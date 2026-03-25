import { NextResponse } from 'next/server';
import { ApiError, apiErrorResponse } from './api';
import { getBearerToken, requireCrmAdmin, verifyCrmToken } from './auth';

export async function withApiHandler(handler: () => Promise<Response>) {
  try {
    return await handler();
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function parseLimit(
  request: Request,
  fallback = 50,
  min = 1,
  max = 200,
  key = 'limit'
): number {
  const url = new URL(request.url);
  const raw = url.searchParams.get(key);
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

export function parseOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (lowered === 'true') return true;
    if (lowered === 'false') return false;
  }
  return fallback;
}

export function parseEnumValue<T extends string>(
  value: unknown,
  enumObject: Record<string, T>,
  fallback: T
): T {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toUpperCase();
  if (Object.values(enumObject).includes(normalized as T)) {
    return normalized as T;
  }

  return fallback;
}

export function parseRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function parseStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const result = value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return result.length > 0 ? result : [];
}

export async function allowBearerOrSecret(
  request: Request,
  options?: {
    envName?: string;
    headerName?: string;
  }
) {
  const token = getBearerToken(request);
  if (token) {
    await verifyCrmToken(token);
    return;
  }

  const envName = options?.envName || 'CRM_WEBHOOK_SECRET';
  const headerName = options?.headerName || 'x-crm-webhook-secret';
  const configuredSecret = process.env[envName];

  if (!configuredSecret) {
    return;
  }

  const incomingSecret = request.headers.get(headerName);
  if (!incomingSecret || incomingSecret !== configuredSecret) {
    throw new ApiError(401, 'Unauthorized webhook request', 'UNAUTHORIZED_WEBHOOK');
  }
}

export async function requireAdminOrSecret(
  request: Request,
  options?: {
    envName?: string;
    headerName?: string;
  }
) {
  const token = getBearerToken(request);
  if (token) {
    await requireCrmAdmin(request);
    return;
  }

  const envName = options?.envName || 'CRM_CRON_SECRET';
  const headerName = options?.headerName || 'x-crm-cron-secret';
  const configuredSecret = process.env[envName];

  if (!configuredSecret) {
    throw new ApiError(401, 'Missing auth token for admin endpoint', 'MISSING_TOKEN');
  }

  const incomingSecret = request.headers.get(headerName);
  if (!incomingSecret || incomingSecret !== configuredSecret) {
    throw new ApiError(401, 'Unauthorized cron request', 'UNAUTHORIZED_CRON');
  }
}
