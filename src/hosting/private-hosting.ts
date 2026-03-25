import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Resolver, resolveTxt } from 'node:dns/promises';
import { ApiError } from '@/src/crm/core/api';

export type HostedProjectType = 'website' | 'app';

export type DomainProvider = 'godaddy' | 'namecheap' | 'manual-dns';

export type HostedProject = {
  id: string;
  userId: string;
  projectType: HostedProjectType;
  name: string;
  slug: string;
  prompt?: string;
  sections: string[];
  modules: string[];
  services: string[];
  status: 'draft' | 'deployed';
  workspacePath: string;
  connectedDomains: string[];
  createdAt: string;
  updatedAt: string;
  deployment?: DeploymentRecord;
};

export type DeploymentRecord = {
  deploymentId: string;
  status: 'deployed';
  previewUrl: string;
  productionUrl: string;
  artifactPath: string;
  deployedAt: string;
};

export type DomainOrder = {
  orderId: string;
  domain: string;
  provider: DomainProvider;
  status: 'simulated-purchased' | 'provider-auth-required' | 'manual-dns-required';
  priceUsd: number;
  nameservers: string[];
  projectId?: string;
  contactEmail?: string;
  createdAt: string;
};

export type DomainConnection = {
  connectionId: string;
  domain: string;
  provider: DomainProvider;
  projectId: string;
  status: 'connected' | 'pending-verification' | 'provider-auth-required';
  verificationToken: string;
  dnsRecords: Array<{
    type: 'A' | 'CNAME' | 'TXT';
    host: string;
    value: string;
    ttl: number;
  }>;
  nextSteps: string[];
  createdAt: string;
  updatedAt: string;
};

export type DomainVerificationResult = {
  connection: DomainConnection;
  verified: boolean;
  message: string;
  recordFound: boolean;
};

export type HostingIntegrationStatus = {
  provider: DomainProvider;
  configured: boolean;
  requiredEnv: string[];
};

type CreateHostedProjectInput = {
  userId?: string;
  projectType: HostedProjectType;
  projectName: string;
  prompt?: string;
  sections?: string[];
  modules?: string[];
  services?: string[];
  slug?: string;
};

type RegisterDomainOrderInput = {
  domain: string;
  provider: DomainProvider;
  projectId?: string;
  contactEmail?: string;
};

type ConnectDomainInput = {
  domain: string;
  provider: DomainProvider;
  projectId: string;
};

const HOSTING_ROOT = process.env.CORTEX_HOSTING_ROOT || path.join(process.cwd(), 'workspaces', 'hosting');
const PROJECTS_ROOT = path.join(HOSTING_ROOT, 'projects');
const DEPLOYMENTS_ROOT = path.join(HOSTING_ROOT, 'deployments');
const DOMAINS_ROOT = path.join(HOSTING_ROOT, 'domains');

const PRIVATE_HOST_DOMAIN = process.env.CORTEX_PRIVATE_HOST_DOMAIN || 'apps.cortexengine.app';
const PUBLIC_APP_URL =
  process.env.PUBLIC_APP_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_BASE_URL ||
  'http://localhost:3000';

function nowIso(): string {
  return new Date().toISOString();
}

function slugify(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || `project-${Date.now().toString(36)}`;
}

function normalizeDomain(value: string): string {
  const domain = value.trim().toLowerCase();
  const pattern = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/;
  if (!pattern.test(domain)) {
    throw new ApiError(400, 'Domain format is invalid.', 'DOMAIN_INVALID');
  }
  return domain;
}

function ensureArray(values?: string[]): string[] {
  if (!values) return [];

  return values
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 12);
}

