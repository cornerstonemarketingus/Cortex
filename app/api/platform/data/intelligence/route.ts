import { requireCrmAuth } from '@/src/crm/core/auth';
import { crmDb } from '@/src/crm/core/crmDb';
import { jsonResponse, parseLimit, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { generateLocalDataIntelligenceReport } from '@/src/platform/local-data-intelligence';
import { recordBelongsToTenant, requireTenantContext } from '@/src/platform/tenant-enforcement';

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const auth = await requireCrmAuth(request);
    const tenant = requireTenantContext(request, { claims: auth, required: true });
    const limit = parseLimit(request, 500, 50, 2000);
    const search = parseOptionalString(new URL(request.url).searchParams.get('search'));

    const records = await crmDb.interaction.findMany({
      where: {
        type: 'data_ingest_record',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    const scoped = records
      .filter((item) => recordBelongsToTenant(item.payload, tenant.tenantId))
      .map((item) => ({
        id: item.id,
        createdAt: item.createdAt,
        payload: asRecord(item.payload),
      }));

    const report = generateLocalDataIntelligenceReport({
      tenantId: tenant.tenantId,
      records: scoped,
      search,
    });

    return jsonResponse({ report });
  });
}
