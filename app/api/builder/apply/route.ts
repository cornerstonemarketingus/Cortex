import { ApiError, readJson } from '@/src/crm/core/api';
import { crmDb } from '@/src/crm/core/crmDb';
import { jsonResponse, parseBoolean, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { requireOperatorAccess } from '@/src/security/operatorAuth';
import { appendTaskDrafts } from '@/src/cto/taskQueue';
import { parseApprovalPayload } from '@/src/platform/approval-lifecycle';
import { recordBelongsToTenant } from '@/src/platform/tenant-enforcement';
import { requireEntitlement } from '@/src/billing/entitlements';

type ApplyBody = {
  blueprint?: unknown;
  tenantId?: unknown;
  subscriberEmail?: unknown;
  approvalId?: unknown;
  objective?: unknown;
  qualityTier?: unknown;
  dryRun?: unknown;
  runBuild?: unknown;
  runLint?: unknown;
  enqueueToCto?: unknown;
  codeChangeRequested?: unknown;
};

function parseBlueprint(value: unknown) {
  if (value === 'website' || value === 'app' || value === 'business' || value === 'game') {
    return value;
  }
  return 'app';
}

function buildFileTargets(blueprint: ReturnType<typeof parseBlueprint>) {
  if (blueprint === 'website') return ['app', 'components', 'public'];
  if (blueprint === 'business') return ['app', 'src/crm', 'components'];
  if (blueprint === 'game') return ['app/game-builder', 'src/game-builder', 'src/cortex'];
  return ['app', 'components', 'src'];
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const operator = await requireOperatorAccess(request, { adminOnly: true });
    const body = await readJson<ApplyBody>(request);

    const blueprint = parseBlueprint(body.blueprint);
    const tenantId = parseOptionalString(body.tenantId) || 'cortex-default';
    const subscriberEmail = parseOptionalString(body.subscriberEmail);
    const approvalId = parseOptionalString(body.approvalId);
    const objective = parseOptionalString(body.objective) || `Execute ${blueprint} improvement packet`;
    const qualityTier = parseOptionalString(body.qualityTier) === 'premium' ? 'premium' : 'foundation';
    const dryRun = parseBoolean(body.dryRun, true);
    const codeChangeRequested = parseBoolean(body.codeChangeRequested, true);

    if (!subscriberEmail) {
      throw new ApiError(400, 'subscriberEmail is required', 'SUBSCRIBER_EMAIL_REQUIRED');
    }
    if (codeChangeRequested && !approvalId) {
      throw new ApiError(400, 'approvalId is required', 'APPROVAL_REQUIRED');
    }

    await requireEntitlement({
      email: subscriberEmail,
      tenantId,
      feature: 'builder-premium',
    });

    if (codeChangeRequested) {
      const approval = await crmDb.interaction.findUnique({ where: { id: approvalId as string } });
      if (!approval || approval.type !== 'approval_request') {
        throw new ApiError(404, 'Approval request not found', 'APPROVAL_NOT_FOUND');
      }

      if (!recordBelongsToTenant(approval.payload, tenantId)) {
        throw new ApiError(403, 'Approval is outside tenant scope', 'TENANT_APPROVAL_FORBIDDEN');
      }

      const payload = parseApprovalPayload(approval.payload);
      if (payload.status !== 'approved') {
        throw new ApiError(409, 'Approval must be in approved state before apply.', 'APPROVAL_NOT_APPROVED');
      }
    }

    const fileTargets = buildFileTargets(blueprint);
    const commands = [
      ...(parseBoolean(body.runLint, true) ? ['npm run lint'] : []),
      ...(parseBoolean(body.runBuild, true) ? ['npm run build'] : []),
    ];

    const executionPlan = {
      operator,
      blueprint,
      qualityTier,
      objective,
      dryRun,
      codeChangeRequested,
      fileTargets,
      commands,
      guardrails: [
        'No destructive git operations',
        'Keep edits within approved file targets',
        'Run lint and build checks before marking apply complete',
      ],
    };

    let queue: { added: number; total: number } | null = null;
    if (parseBoolean(body.enqueueToCto, true)) {
      const queued = await appendTaskDrafts(
        [
          {
            type: 'feature' as const,
            description: `[Builder Apply] ${objective} (${blueprint})`,
            metadata: {
              pipeline: 'builder-apply',
              tenantId,
              subscriberEmail,
              approvalId,
              qualityTier,
              dryRun,
              fileTargets,
              commands,
            },
          },
        ],
        {
          dedupeByDescription: true,
          idPrefix: 'builder-apply',
        }
      );

      queue = {
        added: queued.added.length,
        total: queued.total,
      };
    }

    return jsonResponse(
      {
        ok: true,
        executionPlan,
        queue,
      },
      201
    );
  });
}
