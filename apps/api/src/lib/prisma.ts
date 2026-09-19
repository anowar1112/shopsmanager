import { PrismaClient } from '@prisma/client';
import { env, isProduction } from './env.js';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ['error', 'warn'] : ['query', 'error', 'warn'],
  });

if (!isProduction) globalForPrisma.prisma = prisma;

/** Prisma returns Decimal objects; the API always sends plain numbers. */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return Number(value.toString());
}

export type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export { env };
