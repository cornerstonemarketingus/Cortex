/**
 * Structured document-extraction models.
 *
 * These are the only shapes the rest of the commercial estimating domain is
 * allowed to consume. Nothing here contains a construction quantity — this
 * layer reports *what the document literally contains* (text, coordinates,
 * geometry, sheet metadata) and how much of it we were able to verify.
 */

import type { MeasurementValidationStatus } from '../domain/measurement';

/** PDF user-space box. Origin is bottom-left; units are PDF points (1/72 inch). */
export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Point = { x: number; y: number };

export type TextSpan = {
  id: string;
  text: string;
  bbox: BoundingBox;
  /** Nominal glyph height in points, from the text matrix. */
  fontHeightPt: number;
  /** Baseline rotation in degrees, counter-clockwise from horizontal. */
  rotationDeg: number;
  extractionMethod: 'pdf_embedded_text';
};

export type PathSubpath = {
  closed: boolean;
  /** Vertices in PDF user space after the current transformation matrix is applied. */
  points: Point[];
};

export type PathKind =
  /** Geometry that could represent physical construction. Still requires Phase 2 proof. */
  | 'construction_candidate'
  | 'dimension_line'
  | 'gridline'
  | 'annotation'
  | 'hatching'
  | 'border'
  | 'unclassified';

export type PathClassification = {
  kind: PathKind;
  /** Plain-language reasons, preserved so an estimator can audit the decision. */
  reasons: string[];
};

export type VectorPath = {
  id: string;
  subpaths: PathSubpath[];
  bbox: BoundingBox;
  /** Total stroked length of all subpaths, in PDF points. */
  lengthPt: number;
  /** Line width in points after the CTM scale is applied. */
  strokeWidthPt: number;
  stroked: boolean;
  filled: boolean;
  /** True when the path is a single straight two-point segment. */
  isStraightSegment: boolean;
  /** Segment orientation in degrees [0,180), only set for straight segments. */
  angleDeg: number | null;
  classification: PathClassification;
};

export type RasterPlacement = {
  id: string;
  bbox: BoundingBox;
  /** Fraction of the page area this image covers, 0..1. */
  pageCoverage: number;
};

export type ScaleKind = 'architectural' | 'engineering' | 'ratio' | 'not_to_scale' | 'unknown';

export type ScaleVerificationStatus =
  /** Found a scale annotation but have not checked it against a labelled dimension. */
  | 'declared_unverified'
  /** Annotation agrees with at least one labelled dimension measured off the geometry. */
  | 'verified_against_dimension'
  /** Annotation disagrees with labelled dimensions — do not measure from this sheet. */
  | 'conflicted'
  /** An estimator calibrated this sheet by hand. */
  | 'user_calibrated'
  /** No usable scale information was found. */
  | 'unknown';

export type DrawingScale = {
  /** The annotation exactly as it appears on the sheet. */
  raw: string | null;
  kind: ScaleKind;
  /** Inches measured on the printed sheet. */
  paperInches: number | null;
  /** Real-world feet those paper inches represent. */
  realFeet: number | null;
  /** Real-world feet per PDF point. Null whenever the scale is unusable. */
  feetPerPoint: number | null;
  verificationStatus: ScaleVerificationStatus;
  /** Every scale annotation seen on the page, for conflict reporting. */
  candidates: string[];
  notes: string[];
};

export type SheetRole =
  | 'plan'
  | 'reflected_ceiling_plan'
  | 'enlarged_plan'
  | 'schedule'
  | 'detail'
  | 'elevation'
  | 'section'
  | 'cover'
  | 'specification'
  | 'unknown';

export type SheetIdentity = {
  sheetNumber: string | null;
  sheetTitle: string | null;
  discipline: string | null;
  role: SheetRole;
  /** How the identity was located, kept for audit. */
  source: 'title_block' | 'page_scan' | 'not_found';
  /** Heuristic strength of the match, 0..1. Not a calibrated probability. */
  matchStrength: number;
};

export type RevisionEntry = {
  revision: string;
  description: string | null;
  date: string | null;
  raw: string;
};

export type MatchlineReference = {
  raw: string;
  /** The sheet the matchline points at, when the annotation names one. */
  referencedSheet: string | null;
  bbox: BoundingBox;
};

export type PageClassification =
  | 'vector_drawing'
  | 'scanned_raster'
  | 'mixed'
  | 'text_only'
  | 'empty';

export type MeasurementSuitability =
  /** Vector geometry plus a usable scale — Phase 2 geometry can measure this page. */
  | 'measurable'
  /** Geometry is present but the scale must be calibrated before measuring. */
  | 'requires_scale_calibration'
  /** Raster page: needs OCR / vision before anything can be measured. */
  | 'requires_ocr'
  /** Nothing measurable on the page (cover sheet, spec text, blank). */
  | 'not_measurable';

export type PagePreview = {
  format: 'svg';
  /** Inline SVG markup, safe to embed in the document viewer. */
  markup: string;
  widthPt: number;
  heightPt: number;
  /** True when the preview was capped and does not show every path. */
  truncated: boolean;
};

export type PageExtraction = {
  pageNumber: number;
  /** Media box dimensions in PDF points, before rotation is applied. */
  widthPt: number;
  heightPt: number;
  rotationDeg: number;
  classification: PageClassification;
  measurementSuitability: MeasurementSuitability;
  sheet: SheetIdentity;
  scale: DrawingScale;
  revisions: RevisionEntry[];
  matchlines: MatchlineReference[];
  textSpans: TextSpan[];
  vectorPaths: VectorPath[];
  rasterPlacements: RasterPlacement[];
  preview: PagePreview | null;
  counts: {
    textSpans: number;
    vectorPaths: number;
    rasterPlacements: number;
    /** Paths dropped because the per-page cap was hit. */
    droppedVectorPaths: number;
    pathKinds: Record<PathKind, number>;
  };
  warnings: string[];
};

export type DocumentProcessingStatus = 'succeeded' | 'partial' | 'failed';

export type DocumentExtraction = {
  documentId: string;
  fileName: string;
  /** Content hash — the idempotency key for processing and de-duplication. */
  sha256: string;
  byteSize: number;
  status: DocumentProcessingStatus;
  /** Page count reported by the PDF itself. */
  pageCount: number;
  /** Pages actually extracted (may be fewer when a page cap applies). */
  pagesExtracted: number;
  pages: PageExtraction[];
  producer: string | null;
  extractionEngine: string;
  extractedAt: string;
  durationMs: number;
  warnings: string[];
  errors: string[];
};

/** Per-document roll-up used by APIs and the takeoff workflow. */
export type DocumentExtractionSummary = {
  documentId: string;
  fileName: string;
  sha256: string;
  status: DocumentProcessingStatus;
  pageCount: number;
  pagesExtracted: number;
  sheets: Array<{
    pageNumber: number;
    sheetNumber: string | null;
    sheetTitle: string | null;
    discipline: string | null;
    role: SheetRole;
    classification: PageClassification;
    measurementSuitability: MeasurementSuitability;
    scale: string | null;
    scaleVerification: ScaleVerificationStatus;
    revisions: string[];
    matchlineTargets: string[];
    textSpanCount: number;
    vectorPathCount: number;
  }>;
  measurementReadiness: Record<MeasurementSuitability, number>;
  /**
   * Validation status this document can currently support. PDF Intelligence V1
   * never returns `verified_geometry` because no geometry has been converted
   * into a construction quantity yet — that is Phase 2.
   */
  supportedValidationStatus: MeasurementValidationStatus;
  warnings: string[];
};
