/**
 * Bridge between PDF document intelligence and the existing Cortex takeoff
 * workflow.
 *
 * This is where uploaded PDFs stop being opaque file names. The extractor
 * reads their real contents; this module turns that into (a) a structured
 * block the API and UI can show, and (b) a plain-text scope signal the
 * existing estimator can reason over.
 *
 * What it deliberately does *not* do: emit quantities. Nothing here produces a
 * number that could be mistaken for a measured construction quantity.
 */

import type { MeasurementValidationStatus } from '../domain/measurement';
import { runDocumentProcessingJob, type DocumentJobInput } from '../document-processing/job';
import { EXTRACTION_ENGINE } from '../document-processing/pdf-extractor';
import type {
  DocumentProcessingStatus,
  MeasurementSuitability,
  PageClassification,
  SheetRole,
} from '../document-processing/types';

export type PlanSheetSummary = {
  fileName: string;
  pageNumber: number;
  sheetNumber: string | null;
  sheetTitle: string | null;
  discipline: string | null;
  role: SheetRole;
  classification: PageClassification;
  measurementSuitability: MeasurementSuitability;
  scale: string | null;
  scaleVerified: boolean;
  revisions: string[];
  matchlineTargets: string[];
  textSpanCount: number;
  vectorPathCount: number;
};

export type PlanDocumentSummary = {
  documentId: string;
  fileName: string;
  sha256: string;
  status: DocumentProcessingStatus | 'rejected' | 'duplicate';
  attempts: number;
  reusedFromCache: boolean;
  pageCount: number;
  pagesExtracted: number;
  issues: string[];
};

export type PlanDocumentIntelligence = {
  /** True when at least one PDF page was actually read. */
  analyzed: boolean;
  engine: string;
  jobId: string;
  documents: PlanDocumentSummary[];
  sheets: PlanSheetSummary[];
  totals: {
    documentsSubmitted: number;
    documentsProcessed: number;
    documentsFailed: number;
    documentsRejected: number;
    duplicatesSkipped: number;
    pagesExtracted: number;
    billablePagesProcessed: number;
    durationMs: number;
  };
  measurementReadiness: Record<MeasurementSuitability, number>;
  /**
   * The strongest validation status anything extracted here can support today.
   * V1 reads documents; it does not yet convert geometry into building
   * elements, so it can never support `verified_geometry`.
   */
  supportedValidationStatus: MeasurementValidationStatus;
  /** Shown verbatim in the UI so nobody mistakes extraction for measurement. */
  disclaimer: string;
  warnings: string[];
};

export const DOCUMENT_INTELLIGENCE_DISCLAIMER =
  'Document intelligence read these drawings and recorded their sheets, scales, revisions and geometry. ' +
  'No construction quantity has been measured from them yet — commercial quantity takeoff is the next milestone. ' +
  'Nothing here may be issued as a verified measurement.';

function emptyReadiness(): Record<MeasurementSuitability, number> {
  return {
    measurable: 0,
    requires_scale_calibration: 0,
    requires_ocr: 0,
    not_measurable: 0,
  };
}

export type ProcessPlanDocumentsOptions = {
  documents: DocumentJobInput[];
  maxPagesPerDocument?: number;
  concurrency?: number;
  includePreviews?: boolean;
  onProgress?: Parameters<typeof runDocumentProcessingJob>[0]['onProgress'];
  extractor?: Parameters<typeof runDocumentProcessingJob>[0]['extractor'];
};

/**
 * Run document intelligence over the PDFs in an upload and reduce the result
 * to the shape the takeoff API returns.
 */
