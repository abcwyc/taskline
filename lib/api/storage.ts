import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Local-disk blob storage for attachments. Files live under `UPLOAD_DIR`
 * (default `<cwd>/uploads`, `/app/uploads` in the container — mount a volume).
 * To move to S3/R2, reimplement these four functions.
 */

export const UPLOAD_DIR = process.env.UPLOAD_DIR
   ? path.resolve(process.env.UPLOAD_DIR)
   : path.join(process.cwd(), 'uploads');

const num = (v: string | undefined, fallback: number) => {
   const n = Number(v);
   return v && Number.isFinite(n) ? n : fallback;
};

export const MAX_ATTACHMENT_BYTES = num(process.env.MAX_ATTACHMENT_BYTES, 10 * 1024 * 1024);
/** Total attachment bytes allowed per workspace (default 2 GiB; 0 disables the cap). */
export const MAX_WORKSPACE_ATTACHMENT_BYTES = num(
   process.env.MAX_WORKSPACE_ATTACHMENT_BYTES,
   2 * 1024 * 1024 * 1024
);

/** Build a collision-proof, traversal-proof storage key for an issue's file. */
export function makeStorageKey(issueId: string, filename: string): string {
   const safeIssue = createHash('sha1').update(issueId).digest('hex').slice(0, 16);
   const ext = path
      .extname(filename)
      .slice(0, 12)
      .replace(/[^.\w]/g, '');
   return `${safeIssue}/${randomUUID()}${ext}`;
}

function resolveKey(storageKey: string): string {
   const full = path.resolve(UPLOAD_DIR, storageKey);
   if (full !== UPLOAD_DIR && !full.startsWith(UPLOAD_DIR + path.sep)) {
      throw new Error('invalid storage key');
   }
   return full;
}

export async function saveBlob(storageKey: string, bytes: Buffer): Promise<void> {
   const full = resolveKey(storageKey);
   await mkdir(path.dirname(full), { recursive: true });
   await writeFile(full, bytes);
}

export async function readBlob(storageKey: string): Promise<Buffer> {
   return readFile(resolveKey(storageKey));
}

export async function deleteBlob(storageKey: string): Promise<void> {
   await rm(resolveKey(storageKey), { force: true });
}
