import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'node:crypto';

export const LANDING_EVENT_TYPES = [
  'hero_view',
  'cta_click',
  'pricing_roi_calculated',
  'demo_step_run',
  'demo_completed',
] as const;

export type LandingEventType = (typeof LANDING_EVENT_TYPES)[number];
export type HeroVariant = 'A' | 'B';

export type LandingEventRecord = {
  id: string;
  createdAt: string;
  eventType: LandingEventType;
  variant?: HeroVariant;
  ctaId?: string;
  metadata?: Record<string, unknown>;
};

type LandingEventStore = {
  version: number;
  updatedAt: string;
  events: LandingEventRecord[];
};

export type LandingSummary = {
  totalEvents: number;
  heroViews: Record<HeroVariant, number>;
  ctaClicksByVariant: Record<HeroVariant, number>;
  ctaClicksById: Record<string, number>;
  roiCalculations: number;
  demoStepRuns: number;
  demoCompletions: number;
  updatedAt: string;
};

const STORE_PATH = path.join(process.cwd(), 'apps', 'current_app', 'analytics', 'landing_events.json');

function defaultStore(): LandingEventStore {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    events: [],
  };
}

function normalizeVariant(value: unknown): HeroVariant | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toUpperCase();
  return normalized === 'A' || normalized === 'B' ? normalized : undefined;
}

function normalizeCtaId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  return normalized.slice(0, 80);
}

function normalizeMetadata(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const metadata = value as Record<string, unknown>;
  const entries = Object.entries(metadata).slice(0, 16);
  const normalized: Record<string, unknown> = {};

  for (const [keyRaw, rawValue] of entries) {
    const key = keyRaw.trim().slice(0, 48);
    if (!key) continue;

    if (
      typeof rawValue === 'string' ||
      typeof rawValue === 'number' ||
      typeof rawValue === 'boolean' ||
      rawValue === null
    ) {
      normalized[key] = rawValue;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

async function ensureStore() {
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(defaultStore(), null, 2), 'utf-8');
  }
}

async function readStore(): Promise<LandingEventStore> {
  await ensureStore();
  try {
    const content = await fs.readFile(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(content) as Partial<LandingEventStore>;

    if (!parsed || !Array.isArray(parsed.events)) {
      return defaultStore();
    }

    return {
      version: Number(parsed.version) || 1,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      events: parsed.events,
    };
  } catch {
    return defaultStore();
  }
}

async function writeStore(store: LandingEventStore) {
  const payload: LandingEventStore = {
    version: 1,
    updatedAt: new Date().toISOString(),
    events: store.events,
  };

  await fs.writeFile(STORE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
}

export function isLandingEventType(value: unknown): value is LandingEventType {
  return typeof value === 'string' && LANDING_EVENT_TYPES.includes(value as LandingEventType);
}

export async function recordLandingEvent(input: {
  eventType: LandingEventType;
  variant?: unknown;
  ctaId?: unknown;
  metadata?: unknown;
}) {
  const store = await readStore();

  const event: LandingEventRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    eventType: input.eventType,
    variant: normalizeVariant(input.variant),
    ctaId: normalizeCtaId(input.ctaId),
    metadata: normalizeMetadata(input.metadata),
  };

  store.events.unshift(event);
  store.events = store.events.slice(0, 5000);
  await writeStore(store);

  return event;
}

function summarizeEvents(events: LandingEventRecord[]): LandingSummary {
  const heroViews: Record<HeroVariant, number> = { A: 0, B: 0 };
  const ctaClicksByVariant: Record<HeroVariant, number> = { A: 0, B: 0 };
  const ctaClicksById: Record<string, number> = {};

  let roiCalculations = 0;
  let demoStepRuns = 0;
  let demoCompletions = 0;

  for (const event of events) {
    if (event.eventType === 'hero_view' && event.variant) {
      heroViews[event.variant] += 1;
    }

    if (event.eventType === 'cta_click') {
      if (event.variant) ctaClicksByVariant[event.variant] += 1;
      if (event.ctaId) {
        ctaClicksById[event.ctaId] = (ctaClicksById[event.ctaId] || 0) + 1;
      }
    }

    if (event.eventType === 'pricing_roi_calculated') {
      roiCalculations += 1;
    }

    if (event.eventType === 'demo_step_run') {
      demoStepRuns += 1;
    }

    if (event.eventType === 'demo_completed') {
      demoCompletions += 1;
    }
  }

  return {
    totalEvents: events.length,
    heroViews,
    ctaClicksByVariant,
    ctaClicksById,
    roiCalculations,
    demoStepRuns,
    demoCompletions,
    updatedAt: new Date().toISOString(),
  };
}

export async function summarizeLandingEvents() {
  const store = await readStore();
  return summarizeEvents(store.events);
}

export async function listRecentLandingEvents(limit = 30) {
  const store = await readStore();
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 200));
  return store.events.slice(0, safeLimit);
}
