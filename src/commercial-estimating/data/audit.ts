/**
 * Audit trail for commercial estimating.
 *
 * Every write that a customer could later need to explain — who created this
 * project, when was this drawing uploaded, which revision did that estimate
 * measure — leaves a row here. Recording is best-effort by design: an audit
 * failure must not roll back the work it describes, but it is logged loudly.
 */

import type { CommercialDb } from './client';
import type { OrgScope } from './tenancy';

export type AuditAction =
  | 'project.created'
  | 'project.updated'
  | 'document.uploaded'
  | 'document.revision_added'
  | 'document.duplicate_ignored'
  | 'document.extraction_persisted'
  | 'document.extraction_failed'
  | 'access_grant.created'
  | 'access_grant.revoked';

export async function recordAuditEvent(
  db: CommercialDb,
  scope: OrgScope,
  input: {
    action: AuditAction;
    subjectType: string;
    subjectId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await db.auditEvent.create({
      data: {
        organizationId: scope.organizationId,
        actor: scope.actor,
        action: input.action,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        metadata: (input.metadata ?? {}) as object,
      },
    });
  } catch (error) {
    console.error('[commercial-estimating] failed to record audit event', {
      action: input.action,
      subjectType: input.subjectType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
