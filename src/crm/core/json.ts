import type { Prisma } from '@/generated/crm-client';

function normalizeJson(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;

  // Ensure plain JSON-safe values for Prisma Json columns.
  return JSON.parse(JSON.stringify(value));
}

export function toPrismaJson(value: unknown): Prisma.InputJsonValue | undefined {
  const normalized = normalizeJson(value);
  if (normalized === undefined) return undefined;
  return normalized as Prisma.InputJsonValue;
}

export function toPrismaRequiredJson(
  value: unknown,
  fallback: Prisma.InputJsonValue = {}
): Prisma.InputJsonValue {
  return toPrismaJson(value) ?? fallback;
}
