/**
 * Authentication and organization scoping for the commercial estimating API.
 *
 * Deliberately strict: the caller's *identity* must come from a signed CRM
 * bearer token, never from a header or body field. The organization id may be
 * supplied by the caller, because supplying it proves nothing — membership is
 * verified against the authenticated subject before any scope is issued.
 *
 * The subscription cookie used by the residential estimator is NOT accepted
 * here. It identifies a billing email, not an authenticated principal, and
 * trusting it would let any caller claim any actor.
 */

import { ApiError } from '@/src/crm/core/api';
import { getBearerToken, verifyCrmToken } from '@/src/crm/core/auth';
import { commercialDb, isCommercialDbConfigured, type CommercialDb } from '../data/client';
import { resolveOrgScope, type OrgScope } from '../data/tenancy';

export const ORGANIZATION_HEADER = 'x-cortex-organization';

export class CommercialUnavailableError extends ApiError {
  constructor() {
    super(
      503,
      'Commercial estimating persistence is not configured on this deployment (COMMERCIAL_DATABASE_URL is unset).',
      'COMMERCIAL_DB_UNAVAILABLE'
    );
  }
}

export function requireCommercialDb(): CommercialDb {
  if (!isCommercialDbConfigured()) {
    throw new CommercialUnavailableError();
  }
  return commercialDb();
}

/**
 * Resolve an authenticated, membership-verified scope for this request.
 *
 * `organizationId` is taken from the explicit argument, then the
 * `x-cortex-organization` header. It is never trusted on its own.
 */
export async function resolveRequestScope(
  request: Request,
  options?: { organizationId?: unknown }
): Promise<{ db: CommercialDb; scope: OrgScope }> {
  const db = requireCommercialDb();

  const token = getBearerToken(request);
  if (!token) {
    throw new ApiError(
      401,
      'A bearer token is required for commercial estimating endpoints.',
      'MISSING_TOKEN'
    );
  }

  const claims = await verifyCrmToken(token);

  const fromArgument = typeof options?.organizationId === 'string' ? options.organizationId.trim() : '';
  const fromHeader = request.headers.get(ORGANIZATION_HEADER)?.trim() || '';
  const organizationId = fromArgument || fromHeader || claims.tenantId || '';

  if (!organizationId) {
    throw new ApiError(
      400,
      `An organization is required. Send it as "${ORGANIZATION_HEADER}" or in the request body.`,
      'ORGANIZATION_REQUIRED'
    );
  }

  // resolveOrgScope performs the membership check — this is the actual gate.
  const scope = await resolveOrgScope(db, { organizationId, actor: claims.sub });

  return { db, scope };
}
