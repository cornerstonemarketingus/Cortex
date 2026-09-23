/**
 * Organization scoping for commercial estimating.
 *
 * The blueprint requires tenant isolation enforced independently of any AI
 * layer. The weak version of that is a helper you remember to call; the strong
 * version — what this module implements — makes the unscoped query hard to
 * write in the first place:
 *
 *  - An `OrgScope` is a branded type. It cannot be constructed from a raw
 *    string, only by `resolveOrgScope()`, which verifies membership.
 *  - Every repository function takes a scope and merges `organizationId` into
 *    its `where` clause.
 *  - Reads are additionally checked after the fact by `assertOwnedBy`, so a
 *    query that loses its filter through a refactor fails loudly instead of
 *    leaking.
 *
 * Cross-organization reads are possible only through an explicit
 * `ProjectAccessGrant`, which is what makes shared bid-board packages workable
 * without exposing a competitor's private estimate.
 */

import { ApiError } from '@/src/crm/core/api';
import type { CommercialDb } from './client';

declare const orgScopeBrand: unique symbol;

export type OrgScope = {
  readonly organizationId: string;
  readonly actor: string;
  readonly role: 'OWNER' | 'ADMIN' | 'ESTIMATOR' | 'VIEWER';
  readonly [orgScopeBrand]: true;
};

export class TenantAccessError extends ApiError {
  constructor(message: string, code = 'TENANT_ACCESS_DENIED') {
    super(403, message, code);
    this.name = 'TenantAccessError';
  }
}

function brand(scope: Omit<OrgScope, typeof orgScopeBrand>): OrgScope {
  return scope as OrgScope;
}

/**
 * The only way to obtain an OrgScope. Verifies the actor is a member of the
 * organization; throws otherwise. Never trust an organizationId that arrived
 * in a request body without passing it through here.
 */
export async function resolveOrgScope(
  db: CommercialDb,
  params: { organizationId: string; actor: string }
): Promise<OrgScope> {
  const organizationId = params.organizationId?.trim();
  const actor = params.actor?.trim();

  if (!organizationId) {
    throw new ApiError(400, 'organizationId is required.', 'ORGANIZATION_REQUIRED');
  }
  if (!actor) {
    throw new ApiError(401, 'An authenticated actor is required.', 'ACTOR_REQUIRED');
  }

  const membership = await db.organizationMember.findUnique({
    where: { organizationId_userRef: { organizationId, userRef: actor } },
    select: { role: true },
  });

  if (!membership) {
    // Deliberately identical to the "no such organization" case: whether an
    // organization exists is itself information a non-member should not learn.
    throw new TenantAccessError('No access to this organization.', 'ORGANIZATION_ACCESS_DENIED');
  }

  return brand({ organizationId, actor, role: membership.role });
}

/** Merge the scope's organizationId into a where clause. */
export function scopedWhere<T extends Record<string, unknown>>(
  scope: OrgScope,
  where: T
): T & { organizationId: string } {
  return { ...where, organizationId: scope.organizationId };
}

/**
 * Post-read assertion. Cheap, and it turns a filter lost in a refactor into a
 * loud failure rather than a silent cross-tenant read.
 */
export function assertOwnedBy<T extends { organizationId: string }>(
  record: T | null,
  scope: OrgScope,
  subject: string
): T {
  if (!record) {
    throw new ApiError(404, `${subject} not found.`, 'NOT_FOUND');
  }
  if (record.organizationId !== scope.organizationId) {
    throw new TenantAccessError(`${subject} belongs to another organization.`);
  }
  return record;
}

export type ProjectAccess = {
  projectId: string;
  /** True when the scope's organization owns the project outright. */
  owned: boolean;
  accessLevel: 'OWNER' | 'READ_DOCUMENTS' | 'READ_TAKEOFF' | 'FULL';
};

/**
 * Resolve how (or whether) a scope may reach a project: by ownership, or by an
 * unexpired access grant. Everything that reads project data goes through here.
 */
export async function requireProjectAccess(
  db: CommercialDb,
  scope: OrgScope,
  projectId: string
): Promise<ProjectAccess> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, organizationId: true },
  });

  if (!project) {
    throw new ApiError(404, 'Project not found.', 'PROJECT_NOT_FOUND');
  }

  if (project.organizationId === scope.organizationId) {
    return { projectId, owned: true, accessLevel: 'OWNER' };
  }

  const grant = await db.projectAccessGrant.findUnique({
    where: { projectId_organizationId: { projectId, organizationId: scope.organizationId } },
    select: { accessLevel: true, expiresAt: true },
  });

  if (!grant) {
    // Same shape as "not found" so project existence is not probeable.
    throw new ApiError(404, 'Project not found.', 'PROJECT_NOT_FOUND');
  }

  if (grant.expiresAt && grant.expiresAt.getTime() <= Date.now()) {
    throw new TenantAccessError('Access to this project has expired.', 'PROJECT_ACCESS_EXPIRED');
  }

  return { projectId, owned: false, accessLevel: grant.accessLevel };
}

const WRITE_ROLES = new Set<OrgScope['role']>(['OWNER', 'ADMIN', 'ESTIMATOR']);

/** Viewers may read; they may not create projects or upload documents. */
export function requireWriteRole(scope: OrgScope): void {
  if (!WRITE_ROLES.has(scope.role)) {
    throw new TenantAccessError(
      `Role ${scope.role} cannot modify commercial estimating data.`,
      'INSUFFICIENT_ROLE'
    );
  }
}
