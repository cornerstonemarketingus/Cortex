/**
 * Project repository. Every function takes an OrgScope and cannot be called
 * without one, so there is no code path here that reads across tenants except
 * through an explicit access grant.
 */

import { ApiError } from '@/src/crm/core/api';
import type { CommercialDb } from './client';
import { recordAuditEvent } from './audit';
import {
  assertOwnedBy,
  requireProjectAccess,
  requireWriteRole,
  scopedWhere,
  type OrgScope,
} from './tenancy';

export type CreateProjectInput = {
  name: string;
  projectNumber?: string;
  clientName?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  postalCode?: string;
};

export type ProjectSummary = {
  id: string;
  name: string;
  projectNumber: string | null;
  clientName: string | null;
  city: string | null;
  state: string | null;
  status: string;
  documentCount: number;
  sheetCount: number;
  createdAt: string;
  updatedAt: string;
};

function trimmed(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

export async function createProject(
  db: CommercialDb,
  scope: OrgScope,
  input: CreateProjectInput
): Promise<ProjectSummary> {
  requireWriteRole(scope);

  const name = trimmed(input.name);
  if (!name) {
    throw new ApiError(400, 'Project name is required.', 'PROJECT_NAME_REQUIRED');
  }

  const project = await db.project.create({
    data: {
      organizationId: scope.organizationId,
      name,
      projectNumber: trimmed(input.projectNumber),
      clientName: trimmed(input.clientName),
      addressLine: trimmed(input.addressLine),
      city: trimmed(input.city),
      state: trimmed(input.state),
      postalCode: trimmed(input.postalCode),
      createdBy: scope.actor,
    },
  });

  await recordAuditEvent(db, scope, {
    action: 'project.created',
    subjectType: 'project',
    subjectId: project.id,
    metadata: { name: project.name },
  });

  return {
    id: project.id,
    name: project.name,
    projectNumber: project.projectNumber,
    clientName: project.clientName,
    city: project.city,
    state: project.state,
    status: project.status,
    documentCount: 0,
    sheetCount: 0,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export async function listProjects(
  db: CommercialDb,
  scope: OrgScope,
  options?: { limit?: number; includeArchived?: boolean }
): Promise<ProjectSummary[]> {
  const limit = Math.max(1, Math.min(options?.limit ?? 50, 200));

  const projects = await db.project.findMany({
    where: scopedWhere(
      scope,
      options?.includeArchived ? {} : { status: { not: 'ARCHIVED' as const } }
    ),
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { _count: { select: { documents: true, sheets: true } } },
  });

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    projectNumber: project.projectNumber,
    clientName: project.clientName,
    city: project.city,
    state: project.state,
    status: project.status,
    documentCount: project._count.documents,
    sheetCount: project._count.sheets,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  }));
}

/**
 * Read one project the scope is allowed to see — by ownership, or through an
 * unexpired access grant. `owned` tells the caller which, so a shared bid-board
 * package can hide the owner's private fields.
 */
export async function getProject(
  db: CommercialDb,
  scope: OrgScope,
  projectId: string
): Promise<ProjectSummary & { owned: boolean; organizationId: string }> {
  const access = await requireProjectAccess(db, scope, projectId);

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { _count: { select: { documents: true, sheets: true } } },
  });

  if (!project) {
    throw new ApiError(404, 'Project not found.', 'PROJECT_NOT_FOUND');
  }

  // Owned projects get the post-read ownership assertion too; a granted project
  // legitimately belongs to another organization.
  if (access.owned) {
    assertOwnedBy(project, scope, 'Project');
  }

  return {
    id: project.id,
    name: project.name,
    projectNumber: project.projectNumber,
    clientName: project.clientName,
    city: project.city,
    state: project.state,
    status: project.status,
    documentCount: project._count.documents,
    sheetCount: project._count.sheets,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    owned: access.owned,
    organizationId: project.organizationId,
  };
}
