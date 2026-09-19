import { z } from 'zod';

import { zDate, zId, zOptText, zText } from './http';

const priorityId = z.enum(['no-priority', 'urgent', 'high', 'medium', 'low']);
const cycleStatus = z.enum(['planned', 'upcoming', 'current', 'completed']);
const healthId = z.enum(['no-update', 'off-track', 'on-track', 'at-risk']);

/**
 * Request-body schemas for the write routes. Keep these permissive about which
 * fields are present (most updates are partial) but strict about types, lengths
 * and charsets, so a bad payload fails with a 400 instead of a Prisma error.
 */

const RICH = z.string().max(100_000); // plain-text form of a rich field
const idList = z.array(zId).max(100);

export const issueCreate = z
   .object({
      title: zText(300),
      description: RICH.optional(),
      statusId: zId.optional(),
      priorityId: priorityId.optional(),
      assigneeId: zId.nullable().optional(),
      labelIds: idList.optional(),
      projectId: zId.nullable().optional(),
      cycleId: zId.optional(),
      dueDate: zDate,
      parentId: zId.optional(),
   })
   .strict();

export const issueUpdate = z
   .object({
      title: zText(300).optional(),
      description: RICH.optional(),
      statusId: zId.optional(),
      priorityId: zId.optional(),
      assigneeId: zId.nullable().optional(),
      labelIds: idList.optional(),
      projectId: zId.nullable().optional(),
      cycleId: z.string().max(64).optional(),
      dueDate: zDate,
      rank: z.string().min(1).max(64).optional(),
   })
   .strict();

export const commentCreate = z.object({ text: zText(20_000) }).strict();
export const commentUpdate = commentCreate;

export const relationCreate = z
   .object({
      relatedId: zId, // issue id or identifier
      type: z.enum(['blocks', 'blocked-by', 'related', 'duplicate']),
   })
   .strict();

