/**
 * Deterministic unit handling for commercial takeoff.
 *
 * Every quantity produced by the commercial estimating domain stores both its
 * original unit (as read from the drawing/schedule) and a normalized canonical
 * unit, so downstream pricing arithmetic never has to guess.
 *
 * All conversion is plain arithmetic — no AI is involved at any point.
 */

export const LENGTH_UNITS = ['in', 'ft', 'yd', 'mm', 'cm', 'm'] as const;
export const AREA_UNITS = ['sqin', 'sqft', 'sqyd', 'sqm'] as const;
export const VOLUME_UNITS = ['cuin', 'cuft', 'cuyd', 'cum'] as const;
export const COUNT_UNITS = ['ea'] as const;

export type LengthUnit = (typeof LENGTH_UNITS)[number];
export type AreaUnit = (typeof AREA_UNITS)[number];
export type VolumeUnit = (typeof VOLUME_UNITS)[number];
export type CountUnit = (typeof COUNT_UNITS)[number];
export type MeasurementUnit = LengthUnit | AreaUnit | VolumeUnit | CountUnit;

export type UnitDimension = 'length' | 'area' | 'volume' | 'count';

export const UNIT_DIMENSIONS: Record<MeasurementUnit, UnitDimension> = {
  in: 'length',
  ft: 'length',
  yd: 'length',
  mm: 'length',
  cm: 'length',
  m: 'length',
  sqin: 'area',
  sqft: 'area',
  sqyd: 'area',
  sqm: 'area',
  cuin: 'volume',
  cuft: 'volume',
  cuyd: 'volume',
  cum: 'volume',
  ea: 'count',
};

/** Canonical unit each dimension normalizes to. */
export const CANONICAL_UNITS: Record<UnitDimension, MeasurementUnit> = {
  length: 'ft',
  area: 'sqft',
  volume: 'cuft',
  count: 'ea',
};

/** Multiplier that converts one unit into its dimension's canonical unit. */
const TO_CANONICAL: Record<MeasurementUnit, number> = {
  in: 1 / 12,
  ft: 1,
  yd: 3,
  mm: 1 / 304.8,
  cm: 1 / 30.48,
  m: 1 / 0.3048,
  sqin: 1 / 144,
  sqft: 1,
  sqyd: 9,
  sqm: 1 / (0.3048 * 0.3048),
  cuin: 1 / 1728,
  cuft: 1,
  cuyd: 27,
  cum: 1 / (0.3048 * 0.3048 * 0.3048),
  ea: 1,
};

/**
 * Construction shorthand that estimators actually type, mapped onto the
 * canonical unit identifiers. Unknown labels return null rather than a guess.
 */
const UNIT_ALIASES: Record<string, MeasurementUnit> = {
  in: 'in',
  inch: 'in',
  inches: 'in',
  '"': 'in',
  ft: 'ft',
  foot: 'ft',
  feet: 'ft',
  lf: 'ft',
  'lin ft': 'ft',
  'linear ft': 'ft',
  'linear feet': 'ft',
  "'": 'ft',
  yd: 'yd',
  yard: 'yd',
  yards: 'yd',
  mm: 'mm',
  cm: 'cm',
  m: 'm',
  meter: 'm',
  metre: 'm',
  sf: 'sqft',
  sqft: 'sqft',
  'sq ft': 'sqft',
  'sq. ft.': 'sqft',
  'square ft': 'sqft',
  'square feet': 'sqft',
  sqin: 'sqin',
  'sq in': 'sqin',
  'square inches': 'sqin',
  sy: 'sqyd',
  sqyd: 'sqyd',
  'sq yd': 'sqyd',
  'square yard': 'sqyd',
  'square yards': 'sqyd',
  sqm: 'sqm',
  'sq m': 'sqm',
  cf: 'cuft',
  cuft: 'cuft',
  'cu ft': 'cuft',
  'cubic ft': 'cuft',
  'cubic feet': 'cuft',
  cy: 'cuyd',
  cuyd: 'cuyd',
  'cu yd': 'cuyd',
  'cubic yard': 'cuyd',
  'cubic yards': 'cuyd',
  cum: 'cum',
  'cu m': 'cum',
  cuin: 'cuin',
  'cu in': 'cuin',
  ea: 'ea',
  each: 'ea',
  count: 'ea',
  qty: 'ea',
  no: 'ea',
  pcs: 'ea',
  piece: 'ea',
  pieces: 'ea',
};

