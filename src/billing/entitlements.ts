import { ApiError } from '@/src/crm/core/api';
import { getSubscriptionSnapshot } from '@/src/billing/subscription.service';
import { getTenantConfigById, type TenantConfig } from '@/src/crm/modules/platform/tenant-controls';

export type EntitlementFeature =
  | 'local-data-intelligence'
  | 'blueprint-ai-v1'
  | 'builder-premium'
  | 'payments-entitlements'
  | 'event-webhook'
  | 'subuser-api'
  | 'universal-links'
  | 'segment-connector'
  | 'transactional-templates'
  | 'api-key-permissions'
  | 'engagement-statistics'
  | 'deliverability-insights'
  | 'segmentation'
  | 'automation'
  | 'send-scheduling'
  | 'signup-forms'
  | 'design-code-editors'
  | 'ab-testing'
  | 'responsive-templates'
  | 'email-testing'
  | 'content-personalization'
  | 'security-2fa'
  | 'ip-access-management'
  | 'gdpr-compliance'
  | 'tls-encryption'
  | 'soc2-type2';

export type EntitlementSnapshot = {
  email: string;
  active: boolean;
  tier: 'starter' | 'growth' | 'pro' | 'unified' | null;
  tenantId: string;
  teammatesLimit: number;
  promptCreditsRemaining: number;
  featureFlags: Record<EntitlementFeature, boolean>;
  notes: string[];
};

const FEATURE_SET_BASE: EntitlementFeature[] = [
  'payments-entitlements',
  'blueprint-ai-v1',
  'local-data-intelligence',
  'universal-links',
  'automation',
  'signup-forms',
  'design-code-editors',
  'responsive-templates',
  'tls-encryption',
  'gdpr-compliance',
];

const FEATURE_SET_GROWTH: EntitlementFeature[] = [
  ...FEATURE_SET_BASE,
  'event-webhook',
  'subuser-api',
  'segment-connector',
  'transactional-templates',
  'api-key-permissions',
  'engagement-statistics',
  'deliverability-insights',
  'segmentation',
  'send-scheduling',
  'ab-testing',
  'email-testing',
  'content-personalization',
  'security-2fa',
  'ip-access-management',
  'builder-premium',
];

const FEATURE_SET_PRO: EntitlementFeature[] = [
  ...FEATURE_SET_GROWTH,
  'soc2-type2',
];

function emptyFlags(): Record<EntitlementFeature, boolean> {
  return {
    'local-data-intelligence': false,
    'blueprint-ai-v1': false,
    'builder-premium': false,
    'payments-entitlements': false,
    'event-webhook': false,
    'subuser-api': false,
    'universal-links': false,
    'segment-connector': false,
    'transactional-templates': false,
    'api-key-permissions': false,
    'engagement-statistics': false,
    'deliverability-insights': false,
    segmentation: false,
    automation: false,
    'send-scheduling': false,
    'signup-forms': false,
    'design-code-editors': false,
    'ab-testing': false,
    'responsive-templates': false,
    'email-testing': false,
    'content-personalization': false,
    'security-2fa': false,
    'ip-access-management': false,
    'gdpr-compliance': false,
    'tls-encryption': false,
    'soc2-type2': false,
  };
}

function flagsFromFeatures(features: EntitlementFeature[]): Record<EntitlementFeature, boolean> {
  const flags = emptyFlags();
  for (const feature of features) {
    flags[feature] = true;
  }
  return flags;
}

function resolveTenantBuilderFeature(config: TenantConfig | null) {
  if (!config) return true;
  return config.features.websiteBuilder || config.features.appBuilder || config.features.gameBuilder;
}

export async function resolveEntitlements(email: string, tenantId = 'cortex-default'): Promise<EntitlementSnapshot> {
  const snapshot = await getSubscriptionSnapshot(email);
  const tenant = getTenantConfigById(tenantId);

  const notes: string[] = [];
  if (!snapshot.active) {
    notes.push('Subscription inactive: premium feature execution is blocked.');
  }

  const tier = snapshot.tier;
  const tierFeatures =
    tier === 'starter'
      ? FEATURE_SET_BASE
      : tier === 'growth' || tier === 'unified'
      ? FEATURE_SET_GROWTH
      : tier === 'pro'
      ? FEATURE_SET_PRO
      : [];

  const featureFlags = flagsFromFeatures(tierFeatures);

  if (!resolveTenantBuilderFeature(tenant)) {
    featureFlags['builder-premium'] = false;
    featureFlags['blueprint-ai-v1'] = false;
    notes.push('Tenant policy disabled builder feature set.');
  }

  const teammatesLimit =
    tier === 'starter' || tier === null
      ? 1
      : tier === 'growth'
      ? 10
      : 1000;

  return {
    email: snapshot.email,
    active: snapshot.active,
    tier,
    tenantId,
    teammatesLimit,
    promptCreditsRemaining: snapshot.remainingCredits,
    featureFlags,
    notes,
  };
}

export async function requireEntitlement(params: {
  email: string;
  tenantId: string;
  feature: EntitlementFeature;
}): Promise<EntitlementSnapshot> {
  const entitlements = await resolveEntitlements(params.email, params.tenantId);

  if (!entitlements.active) {
    throw new ApiError(402, 'Active paid subscription required', 'SUBSCRIPTION_REQUIRED');
  }

  if (!entitlements.featureFlags[params.feature]) {
    throw new ApiError(
      403,
      `Current tier does not include required feature: ${params.feature}`,
      'FEATURE_NOT_ENTITLED',
      {
        feature: params.feature,
        tier: entitlements.tier,
      }
    );
  }

  return entitlements;
}
