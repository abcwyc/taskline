import 'server-only';
import { PublicError } from './http';

import { db } from '@/lib/db';
import { getSetting } from './workspace-settings.server';

/**
 * Workspace agent: persisted conversations + an OpenAI-compatible LLM backend.
 *
 * Configure via env (any OpenAI-compatible gateway works):
 *   AGENT_LLM_BASE_URL  e.g. https://api.openai.com/v1
 *   AGENT_LLM_API_KEY
 *   AGENT_LLM_MODEL     e.g. gpt-4o-mini
 * When unset (or the admin disabled AI), message posting returns 503 with a
 * clear reason; conversations remain readable.
 */

export interface AgentMessageDTO {
   id: string;
   role: 'user' | 'assistant';
   content: string;
   createdAt: string;
}

export interface AgentConversationDTO {
   id: string;
   title: string;
   createdAt: string;
   updatedAt: string;
   messageCount: number;
}

export interface AgentLlmConfig {
   baseUrl: string;
   apiKey: string;
   model: string;
}

export function llmConfig(): AgentLlmConfig | null {
   const apiKey = process.env.AGENT_LLM_API_KEY;
   if (!apiKey) return null;
   return {
      baseUrl: (process.env.AGENT_LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
      apiKey,
      model: process.env.AGENT_LLM_MODEL || 'gpt-4o-mini',
   };
}

async function aiEnabled(orgId: string): Promise<boolean> {
   const setting = (await getSetting(orgId, 'ai')) as { enabled: boolean };
   return Boolean(setting?.enabled);
}

/* ------------------------------ conversations ------------------------------ */

export async function listConversations(
   orgId: string,
   userId: string
): Promise<AgentConversationDTO[]> {
   const rows = await db.agentConversation.findMany({
      where: { orgId, userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
      take: 100,
   });
   return rows.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      messageCount: c._count.messages,
   }));
}

export async function createConversation(
   orgId: string,
   userId: string,
   title = 'New chat'
): Promise<AgentConversationDTO> {
   const row = await db.agentConversation.create({
      data: { orgId, userId, title: title.slice(0, 120) },
   });
   return {
      id: row.id,
      title: row.title,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      messageCount: 0,
   };
}

export async function getMessages(
   orgId: string,
   userId: string,
   conversationId: string
): Promise<{ title: string; messages: AgentMessageDTO[] } | null> {
   const row = await db.agentConversation.findFirst({
      where: { orgId, userId, id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
   });
   if (!row) return null;
   return {
      title: row.title,
      messages: row.messages.map((m) => ({
         id: m.id,
         role: m.role as 'user' | 'assistant',
         content: m.content,
         createdAt: m.createdAt.toISOString(),
      })),
   };
}

export async function renameConversation(
   orgId: string,
   userId: string,
   conversationId: string,
   title: string
): Promise<boolean> {
   if (!title?.trim()) throw new PublicError('title is required');
   const res = await db.agentConversation.updateMany({
      where: { orgId, userId, id: conversationId },
      data: { title: title.trim().slice(0, 120) },
   });
   return res.count > 0;
}

export async function deleteConversation(
   orgId: string,
   userId: string,
   conversationId: string
): Promise<boolean> {
   const res = await db.agentConversation.deleteMany({
      where: { orgId, userId, id: conversationId },
   });
   return res.count > 0;
}

/* -------------------------------- messaging -------------------------------- */

export async function postMessage(
   orgId: string,
   userId: string,
   conversationId: string,
   content: string
): Promise<{ user: AgentMessageDTO; assistant: AgentMessageDTO }> {
   if (!content?.trim()) throw new PublicError('message text is required');

   const conversation = await db.agentConversation.findFirst({
      where: { orgId, userId, id: conversationId },
      select: { id: true, title: true },
   });
   if (!conversation) throw new PublicError('conversation not found', 404);

   if (!(await aiEnabled(orgId))) {
      throw new PublicError('the workspace AI agent is disabled by your administrator', 503);
   }
   const config = llmConfig();
   if (!config) {
      throw new PublicError(
         'the AI agent is not configured on this server (AGENT_LLM_* environment variables)',
         503
      );
   }

   const [systemPrompt, history] = await Promise.all([
      buildSystemPrompt(orgId, userId),
      db.agentMessage.findMany({
         where: { conversationId },
         orderBy: { createdAt: 'asc' },
         select: { role: true, content: true },
      }),
   ]);

   const userMessage = await db.agentMessage.create({
      data: { conversationId, role: 'user', content: content.trim().slice(0, 20_000) },
   });

   let reply: string;
   try {
      reply = await callLlm(config, [
         { role: 'system', content: systemPrompt },
         ...history.slice(-20).map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
         })),
         { role: 'user', content: content.trim() },
      ]);
   } catch (err) {
      await db.agentMessage.delete({ where: { id: userMessage.id } });
      throw err;
   }

   const assistantMessage = await db.agentMessage.create({
      data: { conversationId, role: 'assistant', content: reply },
   });

   // First exchange names the conversation after the user's question.
   if (conversation.title === 'New chat') {
      await db.agentConversation.update({
         where: { id: conversation.id },
         data: { title: content.trim().slice(0, 60) },
      });
   } else {
      await db.agentConversation.update({ where: { id: conversation.id }, data: {} });
   }

   return {
      user: serialize(userMessage),
      assistant: serialize(assistantMessage),
   };
}

