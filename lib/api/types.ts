/**
 * Wire DTOs — the JSON actually sent over HTTP.
 *
 * They are the *serializable* projection of the frontend's rich domain objects:
 * anything the UI carries as a non-serializable value (the `icon` React
 * components on `Status` / `Priority` / `Project`) is reduced to an id here and
 * re-hydrated on the client from the mock-data registries (see
 * `lib/api/issues.ts`). This is the seam every other entity slice should copy.
 */

export interface IssueDTO {
   id: string;
   identifier: string;
   title: string;
   description: string;
   statusId: string; // WorkflowState key, e.g. "in-progress"
   priorityId: string; // "no-priority" | "urgent" | "high" | "medium" | "low"
   assigneeId: string | null;
   labelIds: string[];
   projectId: string | null;
   cycleId: string; // "" = not planned in any cycle (mock convention)
   parentId: string | null;
   rank: string;
   dueDate: string | null; // ISO date
   createdAt: string; // ISO datetime
}

/** Fields a client may send when creating an issue (server owns the rest). */
export type IssueCreateBody = Partial<
   Pick<
      IssueDTO,
      | 'title'
      | 'description'
      | 'statusId'
      | 'priorityId'
      | 'assigneeId'
      | 'labelIds'
      | 'projectId'
      | 'cycleId'
      | 'dueDate'
   >
>;

/** Fields a client may patch. */
export type IssueUpdateBody = Partial<
   Pick<
      IssueDTO,
      | 'title'
      | 'description'
      | 'statusId'
      | 'priorityId'
      | 'assigneeId'
      | 'labelIds'
      | 'projectId'
      | 'cycleId'
      | 'dueDate'
      | 'rank'
   >
>;

export interface ListIssuesQuery {
   cycleId?: string;
   projectId?: string;
   assigneeId?: string;
   statusId?: string;
   /** free-text over title + identifier */
   q?: string;
}

/* -------------------------------------------------------------------------- */
/*                                 Projects                                   */
/* -------------------------------------------------------------------------- */

export interface ProjectDTO {
   id: string;
   name: string;
   iconKey: string; // lucide icon name, e.g. "Cuboid" (see lib/api/project-icons.ts)
   statusId: string; // WorkflowState key
   priorityId: string; // priority key
   healthId: string; // "no-update" | "off-track" | "on-track" | "at-risk"
   leadId: string | null;
   initiativeId: string | null;
   teamId: string;
   labelIds: string[];
   startDate: string; // ISO date ("" only if truly unset)
   targetDate: string | null; // ISO date
   healthUpdatedAgoDays: number | null;
   percentComplete: number; // DERIVED server-side from issue states
   createdAt: string;
}

export type ProjectCreateBody = Partial<
   Pick<
      ProjectDTO,
      | 'name'
      | 'iconKey'
      | 'statusId'
      | 'priorityId'
      | 'healthId'
      | 'leadId'
      | 'initiativeId'
      | 'teamId'
      | 'labelIds'
      | 'startDate'
      | 'targetDate'
   >
>;

export type ProjectUpdateBody = ProjectCreateBody;

export interface ListProjectsQuery {
   teamId?: string;
   initiativeId?: string;
   healthId?: string;
   statusId?: string;
   leadId?: string;
   q?: string;
}

/* -------------------------------------------------------------------------- */
/*                              Teams / members                               */
/* -------------------------------------------------------------------------- */

export interface TeamDTO {
   id: string; // team key, e.g. "CORE" — also the [teamId] route segment
   name: string;
   icon: string;
   color: string;
   joined: boolean; // is the current user a member (per-request)
   memberIds: string[];
   projectIds: string[];
   createdAt: string;
}

export type TeamCreateBody = Partial<Pick<TeamDTO, 'id' | 'name' | 'icon' | 'color'>>;
export type TeamUpdateBody = Partial<Pick<TeamDTO, 'name' | 'icon' | 'color'>> & {
   joined?: boolean; // join / leave for the current user
};

export interface MemberDTO {
   id: string;
   name: string;
   email: string;
   avatarUrl: string | null;
   status: string; // "online" | "offline" | "away"
   role: string; // "Member" | "Admin" | "Guest" | "Application"
   joinedDate: string; // ISO date
   timezone: string;
   teamIds: string[];
}

