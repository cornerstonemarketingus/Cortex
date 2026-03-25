import { ApiError, readJson } from '@/src/crm/core/api';
import {
  jsonResponse,
  parseOptionalString,
  withApiHandler,
} from '@/src/crm/core/http';
import {
  connectDomainToProject,
  getDomainConnections,
  getHostedProject,
  getHostingIntegrationStatus,
  registerDomainOrder,
  type DomainProvider,
  verifyDomainConnection,
} from '@/src/hosting/private-hosting';

export const runtime = 'nodejs';

type DomainBody = {
  action?: unknown;
  domain?: unknown;
  provider?: unknown;
  projectId?: unknown;
  contactEmail?: unknown;
};

function parseDomainProvider(value: unknown): DomainProvider {
  const normalized = parseOptionalString(value)?.toLowerCase();
  if (normalized === 'godaddy' || normalized === 'namecheap' || normalized === 'manual-dns') {
    return normalized;
  }
  return 'manual-dns';
}

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const { searchParams } = new URL(request.url);
    const projectId = parseOptionalString(searchParams.get('projectId'));

    if (projectId) {
      const project = await getHostedProject(projectId);
      if (!project) {
        throw new ApiError(404, 'Hosted project not found', 'HOSTED_PROJECT_NOT_FOUND');
      }

      const connections = await getDomainConnections(projectId);

      return jsonResponse({
        integrations: getHostingIntegrationStatus(),
        project,
        connections,
      });
    }

    return jsonResponse({
      integrations: getHostingIntegrationStatus(),
      notes:
        'POST with action=order|connect|verify and include domain + projectId to manage private-hosting domains.',
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await readJson<DomainBody>(request);

    const domain = parseOptionalString(body.domain);
    const projectId = parseOptionalString(body.projectId);

    if (!domain) {
      throw new ApiError(400, 'domain is required', 'DOMAIN_REQUIRED');
    }

    if (!projectId) {
      throw new ApiError(400, 'projectId is required', 'PROJECT_ID_REQUIRED');
    }

    const project = await getHostedProject(projectId);
    if (!project) {
      throw new ApiError(404, 'Hosted project not found', 'HOSTED_PROJECT_NOT_FOUND');
    }

    const action = (parseOptionalString(body.action) || 'order').toLowerCase();
    const provider = parseDomainProvider(body.provider);

    if (action === 'order') {
      const order = await registerDomainOrder({
        domain,
        provider,
        projectId,
        contactEmail: parseOptionalString(body.contactEmail),
      });

      return jsonResponse({
        action: 'order',
        order,
        project,
        integrations: getHostingIntegrationStatus(),
      });
    }

    if (action === 'connect') {
      const connection = await connectDomainToProject({
        domain,
        provider,
        projectId,
      });

      return jsonResponse({
        action: 'connect',
        connection,
        project,
        integrations: getHostingIntegrationStatus(),
      });
    }

    if (action === 'verify') {
      const verification = await verifyDomainConnection({
        domain,
        projectId,
      });

      return jsonResponse({
        action: 'verify',
        verification,
        project,
        integrations: getHostingIntegrationStatus(),
      });
    }

    throw new ApiError(400, 'action must be order, connect, or verify', 'INVALID_DOMAIN_ACTION');
  });
}