export async function processPlanDocuments(
  options: ProcessPlanDocumentsOptions
): Promise<PlanDocumentIntelligence> {
  const job = await runDocumentProcessingJob({
    documents: options.documents,
    concurrency: options.concurrency,
    maxPagesPerDocument: options.maxPagesPerDocument,
    includePreviews: options.includePreviews ?? false,
    // Only the per-page summaries are consumed below, so the full span/path
    // arrays are dropped. Keeping them would pin hundreds of MB of point data
    // in the extraction cache for data nothing reads.
    includeRawGeometry: false,
    onProgress: options.onProgress,
    extractor: options.extractor,
  });

  const documents: PlanDocumentSummary[] = [];
  const sheets: PlanSheetSummary[] = [];
  const measurementReadiness = emptyReadiness();
  const warnings: string[] = [...job.warnings];

  for (const item of job.items) {
    documents.push({
      documentId: item.documentId,
      fileName: item.fileName,
      sha256: item.sha256,
      status: item.status,
      attempts: item.attempts,
      reusedFromCache: item.reusedFromCache,
      pageCount: item.extraction?.pageCount ?? 0,
      pagesExtracted: item.extraction?.pagesExtracted ?? 0,
      issues: item.issues,
    });

    if (!item.summary) continue;

    for (const sheet of item.summary.sheets) {
      measurementReadiness[sheet.measurementSuitability] += 1;
      sheets.push({
        fileName: item.fileName,
        pageNumber: sheet.pageNumber,
        sheetNumber: sheet.sheetNumber,
        sheetTitle: sheet.sheetTitle,
        discipline: sheet.discipline,
        role: sheet.role,
        classification: sheet.classification,
        measurementSuitability: sheet.measurementSuitability,
        scale: sheet.scale,
        scaleVerified: sheet.scaleVerification === 'verified_against_dimension',
        revisions: sheet.revisions,
        matchlineTargets: sheet.matchlineTargets,
        textSpanCount: sheet.textSpanCount,
        vectorPathCount: sheet.vectorPathCount,
      });
    }

    warnings.push(...item.summary.warnings);
  }

  return {
    analyzed: job.pagesExtracted > 0,
    engine: EXTRACTION_ENGINE,
    jobId: job.jobId,
    documents,
    sheets,
    totals: {
      documentsSubmitted: job.documentsSubmitted,
      documentsProcessed: job.documentsProcessed,
      documentsFailed: job.documentsFailed,
      documentsRejected: job.documentsRejected,
      duplicatesSkipped: job.duplicatesSkipped,
      pagesExtracted: job.pagesExtracted,
      billablePagesProcessed: job.billablePagesProcessed,
      durationMs: job.durationMs,
    },
    measurementReadiness,
    supportedValidationStatus: 'scale_unverified' satisfies MeasurementValidationStatus,
    disclaimer: DOCUMENT_INTELLIGENCE_DISCLAIMER,
    warnings: [...new Set(warnings)],
  };
}

/**
 * Scope text derived from what the drawings actually say — sheet titles,
 * disciplines and roles. This is what lets the estimator reason about real PDF
 * content rather than the uploaded file's name.
 */
export function planDocumentScopeSignal(intelligence: PlanDocumentIntelligence | null): string {
  if (!intelligence || intelligence.sheets.length === 0) return '';

  const parts = new Set<string>();
  for (const sheet of intelligence.sheets) {
    if (sheet.sheetTitle) parts.add(sheet.sheetTitle);
    if (sheet.discipline) parts.add(sheet.discipline);
    if (sheet.role !== 'unknown') parts.add(sheet.role.replace(/_/g, ' '));
  }

  return [...parts].join(' ');
}

/** One-line human summary for the estimate's input summary field. */
export function planDocumentSummaryLine(intelligence: PlanDocumentIntelligence | null): string | null {
  if (!intelligence || !intelligence.analyzed) return null;

  const identified = intelligence.sheets.filter((sheet) => sheet.sheetNumber).length;
  const measurable = intelligence.measurementReadiness.measurable;
  const needsCalibration = intelligence.measurementReadiness.requires_scale_calibration;
  const needsOcr = intelligence.measurementReadiness.requires_ocr;

  return (
    `PDF intelligence read ${intelligence.totals.pagesExtracted} drawing page(s) across ` +
    `${intelligence.totals.documentsProcessed} document(s); identified ${identified} sheet number(s). ` +
    `Measurement readiness — ${measurable} page(s) with geometry and a declared scale, ` +
    `${needsCalibration} awaiting scale calibration, ${needsOcr} requiring OCR.`
  );
}
