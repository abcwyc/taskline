import { z } from 'zod';

import { zDate, zId, zOptText, zText } from './http';

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
      priorityId: zId.optional(),
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

export const projectCreate = z
   .object({
      name: zText(200),
      iconKey: zOptText(64),
      icon: zOptText(64),
      teamId: zId.optional(),
      statusId: zId.optional(),
      priorityId: zId.optional(),
      healthId: zId.optional(),
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
      status: zOptText(40),
      startDate: z.string().max(40).optional(),
      endDate: z.string().max(40).optional(),
      capacity: z.number().int().min(0).max(100_000).optional(),
   })
   .strict();

export const cycleUpdate = cycleCreate.partial().strict();

export const labelCreate = z
   .object({ id: zId.optional(), name: zText(80), color: zText(40) })
   .strict();
export const labelUpdate = z
   .object({ name: zText(80).optional(), color: zText(40).optional() })
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

export const milestoneUpdate = z.object({ completed: z.boolean() }).strict();

export const triageUpdate = z.object({ status: z.enum(['declined', 'snoozed']) }).strict();
