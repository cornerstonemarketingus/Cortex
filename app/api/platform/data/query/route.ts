import { requireCrmAuth } from '@/src/crm/core/auth';
import { crmDb } from '@/src/crm/core/crmDb';
import { jsonResponse, parseLimit, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { recordBelongsToTenant, requireTenantContext } from '@/src/platform/tenant-enforcement';

type GeoPoint = { lat: number; lng: number };

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineMiles(a: GeoPoint, b: GeoPoint) {
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(h));
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const auth = await requireCrmAuth(request);
    const tenant = requireTenantContext(request, { claims: auth, required: true });

    const url = new URL(request.url);
    const limit = parseLimit(request, 50, 1, 300);
    const search = parseOptionalString(url.searchParams.get('search'))?.toLowerCase();
    const kind = parseOptionalString(url.searchParams.get('kind'))?.toLowerCase();
    const zip = parseOptionalString(url.searchParams.get('zip'))?.toLowerCase();
    const lat = Number(url.searchParams.get('lat'));
    const lng = Number(url.searchParams.get('lng'));
    const radiusMiles = Number(url.searchParams.get('radiusMiles'));

    const records = await crmDb.interaction.findMany({
      where: {
        type: 'data_ingest_record',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 800,
    });

    const geoFilterEnabled = Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(radiusMiles);
    const center = geoFilterEnabled ? { lat, lng } : null;

    const filtered = records
      .map((item) => {
        const payload = asRecord(item.payload);
        const itemKind = String(payload.kind || '').toLowerCase();
        const itemContent = String(payload.content || '');
        const location = asRecord(payload.location);
        const itemZip = String(location.zip || '').toLowerCase();
        const itemLat = Number(location.lat);
        const itemLng = Number(location.lng);

        let distanceMiles: number | null = null;
        if (geoFilterEnabled && Number.isFinite(itemLat) && Number.isFinite(itemLng) && center) {
          distanceMiles = haversineMiles(center, { lat: itemLat, lng: itemLng });
        }

        return {
          id: item.id,
          createdAt: item.createdAt,
          payload,
          kind: itemKind,
          content: itemContent,
          zip: itemZip,
          distanceMiles,
        };
      })
      .filter((item) => {
        if (!recordBelongsToTenant(item.payload, tenant.tenantId)) return false;
        if (kind && item.kind !== kind) return false;
        if (zip && item.zip !== zip) return false;
        if (search && !item.content.toLowerCase().includes(search)) return false;
        if (geoFilterEnabled && item.distanceMiles !== null && item.distanceMiles > radiusMiles) return false;
        if (geoFilterEnabled && item.distanceMiles === null) return false;
        return true;
      })
      .slice(0, limit);

    return jsonResponse({
      tenantId: tenant.tenantId,
      count: filtered.length,
      items: filtered,
    });
  });
}
