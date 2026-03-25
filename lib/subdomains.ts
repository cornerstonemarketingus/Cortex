export type CortexProduct = 'tradesos' | 'autoflow' | 'creatoros' | 'engine';
export type CortexSite = 'contractor' | 'automation';

export const PRODUCT_ROUTE_PREFIX: Record<CortexProduct, string> = {
  tradesos: '/tradesos',
  autoflow: '/autoflow',
  creatoros: '/creatoros',
  engine: '/engine',
};

export const SUBDOMAIN_MAP: Record<string, CortexProduct> = {
  trades: 'tradesos',
  jobs: 'tradesos',
  tradesos: 'tradesos',
  automations: 'autoflow',
  autoflow: 'autoflow',
  crm: 'autoflow',
  creator: 'creatoros',
  creatoros: 'creatoros',
  build: 'creatoros',
  engine: 'engine',
  cortex: 'engine',
};

export function getBaseDomain(): string {
  return (process.env.CORTEX_BASE_DOMAIN || 'cortexengine.app').toLowerCase();
}

export function getPreferredProductHost(product: CortexProduct): string {
  const base = getBaseDomain();
  if (product === 'engine') {
    return base;
  }

  if (product === 'tradesos') {
    return `trades.${base}`;
  }

  if (product === 'autoflow') {
    return `automations.${base}`;
  }

  return `creator.${base}`;
}

export function normalizeHost(host: string): string {
  return host.toLowerCase().split(':')[0].trim();
}

function parseDomainList(raw: string | undefined): string[] {
  if (!raw) return [];

  return raw
    .split(',')
    .map((entry) => normalizeHost(entry))
    .filter((entry) => entry.length > 0);
}

export function extractSubdomain(host: string): string | null {
  const normalized = normalizeHost(host);
  if (!normalized) return null;

  if (normalized === 'localhost') {
    return null;
  }

  const parts = normalized.split('.');
  if (parts.length === 2 && parts[1] === 'localhost') {
    return parts[0] || null;
  }

  if (parts.length <= 2) {
    return null;
  }

  return parts[0] || null;
}

export function resolveProductFromHost(host: string): CortexProduct | null {
  const subdomain = extractSubdomain(host);
  if (!subdomain) return null;
  return SUBDOMAIN_MAP[subdomain] || null;
}

export function resolveSiteFromHost(host: string): CortexSite | null {
  const normalized = normalizeHost(host);
  if (!normalized) return null;

  const contractorDomains = parseDomainList(process.env.CORTEX_CONTRACTOR_DOMAINS);
  const automationDomains = parseDomainList(process.env.CORTEX_AUTOMATION_DOMAINS);

  if (contractorDomains.includes(normalized)) {
    return 'contractor';
  }

  if (automationDomains.includes(normalized)) {
    return 'automation';
  }

  return null;
}
