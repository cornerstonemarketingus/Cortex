import { ApiError, readJson } from '@/src/crm/core/api';
import { requireCrmAuth } from '@/src/crm/core/auth';
import { crmDb } from '@/src/crm/core/crmDb';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { toPrismaJson } from '@/src/crm/core/json';
import { requireTenantContext, recordBelongsToTenant } from '@/src/platform/tenant-enforcement';

type CalibrationBody = {
  tenantId?: unknown;
  subscriberEmail?: unknown;
  projectCategory?: unknown;
  zipCode?: unknown;
  estimatedTotal?: unknown;
  actualTotal?: unknown;
  estimateId?: unknown;
  notes?: unknown;
};

function parseMoney(value: unknown, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ApiError(400, `${field} must be a positive number`, 'CALIBRATION_VALUE_INVALID');
  }
  return Math.round(parsed * 100) / 100;
}

function safeRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function numberFrom(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const auth = await requireCrmAuth(request);
    const tenant = requireTenantContext(request, { claims: auth, required: true });

    const events = await crmDb.interaction.findMany({
      where: {
        type: 'estimating_calibration_event',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 500,
    });

    const scoped = events
      .filter((event) => recordBelongsToTenant(event.payload, tenant.tenantId))
      .map((event) => safeRecord(event.payload));

    const deltas = scoped
      .map((payload) => {
        const estimated = numberFrom(payload.estimatedTotal);
        const actual = numberFrom(payload.actualTotal);
        if (!estimated || !actual) return null;
        const absPctError = Math.abs(actual - estimated) / estimated;
        return {
          absPctError,
          projectCategory: parseOptionalString(payload.projectCategory) || 'unknown',
        };
      })
      .filter((item): item is { absPctError: number; projectCategory: string } => item !== null);

    const mape = deltas.length > 0
      ? Math.round((deltas.reduce((sum, item) => sum + item.absPctError, 0) / deltas.length) * 10000) / 100
      : null;

    return jsonResponse({
      tenantId: tenant.tenantId,
      events: scoped.length,
      mapePercent: mape,
      guidance: [
        'Target MAPE <= 8% for top categories.',
        'Feed at least 100 closed-job calibrations per major category for stable tuning.',
      ],
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const auth = await requireCrmAuth(request);
    const body = await readJson<CalibrationBody>(request);
    const tenant = requireTenantContext(request, {
      claims: auth,
      bodyTenantId: body.tenantId,
      required: true,
    });

    const subscriberEmail = parseOptionalString(body.subscriberEmail);
    if (!subscriberEmail) {
      throw new ApiError(400, 'subscriberEmail is required', 'SUBSCRIBER_EMAIL_REQUIRED');
    }

    const estimatedTotal = parseMoney(body.estimatedTotal, 'estimatedTotal');
    const actualTotal = parseMoney(body.actualTotal, 'actualTotal');

    const lead = await crmDb.lead.upsert({
      where: {
        email: subscriberEmail,
      },
      update: {
        metadata: toPrismaJson({
          tenantId: tenant.tenantId,
          calibrationParticipant: true,
        }),
      },
      create: {
        firstName: 'Calibration',
        email: subscriberEmail,
        tags: ['estimating-calibration'],
        metadata: toPrismaJson({
          tenantId: tenant.tenantId,
          calibrationParticipant: true,
        }),
      },
    });

    const event = await crmDb.interaction.create({
      data: {
        leadId: lead.id,
        type: 'estimating_calibration_event',
        payload: toPrismaJson({
          tenantId: tenant.tenantId,
          estimateId: parseOptionalString(body.estimateId),
          projectCategory: parseOptionalString(body.projectCategory) || 'general-construction',
          zipCode: parseOptionalString(body.zipCode),
          estimatedTotal,
          actualTotal,
          variancePercent: Math.round(((actualTotal - estimatedTotal) / estimatedTotal) * 10000) / 100,
          notes: parseOptionalString(body.notes),
          recordedAt: new Date().toISOString(),
        }),
      },
    });

    return jsonResponse({ ok: true, tenantId: tenant.tenantId, calibrationEventId: event.id }, 201);
  });
}
