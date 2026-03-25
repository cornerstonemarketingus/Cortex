import { ApiError } from '@/src/crm/core/api';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { AVAILABLE_INTEGRATIONS, generateAutomationBlueprint } from '@/src/builder/automation-blueprints';
import { requireEntitlement } from '@/src/billing/entitlements';

export const runtime = 'nodejs';

type AutomationPlanBody = {
  prompt?: unknown;
  blueprint?: unknown;
  selectedIntegrations?: unknown;
  qualityTier?: unknown;
  subscriberEmail?: unknown;
  tenantId?: unknown;
  brandDna?: unknown;
};

async function parseBody(request: Request): Promise<AutomationPlanBody> {
  const raw = await request.text();
  if (!raw.trim()) {
    throw new ApiError(400, 'Prompt is required.', 'MISSING_BODY');
  }

  try {
    return JSON.parse(raw) as AutomationPlanBody;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.', 'INVALID_JSON');
  }
}

function parseSelectedIntegrations(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0)
    .slice(0, 12);
}

export async function GET() {
  return withApiHandler(async () => {
    return jsonResponse({
      examples: [
        'Set up funnels, CRM pipelines, and AI follow-up for a local contractor business.',
        'Create automation logic for SaaS onboarding, monthly billing, and retention loops.',
        'Build reusable snapshots, pricing tiers, and Zapier + webhook integrations for agency clients.',
      ],
      integrations: AVAILABLE_INTEGRATIONS,
      qualityTiers: ['foundation', 'premium'],
      notes:
        'POST your prompt to generate full automation blueprints including workflows, funnels, CRM pipelines, AI layer, snapshots, pricing tiers, subscriptions, and client-account model.',
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await parseBody(request);
    const prompt = parseOptionalString(body.prompt);
    const qualityTier = parseOptionalString(body.qualityTier) === 'premium' ? 'premium' : 'foundation';
    const subscriberEmail = parseOptionalString(body.subscriberEmail);
    const tenantId = parseOptionalString(body.tenantId) || 'cortex-default';

    if (!prompt) {
      throw new ApiError(400, 'Prompt is required.', 'PROMPT_REQUIRED');
    }

    if (qualityTier === 'premium') {
      if (!subscriberEmail) {
        throw new ApiError(400, 'subscriberEmail is required for premium blueprint mode', 'SUBSCRIBER_EMAIL_REQUIRED');
      }

      await requireEntitlement({
        email: subscriberEmail,
        tenantId,
        feature: 'builder-premium',
      });
    }

    const plan = generateAutomationBlueprint({
      prompt,
      blueprint: parseOptionalString(body.blueprint),
      selectedIntegrations: parseSelectedIntegrations(body.selectedIntegrations),
      qualityTier,
      brandDna: body.brandDna,
    });

    return jsonResponse(
      {
        plan,
        qualityTier,
      },
      201
    );
  });
}
