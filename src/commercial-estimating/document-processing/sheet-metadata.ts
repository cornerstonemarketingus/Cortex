/**
 * Sheet identity, revision and matchline recognition from extracted text.
 *
 * Everything here is deterministic pattern matching over text spans that were
 * read out of the PDF, with the span's coordinates kept so an estimator can
 * click straight back to where the value was found.
 */

import type {
  BoundingBox,
  MatchlineReference,
  RevisionEntry,
  SheetIdentity,
  SheetRole,
  TextSpan,
} from './types';

const DISCIPLINE_NAMES: Record<string, string> = {
  G: 'General',
  T: 'Title / Index',
  C: 'Civil',
  L: 'Landscape',
  S: 'Structural',
  A: 'Architectural',
  I: 'Interiors',
  ID: 'Interior Design',
  Q: 'Equipment',
  F: 'Fire Protection',
  FP: 'Fire Protection',
  P: 'Plumbing',
  D: 'Process',
  M: 'Mechanical',
  E: 'Electrical',
  W: 'Distributed Energy',
  X: 'Other Disciplines',
  H: 'Hazardous Materials',
  R: 'Resource',
  AV: 'Audio Visual',
  TS: 'Telecommunications',
};

/**
 * Sheet numbers follow the US National CAD Standard closely enough to match
 * deterministically: a discipline designator, then a sheet type and sequence.
 * Examples matched: A101, A-101, A1.01, M2.01A, FP-201, ID101.
 */
const SHEET_NUMBER = /^([A-Z]{1,2})\s*[-.]?\s*(\d{1,2}(?:[.-]\d{1,3})?\d*[A-Z]?)$/;

const SHEET_TITLE_KEYWORDS: Array<{ pattern: RegExp; role: SheetRole }> = [
  { pattern: /reflected\s+ceiling\s+plan/i, role: 'reflected_ceiling_plan' },
  { pattern: /enlarged\s+(?:floor\s+)?plan/i, role: 'enlarged_plan' },
  { pattern: /finish\s+(?:schedule|plan)/i, role: 'schedule' },
  { pattern: /\bschedule[s]?\b/i, role: 'schedule' },
  { pattern: /\bdetail[s]?\b/i, role: 'detail' },
  { pattern: /\belevation[s]?\b/i, role: 'elevation' },
  { pattern: /\bsection[s]?\b/i, role: 'section' },
  { pattern: /\b(?:cover|title)\s+sheet\b|sheet\s+index/i, role: 'cover' },
  { pattern: /\bspecification[s]?\b/i, role: 'specification' },
  { pattern: /\bplan\b/i, role: 'plan' },
];

