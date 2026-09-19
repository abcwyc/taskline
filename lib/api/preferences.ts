/**
 * Personal (per-user) preferences, persisted as `User.preferences` JSON and
 * exposed through `/api/me`. Add a key here + a default and it round-trips.
 *
 * Honored by the app today: `autoAssignSelf` (new-issue default assignee),
 * `submitCommentOn` (issue comment composer key binding). The rest are stored
 * and surfaced in Settings but not yet wired to behaviour.
 */
export interface Preferences {
   language: 'system' | 'en' | 'zh-CN';
   defaultHomeView: 'agent' | 'inbox' | 'my-issues';
   displayNames: 'username' | 'full-name';
   firstDayOfWeek: 'monday' | 'sunday' | 'saturday';
   emoticonsToEmoji: boolean;
   submitCommentOn: 'mod-enter' | 'enter';
   fontSize: 'default' | 'small' | 'large';
   pointerCursors: boolean;
   underlineLinks: boolean;
   autoAssignSelf: boolean;
   assignSelfOnStart: boolean;
   /** Inbox notifications the user wants to receive (in-app). */
   notifyComments: boolean;
   notifyMentions: boolean;
   notifyAssignments: boolean;
   notifyStatusChanges: boolean;
   /** Also deliver a digest email (requires SMTP to be configured). */
   notifyEmail: boolean;
   /** Review requests create inbox notifications. */
   reviewNotifications: boolean;
   /** Free-form guidance prepended to the workspace agent's system context. */
   agentGuidance: string;
}

export const DEFAULT_PREFERENCES: Preferences = {
   language: 'system',
   defaultHomeView: 'my-issues',
   displayNames: 'full-name',
   firstDayOfWeek: 'monday',
   emoticonsToEmoji: true,
   submitCommentOn: 'mod-enter',
   fontSize: 'default',
   pointerCursors: true,
   underlineLinks: false,
   autoAssignSelf: false,
   assignSelfOnStart: false,
   notifyComments: true,
   notifyMentions: true,
   notifyAssignments: true,
   notifyStatusChanges: true,
   notifyEmail: false,
   reviewNotifications: true,
   agentGuidance: '',
};

/** Merge a stored (possibly partial / unknown) blob onto the defaults. */
export function normalizePreferences(raw: unknown): Preferences {
   if (!raw || typeof raw !== 'object') return { ...DEFAULT_PREFERENCES };
   const out = { ...DEFAULT_PREFERENCES };
   for (const key of Object.keys(DEFAULT_PREFERENCES) as (keyof Preferences)[]) {
      const v = (raw as Record<string, unknown>)[key];
      if (key === 'language') {
         if (v === 'system' || v === 'en' || v === 'zh-CN') out.language = v;
         continue;
      }
      if (typeof v === typeof DEFAULT_PREFERENCES[key]) {
         // @ts-expect-error homogeneous by construction
         out[key] = v;
      }
   }
   return out;
}
