import { describe, expect, it } from 'vitest';

import { nextShortcutState, SHORTCUTS } from '@/lib/shortcuts';

const matchedId = (keys: string[]) => {
   let state: string[] = [];
   let matched: string | undefined;
   for (const key of keys) {
      const result = nextShortcutState(state, key);
      state = result.state;
      matched = result.matched?.id;
   }
   return matched;
};

describe('shortcut sequence matching', () => {
   it('matches single-key actions', () => {
      expect(matchedId(['c'])).toBe('new-issue');
      expect(matchedId(['?'])).toBe('help');
   });

   it('matches g-prefixed chords across two keystrokes', () => {
      expect(matchedId(['g', 'i'])).toBe('inbox');
      expect(matchedId(['g', 'm'])).toBe('my-issues');
      expect(matchedId(['g', 'p'])).toBe('projects');
      expect(matchedId(['g', 's'])).toBe('settings');
   });

   it('holds "g" as a pending prefix on a dead-end first key', () => {
      const { state, matched } = nextShortcutState([], 'g');
      expect(state).toEqual(['g']);
      expect(matched).toBeUndefined();
   });

   it('cancels on a dead-end chord and re-arms only on a bare "g"', () => {
      expect(nextShortcutState(['g'], 'x').state).toEqual([]);
      expect(nextShortcutState(['g'], 'g').state).toEqual(['g']);
      expect(nextShortcutState(['g'], 'i').state).toEqual([]);
   });

   it('never registers two shortcuts with the same sequence', () => {
      const seen = new Set<string>();
      for (const def of SHORTCUTS) {
         const id = def.sequence.join('>');
         expect(seen.has(id)).toBe(false);
         seen.add(id);
      }
   });
});