const REVISION_PATTERNS: RegExp[] = [
  /\brev(?:ision)?\.?\s*(?:no\.?|#|:)?\s*([A-Z0-9]{1,3})\b/i,
  /\bissue\s*(?:no\.?|#|:)?\s*([A-Z0-9]{1,3})\b/i,
  /^[Δ∆]\s*([A-Z0-9]{1,3})$/,
];

const DATE_PATTERN = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/;

const MATCHLINE_PATTERN = /\bmatch\s*-?\s*line\b/i;
const MATCHLINE_SHEET_REF = /\b(?:see|to|refer\s+to|sheet)\s+([A-Z]{1,2}\s*[-.]?\s*\d{1,2}(?:[.-]\d{1,3})?\d*[A-Z]?)\b/i;

function canonicalSheetNumber(designator: string, sequence: string): string {
  return `${designator.toUpperCase()}${sequence.toUpperCase().replace(/\s+/g, '')}`;
}

export function parseSheetNumber(text: string): { sheetNumber: string; discipline: string | null } | null {
  const candidate = text.trim().toUpperCase().replace(/\s+/g, ' ');
  if (candidate.length < 2 || candidate.length > 12) return null;

  const match = candidate.match(SHEET_NUMBER);
  if (!match) return null;

  const designator = match[1];
  const sequence = match[2];

  // A bare two-letter designator with no digits is not a sheet number.
  if (!/\d/.test(sequence)) return null;

  return {
    sheetNumber: canonicalSheetNumber(designator, sequence),
    discipline: DISCIPLINE_NAMES[designator] ?? null,
  };
}

export function classifySheetRole(title: string | null): SheetRole {
  if (!title) return 'unknown';
  for (const entry of SHEET_TITLE_KEYWORDS) {
    if (entry.pattern.test(title)) return entry.role;
  }
  return 'unknown';
}

/**
 * Title blocks live along the right edge or bottom edge of a sheet. We look
 * there first and fall back to scanning the whole page, recording which path
 * produced the answer.
 */
function titleBlockSpans(spans: TextSpan[], widthPt: number, heightPt: number): TextSpan[] {
  const rightEdge = widthPt * 0.7;
  const bottomEdge = heightPt * 0.3;

  return spans.filter((span) => {
    const inRightBand = span.bbox.x >= rightEdge;
    const inBottomBand = span.bbox.y <= bottomEdge;
    return inRightBand || inBottomBand;
  });
}

function isTitleCandidate(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 4 || trimmed.length > 80) return false;
  if (!/[A-Za-z]/.test(trimmed)) return false;
  if (parseSheetNumber(trimmed)) return false;
  return SHEET_TITLE_KEYWORDS.some((entry) => entry.pattern.test(trimmed));
}

export function identifySheet(params: {
  spans: TextSpan[];
  widthPt: number;
  heightPt: number;
}): SheetIdentity {
  const { spans, widthPt, heightPt } = params;

  const scoped = titleBlockSpans(spans, widthPt, heightPt);
  const searchOrder: Array<{ spans: TextSpan[]; source: SheetIdentity['source'] }> = [
    { spans: scoped, source: 'title_block' },
    { spans, source: 'page_scan' },
  ];

  for (const { spans: pool, source } of searchOrder) {
    // Prefer the largest-font sheet number: title blocks set it in the biggest type.
    const numberMatches = pool
      .map((span) => ({ span, parsed: parseSheetNumber(span.text) }))
      .filter((entry): entry is { span: TextSpan; parsed: { sheetNumber: string; discipline: string | null } } =>
        entry.parsed !== null
      )
      .sort((a, b) => b.span.fontHeightPt - a.span.fontHeightPt);

    if (numberMatches.length === 0) continue;

    const best = numberMatches[0];
    const titleSpan = pool
      .filter((span) => isTitleCandidate(span.text))
      .sort((a, b) => b.fontHeightPt - a.fontHeightPt)[0];

    const sheetTitle = titleSpan ? titleSpan.text.trim().replace(/\s+/g, ' ') : null;

    return {
      sheetNumber: best.parsed.sheetNumber,
      sheetTitle,
      discipline: best.parsed.discipline,
      role: classifySheetRole(sheetTitle),
      source,
      matchStrength: source === 'title_block' ? (sheetTitle ? 0.9 : 0.7) : sheetTitle ? 0.6 : 0.45,
    };
  }

  const titleOnly = spans
    .filter((span) => isTitleCandidate(span.text))
    .sort((a, b) => b.fontHeightPt - a.fontHeightPt)[0];

  return {
    sheetNumber: null,
    sheetTitle: titleOnly ? titleOnly.text.trim().replace(/\s+/g, ' ') : null,
    discipline: null,
    role: classifySheetRole(titleOnly ? titleOnly.text : null),
    source: 'not_found',
    matchStrength: 0,
  };
}

export function extractRevisions(spans: TextSpan[]): RevisionEntry[] {
  const found = new Map<string, RevisionEntry>();

  for (const span of spans) {
    const text = span.text.trim();
    if (!text || text.length > 120) continue;

    for (const pattern of REVISION_PATTERNS) {
      const match = text.match(pattern);
      if (!match) continue;

      const revision = match[1].toUpperCase();
      // Guard against matching an unrelated word that merely starts with "rev".
      if (!/^[A-Z0-9]{1,3}$/.test(revision)) continue;

      const dateMatch = text.match(DATE_PATTERN);
      const entry: RevisionEntry = {
        revision,
        description: text.replace(pattern, '').replace(DATE_PATTERN, '').replace(/\s+/g, ' ').trim() || null,
        date: dateMatch ? dateMatch[1] : null,
        raw: text,
      };

      if (!found.has(revision)) {
        found.set(revision, entry);
      }
      break;
    }
  }

  return [...found.values()].sort((a, b) => a.revision.localeCompare(b.revision));
}

/**
 * Matchlines are how a commercial package splits one floor across sheets. We
 * record them in V1 so Phase 2 reconciliation has the references it needs; no
 * quantity is de-duplicated here.
 */
export function extractMatchlines(spans: TextSpan[]): MatchlineReference[] {
  const results: MatchlineReference[] = [];

  for (const span of spans) {
    const text = span.text.trim().replace(/\s+/g, ' ');
    if (!MATCHLINE_PATTERN.test(text)) continue;

    const refMatch = text.match(MATCHLINE_SHEET_REF);
    const referenced = refMatch ? parseSheetNumber(refMatch[1]) : null;

    results.push({
      raw: text,
      referencedSheet: referenced ? referenced.sheetNumber : null,
      bbox: { ...span.bbox } satisfies BoundingBox,
    });
  }

  return results;
}
