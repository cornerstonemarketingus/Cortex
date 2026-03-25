import { crmDb } from '@/src/crm/core/crmDb';
import { jsonResponse, parseLimit, parseOptionalString, withApiHandler } from '@/src/crm/core/http';

export const runtime = 'nodejs';

type LeadListItem = {
  id: string;
  origin: 'crm' | 'directory';
  fullName: string;
  title: string;
  company: string;
  website?: string;
  email?: string;
  phone?: string;
  city: string;
  state?: string;
  serviceType: string;
  employeeRange?: string;
  revenueRangeUsd?: string;
  estimatedBudgetUsd?: number;
  stage: string;
  source: string;
  score: number;
  tags: string[];
  lastActivityAt: string;
};

type DirectoryLead = Omit<LeadListItem, 'origin' | 'score'> & { fitBase: number };

const directoryLeads: DirectoryLead[] = [
  {
    id: 'dir_001',
    fullName: 'Avery Nguyen',
    title: 'Owner',
    company: 'Northline Roofing & Exteriors',
    website: 'https://northline-roofing.example',
    email: 'avery@northline-roofing.example',
    phone: '+1-612-555-0110',
    city: 'Minneapolis',
    state: 'MN',
    serviceType: 'roof-replacement',
    employeeRange: '11-50',
    revenueRangeUsd: '$1M-$5M',
    estimatedBudgetUsd: 36000,
    stage: 'prospect',
    source: 'regional-contractor-index',
    tags: ['contractor', 'residential', 'roofing'],
    lastActivityAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    fitBase: 84,
  },
  {
    id: 'dir_002',
    fullName: 'Jordan Patel',
    title: 'General Manager',
    company: 'Summit Build Group',
    website: 'https://summit-build-group.example',
    email: 'jordan@summit-build-group.example',
    phone: '+1-651-555-0142',
    city: 'St. Paul',
    state: 'MN',
    serviceType: 'general-construction',
    employeeRange: '51-200',
    revenueRangeUsd: '$10M-$25M',
    estimatedBudgetUsd: 185000,
    stage: 'prospect',
    source: 'regional-contractor-index',
    tags: ['commercial', 'gc', 'tenant-improvement'],
    lastActivityAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    fitBase: 88,
  },
  {
    id: 'dir_003',
    fullName: 'Taylor Brooks',
    title: 'Project Director',
    company: 'Lakeshore Interiors',
    website: 'https://lakeshore-interiors.example',
    email: 'taylor@lakeshore-interiors.example',
    phone: '+1-763-555-0199',
    city: 'Maple Grove',
    state: 'MN',
    serviceType: 'kitchen-gut',
    employeeRange: '11-50',
    revenueRangeUsd: '$5M-$10M',
    estimatedBudgetUsd: 42000,
    stage: 'prospect',
    source: 'regional-contractor-index',
    tags: ['kitchen-remodel', 'design-build'],
    lastActivityAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    fitBase: 81,
  },
  {
    id: 'dir_004',
    fullName: 'Morgan Lee',
    title: 'Operations Lead',
    company: 'Twin City Deck Co',
    website: 'https://twincitydeck.example',
    email: 'morgan@twincitydeck.example',
    phone: '+1-952-555-0177',
    city: 'Eagan',
    state: 'MN',
    serviceType: 'deck',
    employeeRange: '1-10',
    revenueRangeUsd: '$500k-$1M',
    estimatedBudgetUsd: 18000,
    stage: 'prospect',
    source: 'regional-contractor-index',
    tags: ['deck-builder', 'residential'],
    lastActivityAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    fitBase: 76,
  },
  {
    id: 'dir_005',
    fullName: 'Riley Chen',
    title: 'Estimator',
    company: 'Metro Basement Finishers',
    website: 'https://metro-basement.example',
    email: 'riley@metro-basement.example',
    phone: '+1-507-555-0133',
    city: 'Burnsville',
    state: 'MN',
    serviceType: 'basement-finish',
    employeeRange: '11-50',
    revenueRangeUsd: '$2M-$8M',
    estimatedBudgetUsd: 52000,
    stage: 'prospect',
    source: 'regional-contractor-index',
    tags: ['basement', 'residential', 'finish-work'],
    lastActivityAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    fitBase: 79,
  },
];

