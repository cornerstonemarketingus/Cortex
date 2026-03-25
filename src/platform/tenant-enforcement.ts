import { ApiError } from '@/src/crm/core/api';
import type { CrmAuthClaims } from '@/src/crm/core/auth';
import { parseOptionalString } from '@/src/crm/core/http';
import { getTenantConfigById, resolveTenantByHost } from '@/src/crm/modules/platform/tenant-controls';

export type TenantContext = {
  tenantId: string;
  source: 'auth-claim' | 'header' | 'query' | 'body' | 'host';
};

export function normalizeTenantId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export function extractTenantId(payload: unknown): string | undefined {
  const source = toRecord(payload);
  const direct = parseOptionalString(source.tenantId);
  if (direct) return normalizeTenantId(direct);

  const metadata = toRecord(source.metadata);
  const metadataTenant = parseOptionalString(metadata.tenantId);
  if (metadataTenant) return normalizeTenantId(metadataTenant);

  const context = toRecord(source.context);
  const contextTenant = parseOptionalString(context.tenantId);
  if (contextTenant) return normalizeTenantId(contextTenant);

  return undefined;
}

export function recordBelongsToTenant(payload: unknown, tenantId: string): boolean {
  const normalizedTenant = normalizeTenantId(tenantId);
  const extracted = extractTenantId(payload);
  return Boolean(extracted) && extracted === normalizedTenant;
}

export function requireTenantContext(
  request: Request,
  options?: {
    claims?: CrmAuthClaims;
    bodyTenantId?: unknown;
    queryParamName?: string;
    required?: boolean;
  }
): TenantContext {
  const required = options?.required ?? true;
  const queryParamName = options?.queryParamName || 'tenantId';

  const claimTenant = parseOptionalString(options?.claims?.tenantId);
  const headerTenant = parseOptionalString(request.headers.get('x-tenant-id') || undefined);
  const queryTenant = parseOptionalString(new URL(request.url).searchParams.get(queryParamName));
  const bodyTenant = parseOptionalString(options?.bodyTenantId);

  const tenantCandidates: Array<{ value: string; source: TenantContext['source'] }> = [];
  if (claimTenant) tenantCandidates.push({ value: claimTenant, source: 'auth-claim' });
  if (headerTenant) tenantCandidates.push({ value: headerTenant, source: 'header' });
  if (queryTenant) tenantCandidates.push({ value: queryTenant, source: 'query' });
  if (bodyTenant) tenantCandidates.push({ value: bodyTenant, source: 'body' });

  const normalizedCandidates = tenantCandidates
    .map((candidate) => ({
      ...candidate,
      value: normalizeTenantId(candidate.value),
    }))
    .filter((candidate) => candidate.value.length > 0);

  if (normalizedCandidates.length > 0) {
    const first = normalizedCandidates[0];
    const mismatch = normalizedCandidates.find((candidate) => candidate.value !== first.value);
    if (mismatch) {
      throw new ApiError(403, 'Tenant mismatch across auth/header/query/body context', 'TENANT_MISMATCH');
    }

    const configured = getTenantConfigById(first.value);
    if (!configured) {
      throw new ApiError(404, `Unknown tenant: ${first.value}`, 'TENANT_NOT_FOUND');
    }

    return {
      tenantId: first.value,
      source: first.source,
    };
  }

  if (!required) {
    const hostTenant = resolveTenantByHost(request.headers.get('host') || undefined);
    return {
      tenantId: hostTenant.id,
      source: 'host',
    };
  }

  throw new ApiError(
    400,
    'tenantId is required. Provide x-tenant-id header or tenantId in token/body/query.',
    'TENANT_REQUIRED'
  );
}
