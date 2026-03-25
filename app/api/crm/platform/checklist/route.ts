import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { getMarketplaceIntegrations } from '@/src/marketplace/revenue-marketplace';
import {
  buildV1CompletionChecklist,
  type ChecklistScope,
} from '@/src/crm/modules/platform';

export const runtime = 'nodejs';

type FeatureReadiness = {
  id: string;
  label: string;
  status: 'complete' | 'in-progress';
  notes: string;
};

function parseScope(value?: string): ChecklistScope {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'builder' || normalized === 'crm' || normalized === 'all') {
    return normalized;
  }
  return 'all';
}

function getFeatureReadiness(): FeatureReadiness[] {
  return [
    {
      id: 'website-builder-live-preview',
      label: 'Website Builder live sandbox preview',
      status: 'complete',
      notes: 'Plan-to-preview flow and in-page sandbox rendering are active.',
    },
    {
      id: 'app-builder-live-preview',
      label: 'App Builder live sandbox preview',
      status: 'complete',
      notes: 'Template-driven planning now includes refreshable live sandbox output.',
    },
    {
      id: 'delivery-adapters',
      label: 'Twilio + SendGrid delivery adapters',
      status: 'complete',
      notes: 'Retry-aware delivery transport layer and webhook ingestion are active.',
    },
    {
      id: 'voice-social-connectors',
      label: 'Voice AI and social connectors',
      status: 'complete',
      notes: 'Voice handoff and social send/ingest routes are active.',
    },
    {
      id: 'maps-and-guardrails',
      label: 'Maps scoring and autonomous guardrails',
      status: 'complete',
      notes: 'Maps weighted routing and risk guardrail checks are active.',
    },
    {
      id: 'private-hosting-launch',
      label: 'Private hosting launch and domain lifecycle',
      status: 'complete',
      notes: 'Website and app builder flows can now deploy projects and run domain order/connect actions in-platform.',
    },
    {
      id: 'public-estimator-lead-magnet',
      label: 'Public estimator lead-magnet funnel',
      status: 'complete',
      notes: 'Cost calculator now supports instant range output, gated full results, and CRM lead capture.',
    },
    {
      id: 'construction-lead-intelligence',
      label: 'Construction lead intelligence search',
      status: 'complete',
      notes: 'Lead list supports advanced search/filtering and score-driven prospect prioritization.',
    },
    {
      id: 'game-preview-auth-reliability',
      label: 'Game preview auth and reliability hardening',
      status: 'in-progress',
      notes: 'Remaining reliability item currently tracked in active backlog.',
    },
  ];
}

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const url = new URL(request.url);
    const scope = parseScope(parseOptionalString(url.searchParams.get('scope')));

    const checklist = buildV1CompletionChecklist(scope);
    const integrations = getMarketplaceIntegrations().map((integration) => ({
      id: integration.id,
      label: integration.label,
      configured: integration.configured,
      requiredForPhaseOne: integration.requiredForPhaseOne,
      nextStep: integration.nextStep,
    }));

    return jsonResponse({
      generatedAt: new Date().toISOString(),
      checklist,
      integrations,
      featureReadiness: getFeatureReadiness(),
    });
  });
}
