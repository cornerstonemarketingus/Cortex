import { ApiError } from '@/src/crm/core/api';
import { parseOptionalString } from '@/src/crm/core/http';

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'expired'
  | 'cancelled';

export type ApprovalAction =
  | 'approve'
  | 'reject'
  | 'escalate'
  | 'expire'
  | 'cancel'
  | 'reassign';

export type ApprovalRole = 'admin' | 'agent' | 'viewer';

export type ApprovalAuditEvent = {
  at: string;
  actorId: string;
  actorRole: ApprovalRole;
  action: ApprovalAction | 'create';
  fromStatus: ApprovalStatus | null;
  toStatus: ApprovalStatus;
  note: string | null;
};

export type ApprovalEscalationStep = {
  role: ApprovalRole;
  afterMinutes: number;
};

export type ApprovalLifecyclePayload = {
  tenantId: string;
  title: string;
  status: ApprovalStatus;
  requestedBy: string;
  requestedAt: string;
  requestedRole: ApprovalRole;
  reviewerRoles: ApprovalRole[];
  assignedReviewerRole: ApprovalRole;
  slaMinutes: number;
  slaDueAt: string;
  slaBreachedAt?: string | null;
  escalationChain: ApprovalEscalationStep[];
  escalatedAt?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewerNote?: string | null;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  auditTrail: ApprovalAuditEvent[];
};

const TERMINAL_STATUSES = new Set<ApprovalStatus>(['approved', 'rejected', 'expired', 'cancelled']);

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toRole(value: unknown, fallback: ApprovalRole = 'viewer'): ApprovalRole {
  if (value === 'admin' || value === 'agent' || value === 'viewer') {
    return value;
  }
  return fallback;
}

function toStatus(value: unknown, fallback: ApprovalStatus = 'pending'): ApprovalStatus {
  if (
    value === 'pending' ||
    value === 'approved' ||
    value === 'rejected' ||
    value === 'escalated' ||
    value === 'expired' ||
    value === 'cancelled'
  ) {
    return value;
  }
  return fallback;
}

function normalizeReviewerRoles(value: unknown, fallback: ApprovalRole[]): ApprovalRole[] {
  if (!Array.isArray(value)) return fallback;
  const roles = Array.from(
    new Set(
      value
        .map((item) => toRole(item, 'viewer'))
        .filter((item): item is ApprovalRole => item === 'admin' || item === 'agent' || item === 'viewer')
    )
  );

  return roles.length > 0 ? roles : fallback;
}

function normalizeEscalationChain(value: unknown): ApprovalEscalationStep[] {
  if (!Array.isArray(value)) {
    return [
      { role: 'agent', afterMinutes: 15 },
      { role: 'admin', afterMinutes: 45 },
    ];
  }

  const parsed = value
    .map((item) => {
      const record = toRecord(item);
      const role = toRole(record.role, 'admin');
      const afterMinutesRaw = Number(record.afterMinutes);
      const afterMinutes = Number.isFinite(afterMinutesRaw)
        ? Math.max(1, Math.min(24 * 60, Math.floor(afterMinutesRaw)))
        : 30;
      return { role, afterMinutes };
    })
    .sort((a, b) => a.afterMinutes - b.afterMinutes);

  return parsed.length > 0
    ? parsed
    : [
        { role: 'agent', afterMinutes: 15 },
        { role: 'admin', afterMinutes: 45 },
      ];
}

function canRoleReview(role: ApprovalRole, requiredRoles: ApprovalRole[]): boolean {
  if (role === 'admin') return true;
  return requiredRoles.includes(role);
}

export function buildApprovalPayload(input: {
  tenantId: string;
  title: string;
  requestedBy: string;
  requestedRole: ApprovalRole;
  reviewerRoles?: unknown;
  escalationChain?: unknown;
  slaMinutes?: unknown;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  note?: string;
}): ApprovalLifecyclePayload {
  const nowIso = new Date().toISOString();
  const parsedSla = Number(input.slaMinutes);
  const slaMinutes = Number.isFinite(parsedSla)
    ? Math.max(5, Math.min(24 * 60, Math.floor(parsedSla)))
    : Number(process.env.CRM_APPROVAL_SLA_MINUTES || 30);

  const reviewerRoles = normalizeReviewerRoles(input.reviewerRoles, ['agent', 'admin']);
  const escalationChain = normalizeEscalationChain(input.escalationChain);

  const initialStatus: ApprovalStatus = 'pending';
  return {
    tenantId: input.tenantId,
    title: input.title,
    status: initialStatus,
    requestedBy: input.requestedBy,
    requestedAt: nowIso,
    requestedRole: input.requestedRole,
    reviewerRoles,
    assignedReviewerRole: reviewerRoles[0] || 'agent',
    slaMinutes,
    slaDueAt: new Date(Date.now() + slaMinutes * 60_000).toISOString(),
    slaBreachedAt: null,
    escalationChain,
    escalatedAt: null,
    reviewedBy: null,
    reviewedAt: null,
    reviewerNote: input.note || null,
    data: input.data || {},
    metadata: input.metadata || {},
    auditTrail: [
      {
        at: nowIso,
        actorId: input.requestedBy,
        actorRole: input.requestedRole,
        action: 'create',
        fromStatus: null,
        toStatus: initialStatus,
        note: input.note || null,
      },
    ],
  };
}

