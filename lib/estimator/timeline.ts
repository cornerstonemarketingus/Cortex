/**
 * Trade Timeline Engine
 * Produces sequenced construction phases based on industry-standard dependencies.
 * Accounts for parallel trades, crew assumptions, and sqft-based durations.
 */

export interface TimelinePhase {
  tradeName: string;
  tradeId: string;
  startDay: number;
  durationDays: number;
  endDay: number;
  parallel?: boolean;
  dependsOn?: string[];
  crew: number;
  notes: string;
}

// Trade sequencing rules: which trades must finish before this one starts
const DEPENDENCIES: Record<string, string[]> = {
  'commercial-framing': [],
  'residential-framing': [],
  'concrete-foundation': [],
  'electrical-rough': ['residential-framing', 'commercial-framing'],
  'plumbing-rough': ['residential-framing', 'commercial-framing'],
  'drywall-finish': ['electrical-rough', 'plumbing-rough'],
  'painting-interior': ['drywall-finish'],
  'painting-exterior': ['residential-framing', 'commercial-framing'],
  'flooring-hardwood': ['painting-interior'],
  'flooring-tile': ['painting-interior'],
  'doors-interior': ['drywall-finish'],
  'doors-exterior': ['residential-framing', 'commercial-framing'],
  'windows-standard': ['residential-framing', 'commercial-framing'],
  'windows-premium': ['residential-framing', 'commercial-framing'],
  'roofing-shingle': ['residential-framing', 'commercial-framing'],
  'roofing-metal': ['residential-framing', 'commercial-framing'],
};

// Crew sizes by trade (workers)
const CREW_SIZE: Record<string, number> = {
  'residential-framing': 4,
  'commercial-framing': 5,
  'concrete-foundation': 6,
  'electrical-rough': 2,
  'plumbing-rough': 2,
  'drywall-finish': 3,
  'painting-interior': 2,
  'painting-exterior': 3,
  'flooring-hardwood': 2,
  'flooring-tile': 2,
  'doors-interior': 1,
  'doors-exterior': 2,
  'windows-standard': 2,
  'windows-premium': 2,
  'roofing-shingle': 4,
  'roofing-metal': 5,
};

// sqft → days formula per trade (with crew factored in)
function estimateDays(tradeId: string, sqft: number): number {
  const crew = CREW_SIZE[tradeId] ?? 2;
  const baseRates: Record<string, number> = {
    'residential-framing': 0.006,
    'commercial-framing': 0.008,
    'concrete-foundation': 0.004,
    'electrical-rough': 0.003,
    'plumbing-rough': 0.003,
    'drywall-finish': 0.004,
    'painting-interior': 0.002,
    'painting-exterior': 0.003,
    'flooring-hardwood': 0.002,
    'flooring-tile': 0.003,
    'doors-interior': 0.5,   // fixed days
    'doors-exterior': 1,
    'windows-standard': 0.5,
    'windows-premium': 1,
    'roofing-shingle': 0.004,
    'roofing-metal': 0.005,
  };
  const rate = baseRates[tradeId] ?? 0.003;
  const raw = rate * sqft / crew;
  return Math.max(1, Math.round(raw));
}

function getTradeName(tradeId: string): string {
  const names: Record<string, string> = {
    'residential-framing': 'Residential Framing',
    'commercial-framing': 'Commercial Framing',
    'concrete-foundation': 'Concrete / Foundation',
    'electrical-rough': 'Electrical (Rough-in)',
    'plumbing-rough': 'Plumbing (Rough-in)',
    'drywall-finish': 'Drywall & Finish',
    'painting-interior': 'Interior Painting',
    'painting-exterior': 'Exterior Painting',
    'flooring-hardwood': 'Hardwood Flooring',
    'flooring-tile': 'Tile Flooring',
    'doors-interior': 'Interior Doors',
    'doors-exterior': 'Exterior Doors',
    'windows-standard': 'Windows (Standard)',
    'windows-premium': 'Windows (Premium)',
    'roofing-shingle': 'Roofing (Shingle)',
    'roofing-metal': 'Roofing (Metal)',
  };
  return names[tradeId] ?? tradeId;
}

// Trades that can run parallel with each other
const PARALLEL_GROUPS = [
  new Set(['electrical-rough', 'plumbing-rough']),
  new Set(['painting-exterior', 'painting-interior']),
  new Set(['flooring-hardwood', 'flooring-tile']),
];

function isParallel(a: string, b: string): boolean {
  return PARALLEL_GROUPS.some((group) => group.has(a) && group.has(b));
}

export function computeTimeline(tradeIds: string[], sqft: number): TimelinePhase[] {
  if (tradeIds.length === 0) return [];

  const phases: TimelinePhase[] = [];
  const endDayByTrade: Record<string, number> = {};

  for (const tradeId of tradeIds) {
    const deps = (DEPENDENCIES[tradeId] ?? []).filter((dep) => tradeIds.includes(dep));
    const duration = estimateDays(tradeId, sqft);
    const crew = CREW_SIZE[tradeId] ?? 2;

    // Start day = max end day of dependencies (+ 1), or day 1
    let startDay = 1;
    if (deps.length > 0) {
      const depEnd = Math.max(...deps.map((d) => endDayByTrade[d] ?? 0));
      startDay = depEnd + 1;
    }

    // Check if this trade can start in parallel with another already-scheduled trade
    const alreadyScheduled = phases.find((p) => isParallel(p.tradeId, tradeId) && p.startDay === startDay);
    const parallel = !!alreadyScheduled;

    const endDay = startDay + duration - 1;
    endDayByTrade[tradeId] = endDay;

    phases.push({
      tradeId,
      tradeName: getTradeName(tradeId),
      startDay,
      durationDays: duration,
      endDay,
      parallel,
      dependsOn: deps.length > 0 ? deps.map(getTradeName) : undefined,
      crew,
      notes: parallel
        ? `Can run concurrently with other scheduled trades`
        : deps.length > 0
        ? `Follows: ${deps.map(getTradeName).join(', ')}`
        : 'Can begin immediately',
    });
  }

  // Sort by start day
  phases.sort((a, b) => a.startDay - b.startDay);
  return phases;
}
