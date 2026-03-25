import { ApiError, readJson } from '@/src/crm/core/api';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { requireOperatorAccess } from '@/src/security/operatorAuth';
import { runQualityGate } from '@/src/builder/quality-gate';

type QualityGateBody = {
  blueprint?: unknown;
  qualityTier?: unknown;
  metrics?: unknown;
  designChecks?: unknown;
  releaseMode?: unknown;
};

function parseBlueprint(value: unknown) {
  if (value === 'website' || value === 'app' || value === 'business' || value === 'game') {
    return value;
  }
  return 'app';
}

function parseQualityTier(value: unknown) {
  return value === 'premium' ? 'premium' : 'foundation';
}

function parseMetrics(value: unknown) {
  const metrics = value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

  const readNumber = (key: string) => {
    const parsed = Number(metrics[key]);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  return {
    lcpMs: readNumber('lcpMs'),
    ttiMs: readNumber('ttiMs'),
    cls: readNumber('cls'),
    accessibilityScore: readNumber('accessibilityScore'),
    seoScore: readNumber('seoScore'),
    conversionEventsCoverage: readNumber('conversionEventsCoverage'),
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

export async function GET() {
  return withApiHandler(async () => {
    return jsonResponse({
      notes: 'POST quality metrics to evaluate release readiness. Production apply paths should be blocked when passed=false.',
      qualityTiers: ['foundation', 'premium'],
      examples: [
        {
          blueprint: 'website',
          qualityTier: 'premium',
          metrics: {
            lcpMs: 1900,
            ttiMs: 2200,
            cls: 0.06,
            accessibilityScore: 93,
            seoScore: 91,
            conversionEventsCoverage: 90,
          },
          designChecks: ['tokenized spacing', 'typography scale', 'component states', 'motion standards'],
          releaseMode: 'production',
        },
      ],
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await requireOperatorAccess(request, { adminOnly: true });

    const body = await readJson<QualityGateBody>(request);
    const blueprint = parseBlueprint(body.blueprint);
    const qualityTier = parseQualityTier(body.qualityTier);
    const metrics = parseMetrics(body.metrics);
    const designChecks = parseDesignChecks(body.designChecks);
    const releaseMode = parseOptionalString(body.releaseMode) === 'production' ? 'production' : 'staging';

    const result = runQualityGate({
      blueprint,
      qualityTier,
      metrics,
      designChecks,
      releaseMode,
    });

    if (releaseMode === 'production' && !result.passed) {
      throw new ApiError(409, 'Quality gate failed for production release.', 'QUALITY_GATE_FAILED', {
        result,
      });
    }

    return jsonResponse({
      blueprint,
      qualityTier,
      releaseMode,
      result,
    });
  });
}
