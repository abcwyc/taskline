import { PrismaClient } from '@prisma/client';

/**
 * Prisma client singleton — avoids exhausting the connection pool during
 * Next.js dev hot-reloads. Import this from server code only (route handlers,
 * server components, server actions) — never from a `'use client'` module.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
   globalForPrisma.prisma ??
   new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
   });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
