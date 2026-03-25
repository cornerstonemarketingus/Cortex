export type TenantFeatureFlags = {
  websiteBuilder: boolean;
  appBuilder: boolean;
  gameBuilder: boolean;
  aiAutomation: boolean;
  marketplace: boolean;
  socialConnectors: boolean;
  voiceAi: boolean;
};

export type TenantGuardrailPolicy = {
  requireHumanToken: boolean;
  maxApplyRiskScore: number;
  rollbackPlanRequiredScore: number;
  dryRunDefault: boolean;
};

export type TenantBranding = {
  displayName: string;
  subdomain: string;
  supportEmail: string;
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
  customDomain?: string;
};

export type TenantConfig = {
  id: string;
  branding: TenantBranding;
  features: TenantFeatureFlags;
  guardrails: TenantGuardrailPolicy;
  updatedAt: string;
};

export type UpsertTenantInput = {
  id: string;
  branding: Partial<TenantBranding> & {
    displayName: string;
    subdomain: string;
    supportEmail: string;
  };
  features?: Partial<TenantFeatureFlags>;
  guardrails?: Partial<TenantGuardrailPolicy>;
};

const defaultTenantConfigs: TenantConfig[] = [
  {
    id: 'cortex-default',
    branding: {
      displayName: 'Cortex Platform',
      subdomain: 'app',
      supportEmail: 'support@cortex.local',
      primaryColor: '#0ea5e9',
      accentColor: '#22d3ee',
    },
    features: {
      websiteBuilder: true,
      appBuilder: true,
      gameBuilder: true,
      aiAutomation: true,
      marketplace: true,
      socialConnectors: true,
      voiceAi: true,
    },
    guardrails: {
      requireHumanToken: true,
      maxApplyRiskScore: 74,
      rollbackPlanRequiredScore: 55,
      dryRunDefault: true,
    },
    updatedAt: new Date().toISOString(),
  },
];

const tenantStore = new Map<string, TenantConfig>(
  defaultTenantConfigs.map((tenant) => [tenant.id, tenant])
);

function sanitizeTenantId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'tenant';
}

function normalizeColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

function normalizeEmail(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const trimmed = value.trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

function normalizeSubdomain(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || fallback;
}

function normalizeBranding(input: UpsertTenantInput['branding'], fallback: TenantBranding): TenantBranding {
  return {
    displayName: input.displayName?.trim() || fallback.displayName,
    subdomain: normalizeSubdomain(input.subdomain, fallback.subdomain),
    supportEmail: normalizeEmail(input.supportEmail, fallback.supportEmail),
    primaryColor: normalizeColor(input.primaryColor, fallback.primaryColor),
    accentColor: normalizeColor(input.accentColor, fallback.accentColor),
    logoUrl: input.logoUrl?.trim() || fallback.logoUrl,
    customDomain: input.customDomain?.trim().toLowerCase() || fallback.customDomain,
  };
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function asNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function normalizeFeatures(
  input: Partial<TenantFeatureFlags> | undefined,
  fallback: TenantFeatureFlags
): TenantFeatureFlags {
  return {
    websiteBuilder: asBoolean(input?.websiteBuilder, fallback.websiteBuilder),
    appBuilder: asBoolean(input?.appBuilder, fallback.appBuilder),
    gameBuilder: asBoolean(input?.gameBuilder, fallback.gameBuilder),
    aiAutomation: asBoolean(input?.aiAutomation, fallback.aiAutomation),
    marketplace: asBoolean(input?.marketplace, fallback.marketplace),
    socialConnectors: asBoolean(input?.socialConnectors, fallback.socialConnectors),
    voiceAi: asBoolean(input?.voiceAi, fallback.voiceAi),
  };
}

function normalizeGuardrails(
  input: Partial<TenantGuardrailPolicy> | undefined,
  fallback: TenantGuardrailPolicy
): TenantGuardrailPolicy {
  return {
    requireHumanToken: asBoolean(input?.requireHumanToken, fallback.requireHumanToken),
    maxApplyRiskScore: asNumber(input?.maxApplyRiskScore, fallback.maxApplyRiskScore, 30, 95),
    rollbackPlanRequiredScore: asNumber(
      input?.rollbackPlanRequiredScore,
      fallback.rollbackPlanRequiredScore,
      25,
      90
    ),
    dryRunDefault: asBoolean(input?.dryRunDefault, fallback.dryRunDefault),
  };
}

function loadEnvOverrides() {
  const raw = process.env.WHITE_LABEL_TENANTS_JSON;
  if (!raw || raw.trim().length === 0) {
    return;
  }

  try {
    const parsed = JSON.parse(raw) as Array<UpsertTenantInput>;
    if (!Array.isArray(parsed)) {
      return;
    }

    for (const tenant of parsed) {
      if (!tenant || typeof tenant !== 'object') continue;
      if (!tenant.id || !tenant.branding?.displayName || !tenant.branding?.subdomain || !tenant.branding?.supportEmail) {
        continue;
      }
      upsertTenantConfig(tenant);
    }
  } catch {
    // Ignore malformed optional env overrides.
  }
}

loadEnvOverrides();

export function listTenantConfigs(): TenantConfig[] {
  return Array.from(tenantStore.values()).sort((a, b) => a.id.localeCompare(b.id));
}

export function getTenantConfigById(id: string): TenantConfig | null {
  const normalized = sanitizeTenantId(id);
  return tenantStore.get(normalized) || null;
}

export function resolveTenantByHost(host?: string): TenantConfig {
  const normalizedHost = host?.trim().toLowerCase();
  const tenants = listTenantConfigs();

  if (normalizedHost) {
    const byCustomDomain = tenants.find((tenant) => tenant.branding.customDomain === normalizedHost);
    if (byCustomDomain) {
      return byCustomDomain;
    }

    const hostSubdomain = normalizedHost.split('.')[0];
    const bySubdomain = tenants.find((tenant) => tenant.branding.subdomain === hostSubdomain);
    if (bySubdomain) {
      return bySubdomain;
    }
  }

  return tenantStore.get('cortex-default') || defaultTenantConfigs[0];
}

export function upsertTenantConfig(input: UpsertTenantInput): TenantConfig {
  const id = sanitizeTenantId(input.id);
  const existing = tenantStore.get(id) || tenantStore.get('cortex-default') || defaultTenantConfigs[0];

  const next: TenantConfig = {
    id,
    branding: normalizeBranding(input.branding, existing.branding),
    features: normalizeFeatures(input.features, existing.features),
    guardrails: normalizeGuardrails(input.guardrails, existing.guardrails),
    updatedAt: new Date().toISOString(),
  };

  tenantStore.set(id, next);
  return next;
}
