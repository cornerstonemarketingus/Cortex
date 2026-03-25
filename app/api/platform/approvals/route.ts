import { ApiError, readJson } from '@/src/crm/core/api';
import { requireCrmAuth } from '@/src/crm/core/auth';
import { crmDb } from '@/src/crm/core/crmDb';
import { jsonResponse, parseLimit, parseOptionalString, parseRecord, withApiHandler } from '@/src/crm/core/http';
import { toPrismaJson } from '@/src/crm/core/json';
import {
  applyApprovalAction,
  buildApprovalPayload,
  evaluateSlaEscalation,
  parseApprovalPayload,
  type ApprovalAction,
  type ApprovalRole,
} from '@/src/platform/approval-lifecycle';
import { requireTenantContext, recordBelongsToTenant } from '@/src/platform/tenant-enforcement';

type CreateApprovalBody = {
  leadId?: unknown;
  title?: unknown;
  payload?: unknown;
  reviewerRoles?: unknown;
  escalationChain?: unknown;
  slaMinutes?: unknown;
  tenantId?: unknown;
};

type UpdateApprovalBody = {
  approvalId?: unknown;
  decision?: unknown;
  action?: unknown;
  reviewerNote?: unknown;
  assignedReviewerRole?: unknown;
  tenantId?: unknown;
};

function toApprovalRole(value: unknown, fallback: ApprovalRole = 'viewer'): ApprovalRole {
  if (value === 'admin' || value === 'agent' || value === 'viewer') {
    return value;
  }
  return fallback;
}

function toApprovalAction(value: unknown): ApprovalAction | null {
  if (value === 'approve' || value === 'reject' || value === 'escalate' || value === 'expire' || value === 'cancel' || value === 'reassign') {
    return value;
  }
  return null;
}

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const auth = await requireCrmAuth(request);
    const tenant = requireTenantContext(request, { claims: auth, required: true });
    const limit = parseLimit(request, 50, 1, 200);
    const leadId = parseOptionalString(new URL(request.url).searchParams.get('leadId'));

    const items = await crmDb.interaction.findMany({
      where: {
        type: 'approval_request',
        ...(leadId ? { leadId } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.max(limit * 3, limit),
    });

    const scoped = items
      .filter((item) => recordBelongsToTenant(item.payload, tenant.tenantId))
      .map((item) => {
        const payload = evaluateSlaEscalation(parseApprovalPayload(item.payload));
        return {
          ...item,
          payload,
        };
      })
      .slice(0, limit);

    return jsonResponse({ approvals: scoped, count: scoped.length, tenantId: tenant.tenantId });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const auth = await requireCrmAuth(request);
    const body = await readJson<CreateApprovalBody>(request);
    const tenant = requireTenantContext(request, {
      claims: auth,
      bodyTenantId: body.tenantId,
      required: true,
    });

    const leadId = parseOptionalString(body.leadId);
    const title = parseOptionalString(body.title);
    if (!leadId || !title) {
      throw new ApiError(400, 'leadId and title are required', 'APPROVAL_INPUT_REQUIRED');
    }

    const lead = await crmDb.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new ApiError(404, 'Lead not found', 'LEAD_NOT_FOUND');
    }

    if (!recordBelongsToTenant(lead.metadata, tenant.tenantId)) {
      throw new ApiError(403, 'Lead does not belong to tenant', 'TENANT_LEAD_FORBIDDEN');
    }

    const lifecyclePayload = buildApprovalPayload({
      tenantId: tenant.tenantId,
      title,
      requestedBy: auth.sub,
      requestedRole: toApprovalRole(auth.role, 'viewer'),
      reviewerRoles: body.reviewerRoles,
      escalationChain: body.escalationChain,
      slaMinutes: body.slaMinutes,
      data: parseRecord(body.payload),
      metadata: {
        leadId,
      },
    });

    const item = await crmDb.interaction.create({
      data: {
        leadId,
        type: 'approval_request',
        payload: toPrismaJson(lifecyclePayload),
      },
    });

    return jsonResponse({ approval: item, tenantId: tenant.tenantId }, 201);
  });
}

export async function PATCH(request: Request) {
  return withApiHandler(async () => {
    const auth = await requireCrmAuth(request);
    const body = await readJson<UpdateApprovalBody>(request);
    const tenant = requireTenantContext(request, {
      claims: auth,
      bodyTenantId: body.tenantId,
      required: true,
    });

    const approvalId = parseOptionalString(body.approvalId);
    const decision = parseOptionalString(body.decision)?.toLowerCase();
    const action = toApprovalAction(parseOptionalString(body.action)?.toLowerCase()) ||
      (decision === 'approved'
        ? 'approve'
        : decision === 'rejected'
        ? 'reject'
        : null);

    if (!approvalId || !action) {
      throw new ApiError(
        400,
        'approvalId and action=approve|reject|escalate|expire|cancel|reassign (or decision=approved|rejected) are required',
        'APPROVAL_DECISION_REQUIRED'
      );
    }

    const existing = await crmDb.interaction.findUnique({ where: { id: approvalId } });
    if (!existing || existing.type !== 'approval_request') {
      throw new ApiError(404, 'Approval request not found', 'APPROVAL_NOT_FOUND');
    }

    if (!recordBelongsToTenant(existing.payload, tenant.tenantId)) {
      throw new ApiError(403, 'Approval request is outside tenant scope', 'TENANT_APPROVAL_FORBIDDEN');
    }

    const basePayload = parseApprovalPayload(existing.payload);
    const next = applyApprovalAction({
      payload: basePayload,
      action,
      actorId: auth.sub,
      actorRole: toApprovalRole(auth.role, 'viewer'),
      note: parseOptionalString(body.reviewerNote),
      reassignedReviewerRole: toApprovalRole(body.assignedReviewerRole, basePayload.assignedReviewerRole),
    });

    const updated = await crmDb.interaction.update({
      where: { id: approvalId },
      data: {
        payload: toPrismaJson(next),
      },
    });

    await crmDb.interaction.create({
      data: {
        leadId: existing.leadId,
        type: 'approval_transition',
        payload: toPrismaJson({
          tenantId: tenant.tenantId,
          approvalId: existing.id,
          action,
          fromStatus: basePayload.status,
          toStatus: next.status,
          actorId: auth.sub,
          actorRole: auth.role,
          at: new Date().toISOString(),
        }),
      },
    });

    return jsonResponse({ approval: updated, tenantId: tenant.tenantId });
  });
}