export const prLinkCreate = z
   .object({
      title: zText(200),
      url: z
         .string()
         .trim()
         .max(2_000)
         .refine((v) => /^https?:\/\//i.test(v), 'must be an http(s) URL'),
   })
   .strict();

export const prLinkUpdate = z.object({ status: z.enum(['open', 'merged', 'draft']) }).strict();

export const projectCreate = z
   .object({
      name: zText(200),
      iconKey: zOptText(64),
      icon: zOptText(64),
      teamId: zId.optional(),
      statusId: zId.optional(),
      priorityId: priorityId.optional(),
      healthId: healthId.optional(),
      leadId: zId.nullable().optional(),
      initiativeId: zId.nullable().optional(),
      startDate: zDate,
      targetDate: zDate,
      labels: idList.optional(),
      labelIds: idList.optional(),
   })
   .strict();

export const projectUpdate = projectCreate.partial().strict();

export const projectUpdatePost = z.object({ health: zText(40), text: zText(20_000) }).strict();

const zEmoji = z.string().max(24).optional();

export const cycleCreate = z
   .object({
      name: zText(160),
      teamId: zId,
      status: cycleStatus.optional(),
      startDate: zDate,
      endDate: zDate,
      capacity: z.number().int().min(0).max(100_000).optional(),
   })
   .strict();

export const cycleUpdate = cycleCreate.partial().strict();

export const labelCreate = z
   .object({
      id: zId.optional(),
      name: zText(80),
      color: zText(40),
      description: zOptText(500).nullable(),
   })
   .strict();
export const labelUpdate = z
   .object({
      name: zText(80).optional(),
      color: zText(40).optional(),
      description: zOptText(500).nullable().optional(),
   })
   .strict();

export const initiativeCreate = z
   .object({
      name: zText(200),
      icon: zEmoji,
      description: RICH.nullable().optional(),
      status: zOptText(40),
      priorityId: zId.optional(),
      healthId: zId.optional(),
      ownerId: zId.nullable().optional(),
      leadTeamId: zId.nullable().optional(),
      target: zOptText(200).nullable(),
      projectIds: idList.optional(),
   })
   .strict();

export const initiativeUpdate = initiativeCreate.partial().strict();

export const viewCreate = z
   .object({
      name: zText(160),
      description: zOptText(2_000),
      icon: zEmoji,
      type: z.enum(['issue', 'project']).optional(),
      filter: z.record(z.string(), z.unknown()).optional(),
      teamId: zId.nullable().optional(),
   })
   .strict();

export const viewUpdate = viewCreate.partial().strict();

export const documentCreate = z
   .object({
      name: zText(200).optional(),
      icon: zEmoji,
      pinned: z.boolean().optional(),
      folderId: zId.optional(),
   })
   .strict();

export const documentUpdate = z
   .object({ name: zText(200).optional(), icon: zEmoji, pinned: z.boolean().optional() })
   .strict();

export const teamCreate = z
   .object({ name: zText(80), id: zId.optional(), icon: zEmoji, color: zOptText(40) })
   .strict();

export const teamUpdate = z
   .object({
      name: zText(80).optional(),
      icon: zEmoji,
      color: zOptText(40),
      joined: z.boolean().optional(),
   })
   .strict();

export const inviteCreate = z
   .object({
      email: z.string().email().max(320).nullable().optional(),
      role: z.enum(['Member', 'Guest']).optional(),
   })
   .strict();

export const meUpdate = z
   .object({
      name: zText(120).optional(),
      jobTitle: zOptText(120).nullable(),
      timezone: z.string().max(64).optional(),
      preferences: z.record(z.string(), z.unknown()).optional(),
   })
   .strict();

export const memberUpdate = z
   .object({
      role: z.enum(['Admin', 'Member', 'Guest']).optional(),
      name: zText(120).optional(),
      timezone: z.string().max(64).optional(),
   })
   .strict();

export const milestoneUpdate = z
   .object({
      name: zText(200).optional(),
      targetDate: zDate,
      completed: z.boolean().optional(),
      order: z.number().int().min(0).max(10_000).optional(),
   })
   .strict();

export const milestoneCreate = z.object({ name: zText(200), targetDate: zDate }).strict();

export const notificationUpdate = z
   .object({
      read: z.boolean().optional(),
      /** ISO datetime — the notification is hidden from Inbox until then. */
      snoozedUntil: z.string().datetime().nullable().optional(),
   })
   .strict();

export const workflowStateCreate = z
   .object({
      name: zText(80),
      key: zId.optional(),
      color: z
         .string()
         .trim()
         .regex(/^#[0-9a-fA-F]{6}$/, 'expected a hex color like #5e6ad2')
         .optional(),
      category: z.enum(['triage', 'backlog', 'unstarted', 'started', 'completed', 'canceled']),
      iconKey: z.enum(['circle', 'pie', 'check', 'gear', 'triage', 'x', 'duplicate']).optional(),
   })
   .strict();

export const workflowStateUpdate = workflowStateCreate.partial().strict();

export const folderCreate = z
   .object({ name: zText(120), icon: zEmoji, teamId: zId.nullable().optional() })
   .strict();

export const folderUpdate = z
   .object({
      name: zText(120).optional(),
      icon: zEmoji,
      order: z.number().int().min(0).max(10_000).optional(),
   })
   .strict();

export const triageUpdate = z.object({ status: z.enum(['declined', 'snoozed']) }).strict();

export const issueTemplateCreate = z
   .object({
      name: zText(120),
      description: zOptText(500),
      title: zOptText(300),
      body: z.string().max(20_000),
      icon: zEmoji,
      teamId: zId.nullable(),
   })
   .strict();

export const issueTemplateUpdate = issueTemplateCreate.partial().strict();

export const reviewCreate = z
   .object({
      title: zText(300),
      repo: zOptText(200),
      targetBranch: zOptText(120),
      sourceBranch: zOptText(120),
      resolvesIdentifier: zId.nullable().optional(),
      summary: z.array(z.string().max(2_000)).max(20).optional(),
      testPlan: z
         .array(z.object({ text: z.string().max(500), checked: z.boolean() }))
         .max(30)
         .optional(),
      diff: z.string().min(1).max(600_000),
   })
   .strict();

export const reviewCommentCreate = z
   .object({
      filePath: z
         .string()
         .min(1)
         .max(500)
         .regex(/^[^\?%*|<>"]+$/, 'invalid file path')
         .nullable(),
      text: zText(20_000),
   })
   .strict();

export const reviewVerdict = z
   .object({ verdict: z.enum(['approved', 'changes_requested']).nullable() })
   .strict();

export const reviewStatusUpdate = z
   .object({ status: z.enum(['open', 'merged', 'closed']) })
   .strict();

export const triageCreate = z
   .object({
      title: zText(300),
      description: z.string().max(20_000),
      teamId: zId,
   })
   .strict();
