import { describe, expect, it } from 'vitest';

import { parseUnifiedDiff } from '@/lib/api/diff';

const SAMPLE = `diff --git a/src/app.tsx b/src/app.tsx
index 1111111..2222222 100644
--- a/src/app.tsx
+++ b/src/app.tsx
@@ -1,4 +1,6 @@
 import React from 'react';
+import { useState } from 'react';
 
-export function App() {
+export function App(props: AppProps) {
+  const [open, setOpen] = useState(false);
   return null;
diff --git a/src/app.test.tsx b/src/app.test.tsx
new file mode 100644
index 0000000..3333333
--- /dev/null
+++ b/src/app.test.tsx
@@ -0,0 +1,3 @@
+it('renders', () => {
+  expect(true).toBe(true);
+});
`;

describe('parseUnifiedDiff', () => {
   it('splits files and counts additions/deletions', () => {
      const parsed = parseUnifiedDiff(SAMPLE);
      expect(parsed.files).toHaveLength(2);
      expect(parsed.additions).toBe(6); // 3 in app.tsx + 3 in the new test file
      expect(parsed.deletions).toBe(1);

      const app = parsed.files[0]!;
      expect(app.name).toBe('app.tsx');
      expect(app.path).toBe('src/app.tsx');
      expect(app.additions).toBe(3);
      expect(app.deletions).toBe(1);
      expect(parsed.diffs['src/app.tsx']).toContain('@@ -1,4 +1,6 @@');
      expect(parsed.diffs['src/app.tsx']).toContain('+import { useState }');
   });

   it('categorizes test files', () => {
      const parsed = parseUnifiedDiff(SAMPLE);
      expect(parsed.files[0]!.category).toBe('implementation');
      expect(parsed.files[1]!.category).toBe('tests');
   });

   it('parses header-less unified diffs (---/+++ only)', () => {
      const parsed = parseUnifiedDiff(
         '--- a/lib/util.ts\n+++ b/lib/util.ts\n@@ -1 +1 @@\n-old\n+new'
      );
      expect(parsed.files).toHaveLength(1);
      expect(parsed.files[0]!.path).toBe('lib/util.ts');
      expect(parsed.additions).toBe(1);
      expect(parsed.deletions).toBe(1);
   });

   it('rejects text that contains no file diff', () => {
      expect(() => parseUnifiedDiff('hello world\nnot a diff')).toThrow();
   });
});