export type MemberUpdateBody = Partial<Pick<MemberDTO, 'role' | 'timezone' | 'name'>>;

export const PRESENCE_ENUM_TO_KEY: Record<string, string> = {
   ONLINE: 'online',
   OFFLINE: 'offline',
   AWAY: 'away',
};
export const PRESENCE_KEY_TO_ENUM: Record<string, string> = {
   online: 'ONLINE',
   offline: 'OFFLINE',
   away: 'AWAY',
};

export const ROLE_ENUM_TO_KEY: Record<string, string> = {
   ADMIN: 'Admin',
   MEMBER: 'Member',
   GUEST: 'Guest',
   APPLICATION: 'Application',
};
export const ROLE_KEY_TO_ENUM: Record<string, string> = {
   Admin: 'ADMIN',
   Member: 'MEMBER',
   Guest: 'GUEST',
   Application: 'APPLICATION',
};

/* -------------------------------------------------------------------------- */
/*                                  Labels                                    */
/* -------------------------------------------------------------------------- */

export interface LabelDTO {
   id: string; // label key, e.g. "bug"
   name: string;
   color: string; // CSS color keyword
}

export type LabelCreateBody = Partial<Pick<LabelDTO, 'id' | 'name' | 'color'>>;
export type LabelUpdateBody = Partial<Pick<LabelDTO, 'name' | 'color'>>;

/* -------------------------------------------------------------------------- */
/*                                  Cycles                                    */
/* -------------------------------------------------------------------------- */

export interface CycleBurnupPointDTO {
   date: string;
   scope: number;
   started: number;
   completed: number;
   ideal: number;
}

export interface CycleDTO {
   id: string;
   number: number;
   name: string;
   teamId: string; // team key
   status: string; // "planned" | "upcoming" | "current" | "completed"
   startDate: string;
   endDate: string;
   capacity: number;
   scope: number; // DERIVED (issue count in the cycle)
   scopeDelta: number;
   started: number; // DERIVED
   completed: number; // DERIVED
   successRate?: number;
   burnup?: CycleBurnupPointDTO[];
}

export type CycleCreateBody = Partial<
   Pick<CycleDTO, 'name' | 'teamId' | 'status' | 'startDate' | 'endDate' | 'capacity'>
>;
export type CycleUpdateBody = CycleCreateBody;

export const CYCLE_STATUS_ENUM_TO_KEY: Record<string, string> = {
   PLANNED: 'planned',
   UPCOMING: 'upcoming',
   CURRENT: 'current',
   COMPLETED: 'completed',
};
export const CYCLE_STATUS_KEY_TO_ENUM: Record<string, string> = {
   planned: 'PLANNED',
   upcoming: 'UPCOMING',
   current: 'CURRENT',
   completed: 'COMPLETED',
};

/* -------------------------------------------------------------------------- */
/*                             Issue detail                                   */
/* -------------------------------------------------------------------------- */

export interface IssueCommentDTO {
   id: string;
   authorId: string;
   body: RichBlocks;
   reactions: { emoji: string; count: number }[];
   createdAt: string;
}

export interface IssueActivityDTO {
   id: string;
   actorId: string;
   verb: string;
   field: string | null;
   text: string;
   createdAt: string;
}

export interface PrLinkDTO {
   id: string;
   title: string;
   url: string;
   status: string; // "open" | "merged" | "draft"
}

export interface IssueDetailDTO {
   identifier: string;
   description: RichBlocks;
   comments: IssueCommentDTO[];
   activity: IssueActivityDTO[];
   subIssueIds: string[]; // identifiers
   relatedIds: string[];
   blockedByIds: string[];
   prLinks: PrLinkDTO[];
   milestone: string | null;
}

export interface PostCommentBody {
   text: string;
}

export const PR_STATUS_ENUM_TO_KEY: Record<string, string> = {
   OPEN: 'open',
   MERGED: 'merged',
   DRAFT: 'draft',
};

/* -------------------------------------------------------------------------- */
/*                             Notifications                                  */
/* -------------------------------------------------------------------------- */

export interface NotificationDTO {
   id: string;
   type: string; // comment | mention | assignment | status | reopened | closed | edited | created | upload
   content: string;
   actorId: string | null;
   issueIdentifier: string | null;
   read: boolean;
   timestamp: string; // ISO
}