const serialize = (m: {
   id: string;
   role: string;
   content: string;
   createdAt: Date;
}): AgentMessageDTO => ({
   id: m.id,
   role: m.role as 'user' | 'assistant',
   content: m.content,
   createdAt: m.createdAt.toISOString(),
});

/* ----------------------------- workspace context ---------------------------- */

/** Compact workspace snapshot so the agent can answer with real data. */
async function buildSystemPrompt(orgId: string, userId: string): Promise<string> {
   const [org, teams, counts, openIssues, projects, user, aiSetting] = await Promise.all([
      db.organization.findUnique({
         where: { id: orgId },
         select: { name: true, issuePrefix: true },
      }),
      db.team.findMany({ where: { orgId }, select: { key: true, name: true } }),
      db.issue.count({ where: { orgId } }),
      db.issue.findMany({
         where: {
            orgId,
            state: { category: { in: ['TRIAGE', 'BACKLOG', 'UNSTARTED', 'STARTED'] } },
         },
         orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
         take: 25,
         select: {
            identifier: true,
            title: true,
            priority: true,
            assigneeId: true,
            state: { select: { name: true } },
         },
      }),
      db.project.findMany({ where: { orgId }, select: { name: true, health: true }, take: 15 }),
      db.user.findUnique({ where: { id: userId }, select: { name: true, preferences: true } }),
      getSetting(orgId, 'ai') as Promise<{ systemPrompt: string }>,
   ]);

   const assigneeNames = new Map(
      (
         await db.user.findMany({
            where: { assignedIssues: { some: { orgId } } },
            select: { id: true, name: true },
         })
      ).map((u) => [u.id, u.name])
   );

   const lines = [
      `You are the workspace assistant for "${org?.name ?? 'this workspace'}", a project tracking tool (like Linear).`,
      `Today is ${new Date().toISOString().slice(0, 10)}.`,
      `Teams: ${teams.map((t) => t.name).join(', ') || 'none'}.`,
      `Total issues: ${counts}. Open projects: ${projects.map((p) => `${p.name} (${p.health.toLowerCase().replace('_', '-')})`).join(', ') || 'none'}.`,
      `Currently open issues (top by priority):`,
      ...openIssues.map(
         (i) =>
            `- ${i.identifier}: ${i.title} [status=${i.state.name}${i.assigneeId ? `, assignee=${assigneeNames.get(i.assigneeId) ?? 'unknown'}` : ''}]`
      ),
   ];
   const guidance = (user?.preferences as Record<string, unknown> | null)?.agentGuidance;
   if (typeof guidance === 'string' && guidance.trim()) {
      lines.push(`The user's personal guidance for you: ${guidance.trim().slice(0, 2_000)}`);
   }
   if (aiSetting?.systemPrompt?.trim()) {
      lines.push(
         `Workspace operator instructions: ${aiSetting.systemPrompt.trim().slice(0, 2_000)}`
      );
   }
   lines.push(
      'Answer concisely. When asked about issues, teams or projects, prefer the snapshot above; if data is missing, say so instead of inventing identifiers.'
   );
   return lines.join('\n');
}

/* --------------------------------- llm call -------------------------------- */

interface ChatMessage {
   role: 'system' | 'user' | 'assistant';
   content: string;
}

async function callLlm(config: AgentLlmConfig, messages: ChatMessage[]): Promise<string> {
   const controller = new AbortController();
   const timer = setTimeout(() => controller.abort(), 90_000);
   try {
      const res = await fetch(`${config.baseUrl}/chat/completions`, {
         method: 'POST',
         headers: {
            'content-type': 'application/json',
            'authorization': `Bearer ${config.apiKey}`,
         },
         body: JSON.stringify({
            model: config.model,
            messages,
            max_tokens: 1_500,
         }),
         signal: controller.signal,
      });
      if (!res.ok) {
         throw new PublicError(
            `the AI provider rejected the request (${res.status})`,
            res.status === 401 || res.status === 403 ? 503 : 502
         );
      }
      const data = (await res.json()) as {
         choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) throw new PublicError('the AI provider returned an empty reply', 502);
      return content;
   } catch (err) {
      if (err instanceof PublicError) throw err;
      if ((err as Error).name === 'AbortError') {
         throw new PublicError('the AI provider timed out', 504);
      }
      throw new PublicError('the AI provider could not be reached', 502);
   } finally {
      clearTimeout(timer);
   }
}
