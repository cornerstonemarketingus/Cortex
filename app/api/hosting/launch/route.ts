import { ApiError, readJson } from '@/src/crm/core/api';
import {
  jsonResponse,
  parseBoolean,
  parseOptionalString,
  parseStringArray,
  withApiHandler,
} from '@/src/crm/core/http';
import {
  connectDomainToProject,
  createHostedProject,
  deployHostedProject,
  getHostingIntegrationStatus,
  registerDomainOrder,
  type DomainProvider,
  type HostedProjectType,
} from '@/src/hosting/private-hosting';
import { runQualityGate } from '@/src/builder/quality-gate';

export const runtime = 'nodejs';

type LaunchBody = {
  projectType?: unknown;
  projectName?: unknown;
  prompt?: unknown;
  sections?: unknown;
  modules?: unknown;
  services?: unknown;
  preferredDomain?: unknown;
  domainProvider?: unknown;
  contactEmail?: unknown;
  purchaseDomain?: unknown;
  autoConnectDomain?: unknown;
  userId?: unknown;
  slug?: unknown;
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

function parseProjectType(value: unknown): HostedProjectType {
  if (value === 'app') return 'app';
  return 'website';
}

function parseDomainProvider(value: unknown): DomainProvider {
  const normalized = parseOptionalString(value)?.toLowerCase();
  if (normalized === 'godaddy' || normalized === 'namecheap' || normalized === 'manual-dns') {
    return normalized;
  }
  return 'manual-dns';
}

export async function GET() {
  return withApiHandler(async () => {
    return jsonResponse({
      notes:
        'POST projectType + projectName (+ optional preferredDomain) to create, deploy, and connect a project on Cortex private hosting.',
      providers: getHostingIntegrationStatus(),
      defaults: {
        purchaseDomain: true,
        autoConnectDomain: true,
      },
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await readJson<LaunchBody>(request);

    const projectName = parseOptionalString(body.projectName);
    if (!projectName) {
      throw new ApiError(400, 'projectName is required', 'PROJECT_NAME_REQUIRED');
    }

    const projectType = parseProjectType(body.projectType);
    const preferredDomain = parseOptionalString(body.preferredDomain);
    const domainProvider = parseDomainProvider(body.domainProvider);
    const purchaseDomain = parseBoolean(body.purchaseDomain, true);
    const autoConnectDomain = parseBoolean(body.autoConnectDomain, true);
    const qualityTier = parseQualityTier(body.qualityTier);

    if (qualityTier === 'premium') {
      const gateResult = runQualityGate({
        blueprint: projectType === 'app' ? 'app' : 'website',
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

    const project = await createHostedProject({
      userId: parseOptionalString(body.userId) || 'public-user',
      projectType,
      projectName,
      prompt: parseOptionalString(body.prompt),
      sections: parseStringArray(body.sections) || [],
      modules: parseStringArray(body.modules) || [],
      services: parseStringArray(body.services) || [],
      slug: parseOptionalString(body.slug),
    });

    const deploymentResult = await deployHostedProject(project.id);

    let domainOrder: Awaited<ReturnType<typeof registerDomainOrder>> | null = null;
    let domainConnection: Awaited<ReturnType<typeof connectDomainToProject>> | null = null;

    if (preferredDomain && purchaseDomain) {
      domainOrder = await registerDomainOrder({
        domain: preferredDomain,
        provider: domainProvider,
        projectId: project.id,
        contactEmail: parseOptionalString(body.contactEmail),
      });
    }

    if (preferredDomain && autoConnectDomain) {
      domainConnection = await connectDomainToProject({
        domain: preferredDomain,
        provider: domainProvider,
        projectId: project.id,
      });
    }

    const launchChecklist = [
      'Project scaffold generated in private hosting workspace.',
      'Deployment artifact generated and production URL assigned.',
      preferredDomain
        ? purchaseDomain
          ? 'Domain purchase request recorded.'
          : 'Domain purchase skipped by configuration.'
        : 'No preferred domain set; using subdomain launch only.',
      preferredDomain
        ? autoConnectDomain
          ? 'Domain connection flow executed with DNS records.'
          : 'Domain connect skipped by configuration.'
        : 'No domain connection requested.',
      'Run smoke tests on preview and production URLs before publish announcement.',
    ];

    return jsonResponse(
      {
        launch: {
          project: deploymentResult.project,
          deployment: deploymentResult.deployment,
          qualityTier,
          domainOrder,
          domainConnection,
          hostingPanelUrl: '/website-builder',
          launchChecklist,
        },
        integrations: getHostingIntegrationStatus(),
      },
      201
    );
  });
}
