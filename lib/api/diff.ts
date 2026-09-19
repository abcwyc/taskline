import 'server-only';

import { PublicError } from './http';

import type { ReviewFileStat } from '@/mock-data/reviews';

/**
 * Unified-diff parsing for locally created reviews (no VCS integration —
 * the user pastes `git diff` output). Kept db-free so it is unit-testable.
 */

const MAX_DIFF_BYTES = 512 * 1024;
const MAX_FILES = 300;

const TEST_PATH = /(^|\/)(tests?|__tests__|spec)(\/|$)|\.(test|spec)\.[tj]sx?$/i;

export function parseUnifiedDiff(diff: string): {
   files: ReviewFileStat[];
   diffs: Record<string, string>;
   additions: number;
   deletions: number;
} {
   if (diff.length > MAX_DIFF_BYTES) throw new PublicError('diff is too large (max 512 KB)');
   const lines = diff.split('\n');
   const files: ReviewFileStat[] = [];
   const diffs: Record<string, string> = {};
   let additions = 0;
   let deletions = 0;

   let currentPath: string | null = null;
   let currentText: string[] = [];
   let fileAdd = 0;
   let fileDel = 0;

   const flush = () => {
      if (!currentPath) return;
      if (files.length >= MAX_FILES) throw new PublicError(`diff exceeds ${MAX_FILES} files`);
      const name = currentPath.split('/').pop() ?? currentPath;
      files.push({
         name,
         path: currentPath,
         additions: fileAdd,
         deletions: fileDel,
         category: TEST_PATH.test(currentPath) ? 'tests' : 'implementation',
      });
      diffs[currentPath] = currentText.join('\n');
   };

   for (const line of lines) {
      const gitMatch = /^diff --git a\/(\S+) b\/(\S+)$/.exec(line);
      if (gitMatch) {
         flush();
         currentPath = gitMatch[2];
         currentText = [line];
         fileAdd = 0;
         fileDel = 0;
         continue;
      }
      const plusMatch = /^\+\+\+ b\/(\S+)$/.exec(line);
      if (plusMatch && !currentPath) {
         currentPath = plusMatch[1];
      }
      if (currentPath === null) continue; // preamble (commit message etc.) before any file
      if (/^\+\+\+|^---/.test(line)) {
         currentText.push(line);
         continue;
      }
      if (line.startsWith('+')) {
         additions += 1;
         fileAdd += 1;
         currentText.push(line);
      } else if (line.startsWith('-')) {
         deletions += 1;
         fileDel += 1;
         currentText.push(line);
      } else {
         currentText.push(line);
      }
   }
   flush();

   if (!files.length) throw new PublicError('no file diffs found — paste a unified git diff');
   return { files, diffs, additions, deletions };
}
