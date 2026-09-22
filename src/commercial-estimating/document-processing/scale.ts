/**
 * Drawing scale identification and verification.
 *
 * A scale annotation on a sheet is a *claim*, not a fact: sheets get rescaled
 * when they are plotted, viewports get their own scale, and details are often
 * drawn at a scale that differs from the sheet's title-block note. So a parsed
 * annotation is only ever `declared_unverified` until it is checked against a
 * labelled dimension measured off the real geometry.
 */

import { parseFeetInches, roundTo } from '../domain/units';
import type { DrawingScale, ScaleKind, ScaleVerificationStatus } from './types';

const POINTS_PER_INCH = 72;

export type ParsedScale = {
  raw: string;
  kind: ScaleKind;
  paperInches: number | null;
  realFeet: number | null;
  feetPerPoint: number | null;
};

function normalizeScaleText(raw: string): string {
  return raw
    .replace(/[′’]/g, "'")
    .replace(/[″”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function fractionToNumber(whole: string | undefined, num: string, den: string): number | null {
  const denominator = Number(den);
  if (!Number.isFinite(denominator) || denominator === 0) return null;
  const numerator = Number(num);
  if (!Number.isFinite(numerator)) return null;
  const base = whole ? Number(whole) : 0;
  if (!Number.isFinite(base)) return null;
  return base + numerator / denominator;
}

/** `1/4" = 1'-0"`, `3/32"=1'-0"`, `1 1/2" = 1'-0"`, `1" = 1'-0"` */
const ARCHITECTURAL = /(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)\s*"?\s*=\s*([\d'\-\s/"]+)|^(\d+(?:\.\d+)?)\s*"\s*=\s*([\d'\-\s/"]+)$/;

