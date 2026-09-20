/**
 * Global keyboard shortcuts — the single registry behind the hotkey listener,
 * the help dialog and (conceptually) the hints in the command palette.
 *
 * `nextShortcutState` is a pure function so the sequence matching ("g" prefix
 * chords) is unit-testable without a DOM.
 */

export interface ShortcutDef {
   id: string;
   /** Lower-case key sequence, e.g. ["g","i"] for "go to inbox"; single key for actions. */
   sequence: string[];
   /** i18n source string describing the action. */
   label: string;
   group: 'goto' | 'actions';
}

export const SHORTCUTS: ShortcutDef[] = [
   { id: 'new-issue', sequence: ['c'], label: 'Create new issue', group: 'actions' },
   { id: 'help', sequence: ['?'], label: 'Keyboard shortcuts', group: 'actions' },
   { id: 'inbox', sequence: ['g', 'i'], label: 'Inbox', group: 'goto' },
   { id: 'my-issues', sequence: ['g', 'm'], label: 'My issues', group: 'goto' },
   { id: 'projects', sequence: ['g', 'p'], label: 'Projects', group: 'goto' },
   { id: 'views', sequence: ['g', 'v'], label: 'Views', group: 'goto' },
   { id: 'teams', sequence: ['g', 't'], label: 'Teams', group: 'goto' },
   { id: 'reviews', sequence: ['g', 'r'], label: 'Reviews', group: 'goto' },
   { id: 'agent', sequence: ['g', 'a'], label: 'Agent', group: 'goto' },
   { id: 'initiatives', sequence: ['g', 'n'], label: 'Initiatives', group: 'goto' },
   { id: 'settings', sequence: ['g', 's'], label: 'Settings', group: 'goto' },
];

export interface ShortcutMatch {
   state: string[];
   matched?: ShortcutDef;
}

/**
 * Advance the pending key sequence with `key`.
 * - exact registry hit → `{ state: [], matched }`
 * - still a valid prefix (e.g. ["g"]) → `{ state: candidate }`
 * - dead end → reset, keeping a bare "g" as a fresh prefix
 */
export function nextShortcutState(pending: string[], key: string): ShortcutMatch {
   const candidate = [...pending, key];
   const prefixOf = (sequence: string[]) =>
      sequence.slice(0, candidate.length).every((k, i) => k === candidate[i]);
   const exact = SHORTCUTS.find(
      (def) => def.sequence.length === candidate.length && prefixOf(def.sequence)
   );
   if (exact) return { state: [], matched: exact };
   const partial = SHORTCUTS.some(
      (def) => def.sequence.length > candidate.length && prefixOf(def.sequence)
   );
   if (partial) return { state: candidate };
   return { state: key === 'g' ? ['g'] : [] };
}
