/**
 * Upload validation and content hashing for document intelligence.
 *
 * Validation runs before a single byte is handed to the PDF parser: file type,
 * size, and page count are all bounded so a malformed or oversized drawing
 * package cannot exhaust the process.
 */

import { createHash } from 'node:crypto';

export const PDF_MIME_TYPES = new Set(['application/pdf', 'application/x-pdf']);

export const IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

/** Bounds are env-tunable so hosting limits can be respected per deployment. */
export function documentLimits() {
  return {
    maxPdfBytes: envNumber('COMMERCIAL_PDF_MAX_BYTES', 60 * 1024 * 1024),
    /**
     * Commercial packages are routinely 50-400 sheets, so the old four-page
     * ceiling does not apply. Processing is still bounded and batched.
     */
    maxPagesPerDocument: envNumber('COMMERCIAL_PDF_MAX_PAGES', 250),
    maxDocumentsPerRequest: envNumber('COMMERCIAL_PDF_MAX_DOCUMENTS', 25),
    maxVectorPathsPerPage: envNumber('COMMERCIAL_PDF_MAX_PATHS_PER_PAGE', 20000),
    maxTextSpansPerPage: envNumber('COMMERCIAL_PDF_MAX_TEXT_SPANS_PER_PAGE', 8000),
    perPageTimeoutMs: envNumber('COMMERCIAL_PDF_PAGE_TIMEOUT_MS', 20000),
    perDocumentTimeoutMs: envNumber('COMMERCIAL_PDF_DOCUMENT_TIMEOUT_MS', 240000),
  };
}

export type DocumentValidationIssue = {
  code:
    | 'UNSUPPORTED_FILE_TYPE'
    | 'FILE_TOO_LARGE'
    | 'EMPTY_FILE'
    | 'NOT_A_PDF'
    | 'PAGE_LIMIT_EXCEEDED';
  message: string;
};

export type DocumentValidationResult = {
  ok: boolean;
  issues: DocumentValidationIssue[];
};

const PDF_MAGIC = '%PDF-';

export function looksLikePdf(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_MAGIC.length) return false;
  // The header is allowed to sit a little way into the file in the wild.
  const window = Buffer.from(bytes.subarray(0, Math.min(bytes.length, 1024))).toString('latin1');
  return window.includes(PDF_MAGIC);
}

export function isPdfUpload(mimeType: string, fileName: string): boolean {
  if (PDF_MIME_TYPES.has(mimeType.toLowerCase())) return true;
  return fileName.toLowerCase().endsWith('.pdf');
}

export function validatePdfUpload(params: {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}): DocumentValidationResult {
  const limits = documentLimits();
  const issues: DocumentValidationIssue[] = [];

  if (params.bytes.length === 0) {
    issues.push({ code: 'EMPTY_FILE', message: `${params.fileName} is empty.` });
    return { ok: false, issues };
  }

  if (!isPdfUpload(params.mimeType, params.fileName)) {
    issues.push({
      code: 'UNSUPPORTED_FILE_TYPE',
      message: `${params.fileName} is not a PDF (received ${params.mimeType || 'unknown type'}).`,
    });
  }

  if (params.bytes.length > limits.maxPdfBytes) {
    issues.push({
      code: 'FILE_TOO_LARGE',
      message: `${params.fileName} is ${params.bytes.length} bytes, over the ${limits.maxPdfBytes} byte limit.`,
    });
  }

  if (!looksLikePdf(params.bytes)) {
    issues.push({
      code: 'NOT_A_PDF',
      message: `${params.fileName} does not begin with a PDF header and cannot be parsed.`,
    });
  }

  return { ok: issues.length === 0, issues };
}

/** Content hash used as the idempotency key for processing and de-duplication. */
export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}