export function isMeasurementUnit(value: string): value is MeasurementUnit {
  return Object.prototype.hasOwnProperty.call(UNIT_DIMENSIONS, value);
}

/** Resolve a free-text unit label ("LF", "sq. ft.", "CY") to a canonical unit id. */
export function normalizeUnitLabel(raw: string): MeasurementUnit | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  if (isMeasurementUnit(trimmed)) return trimmed;

  const collapsed = trimmed.replace(/\s+/g, ' ');
  if (UNIT_ALIASES[collapsed]) return UNIT_ALIASES[collapsed];

  const stripped = collapsed.replace(/[.]/g, '').trim();
  if (UNIT_ALIASES[stripped]) return UNIT_ALIASES[stripped];
  if (isMeasurementUnit(stripped)) return stripped;

  return null;
}

export function unitDimension(unit: MeasurementUnit): UnitDimension {
  return UNIT_DIMENSIONS[unit];
}

export class UnitConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnitConversionError';
  }
}

/** Convert between two units of the same dimension. Throws across dimensions. */
export function convertQuantity(value: number, from: MeasurementUnit, to: MeasurementUnit): number {
  if (!Number.isFinite(value)) {
    throw new UnitConversionError(`Quantity must be a finite number, received ${String(value)}`);
  }

  const fromDimension = UNIT_DIMENSIONS[from];
  const toDimension = UNIT_DIMENSIONS[to];
  if (fromDimension !== toDimension) {
    throw new UnitConversionError(
      `Cannot convert ${from} (${fromDimension}) to ${to} (${toDimension}) — dimensions differ.`
    );
  }

  return (value * TO_CANONICAL[from]) / TO_CANONICAL[to];
}

export type NormalizedQuantity = {
  value: number;
  unit: MeasurementUnit;
  dimension: UnitDimension;
};

/** Normalize a quantity onto its dimension's canonical unit (ft / sqft / cuft / ea). */
export function toCanonicalQuantity(value: number, unit: MeasurementUnit): NormalizedQuantity {
  const dimension = UNIT_DIMENSIONS[unit];
  const canonical = CANONICAL_UNITS[dimension];
  return {
    value: convertQuantity(value, unit, canonical),
    unit: canonical,
    dimension,
  };
}

/**
 * Parse an architectural dimension string such as `12'-6"`, `24' - 0 1/2"`,
 * `145'`, or `6"` into decimal feet. Returns null when the text is not a
 * dimension — callers must never substitute a guess for a null result.
 */
export function parseFeetInches(raw: string): number | null {
  const text = raw.trim().replace(/[′’]/g, "'").replace(/[″”]/g, '"');
  if (!text) return null;

  const pattern =
    /^(?:(\d+(?:\.\d+)?)\s*'\s*)?(?:-\s*)?(?:(\d+(?:\.\d+)?)(?:\s+(\d+)\/(\d+))?\s*"|(\d+)\/(\d+)\s*")?$/;
  const match = text.match(pattern);
  if (!match) return null;

  const [, feetRaw, inchesRaw, mixedNum, mixedDen, bareNum, bareDen] = match;
  if (!feetRaw && !inchesRaw && !bareNum) return null;

  let feet = feetRaw ? Number(feetRaw) : 0;
  let inches = inchesRaw ? Number(inchesRaw) : 0;

  if (mixedNum && mixedDen && Number(mixedDen) !== 0) {
    inches += Number(mixedNum) / Number(mixedDen);
  }
  if (bareNum && bareDen && Number(bareDen) !== 0) {
    inches += Number(bareNum) / Number(bareDen);
  }

  if (!Number.isFinite(feet) || !Number.isFinite(inches)) return null;
  feet += inches / 12;

  return feet > 0 ? feet : null;
}

/** Round to a fixed number of decimals without accumulating float noise. */
export function roundTo(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
