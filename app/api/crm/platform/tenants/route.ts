import { ApiError, readJson } from '@/src/crm/core/api';
import { jsonResponse, parseBoolean, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import {
  listTenantConfigs,
  resolveTenantByHost,
  upsertTenantConfig,
  type UpsertTenantInput,
} from '@/src/crm/modules/platform';
import { requireOperatorAccess } from '@/src/security/operatorAuth';

export const runtime = 'nodejs';

type TenantBody = {
  action?: unknown;
  host?: unknown;
  tenant?: unknown;
};

function parseTenantInput(value: unknown): UpsertTenantInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'tenant object is required', 'TENANT_REQUIRED');
  }

  const tenant = value as Record<string, unknown>;
  const id = parseOptionalString(typeof tenant.id === 'string' ? tenant.id : undefined);
  if (!id) {
    throw new ApiError(400, 'tenant.id is required', 'TENANT_ID_REQUIRED');
  }

  const brandingRaw = tenant.branding;
  if (!brandingRaw || typeof brandingRaw !== 'object' || Array.isArray(brandingRaw)) {
    throw new ApiError(400, 'tenant.branding is required', 'TENANT_BRANDING_REQUIRED');
  }

  const branding = brandingRaw as Record<string, unknown>;

  const displayName = parseOptionalString(
    typeof branding.displayName === 'string' ? branding.displayName : undefined
  );
  const subdomain = parseOptionalString(typeof branding.subdomain === 'string' ? branding.subdomain : undefined);
  const supportEmail = parseOptionalString(
    typeof branding.supportEmail === 'string' ? branding.supportEmail : undefined
  );

  if (!displayName || !subdomain || !supportEmail) {
    throw new ApiError(
      400,
      'tenant.branding.displayName, tenant.branding.subdomain, and tenant.branding.supportEmail are required',
      'TENANT_BRANDING_FIELDS_REQUIRED'
    );
  }

  const featuresRaw =
    tenant.features && typeof tenant.features === 'object' && !Array.isArray(tenant.features)
      ? (tenant.features as Record<string, unknown>)
      : undefined;

  const guardrailsRaw =
    tenant.guardrails && typeof tenant.guardrails === 'object' && !Array.isArray(tenant.guardrails)
      ? (tenant.guardrails as Record<string, unknown>)
      : undefined;

  return {
    id,
    branding: {
      displayName,
      subdomain,
      supportEmail,
      primaryColor: parseOptionalString(
        typeof branding.primaryColor === 'string' ? branding.primaryColor : undefined
      ),
      accentColor: parseOptionalString(typeof branding.accentColor === 'string' ? branding.accentColor : undefined),
      logoUrl: parseOptionalString(typeof branding.logoUrl === 'string' ? branding.logoUrl : undefined),
      customDomain: parseOptionalString(
        typeof branding.customDomain === 'string' ? branding.customDomain : undefined
      ),
    },
    features: featuresRaw
      ? {
          websiteBuilder: parseBoolean(featuresRaw.websiteBuilder, true),
          appBuilder: parseBoolean(featuresRaw.appBuilder, true),
          gameBuilder: parseBoolean(featuresRaw.gameBuilder, true),
          aiAutomation: parseBoolean(featuresRaw.aiAutomation, true),
          marketplace: parseBoolean(featuresRaw.marketplace, true),
          socialConnectors: parseBoolean(featuresRaw.socialConnectors, true),
          voiceAi: parseBoolean(featuresRaw.voiceAi, true),
        }
      : undefined,
    guardrails: guardrailsRaw
      ? {
          requireHumanToken: parseBoolean(guardrailsRaw.requireHumanToken, true),
          dryRunDefault: parseBoolean(guardrailsRaw.dryRunDefault, true),
          maxApplyRiskScore: Number(guardrailsRaw.maxApplyRiskScore),
          rollbackPlanRequiredScore: Number(guardrailsRaw.rollbackPlanRequiredScore),
        }
      : undefined,
  };
}

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const url = new URL(request.url);
    const host = parseOptionalString(url.searchParams.get('host'));

    if (host) {
      const tenant = resolveTenantByHost(host);
      return jsonResponse({
        host,
        tenant,
      });
    }

    await requireOperatorAccess(request, { adminOnly: true });
    const tenants = listTenantConfigs();

    return jsonResponse({
      tenants,
      count: tenants.length,
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await requireOperatorAccess(request, { adminOnly: true });

    const body = await readJson<TenantBody>(request);
    const action = parseOptionalString(typeof body.action === 'string' ? body.action : undefined) || 'upsert';

    if (action === 'resolve') {
      const host = parseOptionalString(typeof body.host === 'string' ? body.host : undefined);
      if (!host) {
        return jsonResponse({ error: 'host is required for resolve action' }, 400);
      }

      const tenant = resolveTenantByHost(host);
      return jsonResponse({
        host,
        tenant,
      });
    }

    if (action !== 'upsert') {
      return jsonResponse({ error: 'Unsupported action. Use upsert or resolve.' }, 400);
    }

    const tenantInput = parseTenantInput(body.tenant);
    const tenant = upsertTenantConfig(tenantInput);

    return jsonResponse({ tenant }, 201);
  });
}
