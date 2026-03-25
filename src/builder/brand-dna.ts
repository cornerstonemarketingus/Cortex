export type BrandTone = 'executive' | 'technical' | 'friendly' | 'bold';

export type BrandDnaProfile = {
  brandName: string;
  archetype: string;
  tone: BrandTone;
  visualStyle: string;
  primaryColor: string;
  accentColor: string;
  typographyDirection: string;
  motionStyle: string;
  trustSignals: string[];
  conversionBias: 'aggressive' | 'balanced' | 'consultative';
};

function asString(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeColor(value: unknown, fallback: string): string {
  const parsed = asString(value, fallback);
  if (/^#[0-9a-f]{6}$/i.test(parsed)) {
    return parsed;
  }
  return fallback;
}

function normalizeTone(value: unknown): BrandTone {
  const parsed = asString(value).toLowerCase();
  if (parsed === 'executive' || parsed === 'technical' || parsed === 'friendly' || parsed === 'bold') {
    return parsed;
  }
  return 'executive';
}

function normalizeConversionBias(value: unknown): BrandDnaProfile['conversionBias'] {
  const parsed = asString(value).toLowerCase();
  if (parsed === 'aggressive' || parsed === 'balanced' || parsed === 'consultative') {
    return parsed;
  }
  return 'balanced';
}

function normalizeTrustSignals(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return ['Case studies', 'Client logos', 'Performance benchmarks'];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 8);
}

export function normalizeBrandDnaProfile(value: unknown): BrandDnaProfile {
  const payload = value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

  return {
    brandName: asString(payload.brandName, 'Cortex Signature Studio'),
    archetype: asString(payload.archetype, 'Strategic Operator'),
    tone: normalizeTone(payload.tone),
    visualStyle: asString(payload.visualStyle, 'High-contrast editorial minimalism'),
    primaryColor: normalizeColor(payload.primaryColor, '#0b132b'),
    accentColor: normalizeColor(payload.accentColor, '#22d3ee'),
    typographyDirection: asString(payload.typographyDirection, 'Bold display headlines with technical body rhythm'),
    motionStyle: asString(payload.motionStyle, 'Purposeful staggered reveals and directional transitions'),
    trustSignals: normalizeTrustSignals(payload.trustSignals),
    conversionBias: normalizeConversionBias(payload.conversionBias),
  };
}