/* -------------------------------------------------------------------------- */
/*                              Initiatives                                   */
/* -------------------------------------------------------------------------- */

export interface InitiativeDTO {
   id: string;
   name: string;
   description: string | null;
   icon: string;
   status: string; // active | planned | completed | canceled
   priorityId: string;
   ownerId: string | null;
   leadTeamId: string | null; // team key
   target: string | null;
   healthId: string;
   projectIds: string[];
   createdAt: string;
}

export type InitiativeCreateBody = Partial<
   Pick<
      InitiativeDTO,
      | 'name'
      | 'description'
      | 'icon'
      | 'status'
      | 'priorityId'
      | 'ownerId'
      | 'leadTeamId'
      | 'target'
      | 'healthId'
      | 'projectIds'
   >
>;
export type InitiativeUpdateBody = InitiativeCreateBody;

export const INITIATIVE_STATUS_ENUM_TO_KEY: Record<string, string> = {
   ACTIVE: 'active',
   PLANNED: 'planned',
   COMPLETED: 'completed',
   CANCELED: 'canceled',
};
export const INITIATIVE_STATUS_KEY_TO_ENUM: Record<string, string> = {
   active: 'ACTIVE',
   planned: 'PLANNED',
   completed: 'COMPLETED',
   canceled: 'CANCELED',
};

/* ------------------------------ health mapping ---------------------------- */
// DB enum (ON_TRACK) <-> mock Health.id (on-track)

export const HEALTH_ENUM_TO_KEY: Record<string, string> = {
   NO_UPDATE: 'no-update',
   OFF_TRACK: 'off-track',
   ON_TRACK: 'on-track',
   AT_RISK: 'at-risk',
};

export const HEALTH_KEY_TO_ENUM: Record<string, string> = {
   'no-update': 'NO_UPDATE',
   'off-track': 'OFF_TRACK',
   'on-track': 'ON_TRACK',
   'at-risk': 'AT_RISK',
};

/* -------------------------------------------------------------------------- */
/*                             Project details                                */
/* -------------------------------------------------------------------------- */

/** ContentBlock[] / other rich payloads are opaque JSON on the wire. */
export type RichBlocks = unknown[];

export interface ProjectMilestoneDTO {
   id: string;
   name: string;
   targetDate: string | null;
   completed: boolean;
}

export interface ProjectUpdateDTO {
   id: string;
   authorId: string;
   date: string; // ISO date
   health: string; // "on-track" | "at-risk" | "off-track"
   blocks: RichBlocks;
}

export interface ProjectActivityDTO {
   id: string;
   userId: string;
   date: string;
   text: string;
}

export interface ProjectDetailDTO {
   projectId: string;
   summary: string;
   description: RichBlocks;
   resources: { label: string; url: string }[];
   milestones: ProjectMilestoneDTO[];
   updates: ProjectUpdateDTO[];
   activity: ProjectActivityDTO[];
}

export interface PostProjectUpdateBody {
   health: string; // project-update health key
   text: string;
}

// DB enum (ON_TRACK) <-> project-update health key (on-track)
export const PU_HEALTH_ENUM_TO_KEY: Record<string, string> = {
   ON_TRACK: 'on-track',
   AT_RISK: 'at-risk',
   OFF_TRACK: 'off-track',
};
export const PU_HEALTH_KEY_TO_ENUM: Record<string, string> = {
   'on-track': 'ON_TRACK',
   'at-risk': 'AT_RISK',
   'off-track': 'OFF_TRACK',
};

/* ----------------------------- priority mapping ---------------------------- */
// The DB stores priority as an enum (URGENT); the UI uses the mock id (urgent).

export const PRIORITY_KEYS = ['no-priority', 'urgent', 'high', 'medium', 'low'] as const;
export type PriorityKey = (typeof PRIORITY_KEYS)[number];

export const PRIORITY_ENUM_TO_KEY: Record<string, PriorityKey> = {
   NO_PRIORITY: 'no-priority',
   URGENT: 'urgent',
   HIGH: 'high',
   MEDIUM: 'medium',
   LOW: 'low',
};

export const PRIORITY_KEY_TO_ENUM: Record<string, string> = {
   'no-priority': 'NO_PRIORITY',
   'urgent': 'URGENT',
   'high': 'HIGH',
   'medium': 'MEDIUM',
   'low': 'LOW',
};