export function parseApprovalPayload(value: unknown): ApprovalLifecyclePayload {
  const record = toRecord(value);
  const auditTrailRaw = Array.isArray(record.auditTrail) ? record.auditTrail : [];

  return {
    tenantId: parseOptionalString(record.tenantId) || 'unknown',
    title: parseOptionalString(record.title) || 'Approval',
    status: toStatus(record.status, 'pending'),
    requestedBy: parseOptionalString(record.requestedBy) || 'unknown',
    requestedAt: parseOptionalString(record.requestedAt) || new Date(0).toISOString(),
    requestedRole: toRole(record.requestedRole, 'viewer'),
    reviewerRoles: normalizeReviewerRoles(record.reviewerRoles, ['agent', 'admin']),
    assignedReviewerRole: toRole(record.assignedReviewerRole, 'agent'),
    slaMinutes: Math.max(1, Number(record.slaMinutes) || 30),
    slaDueAt: parseOptionalString(record.slaDueAt) || new Date(Date.now() + 30 * 60_000).toISOString(),
    slaBreachedAt: parseOptionalString(record.slaBreachedAt) || null,
    escalationChain: normalizeEscalationChain(record.escalationChain),
    escalatedAt: parseOptionalString(record.escalatedAt) || null,
    reviewedBy: parseOptionalString(record.reviewedBy) || null,
    reviewedAt: parseOptionalString(record.reviewedAt) || null,
    reviewerNote: parseOptionalString(record.reviewerNote) || null,
    data: toRecord(record.data),
    metadata: toRecord(record.metadata),
    auditTrail: auditTrailRaw.map((item) => {
      const event = toRecord(item);
      return {
        at: parseOptionalString(event.at) || new Date().toISOString(),
        actorId: parseOptionalString(event.actorId) || 'unknown',
        actorRole: toRole(event.actorRole, 'viewer'),
        action: (parseOptionalString(event.action) as ApprovalAction | 'create') || 'create',
        fromStatus: toStatus(event.fromStatus, 'pending'),
        toStatus: toStatus(event.toStatus, 'pending'),
        note: parseOptionalString(event.note) || null,
      };
    }),
  };
}

export function evaluateSlaEscalation(payload: ApprovalLifecyclePayload, now = new Date()): ApprovalLifecyclePayload {
  if (TERMINAL_STATUSES.has(payload.status)) return payload;

  const nowMs = now.getTime();
  const requestedAtMs = new Date(payload.requestedAt).getTime();
  const dueAtMs = new Date(payload.slaDueAt).getTime();
  const elapsedMinutes = Math.max(0, Math.floor((nowMs - requestedAtMs) / 60_000));

  const nextEscalation = payload.escalationChain
    .slice()
    .sort((a, b) => a.afterMinutes - b.afterMinutes)
    .find((step) => step.afterMinutes <= elapsedMinutes && step.role !== payload.assignedReviewerRole);

  let status = payload.status;
  let assignedReviewerRole = payload.assignedReviewerRole;
  let escalatedAt = payload.escalatedAt;
  let slaBreachedAt = payload.slaBreachedAt;

  if (nextEscalation) {
    status = 'escalated';
    assignedReviewerRole = nextEscalation.role;
    escalatedAt = payload.escalatedAt || new Date(nowMs).toISOString();
  }

  if (nowMs > dueAtMs && !slaBreachedAt) {
    slaBreachedAt = new Date(nowMs).toISOString();
  }

  return {
    ...payload,
    status,
    assignedReviewerRole,
    escalatedAt,
    slaBreachedAt,
  };
}

export function applyApprovalAction(input: {
  payload: ApprovalLifecyclePayload;
  action: ApprovalAction;
  actorId: string;
  actorRole: ApprovalRole;
  note?: string;
  reassignedReviewerRole?: ApprovalRole;
  now?: Date;
}): ApprovalLifecyclePayload {
  const now = input.now || new Date();
  const current = evaluateSlaEscalation(input.payload, now);

  if (TERMINAL_STATUSES.has(current.status)) {
    throw new ApiError(409, `Approval is already terminal (${current.status})`, 'APPROVAL_TERMINAL');
  }

  if (!canRoleReview(input.actorRole, current.reviewerRoles)) {
    throw new ApiError(403, 'Reviewer role is not authorized for this approval', 'APPROVAL_FORBIDDEN_ROLE');
  }

  let nextStatus: ApprovalStatus;
  switch (input.action) {
    case 'approve':
      nextStatus = 'approved';
      break;
    case 'reject':
      nextStatus = 'rejected';
      break;
    case 'escalate':
      nextStatus = 'escalated';
      break;
    case 'expire':
      nextStatus = 'expired';
      break;
    case 'cancel':
      nextStatus = 'cancelled';
      break;
    case 'reassign':
      nextStatus = current.status;
      break;
    default:
      nextStatus = current.status;
  }

  const note = input.note?.trim() || null;
  const timestamp = now.toISOString();

  const reassignedRole = input.action === 'reassign'
    ? input.reassignedReviewerRole || current.assignedReviewerRole
    : current.assignedReviewerRole;

  const transitioned: ApprovalLifecyclePayload = {
    ...current,
    status: nextStatus,
    assignedReviewerRole: reassignedRole,
    reviewedBy: input.actorId,
    reviewedAt: timestamp,
    reviewerNote: note,
    escalatedAt: input.action === 'escalate' ? timestamp : current.escalatedAt,
  };

  transitioned.auditTrail = [
    ...current.auditTrail,
    {
      at: timestamp,
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: input.action,
      fromStatus: current.status,
      toStatus: transitioned.status,
      note,
    },
  ].slice(-200);

  return transitioned;
}
