import type { BlueprintType } from '@/src/builder/automation-blueprints';

export type QualityGateInput = {
  blueprint: BlueprintType;
  qualityTier: 'foundation' | 'premium';
  metrics: {
    lcpMs?: number;
    ttiMs?: number;
    cls?: number;
    accessibilityScore?: number;
    seoScore?: number;
    conversionEventsCoverage?: number;
  };
  designChecks?: string[];
  releaseMode?: 'staging' | 'production';
};

export type QualityGateResult = {
  score: number;
  passed: boolean;
  threshold: number;
  categoryScores: {
    performance: number;
    accessibility: number;
    seo: number;
    conversion: number;
    designSystem: number;
  };
  blockers: string[];
  recommendations: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function scorePerformance(input: QualityGateInput['metrics']) {
  const lcp = typeof input.lcpMs === 'number' ? input.lcpMs : 2800;
  const tti = typeof input.ttiMs === 'number' ? input.ttiMs : 3200;
  const cls = typeof input.cls === 'number' ? input.cls : 0.15;

  const lcpScore = clamp(100 - (lcp - 1800) / 20, 10, 100);
  const ttiScore = clamp(100 - (tti - 2200) / 22, 10, 100);
  const clsScore = clamp(100 - cls * 420, 10, 100);

  return Math.round((lcpScore + ttiScore + clsScore) / 3);
}

function scoreDesignSystem(checks: string[] | undefined) {
  if (!checks || checks.length === 0) return 50;

  const score = new Set(checks.map((item) => item.toLowerCase())).size * 12;
  return clamp(score, 40, 100);
}

export function runQualityGate(input: QualityGateInput): QualityGateResult {
  const performance = scorePerformance(input.metrics);
  const accessibility = clamp(Math.round(input.metrics.accessibilityScore ?? 78), 30, 100);
  const seo = clamp(Math.round(input.metrics.seoScore ?? 74), 25, 100);
  const conversion = clamp(Math.round(input.metrics.conversionEventsCoverage ?? 65), 20, 100);
  const designSystem = scoreDesignSystem(input.designChecks);

  const weighted =
    performance * 0.25 +
    accessibility * 0.2 +
    seo * 0.15 +
    conversion * 0.2 +
    designSystem * 0.2;

  const score = Math.round(weighted);
  const threshold = input.qualityTier === 'premium' ? 86 : 76;

  const blockers: string[] = [];
  if (performance < 72) blockers.push('Performance budget below release target.');
  if (accessibility < 80) blockers.push('Accessibility score is below 80.');
  if (conversion < 70) blockers.push('Conversion instrumentation coverage too low.');
  if (input.qualityTier === 'premium' && designSystem < 85) {
    blockers.push('Premium release requires a stronger design system consistency score.');
  }

  const recommendations: string[] = [];
  if (performance < 85) recommendations.push('Optimize render path, image loading, and script bundle boundaries.');
  if (accessibility < 90) recommendations.push('Improve contrast, focus states, and semantic labeling across templates.');
  if (seo < 88) recommendations.push('Expand metadata coverage and schema consistency by page type.');
  if (conversion < 85) recommendations.push('Track every CTA, form step, and completion event with explicit naming.');
  if (designSystem < 90) recommendations.push('Unify spacing, typography, and component token usage for premium consistency.');

  const passed = blockers.length === 0 && score >= threshold;

  return {
    score,
    passed,
    threshold,
    categoryScores: {
      performance,
      accessibility,
      seo,
      conversion,
      designSystem,
    },
    blockers,
    recommendations,
  };
}