function normalizeText(value: string | undefined): string {
  return (value || '').trim().toLowerCase();
}

function parseMetadata(record: unknown): Record<string, unknown> {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return {};
  }
  return record as Record<string, unknown>;
}

function toBudget(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.round(parsed);
}

function computeFitScore(item: LeadListItem, search?: string): number {
  let score = item.origin === 'crm' ? 62 : 72;

  if (item.email) score += 4;
  if (item.phone) score += 4;
  if (item.stage.toLowerCase() === 'proposal_sent') score += 12;
  if (item.stage.toLowerCase() === 'qualified') score += 7;
  if ((item.estimatedBudgetUsd || 0) >= 20000) score += 6;

  const query = normalizeText(search);
  if (query) {
    const haystack = [
      item.fullName,
      item.company,
      item.serviceType,
      item.city,
      item.tags.join(' '),
    ]
      .join(' ')
      .toLowerCase();

    if (haystack.includes(query)) {
      score += 9;
    }
  }

  return Math.max(1, Math.min(99, score));
}

function applyFilters(
  item: LeadListItem,
  filters: {
    search?: string;
    city?: string;
    serviceType?: string;
    stage?: string;
    employeeRange?: string;
    revenueRangeUsd?: string;
    origin?: 'crm' | 'directory' | 'all';
    minBudget?: number;
    maxBudget?: number;
    minScore?: number;
  }
): boolean {
  const search = normalizeText(filters.search);
  const city = normalizeText(filters.city);
  const serviceType = normalizeText(filters.serviceType);
  const stage = normalizeText(filters.stage);
  const employeeRange = normalizeText(filters.employeeRange);
  const revenueRangeUsd = normalizeText(filters.revenueRangeUsd);

  if (city && !normalizeText(item.city).includes(city)) {
    return false;
  }

  if (serviceType && !normalizeText(item.serviceType).includes(serviceType)) {
    return false;
  }

  if (stage && !normalizeText(item.stage).includes(stage)) {
    return false;
  }

  if (employeeRange && !normalizeText(item.employeeRange).includes(employeeRange)) {
    return false;
  }

  if (revenueRangeUsd && !normalizeText(item.revenueRangeUsd).includes(revenueRangeUsd)) {
    return false;
  }

  if (filters.origin && filters.origin !== 'all' && item.origin !== filters.origin) {
    return false;
  }

  if (search) {
    const haystack = [
      item.fullName,
      item.title,
      item.company,
      item.city,
      item.serviceType,
      item.tags.join(' '),
      item.source,
    ]
      .join(' ')
      .toLowerCase();

    if (!haystack.includes(search)) {
      return false;
    }
  }

  if (typeof filters.minScore === 'number' && Number.isFinite(filters.minScore)) {
    if (item.score < filters.minScore) {
      return false;
    }
  }

  if (typeof filters.minBudget === 'number' && Number.isFinite(filters.minBudget)) {
    if ((item.estimatedBudgetUsd || 0) < filters.minBudget) {
      return false;
    }
  }

  if (typeof filters.maxBudget === 'number' && Number.isFinite(filters.maxBudget)) {
    if ((item.estimatedBudgetUsd || Number.MAX_SAFE_INTEGER) > filters.maxBudget) {
      return false;
    }
  }

  return true;
}

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const url = new URL(request.url);
    const limit = parseLimit(request, 40, 1, 200);
    const search = parseOptionalString(url.searchParams.get('search'));
    const city = parseOptionalString(url.searchParams.get('city'));
    const serviceType = parseOptionalString(url.searchParams.get('serviceType'));
    const stage = parseOptionalString(url.searchParams.get('stage'));
    const employeeRange = parseOptionalString(url.searchParams.get('employeeRange'));
    const revenueRangeUsd = parseOptionalString(url.searchParams.get('revenueRangeUsd'));
    const originRaw = parseOptionalString(url.searchParams.get('origin'));
    const origin: 'crm' | 'directory' | 'all' =
      originRaw === 'crm' || originRaw === 'directory' ? originRaw : 'all';
    const sortByRaw = parseOptionalString(url.searchParams.get('sortBy'));
    const sortBy: 'score' | 'activity' | 'budget' =
      sortByRaw === 'activity' || sortByRaw === 'budget' ? sortByRaw : 'score';
    const minBudgetRaw = Number(url.searchParams.get('minBudget'));
    const maxBudgetRaw = Number(url.searchParams.get('maxBudget'));
    const minBudget = Number.isFinite(minBudgetRaw) ? Math.max(0, Math.floor(minBudgetRaw)) : undefined;
    const maxBudget = Number.isFinite(maxBudgetRaw) ? Math.max(0, Math.floor(maxBudgetRaw)) : undefined;
    const minScoreRaw = Number(url.searchParams.get('minScore'));
    const minScore = Number.isFinite(minScoreRaw) ? Math.max(1, Math.min(99, Math.floor(minScoreRaw))) : undefined;

    const crmLeadsRaw = await crmDb.lead.findMany({
      take: 250,
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        source: true,
        campaign: true,
      },
    });

    const crmLeads: LeadListItem[] = crmLeadsRaw.map((lead) => {
      const metadata = parseMetadata(lead.metadata);
      const metaCity = typeof metadata.city === 'string' ? metadata.city : typeof metadata.location === 'string' ? metadata.location : 'Unknown';
      const service =
        typeof metadata.projectCategory === 'string'
          ? metadata.projectCategory
          : lead.tags[0] || 'general-construction';
      const budget = toBudget(metadata.ballparkTotalUsd);

      return {
        id: lead.id,
        origin: 'crm',
        fullName: `${lead.firstName}${lead.lastName ? ` ${lead.lastName}` : ''}`,
        title: lead.jobTitle || 'Prospective Client',
        company: lead.company || 'Independent Client',
        website: undefined,
        email: lead.email || undefined,
        phone: lead.phone || undefined,
        city: metaCity,
        state: typeof metadata.state === 'string' ? metadata.state : undefined,
        serviceType: service,
        employeeRange: undefined,
        revenueRangeUsd: undefined,
        estimatedBudgetUsd: budget,
        stage: lead.stage,
        source: lead.source?.name || lead.campaign?.name || 'crm-intake',
        score: 0,
        tags: lead.tags,
        lastActivityAt: lead.updatedAt.toISOString(),
      };
    });

    const directoryRecords: LeadListItem[] = directoryLeads.map((lead) => ({
      ...lead,
      origin: 'directory',
      score: lead.fitBase,
    }));

    const merged = [...crmLeads, ...directoryRecords].map((record) => ({
      ...record,
      score: record.origin === 'directory' ? Math.max(record.score, computeFitScore(record, search)) : computeFitScore(record, search),
    }));

    const filtered = merged
      .filter((item) =>
        applyFilters(item, {
          search,
          city,
          serviceType,
          stage,
          employeeRange,
          revenueRangeUsd,
          origin,
          minBudget,
          maxBudget,
          minScore,
        })
      )
      .sort((a, b) => {
        if (sortBy === 'budget') {
          const budgetDelta = (b.estimatedBudgetUsd || 0) - (a.estimatedBudgetUsd || 0);
          if (budgetDelta !== 0) return budgetDelta;
        }

        if (sortBy === 'activity') {
          const activityDelta = b.lastActivityAt.localeCompare(a.lastActivityAt);
          if (activityDelta !== 0) return activityDelta;
        }

        if (b.score !== a.score) return b.score - a.score;
        return b.lastActivityAt.localeCompare(a.lastActivityAt);
      })
      .slice(0, limit);

    const crmCount = filtered.filter((item) => item.origin === 'crm').length;
    const directoryCount = filtered.length - crmCount;

    return jsonResponse({
      leads: filtered,
      count: filtered.length,
      sources: {
        crm: crmCount,
        directory: directoryCount,
      },
      filters: {
        search: search || null,
        city: city || null,
        serviceType: serviceType || null,
        stage: stage || null,
        employeeRange: employeeRange || null,
        revenueRangeUsd: revenueRangeUsd || null,
        origin,
        sortBy,
        minBudget: minBudget || null,
        maxBudget: maxBudget || null,
        minScore: minScore || null,
        limit,
      },
      notes:
        'Apollo-style lead intelligence combines your CRM records with a regional prospect directory and fit scoring.',
    });
  });
}
