#!/usr/bin/env node
/**
 * Merge translation fragments from .i18n-work/*.json into the ZH_CN dictionary
 * in lib/i18n.ts.
 *
 * - Existing dictionary entries always win (fragments only ADD new keys).
 * - Conflicting values for the same new key across fragments: first file in
 *   sorted order wins, conflicts are reported.
 * - The rewritten ZH_CN block keeps its existing order; new keys are appended
 *   grouped by fragment file, sorted alphabetically.
 *
 * Usage: node scripts/i18n-merge.mjs
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const I18N_FILE = join(ROOT, 'lib/i18n.ts');
const WORK_DIR = join(ROOT, '.i18n-work');

const src = readFileSync(I18N_FILE, 'utf8');

const startMarker = 'const ZH_CN: Record<string, string> = {';
const startIdx = src.indexOf(startMarker);
if (startIdx === -1) throw new Error('ZH_CN block not found');
const bodyStart = startIdx + startMarker.length;
const endIdx = src.indexOf('\n};', bodyStart);
if (endIdx === -1) throw new Error('ZH_CN block end not found');
const body = src.slice(bodyStart, endIdx);

// Parse existing entries: lines like   'key': 'value',
const entryRe = /^\s*'((?:[^'\\]|\\.)*)':\s*'((?:[^'\\]|\\.)*)',?\s*$/gm;
const existing = new Map();
for (const m of body.matchAll(entryRe)) {
   existing.set(m[1].replace(/\\'/g, "'"), m[2].replace(/\\'/g, "'"));
}

if (!existsSync(WORK_DIR)) {
   console.log('No .i18n-work directory — nothing to merge.');
   process.exit(0);
}

const fragments = readdirSync(WORK_DIR)
   .filter((f) => f.endsWith('.json'))
   .sort();

const additions = new Map(); // key -> { value, source }
const conflicts = [];
const skippedExisting = [];

for (const file of fragments) {
   const frag = JSON.parse(readFileSync(join(WORK_DIR, file), 'utf8'));
   for (const [key, value] of Object.entries(frag)) {
      if (typeof value !== 'string' || !value.trim()) {
         console.warn(`⚠ ${file}: empty value for key ${JSON.stringify(key)} — skipped`);
         continue;
      }
      if (existing.has(key)) {
         skippedExisting.push({ key, file });
         continue;
      }
      const prev = additions.get(key);
      if (!prev) {
         additions.set(key, { value, source: file });
      } else if (prev.value !== value) {
         conflicts.push({ key, keep: prev.value, dropped: { value, source: file } });
      }
   }
}

const esc = (s) =>
   s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n').replace(/\t/g, '\\t');

const newKeys = [...additions.keys()].sort((a, b) => a.localeCompare(b, 'en'));
let newBlock = '';
for (const [key, value] of existing) {
   newBlock += `   '${esc(key)}': '${esc(value)}',\n`;
}
if (newKeys.length) newBlock += '\n';
for (const key of newKeys) {
   newBlock += `   '${esc(key)}': '${esc(additions.get(key).value)}',\n`;
}

const out = src.slice(0, bodyStart) + '\n' + newBlock + src.slice(endIdx);
writeFileSync(I18N_FILE, out);

console.log(`Existing keys: ${existing.size}`);
console.log(`Added keys: ${newKeys.length}`);
if (skippedExisting.length)
   console.log(`Skipped (already in dictionary): ${skippedExisting.length}`);
if (conflicts.length) {
   console.log('\nConflicts (kept first, dropped later):');
   for (const c of conflicts)
      console.log(
         `  ${JSON.stringify(c.key)}: kept ${JSON.stringify(c.keep)}, dropped ${JSON.stringify(c.dropped.value)} (${c.dropped.source})`
      );
}
