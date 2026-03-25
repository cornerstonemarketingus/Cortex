import { ApiError } from '@/src/crm/core/api';
import { jsonResponse, parseBoolean, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import {
  connectDomainToProject,
  createHostedProject,
  deployHostedProject,
  getHostingIntegrationStatus,
  registerDomainOrder,
} from '@/src/hosting/private-hosting';
import { runQualityGate } from '@/src/builder/quality-gate';

export const runtime = 'nodejs';

type FullLaunchBody = {
  businessType?: unknown;
  businessName?: unknown;
  services?: unknown;
  location?: unknown;
  domain?: unknown;
  domainProvider?: unknown;
  contactEmail?: unknown;
  userId?: unknown;
  purchaseDomain?: unknown;
  autoConnectDomain?: unknown;
  qualityTier?: unknown;
  qualityMetrics?: unknown;
  designChecks?: unknown;
};

function parseQualityTier(value: unknown): 'foundation' | 'premium' {
  return value === 'premium' ? 'premium' : 'foundation';
}

function parseMetrics(value: unknown) {
  const payload = value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  const asNumber = (key: string) => {
    const parsed = Number(payload[key]);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  return {
    lcpMs: asNumber('lcpMs'),
    ttiMs: asNumber('ttiMs'),
    cls: asNumber('cls'),
    accessibilityScore: asNumber('accessibilityScore'),
    seoScore: asNumber('seoScore'),
    conversionEventsCoverage: asNumber('conversionEventsCoverage'),
  };
}

function parseDesignChecks(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 20);
}

const supportedDomainProviders = ['godaddy', 'namecheap', 'manual-dns'] as const;

type DomainProvider = typeof supportedDomainProviders[number];

function parseProvider(value: unknown): DomainProvider {
  const normalized = parseOptionalString(value)?.toLowerCase();
  if (normalized === 'godaddy' || normalized === 'namecheap' || normalized === 'manual-dns') {
    return normalized;
  }
  return 'manual-dns';
}

function parseServices(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return ['General service package'];
  }

  const services = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 8);

  return services.length > 0 ? services : ['General service package'];
}

async function parseBody(request: Request): Promise<FullLaunchBody> {
  const raw = await request.text();
  if (!raw.trim()) {
    throw new ApiError(400, 'Request body is required.', 'MISSING_BODY');
  }

  try {
    return JSON.parse(raw) as FullLaunchBody;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.', 'INVALID_JSON');
  }
}

export async function GET() {
  return withApiHandler(async () => {
    return jsonResponse({
      supportedDomainProviders,
      hostingIntegrations: getHostingIntegrationStatus(),
      notes:
        'POST businessType + businessName + services + location to generate an idea-to-live launch packet (site, copy, lead form, and activation checklist).',
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await parseBody(request);

    const businessType = parseOptionalString(body.businessType) || 'contractor';
    const businessName = parseOptionalString(body.businessName) || 'Cortex Business Launch';
    const location = parseOptionalString(body.location) || 'Eagan, MN';
    const services = parseServices(body.services);
    const domain = parseOptionalString(body.domain) || `${businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
    const domainProvider = parseProvider(body.domainProvider);
    const purchaseDomain = parseBoolean(body.purchaseDomain, true);
    const autoConnectDomain = parseBoolean(body.autoConnectDomain, true);
    const qualityTier = parseQualityTier(body.qualityTier);

    if (qualityTier === 'premium') {
      const gateResult = runQualityGate({
        blueprint: 'website',
        qualityTier,
        metrics: parseMetrics(body.qualityMetrics),
        designChecks: parseDesignChecks(body.designChecks),
        releaseMode: 'production',
      });

      if (!gateResult.passed) {
        throw new ApiError(409, 'Premium launch blocked by quality gate.', 'QUALITY_GATE_FAILED', {
          result: gateResult,
        });
      }
    }

    const launchId = `launch_${Date.now().toString(36)}`;

    const generatedAssets = {
      siteStructure: ['Home', 'Services', 'Request Quote', 'Reviews', 'Contact'],
      conversionBlocks: ['Request quote form', 'Tap-to-call button', 'Trust badges', 'Before/after gallery'],
      leadFlow: ['Lead captured', 'CRM record created', 'Auto SMS + email follow-up', 'Pipeline stage set to New Lead'],
    };

    const hostedProject = await createHostedProject({
      userId: parseOptionalString(body.userId) || 'public-user',
      projectType: 'website',
      projectName: businessName,
      prompt: `Launch a ${businessType} website for ${location}.`,
      sections: generatedAssets.siteStructure,
      services,
    });

    const deploymentResult = await deployHostedProject(hostedProject.id);

    let domainOrder: Awaited<ReturnType<typeof registerDomainOrder>> | null = null;
    let domainConnection: Awaited<ReturnType<typeof connectDomainToProject>> | null = null;

    if (purchaseDomain) {
      domainOrder = await registerDomainOrder({
        domain,
        provider: domainProvider,
        projectId: hostedProject.id,
        contactEmail: parseOptionalString(body.contactEmail),
      });
    }

    if (autoConnectDomain) {
      domainConnection = await connectDomainToProject({
        domain,
        provider: domainProvider,
        projectId: hostedProject.id,
      });
    }

    const provisioningStatus =
      domainConnection?.status || domainOrder?.status || (domainProvider === 'manual-dns' ? 'manual-dns-required' : 'provider-auth-required');

    return jsonResponse(
      {
        launchId,
        businessType,
        businessName,
        location,
        services,
        generatedAssets,
        domain: {
          selectedDomain: domain,
          provider: domainProvider,
          provisioningStatus,
        },
        qualityTier,
        launchChecklist: [
          'Confirm service area targeting and city pages',
          'Review auto-follow-up SMS and email templates',
          'Enable payment links and booking logic',
          `Project deployed at ${deploymentResult.deployment.productionUrl}`,
          domainConnection
            ? `Domain ${domain} connection status: ${domainConnection.status}`
            : 'Domain connection pending; complete DNS mapping before go-live.',
        ],
        estimatedTimeMinutes: 12,
        differentiator:
          'Cortex launches a revenue-ready operating system, not just a website, by activating lead routing and follow-up automation on publish.',
        hosting: {
          projectId: deploymentResult.project.id,
          deploymentId: deploymentResult.deployment.deploymentId,
          productionUrl: deploymentResult.deployment.productionUrl,
          previewUrl: deploymentResult.deployment.previewUrl,
          connectedDomains: deploymentResult.project.connectedDomains,
        },
        domainOrder,
        domainConnection,
        integrations: getHostingIntegrationStatus(),
      },
      201
    );
  });
}
