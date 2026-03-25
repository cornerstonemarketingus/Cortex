import { randomUUID } from 'node:crypto';
import { ApiError } from '@/src/crm/core/api';
import { jsonResponse, parseBoolean, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import {
  connectDomainToProject,
  getHostedProject,
  getHostingIntegrationStatus,
  registerDomainOrder,
  type DomainProvider,
} from '@/src/hosting/private-hosting';

export const runtime = 'nodejs';

type DomainConnectBody = {
  domain?: unknown;
  provider?: unknown;
  siteName?: unknown;
  contactEmail?: unknown;
  autoConfigure?: unknown;
  projectId?: unknown;
  purchaseDomain?: unknown;
};

const SUPPORTED_PROVIDERS = [
  'cloudflare',
  'godaddy',
  'namecheap',
  'squarespace',
  'manual-dns',
] as const;

type SupportedProvider = typeof SUPPORTED_PROVIDERS[number];

function normalizeProvider(value: unknown): SupportedProvider {
  const raw = parseOptionalString(value)?.toLowerCase();
  if (raw && SUPPORTED_PROVIDERS.includes(raw as SupportedProvider)) {
    return raw as SupportedProvider;
  }
  return 'manual-dns';
}

function toHostingProvider(provider: SupportedProvider): DomainProvider {
  if (provider === 'godaddy' || provider === 'namecheap' || provider === 'manual-dns') {
    return provider;
  }
  return 'manual-dns';
}

function ensureValidDomain(value: string | undefined): string {
  const candidate = value?.toLowerCase().trim() || '';
  if (!candidate) {
    throw new ApiError(400, 'Domain is required.', 'DOMAIN_REQUIRED');
  }

  const domainPattern = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/;
  if (!domainPattern.test(candidate)) {
    throw new ApiError(400, 'Domain format is invalid.', 'DOMAIN_INVALID');
  }

  return candidate;
}

function buildInstructions(provider: SupportedProvider, domain: string, verificationToken: string) {
  const cnameTarget = 'sites.cortexengine.app';

  return {
    status: 'pending-verification',
    provider,
    domain,
    verificationToken,
    dnsRecords: [
      {
        type: 'CNAME',
        host: 'www',
        value: cnameTarget,
        ttl: 300,
      },
      {
        type: 'TXT',
        host: '@',
        value: `cortex-site-verification=${verificationToken}`,
        ttl: 300,
      },
      {
        type: 'A',
        host: '@',
        value: '76.76.21.21',
        ttl: 300,
      },
    ],
    nextSteps: [
      `Add the DNS records for ${domain} in ${provider}.`,
      'Wait for DNS propagation (usually 5-30 minutes).',
      'Click Verify Domain inside Cortex Website Builder.',
      'Enable HTTPS and set your primary redirect policy.',
    ],
    notes: 'This endpoint creates a connection plan and verification token. Live registrar writes require provider OAuth keys.',
  };
}

async function parseBody(request: Request): Promise<DomainConnectBody> {
  const raw = await request.text();
  if (!raw.trim()) {
    throw new ApiError(400, 'Request body is required.', 'MISSING_BODY');
  }

  try {
    return JSON.parse(raw) as DomainConnectBody;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.', 'INVALID_JSON');
  }
}

export async function GET() {
  return withApiHandler(async () => {
    return jsonResponse({
      supportedProviders: SUPPORTED_PROVIDERS,
      requiredRecords: ['CNAME www -> sites.cortexengine.app', 'A @ -> 76.76.21.21', 'TXT verification'],
      integrations: getHostingIntegrationStatus(),
      notes: 'POST domain + provider to generate a domain connection plan for your live website preview output.',
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await parseBody(request);
    const domain = ensureValidDomain(parseOptionalString(body.domain));
    const provider = normalizeProvider(body.provider);
    const hostingProvider = toHostingProvider(provider);
    const projectId = parseOptionalString(body.projectId);

    const verificationToken = randomUUID().replace(/-/g, '').slice(0, 20);
    const autoConfigure = parseBoolean(body.autoConfigure, false);
    const purchaseDomain = parseBoolean(body.purchaseDomain, true);

    if (projectId) {
      const project = await getHostedProject(projectId);
      if (!project) {
        throw new ApiError(404, 'Hosted project not found for domain connection.', 'HOSTED_PROJECT_NOT_FOUND');
      }

      const order = purchaseDomain
        ? await registerDomainOrder({
            domain,
            provider: hostingProvider,
            projectId,
            contactEmail: parseOptionalString(body.contactEmail),
          })
        : null;

      const connection = await connectDomainToProject({
        domain,
        provider: hostingProvider,
        projectId,
      });

      return jsonResponse(
        {
          connection: {
            ...connection,
            notes:
              connection.status === 'connected'
                ? 'Domain mapped directly to Cortex private hosting and ready for SSL checks.'
                : 'Domain connection created; complete DNS and verification steps to finalize.',
          },
          order,
          project: {
            id: project.id,
            name: project.name,
            status: project.status,
            deployment: project.deployment || null,
          },
          siteName: parseOptionalString(body.siteName) || project.name,
          contactEmail: parseOptionalString(body.contactEmail) || null,
          automation: {
            autoConfigureRequested: autoConfigure,
            status: connection.status,
          },
          integrations: getHostingIntegrationStatus(),
        },
        201
      );
    }

    return jsonResponse(
      {
        connection: buildInstructions(provider, domain, verificationToken),
        siteName: parseOptionalString(body.siteName) || 'Cortex Website Builder Site',
        contactEmail: parseOptionalString(body.contactEmail) || null,
        automation: {
          autoConfigureRequested: autoConfigure,
          status: autoConfigure ? 'queued-for-provider-auth' : 'manual-dns-required',
        },
      },
      201
    );
  });
}
