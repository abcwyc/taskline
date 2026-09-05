import type { Prisma } from '@prisma/client';

/**
 * Rich text on the wire is `ContentBlock[]` (see mock-data/issue-details.ts).
 * In the DB it is stored as `{ blocks: ContentBlock[] }` on a JSON column.
 * List DTOs carry a plain-text preview instead of the full tree.
 */

export type Block = { type: string; text?: string; items?: unknown[] };

export function readBlocks(json: Prisma.JsonValue | null | undefined): Block[] {
   if (json && typeof json === 'object' && !Array.isArray(json) && 'blocks' in json) {
      const b = (json as { blocks?: unknown }).blocks;
      return Array.isArray(b) ? (b as Block[]) : [];
   }
   if (Array.isArray(json)) return json as Block[];
   return [];
}

export const storeBlocks = (blocks: Block[]): Prisma.InputJsonValue =>
   ({ blocks }) as unknown as Prisma.InputJsonValue;

/** Free text -> paragraph blocks (split on blank lines). */
export const textToBlocks = (text: string): Block[] =>
   text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => ({ type: 'paragraph', text: p }));

/** Blocks -> a short plain-text preview for list DTOs. */
export function blocksToText(blocks: Block[]): string {
   return blocks
      .filter((b) => b.type === 'paragraph' || b.type === 'heading' || b.type === 'quote')
      .map((b) => b.text ?? '')
      .filter(Boolean)
      .join('\n\n')
      .trim();
}
