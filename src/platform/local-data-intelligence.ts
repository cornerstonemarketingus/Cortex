type IngestRecord = {
  id: string;
  createdAt: Date;
  payload: Record<string, unknown>;
};

export type LocalMarketSignal = {
  key: string;
  score: number;
  reason: string;
};

export type LocalDataIntelligenceReport = {
  tenantId: string;
  generatedAt: string;
  totalRecords: number;
  byKind: Array<{ kind: string; count: number }>;
  byZip: Array<{ zip: string; count: number }>;
  topSignals: LocalMarketSignal[];
  opportunities: string[];
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function safeLower(value: unknown): string {
  return asString(value).toLowerCase();
}

function increment(map: Map<string, number>, key: string) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
}

function scoreSignal(key: string, count: number, total: number): LocalMarketSignal {
  const ratio = total > 0 ? count / total : 0;
  const volumeScore = Math.min(100, Math.round(ratio * 140));

  return {
    key,
    score: volumeScore,
    reason: `${count} matching records (${Math.round(ratio * 100)}% of ingest volume).`,
  };
}

export function generateLocalDataIntelligenceReport(params: {
  tenantId: string;
  records: IngestRecord[];
  search?: string;
}): LocalDataIntelligenceReport {
  const search = safeLower(params.search);
  const filtered = params.records.filter((record) => {
    if (!search) return true;
    const content = safeLower(asRecord(record.payload).content);
    return content.includes(search);
  });

  const byKindMap = new Map<string, number>();
  const byZipMap = new Map<string, number>();
  const signalMap = new Map<string, number>();

  for (const record of filtered) {
    const payload = asRecord(record.payload);
    const kind = safeLower(payload.kind) || 'unknown';
    const location = asRecord(payload.location);
    const zip = safeLower(location.zip) || 'unknown';
    const content = safeLower(payload.content);

    increment(byKindMap, kind);
    increment(byZipMap, zip);

    if (/urgent|asap|today|immediately/.test(content)) increment(signalMap, 'urgent-demand');
    if (/price|quote|estimate|budget/.test(content)) increment(signalMap, 'price-sensitive-demand');
    if (/repair|broken|issue|problem/.test(content)) increment(signalMap, 'repair-intent');
    if (/install|upgrade|new build/.test(content)) increment(signalMap, 'new-install-intent');
    if (/commercial|business/.test(content)) increment(signalMap, 'commercial-opportunity');
  }

  const byKind = Array.from(byKindMap.entries())
    .map(([kind, count]) => ({ kind, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const byZip = Array.from(byZipMap.entries())
    .map(([zip, count]) => ({ zip, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const total = filtered.length;
  const topSignals = Array.from(signalMap.entries())
    .map(([key, count]) => scoreSignal(key, count, total))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const opportunities: string[] = [];
  if (topSignals.some((signal) => signal.key === 'urgent-demand' && signal.score >= 30)) {
    opportunities.push('Launch an emergency-response funnel with instant callback SLA under 5 minutes.');
  }
  if (topSignals.some((signal) => signal.key === 'price-sensitive-demand' && signal.score >= 25)) {
    opportunities.push('Create transparent pricing/estimate calculator pages by top ZIP clusters.');
  }
  if (topSignals.some((signal) => signal.key === 'commercial-opportunity' && signal.score >= 20)) {
    opportunities.push('Spin up commercial-service landing pages and B2B follow-up sequences.');
  }
  if (opportunities.length === 0) {
    opportunities.push('Increase ingest volume and source diversity to unlock stronger locality signals.');
  }

  return {
    tenantId: params.tenantId,
    generatedAt: new Date().toISOString(),
    totalRecords: total,
    byKind,
    byZip,
    topSignals,
    opportunities,
  };
}
