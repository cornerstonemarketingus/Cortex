/**
 * Measurement validation and provenance for commercial takeoff.
 *
 * The central rule of this domain: a quantity is only ever presented as a
 * *verified* measurement when it was computed deterministically from drawing
 * geometry at a scale we were able to verify. Anything a model inferred from
 * looking at a drawing stays labelled `ai_inferred` all the way to the UI, the
 * exports and the audit trail.
 */

import {
  type MeasurementUnit,
  toCanonicalQuantity,
  roundTo,
} from './units';

/** Bumped whenever the deterministic calculation path changes shape or math. */
export const CALCULATION_ENGINE_VERSION = 'cortex-commercial-takeoff-0.1.0';

export type MeasurementValidationStatus =
  /** Computed by deterministic geometry from vector drawing data at a verified scale. */
  | 'verified_geometry'
  /** Geometry was measured, but the drawing scale could not be verified. Needs calibration. */
  | 'scale_unverified'
  /** Produced by a vision model reading a drawing. Never a verified measurement. */
  | 'ai_inferred'
  /** Entered or imported without verification against a source document. */
  | 'unverified'
  /** The information needed for this measurement was not found in the documents. */
  | 'missing';

export const MEASUREMENT_VALIDATION_STATUSES: readonly MeasurementValidationStatus[] = [
  'verified_geometry',
  'scale_unverified',
  'ai_inferred',
  'unverified',
  'missing',
];

/** The only status that may be reported to a customer as a verified measurement. */
export function isVerifiedMeasurement(status: MeasurementValidationStatus): boolean {
  return status === 'verified_geometry';
}

/** True when the quantity must be reviewed by an estimator before it is bid. */
export function requiresEstimatorReview(status: MeasurementValidationStatus): boolean {
  return status !== 'verified_geometry';
}

export const VALIDATION_STATUS_LABELS: Record<MeasurementValidationStatus, string> = {
  verified_geometry: 'Verified geometry',
  scale_unverified: 'Measured — scale not verified',
  ai_inferred: 'AI inferred — not a verified measurement',
  unverified: 'Unverified input',
  missing: 'Missing information',
};

export type ReviewStatus = 'pending' | 'accepted' | 'corrected' | 'rejected';

export type ExtractionMethod =
  | 'pdf_embedded_text'
  | 'pdf_vector_geometry'
  | 'pdf_raster_image'
  | 'ai_vision'
  | 'user_input';

export type SourceCoordinates = {
  /** PDF user-space bounding box, origin bottom-left, units of PDF points (1/72 in). */
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MeasurementProvenance = {
  organizationId?: string;
  projectId?: string;
  documentId: string;
  /** Content hash of the exact uploaded file the measurement came from. */
  documentSha256: string;
  drawingSheetId?: string;
  sheetNumber?: string;
  /** Document revision this measurement was taken against. */
  revision?: string;
  pageNumber: number;
  sourceCoordinates?: SourceCoordinates;
  extractionMethod: ExtractionMethod;
  /** Human-readable description of the arithmetic used, e.g. "polygon shoelace area". */
  calculationMethod: string;
  calculationEngineVersion: string;
  /** Only set when a model contributed to the value. */
  aiModelVersion?: string;
  extractedAt: string;
};

export type MeasurementRecord = {
  id: string;
  /** Stable physical-element id once element identity is assigned (Phase 2). */
  elementId?: string;
  description: string;
  /** Quantity in the unit it was originally measured or read in. */
  quantity: number;
  unit: MeasurementUnit;
  /** Same quantity normalized onto the canonical unit for its dimension. */
  normalizedQuantity: number;
  normalizedUnit: MeasurementUnit;
  validationStatus: MeasurementValidationStatus;
  reviewStatus: ReviewStatus;
  reviewedBy?: string;
  /** Anything the estimator needs to know before trusting this number. */
  notes: string[];
  provenance: MeasurementProvenance;
};

export type CreateMeasurementInput = {
  id: string;
  description: string;
  quantity: number;
  unit: MeasurementUnit;
  validationStatus: MeasurementValidationStatus;
  elementId?: string;
  reviewStatus?: ReviewStatus;
  notes?: string[];
  provenance: Omit<MeasurementProvenance, 'calculationEngineVersion' | 'extractedAt'> & {
    calculationEngineVersion?: string;
    extractedAt?: string;
  };
};

/**
 * Build a measurement record with normalized units and a complete provenance
 * block. Every measurement that leaves this domain goes through here so no
 * quantity can reach an estimate without a traceable source.
 */
export function createMeasurementRecord(input: CreateMeasurementInput): MeasurementRecord {
  const normalized = toCanonicalQuantity(input.quantity, input.unit);

  return {
    id: input.id,
    elementId: input.elementId,
    description: input.description,
    quantity: roundTo(input.quantity, 4),
    unit: input.unit,
    normalizedQuantity: roundTo(normalized.value, 4),
    normalizedUnit: normalized.unit,
    validationStatus: input.validationStatus,
    reviewStatus: input.reviewStatus ?? 'pending',
    notes: input.notes ? [...input.notes] : [],
    provenance: {
      ...input.provenance,
      calculationEngineVersion:
        input.provenance.calculationEngineVersion ?? CALCULATION_ENGINE_VERSION,
      extractedAt: input.provenance.extractedAt ?? new Date().toISOString(),
    },
  };
}

/** Summary counts used by the quality-control panel and by API responses. */
export function summarizeValidationStatuses(
  records: Array<Pick<MeasurementRecord, 'validationStatus'>>
): Record<MeasurementValidationStatus, number> {
  const summary = {
    verified_geometry: 0,
    scale_unverified: 0,
    ai_inferred: 0,
    unverified: 0,
    missing: 0,
  } satisfies Record<MeasurementValidationStatus, number>;

  for (const record of records) {
    summary[record.validationStatus] += 1;
  }

  return summary;
}
