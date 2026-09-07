import { NextResponse } from 'next/server';
import { z } from 'zod';

import { logError } from '@/lib/logger';

/**
 * A validation / business-rule error whose message is safe to show the client.
 * Anything else caught in a route handler is logged and returned as a generic
 * message, so Prisma internals never leak.
 */
export class PublicError extends Error {
   status: number;
   constructor(message: string, status = 422) {
      super(message);
      this.status = status;
   }
}

/** Turn a caught error into a response — curated message for PublicError, generic otherwise. */
export function errorResponse(err: unknown): NextResponse {
   if (err instanceof PublicError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
   }
   if (err instanceof z.ZodError) {
      return NextResponse.json(
         { error: 'invalid request', issues: err.issues.map((i) => i.message) },
         { status: 400 }
      );
   }
   logError('api.unhandled', err);
   return NextResponse.json({ error: 'something went wrong' }, { status: 500 });
}

/** Parse + validate a JSON request body. Throws (caught by `errorResponse`) on bad input. */
export async function parseBody<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
   let raw: unknown;
   try {
      raw = await req.json();
   } catch {
      throw new PublicError('expected a JSON body', 400);
   }
   return schema.parse(raw);
}

/* ----------------------------- shared field bits ---------------------------- */

export const zText = (max: number) => z.string().trim().min(1).max(max);
export const zOptText = (max: number) => z.string().trim().max(max).optional();
/** an id/key we hand straight to Prisma `connect` — keep it short + charset-safe */
export const zId = z
   .string()
   .min(1)
   .max(64)
   .regex(/^[A-Za-z0-9_.:@+-]+$/, 'invalid id');
const dateOnly = z
   .string()
   .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')
   .refine((value) => {
      const [year, month, day] = value.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      return (
         date.getUTCFullYear() === year &&
         date.getUTCMonth() === month - 1 &&
         date.getUTCDate() === day
      );
   }, 'invalid calendar date');
export const zDate = dateOnly.nullable().optional();
