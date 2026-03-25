import { ApiError, readJson } from '@/src/crm/core/api';
import { requireCrmAuth } from '@/src/crm/core/auth';
import { crmDb } from '@/src/crm/core/crmDb';
import { jsonResponse, parseOptionalString, parseRecord, withApiHandler } from '@/src/crm/core/http';
import { toPrismaJson } from '@/src/crm/core/json';
import { requireTenantContext } from '@/src/platform/tenant-enforcement';

type IngestBody = {
  source?: unknown;
  kind?: unknown;
  region?: unknown;
  location?: unknown;
  content?: unknown;
  metadata?: unknown;
  tenantId?: unknown;
};

function normalizeText(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, 5000);
}

function normalizeLocation(value: unknown) {
  const record = parseRecord(value);
  const lat = Number(record.lat);
  const lng = Number(record.lng);
  const zip = parseOptionalString(record.zip);
  const city = parseOptionalString(record.city);

  return {
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    zip,
    city,
  };
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const auth = await requireCrmAuth(request);

    const body = await readJson<IngestBody>(request);
    const tenant = requireTenantContext(request, {
      claims: auth,
      bodyTenantId: body.tenantId,
      required: true,
    });

    const source = parseOptionalString(body.source) || 'manual';
    const kind = parseOptionalString(body.kind) || 'unclassified';
    const region = parseOptionalString(body.region) || 'us';
    const content = normalizeText(body.content);

    if (!content) {
      throw new ApiError(400, 'content is required', 'INGEST_CONTENT_REQUIRED');
    }

    const location = normalizeLocation(body.location);

    const systemLeadEmail = process.env.CRM_SYSTEM_LEAD_EMAIL || `system+${tenant.tenantId}@cortex.local`;
    const existingSystemLead = await crmDb.lead.findFirst({
      where: {
        email: systemLeadEmail,
      },
    });

    const systemLead =
      existingSystemLead ||
      (await crmDb.lead.create({
        data: {
          firstName: 'System',
          lastName: 'Ingestion',
          email: systemLeadEmail,
          tags: ['system', 'ingestion'],
          metadata: {
            managedBy: 'platform-data-ingest',
            tenantId: tenant.tenantId,
          },
        },
      }));

    const item = await crmDb.interaction.create({
      data: {
        leadId: systemLead.id,
        type: 'data_ingest_record',
        payload: toPrismaJson({
          tenantId: tenant.tenantId,
          source,
          kind,
          region,
          location,
          content,
          metadata: parseRecord(body.metadata),
          normalizedAt: new Date().toISOString(),
        }),
      },
    });

    return jsonResponse({ tenantId: tenant.tenantId, recordId: item.id, normalized: item.payload }, 201);
  });
}