async function ensureStorage() {
  await Promise.all([
    fs.mkdir(PROJECTS_ROOT, { recursive: true }),
    fs.mkdir(DEPLOYMENTS_ROOT, { recursive: true }),
    fs.mkdir(DOMAINS_ROOT, { recursive: true }),
  ]);
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

async function writeJson(filePath: string, payload: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

function buildProjectFilePath(projectId: string): string {
  return path.join(PROJECTS_ROOT, `${projectId}.json`);
}

function buildOrderFilePath(orderId: string): string {
  return path.join(DOMAINS_ROOT, 'orders', `${orderId}.json`);
}

function buildConnectionFilePath(connectionId: string): string {
  return path.join(DOMAINS_ROOT, 'connections', `${connectionId}.json`);
}

async function listDomainConnectionsByProject(projectId: string): Promise<DomainConnection[]> {
  await ensureStorage();
  const connectionsRoot = path.join(DOMAINS_ROOT, 'connections');
  const files = await fs.readdir(connectionsRoot).catch(() => [] as string[]);

  const matches: DomainConnection[] = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const record = await readJson<DomainConnection>(path.join(connectionsRoot, file));
    if (!record) continue;
    if (record.projectId !== projectId) continue;
    matches.push(record);
  }

  return matches.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function findLatestConnection(projectId: string, domain: string): Promise<DomainConnection | null> {
  const normalizedDomain = normalizeDomain(domain);
  const connections = await listDomainConnectionsByProject(projectId);
  return connections.find((entry) => entry.domain === normalizedDomain) || null;
}

function providerConfigured(provider: DomainProvider): boolean {
  if (provider === 'manual-dns') return true;

  if (provider === 'godaddy') {
    return Boolean(process.env.GODADDY_API_KEY && process.env.GODADDY_API_SECRET);
  }

  return Boolean(process.env.NAMECHEAP_API_USER && process.env.NAMECHEAP_API_KEY);
}

function buildNameservers(): string[] {
  return ['ns1.cortexhost.net', 'ns2.cortexhost.net'];
}

function renderDeploymentHtml(project: HostedProject): string {
  const list = (project.projectType === 'website' ? project.sections : project.modules)
    .slice(0, 8)
    .map((item) => `<li>${item}</li>`)
    .join('');

  const serviceList = project.services.slice(0, 8).map((item) => `<li>${item}</li>`).join('');

  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${project.name} | Cortex Private Hosting</title>`,
    '<style>',
    'body { margin:0; font-family: "Segoe UI", sans-serif; background: linear-gradient(135deg, #0a1f4d, #123a73); color:#e2e8f0; }',
    '.shell { max-width:960px; margin:24px auto; border:1px solid rgba(148,163,184,0.35); border-radius:16px; background:rgba(2,6,23,0.6); overflow:hidden; }',
    '.hero { padding:24px; border-bottom:1px solid rgba(148,163,184,0.3); }',
    '.hero h1 { margin:0; font-size:28px; }',
    '.hero p { margin:10px 0 0; color:#cbd5e1; }',
    '.grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; padding:16px; }',
    '.card { border:1px solid rgba(148,163,184,0.3); border-radius:12px; padding:12px; background:rgba(15,23,42,0.55); }',
    '.card h2 { margin:0 0 8px; font-size:14px; text-transform:uppercase; letter-spacing:0.12em; color:#93c5fd; }',
    '.card ul { margin:0; padding-left:18px; line-height:1.45; }',
    '.foot { padding:16px; border-top:1px solid rgba(148,163,184,0.3); font-size:12px; color:#94a3b8; }',
    '@media (max-width: 860px) { .grid { grid-template-columns:1fr; } }',
    '</style>',
    '</head>',
    '<body>',
    '<main class="shell">',
    '<section class="hero">',
    `<h1>${project.name}</h1>`,
    `<p>Hosted on Cortex Private Hosting (${project.projectType}).</p>`,
    '</section>',
    '<section class="grid">',
    '<article class="card">',
    '<h2>Rendered Surface</h2>',
    `<ul>${list || '<li>Base scaffold ready</li>'}</ul>`,
    '</article>',
    '<article class="card">',
    '<h2>Services and Offers</h2>',
    `<ul>${serviceList || '<li>Primary offer package configured</li>'}</ul>`,
    '</article>',
    '</section>',
    `<footer class="foot">Project ID: ${project.id} | Deploy through your Cortex control plane.</footer>`,
    '</main>',
    '</body>',
    '</html>',
  ].join('');
}

export function getHostingIntegrationStatus(): HostingIntegrationStatus[] {
  return [
    {
      provider: 'godaddy',
      configured: providerConfigured('godaddy'),
      requiredEnv: ['GODADDY_API_KEY', 'GODADDY_API_SECRET'],
    },
    {
      provider: 'namecheap',
      configured: providerConfigured('namecheap'),
      requiredEnv: ['NAMECHEAP_API_USER', 'NAMECHEAP_API_KEY'],
    },
    {
      provider: 'manual-dns',
      configured: true,
      requiredEnv: [],
    },
  ];
}

export async function listHostedProjects(projectType?: HostedProjectType): Promise<HostedProject[]> {
  await ensureStorage();
  const files = await fs.readdir(PROJECTS_ROOT);

  const projects: HostedProject[] = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const project = await readJson<HostedProject>(path.join(PROJECTS_ROOT, file));
    if (!project) continue;
    if (projectType && project.projectType !== projectType) continue;
    projects.push(project);
  }

  return projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getHostedProject(projectId: string): Promise<HostedProject | null> {
  await ensureStorage();
  return readJson<HostedProject>(buildProjectFilePath(projectId));
}

export async function createHostedProject(input: CreateHostedProjectInput): Promise<HostedProject> {
  await ensureStorage();

  const projectName = input.projectName.trim();
  if (!projectName) {
    throw new ApiError(400, 'projectName is required', 'PROJECT_NAME_REQUIRED');
  }

  const baseSlug = slugify(input.slug || projectName);
  const id = `proj_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
  const slug = `${baseSlug}-${id.slice(-6)}`;
  const workspacePath = path.join(HOSTING_ROOT, 'runtime', slug);

  await fs.mkdir(workspacePath, { recursive: true });

  const project: HostedProject = {
    id,
    userId: input.userId?.trim() || 'public-user',
    projectType: input.projectType,
    name: projectName,
    slug,
    prompt: input.prompt,
    sections: ensureArray(input.sections),
    modules: ensureArray(input.modules),
    services: ensureArray(input.services),
    status: 'draft',
    workspacePath,
    connectedDomains: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  await writeJson(buildProjectFilePath(project.id), project);
  return project;
}

export async function deployHostedProject(projectId: string): Promise<{ project: HostedProject; deployment: DeploymentRecord }> {
  await ensureStorage();
  const project = await getHostedProject(projectId);

  if (!project) {
    throw new ApiError(404, 'Hosted project not found', 'HOSTED_PROJECT_NOT_FOUND');
  }

  const deploymentId = `dep_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
  const artifactPath = path.join(DEPLOYMENTS_ROOT, project.id, deploymentId);
  await fs.mkdir(artifactPath, { recursive: true });

  const html = renderDeploymentHtml(project);
  await fs.writeFile(path.join(artifactPath, 'index.html'), html, 'utf8');

  const deployment: DeploymentRecord = {
    deploymentId,
    status: 'deployed',
    previewUrl: `${PUBLIC_APP_URL.replace(/\/$/, '')}/api/hosting/projects?projectId=${encodeURIComponent(project.id)}`,
    productionUrl: `https://${project.slug}.${PRIVATE_HOST_DOMAIN}`,
    artifactPath,
    deployedAt: nowIso(),
  };

  const nextProject: HostedProject = {
    ...project,
    status: 'deployed',
    deployment,
    updatedAt: nowIso(),
  };

  await writeJson(buildProjectFilePath(nextProject.id), nextProject);

  return {
    project: nextProject,
    deployment,
  };
}

export async function registerDomainOrder(input: RegisterDomainOrderInput): Promise<DomainOrder> {
  await ensureStorage();
  const domain = normalizeDomain(input.domain);
  const configured = providerConfigured(input.provider);

  let status: DomainOrder['status'] = 'manual-dns-required';
  if (input.provider !== 'manual-dns') {
    status = configured ? 'simulated-purchased' : 'provider-auth-required';
  }

  const order: DomainOrder = {
    orderId: `ord_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`,
    domain,
    provider: input.provider,
    status,
    priceUsd: domain.endsWith('.io') ? 42 : 18,
    nameservers: buildNameservers(),
    projectId: input.projectId,
    contactEmail: input.contactEmail?.trim(),
    createdAt: nowIso(),
  };

  await writeJson(buildOrderFilePath(order.orderId), order);
  return order;
}

export async function connectDomainToProject(input: ConnectDomainInput): Promise<DomainConnection> {
  await ensureStorage();

  const domain = normalizeDomain(input.domain);
  const project = await getHostedProject(input.projectId);
  if (!project) {
    throw new ApiError(404, 'Hosted project not found for domain mapping', 'HOSTED_PROJECT_NOT_FOUND');
  }

  const verificationToken = randomUUID().replace(/-/g, '').slice(0, 20);
  const providerReady = providerConfigured(input.provider);

  const status: DomainConnection['status'] =
    input.provider === 'manual-dns'
      ? 'pending-verification'
      : providerReady
      ? 'connected'
      : 'provider-auth-required';

  const dnsRecords: DomainConnection['dnsRecords'] = [
    {
      type: 'A',
      host: '@',
      value: '76.76.21.21',
      ttl: 300,
    },
    {
      type: 'CNAME',
      host: 'www',
      value: `${project.slug}.${PRIVATE_HOST_DOMAIN}`,
      ttl: 300,
    },
    {
      type: 'TXT',
      host: '@',
      value: `cortex-host-verification=${verificationToken}`,
      ttl: 300,
    },
  ];

  const nextSteps =
    status === 'connected'
      ? [
          'Domain is provider-connected and mapped to private hosting.',
          'Enable SSL certificates and force HTTPS redirect.',
          'Run smoke tests against the production URL.',
        ]
      : status === 'provider-auth-required'
      ? [
          'Complete provider API authentication for automatic DNS writes.',
          'Retry connect action after keys/OAuth are configured.',
          'Or configure records manually using the DNS record set below.',
        ]
      : [
          'Add DNS records manually at your registrar.',
          'Wait for propagation and verify connection in Cortex.',
          'Enable SSL and set root-to-www redirect policy.',
        ];

  const connection: DomainConnection = {
    connectionId: `dom_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`,
    domain,
    provider: input.provider,
    projectId: project.id,
    status,
    verificationToken,
    dnsRecords,
    nextSteps,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const connectedDomains = Array.from(new Set([...(project.connectedDomains || []), domain]));
  const nextProject: HostedProject = {
    ...project,
    connectedDomains,
    updatedAt: nowIso(),
  };

  await Promise.all([
    writeJson(buildConnectionFilePath(connection.connectionId), connection),
    writeJson(buildProjectFilePath(project.id), nextProject),
  ]);

  return connection;
}

export async function getDomainConnections(projectId: string): Promise<DomainConnection[]> {
  return listDomainConnectionsByProject(projectId);
}

export async function verifyDomainConnection(input: {
  projectId: string;
  domain: string;
}): Promise<DomainVerificationResult> {
  await ensureStorage();

  const connection = await findLatestConnection(input.projectId, input.domain);
  if (!connection) {
    throw new ApiError(404, 'Domain connection not found for project.', 'DOMAIN_CONNECTION_NOT_FOUND');
  }

  if (connection.status === 'connected') {
    return {
      connection,
      verified: true,
      message: 'Domain already verified and connected.',
      recordFound: true,
    };
  }

  const expectedToken = `cortex-host-verification=${connection.verificationToken}`;

  const queryTxtRecords = async (domain: string): Promise<string[]> => {
    try {
      const rows = await resolveTxt(domain);
      return rows.flat().map((entry) => entry.trim());
    } catch {
      // Fall back to public resolvers when host resolver is unavailable.
    }

    for (const server of ['1.1.1.1', '8.8.8.8']) {
      try {
        const resolver = new Resolver();
        resolver.setServers([server]);
        const rows = await resolver.resolveTxt(domain);
        return rows.flat().map((entry) => entry.trim());
      } catch {
        // Try next fallback resolver.
      }
    }

    return [];
  };

  const txtRecords = await queryTxtRecords(connection.domain);

  const recordFound = txtRecords.some((entry) => entry === expectedToken);
  const updatedConnection: DomainConnection = {
    ...connection,
    status: recordFound ? 'connected' : connection.status,
    nextSteps: recordFound
      ? [
          'Domain TXT verification detected.',
          'A/CNAME mapping appears complete for private hosting.',
          'Enable SSL certificates and force HTTPS redirect.',
        ]
      : [
          ...connection.nextSteps,
          `TXT verification not found yet. Expected: ${expectedToken}`,
        ].slice(0, 5),
    updatedAt: nowIso(),
  };

  await writeJson(buildConnectionFilePath(updatedConnection.connectionId), updatedConnection);

  return {
    connection: updatedConnection,
    verified: recordFound,
    message: recordFound
      ? 'TXT verification record found. Domain marked connected.'
      : 'TXT verification record not found yet. Keep DNS records in place and retry.',
    recordFound,
  };
}