/** `1" = 20'`, `1"=100'-0"`, `1 IN = 50 FT` */
const ENGINEERING = /(\d+(?:\.\d+)?)\s*(?:"|in\b|inch(?:es)?)\s*=\s*(\d+(?:\.\d+)?)\s*(?:'|ft\b|feet\b|foot\b)/i;

/** `1:100`, `1 : 50` */
const RATIO = /\b(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\b/;

const NOT_TO_SCALE = /\b(?:n\.?t\.?s\.?|not\s+to\s+scale)\b/i;

/**
 * Parse a single scale annotation. Returns null when the text carries no
 * recoverable scale — callers must not invent one.
 */
export function parseScaleAnnotation(input: string): ParsedScale | null {
  const raw = normalizeScaleText(input);
  if (!raw) return null;

  // Strip a leading "SCALE:" label so the rest of the parsing is uniform.
  const body = raw.replace(/^scale\s*[:=]?\s*/i, '').trim();

  if (NOT_TO_SCALE.test(body)) {
    return { raw, kind: 'not_to_scale', paperInches: null, realFeet: null, feetPerPoint: null };
  }

  const architectural = body.match(ARCHITECTURAL);
  if (architectural) {
    const [, whole, num, den, archRight, decimalInches, decimalRight] = architectural;

    const paperInches = num && den ? fractionToNumber(whole, num, den) : Number(decimalInches);
    const rightSide = archRight ?? decimalRight;

    if (paperInches && Number.isFinite(paperInches) && paperInches > 0 && rightSide) {
      const realFeet = parseFeetInches(rightSide.trim());
      if (realFeet && realFeet > 0) {
        // Same arithmetic either way; the two conventions differ only in how
        // they are written. `1" = 20'` is an engineering scale, `1/4" = 1'-0"`
        // an architectural one.
        const kind: ScaleKind =
          realFeet > 1 && Number.isInteger(paperInches) ? 'engineering' : 'architectural';

        return {
          raw,
          kind,
          paperInches: roundTo(paperInches, 6),
          realFeet: roundTo(realFeet, 6),
          feetPerPoint: roundTo(realFeet / paperInches / POINTS_PER_INCH, 10),
        };
      }
    }
  }

  const engineering = body.match(ENGINEERING);
  if (engineering) {
    const paperInches = Number(engineering[1]);
    const realFeet = Number(engineering[2]);
    if (paperInches > 0 && realFeet > 0) {
      return {
        raw,
        kind: 'engineering',
        paperInches: roundTo(paperInches, 6),
        realFeet: roundTo(realFeet, 6),
        feetPerPoint: roundTo(realFeet / paperInches / POINTS_PER_INCH, 10),
      };
    }
  }

  const ratio = body.match(RATIO);
  if (ratio) {
    const left = Number(ratio[1]);
    const right = Number(ratio[2]);
    if (left > 0 && right > 0) {
      // A ratio is unitless: one paper inch represents (right/left) inches.
      const paperInches = 1;
      const realFeet = right / left / 12;
      return {
        raw,
        kind: 'ratio',
        paperInches,
        realFeet: roundTo(realFeet, 6),
        feetPerPoint: roundTo(realFeet / POINTS_PER_INCH, 10),
      };
    }
  }

  return null;
}

/** Text that is worth running through the scale parser at all. */
export function looksLikeScaleAnnotation(text: string): boolean {
  const normalized = normalizeScaleText(text);
  if (!normalized) return false;
  if (/scale/i.test(normalized)) return true;
  if (NOT_TO_SCALE.test(normalized)) return true;
  if (ARCHITECTURAL.test(normalized) || ENGINEERING.test(normalized)) return true;
  if (/^\s*\d+\s*:\s*\d+\s*$/.test(normalized)) return true;
  return false;
}

export type ScaleVerificationInput = {
  /** Candidate real feet per PDF point, from a parsed annotation. */
  feetPerPoint: number;
  /** A geometric distance measured off the page, in PDF points. */
  measuredPoints: number;
  /** The dimension the drawing labels that distance with, in feet. */
  labelledFeet: number;
  /** Allowed relative error before the annotation is treated as conflicting. */
  tolerance?: number;
};

export type ScaleVerificationResult = {
  status: ScaleVerificationStatus;
  /** Relative error between the labelled dimension and the scaled measurement. */
  relativeError: number;
  impliedFeetPerPoint: number;
};

/**
 * Check a declared scale against one labelled dimension. This is the only path
 * by which a scale is allowed to become `verified_against_dimension`.
 */
export function verifyScaleAgainstDimension(
  input: ScaleVerificationInput
): ScaleVerificationResult | null {
  const tolerance = input.tolerance ?? 0.02;
  if (input.measuredPoints <= 0 || input.labelledFeet <= 0 || input.feetPerPoint <= 0) {
    return null;
  }

  const impliedFeetPerPoint = input.labelledFeet / input.measuredPoints;
  const relativeError = Math.abs(impliedFeetPerPoint - input.feetPerPoint) / input.feetPerPoint;

  return {
    status: relativeError <= tolerance ? 'verified_against_dimension' : 'conflicted',
    relativeError: roundTo(relativeError, 6),
    impliedFeetPerPoint: roundTo(impliedFeetPerPoint, 10),
  };
}

/** A page with no usable scale. Never carries a fabricated conversion factor. */
export function unknownScale(candidates: string[] = [], notes: string[] = []): DrawingScale {
  return {
    raw: null,
    kind: 'unknown',
    paperInches: null,
    realFeet: null,
    feetPerPoint: null,
    verificationStatus: 'unknown',
    candidates,
    notes,
  };
}

/**
 * Resolve the page's scale from every annotation found on it.
 *
 * Multiple different scales on one sheet (very common: a plan plus enlarged
 * details) are reported rather than silently reduced to one, because measuring
 * the whole sheet at a detail's scale is exactly how a takeoff goes wrong.
 */
export function resolvePageScale(annotations: string[]): DrawingScale {
  const parsed = annotations
    .map((annotation) => parseScaleAnnotation(annotation))
    .filter((entry): entry is ParsedScale => entry !== null);

  if (parsed.length === 0) {
    return unknownScale(annotations, [
      'No drawing scale annotation was found. Measurements from this sheet require calibration.',
    ]);
  }

  const usable = parsed.filter((entry) => entry.feetPerPoint !== null);
  if (usable.length === 0) {
    return {
      raw: parsed[0].raw,
      kind: parsed[0].kind,
      paperInches: null,
      realFeet: null,
      feetPerPoint: null,
      verificationStatus: 'unknown',
      candidates: parsed.map((entry) => entry.raw),
      notes:
        parsed[0].kind === 'not_to_scale'
          ? ['Sheet is annotated NOT TO SCALE. Nothing on it may be measured geometrically.']
          : ['Scale annotation could not be converted to a usable factor.'],
    };
  }

  const distinct = new Set(usable.map((entry) => entry.feetPerPoint));
  const primary = usable[0];
  const notes: string[] = [];

  if (distinct.size > 1) {
    notes.push(
      `Sheet carries ${distinct.size} different scales (${usable
        .map((entry) => entry.raw)
        .join(' | ')}). Each measured region must be assigned its own scale before use.`
    );
  }
  notes.push('Scale was read from an annotation and has not been verified against a dimension.');

  return {
    raw: primary.raw,
    kind: primary.kind,
    paperInches: primary.paperInches,
    realFeet: primary.realFeet,
    feetPerPoint: primary.feetPerPoint,
    verificationStatus: 'declared_unverified',
    candidates: parsed.map((entry) => entry.raw),
    notes,
  };
}
