import { create } from 'zustand';
import { toast } from 'sonner';

export interface AgentMessage {
   id: string;
   role: 'user' | 'assistant';
   content: string;
   /** True while the assistant reply is pending. */
   streaming?: boolean;
}

export interface AgentChat {
   id: string;
   title: string;
   messages: AgentMessage[];
}

const BASE = '/api/agent/conversations';

async function http<T>(url: string, init?: RequestInit): Promise<T> {
   const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
   if (!res.ok) {
      let message = `${res.status}`;
      try {
         const body = (await res.json()) as { error?: string };
         if (body.error) message = body.error;
      } catch {
         /* keep status-only message */
      }
      const err = new Error(message) as Error & { status?: number };
      err.status = res.status;
      throw err;
   }
   return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

interface AgentChatState {
   chats: AgentChat[];
   activeChatId: string | null;
   hydrated: boolean;
   sending: boolean;
   /** Set when the server-side agent is unavailable (disabled / not configured). */
   unconfigured: string | null;

   hydrate: () => Promise<void>;
   setActiveChat: (chatId: string | null) => void;
   startNewChat: () => void;
   deleteChat: (chatId: string) => void;
   /** Sends a user message; appends the persisted exchange (optimistic user bubble). */
   sendMessage: (input: string) => Promise<void>;
}

/**
 * Agent chat backed by /api/agent/conversations. Replies come from the
 * workspace LLM backend; when it is unavailable the store surfaces the
 * server's reason through `unconfigured` instead of fabricating answers.
 */
export const useAgentChatStore = create<AgentChatState>((set, get) => ({
   chats: [],
   activeChatId: null,
   hydrated: false,
   sending: false,
   unconfigured: null,

   hydrate: async () => {
      if (get().hydrated) return;
      try {
         const conversations =
            await http<{ id: string; title: string; messageCount: number; updatedAt: string }[]>(
               BASE
            );
         set({
            // Messages load lazily when a conversation is opened.
            chats: conversations.map((c) => ({ id: c.id, title: c.title, messages: [] })),
            hydrated: true,
         });
      } catch (err) {
         console.error(err);
      }
   },

   setActiveChat: async (chatId) => {
      set({ activeChatId: chatId });
      if (!chatId) return;
      const chat = get().chats.find((c) => c.id === chatId);
      if (chat && chat.messages.length === 0) {
         try {
            const data = await http<{ title: string; messages: AgentMessage[] }>(
               `${BASE}/${encodeURIComponent(chatId)}`
            );
            set((s) => ({
               chats: s.chats.map((c) =>
                  c.id === chatId ? { ...c, title: data.title, messages: data.messages } : c
               ),
            }));
         } catch (err) {
            console.error(err);
         }
      }
   },

   startNewChat: () => set({ activeChatId: null }),

   deleteChat: (chatId) => {
      const snapshot = get().chats;
      set((s) => ({
         chats: s.chats.filter((c) => c.id !== chatId),
         activeChatId: s.activeChatId === chatId ? null : s.activeChatId,
      }));
      http<void>(`${BASE}/${encodeURIComponent(chatId)}`, { method: 'DELETE' }).catch((err) => {
         set({ chats: snapshot });
         console.error(err);
      });
   },

   sendMessage: async (input) => {
      if (get().sending) return;
      set({ sending: true });
      const state = get();
      const active = state.chats.find((chat) => chat.id === state.activeChatId);

      // Optimistic user bubble + pending assistant bubble.
      const optimisticUser: AgentMessage = {
         id: `pending-user-${Date.now()}`,
         role: 'user',
         content: input,
      };
      const optimisticAssistant: AgentMessage = {
         id: `pending-assistant-${Date.now()}`,
         role: 'assistant',
         content: '',
         streaming: true,
      };

      let chatId = active?.id ?? null;
      if (chatId) {
         set({
            chats: state.chats.map((chat) =>
               chat.id === chatId
                  ? { ...chat, messages: [...chat.messages, optimisticUser, optimisticAssistant] }
                  : chat
            ),
         });
      } else {
         const chat: AgentChat = {
            id: `pending-chat-${Date.now()}`,
            title: input.slice(0, 60),
            messages: [optimisticUser, optimisticAssistant],
         };
         chatId = chat.id;
         set({ chats: [chat, ...state.chats], activeChatId: chat.id });
      }
      let targetChatId = chatId;

      const rollback = (message: string, status?: number) => {
         set((s) => ({
            chats: s.chats.map((chat) =>
               chat.id === targetChatId
                  ? { ...chat, messages: chat.messages.filter((m) => !m.id.startsWith('pending-')) }
                  : chat
            ),
            ...(status === 503 ? { unconfigured: message } : {}),
         }));
         if (!get().unconfigured) toast.error('The agent could not answer. Try again.');
      };

      try {
         // Create the conversation server-side on first message.
         if (targetChatId.startsWith('pending-chat-')) {
            const created = await http<{ id: string; title: string }>(BASE, {
               method: 'POST',
               body: JSON.stringify({ title: input.slice(0, 60) }),
            });
            set((s) => ({
               chats: s.chats.map((chat) =>
                  chat.id === targetChatId ? { ...chat, id: created.id } : chat
               ),
               activeChatId: s.activeChatId === targetChatId ? created.id : s.activeChatId,
            }));
            targetChatId = created.id;
         }

         const exchange = await http<{
            user: AgentMessage;
            assistant: AgentMessage;
         }>(`${BASE}/${encodeURIComponent(targetChatId)}/messages`, {
            method: 'POST',
            body: JSON.stringify({ text: input }),
         });

         set((s) => ({
            chats: s.chats.map((chat) =>
               chat.id === targetChatId
                  ? {
                       ...chat,
                       messages: [
                          ...chat.messages.filter((m) => !m.id.startsWith('pending-')),
                          exchange.user,
                          exchange.assistant,
                       ],
                    }
                  : chat
            ),
            unconfigured: null,
         }));
      } catch (err) {
         rollback((err as Error).message, (err as { status?: number }).status);
      } finally {
         set({ sending: false });
      }
   },
}));
