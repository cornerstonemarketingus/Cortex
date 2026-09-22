/**
 * Bounded document-processing jobs.
 *
 * A commercial drawing package is far too large to process inline on a single
 * request, so extraction runs as a job: batched, concurrency-limited, retried
 * on transient failure, reporting progress, and returning partial results
 * rather than nothing when one document fails.
 *
 * Idempotency: work is keyed by the file's SHA-256. Re-submitting the same
 * bytes returns the cached extraction instead of re-running the parser, so a
 * retried or duplicated upload cannot be charged or processed twice.
 *
 * The cache is per-process. A durable job + result store backed by the
 * database is the next milestone; the interface here is deliberately the one a
 * durable store would implement.
 */

import { randomUUID } from 'node:crypto';

import { extractPdfDocument, summarizeExtraction, type ExtractPdfOptions } from './pdf-extractor';
import { documentLimits, sha256Hex, validatePdfUpload } from './validation';
import type { DocumentExtraction, DocumentExtractionSummary } from './types';

export type ProcessingJobStatus = 'queued' | 'running' | 'succeeded' | 'partial' | 'failed';

export type DocumentJobInput = {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  documentId?: string;
};

export type DocumentJobItemResult = {
  documentId: string;
  fileName: string;
  sha256: string;
  status: 'succeeded' | 'partial' | 'failed' | 'rejected' | 'duplicate';
  attempts: number;
  /** True when the result came from the idempotency cache rather than a new run. */
  reusedFromCache: boolean;
  /** True when this exact file appeared more than once in the same submission. */
  duplicateOfDocumentId?: string;
  extraction: DocumentExtraction | null;
  summary: DocumentExtractionSummary | null;
  issues: string[];
};

export type ProcessingJobResult = {
  jobId: string;
  status: ProcessingJobStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  documentsSubmitted: number;
  documentsProcessed: number;
  documentsFailed: number;
  documentsRejected: number;
  duplicatesSkipped: number;
  pagesExtracted: number;
  /** Billable units of work actually performed — cached/duplicate pages excluded. */
  billablePagesProcessed: number;
  items: DocumentJobItemResult[];
  warnings: string[];
};

export type ProcessingJobProgress = {
  jobId: string;
  documentsCompleted: number;
  documentsSubmitted: number;
  currentFileName: string | null;
  pagesExtracted: number;
};

type CacheEntry = {
  extraction: DocumentExtraction;
  cachedAt: number;
};

const EXTRACTION_CACHE = new Map<string, CacheEntry>();
const CACHE_MAX_ENTRIES = 32;
const CACHE_TTL_MS = 15 * 60 * 1000;

function readCache(sha256: string): DocumentExtraction | null {
  const entry = EXTRACTION_CACHE.get(sha256);
  if (!entry) return null;

  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    EXTRACTION_CACHE.delete(sha256);
    return null;
  }

  // Refresh recency so the cache behaves as an LRU.
  EXTRACTION_CACHE.delete(sha256);
  EXTRACTION_CACHE.set(sha256, entry);
  return entry.extraction;
}

function writeCache(sha256: string, extraction: DocumentExtraction): void {
  EXTRACTION_CACHE.set(sha256, { extraction, cachedAt: Date.now() });

  while (EXTRACTION_CACHE.size > CACHE_MAX_ENTRIES) {
    const oldest = EXTRACTION_CACHE.keys().next();
    if (oldest.done) break;
    EXTRACTION_CACHE.delete(oldest.value);
  }
}

/** Exposed for tests and for operational cache clearing. */
export function clearExtractionCache(): void {
  EXTRACTION_CACHE.clear();
}

export type RunDocumentJobOptions = {
  documents: DocumentJobInput[];
  jobId?: string;
  concurrency?: number;
  maxAttempts?: number;
  maxPagesPerDocument?: number;
  includePreviews?: boolean;
  includeRawGeometry?: boolean;
  onProgress?: (progress: ProcessingJobProgress) => void;
  /** Injectable for tests; defaults to the real pdf.js-backed extractor. */
  extractor?: (options: ExtractPdfOptions) => Promise<DocumentExtraction>;
};

function isRetryable(extraction: DocumentExtraction): boolean {
  if (extraction.status !== 'failed') return false;
  // A file that is not a readable PDF will never succeed on a retry.
  return !extraction.errors.some((error) => /InvalidPDFException|not begin with a PDF header/i.test(error));
}

/**
 * Run a bounded extraction job over a set of uploaded documents.
 *
 * Failure of one document never aborts the job: each item carries its own
 * status, attempt count and issues so the caller can show partial results and
 * bill only for what actually ran.
 */
export async function runDocumentProcessingJob(
  options: RunDocumentJobOptions
): Promise<ProcessingJobResult> {
  const limits = documentLimits();
  const jobId = options.jobId ?? randomUUID();
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();

  const concurrency = Math.max(1, Math.min(options.concurrency ?? 2, 8));
  const maxAttempts = Math.max(1, Math.min(options.maxAttempts ?? 2, 5));
  const extractor = options.extractor ?? extractPdfDocument;

  const warnings: string[] = [];
  const submitted = options.documents.slice(0, limits.maxDocumentsPerRequest);
  if (options.documents.length > submitted.length) {
    warnings.push(
      `Only the first ${submitted.length} of ${options.documents.length} documents were queued (limit ${limits.maxDocumentsPerRequest}).`
    );
  }

  const results: DocumentJobItemResult[] = new Array(submitted.length);
  const seenHashes = new Map<string, string>();
  let documentsCompleted = 0;
  let pagesExtracted = 0;

  // Hash and validate up front so rejected files never occupy a worker slot.
  const prepared = submitted.map((document, index) => {
    const sha256 = sha256Hex(document.bytes);
    const documentId = document.documentId ?? randomUUID();
    const validation = validatePdfUpload({
      fileName: document.fileName,
      mimeType: document.mimeType,
      bytes: document.bytes,
    });

    return { document, index, sha256, documentId, validation };
  });

  for (const entry of prepared) {
    if (!entry.validation.ok) {
      results[entry.index] = {
        documentId: entry.documentId,
        fileName: entry.document.fileName,
        sha256: entry.sha256,
        status: 'rejected',
        attempts: 0,
        reusedFromCache: false,
        extraction: null,
        summary: null,
        issues: entry.validation.issues.map((issue) => issue.message),
      };
      documentsCompleted += 1;
      continue;
    }

    const firstSeen = seenHashes.get(entry.sha256);
    if (firstSeen) {
      results[entry.index] = {
        documentId: entry.documentId,
        fileName: entry.document.fileName,
        sha256: entry.sha256,
        status: 'duplicate',
        attempts: 0,
        reusedFromCache: true,
        duplicateOfDocumentId: firstSeen,
        extraction: null,
        summary: null,
        issues: [
          `Identical to a document already submitted in this job (${entry.sha256.slice(0, 12)}). Processed once, billed once.`,
        ],
      };
      documentsCompleted += 1;
      continue;
    }

    seenHashes.set(entry.sha256, entry.documentId);
  }

  const queue = prepared.filter((entry) => results[entry.index] === undefined);
  let cursor = 0;

  const worker = async () => {
    for (;;) {
      const next = cursor;
      cursor += 1;
      if (next >= queue.length) return;

      const entry = queue[next];
      options.onProgress?.({
        jobId,
        documentsCompleted,
        documentsSubmitted: submitted.length,
        currentFileName: entry.document.fileName,
        pagesExtracted,
      });

      const cached = readCache(entry.sha256);
      if (cached) {
        const extraction: DocumentExtraction = { ...cached, documentId: entry.documentId };
        results[entry.index] = {
          documentId: entry.documentId,
          fileName: entry.document.fileName,
          sha256: entry.sha256,
          status: extraction.status === 'failed' ? 'failed' : extraction.status,
          attempts: 0,
          reusedFromCache: true,
          extraction,
          summary: summarizeExtraction(extraction),
          issues: [...extraction.errors],
        };
        documentsCompleted += 1;
        continue;
      }

      let attempts = 0;
      let extraction: DocumentExtraction | null = null;
      const issues: string[] = [];

      while (attempts < maxAttempts) {
        attempts += 1;
        try {
          extraction = await extractor({
            data: entry.document.bytes,
            fileName: entry.document.fileName,
            documentId: entry.documentId,
            maxPages: options.maxPagesPerDocument,
            includePreviews: options.includePreviews,
            includeRawGeometry: options.includeRawGeometry,
          });
        } catch (error) {
          issues.push(
            `Attempt ${attempts} threw: ${error instanceof Error ? error.message : String(error)}`
          );
          extraction = null;
        }

        if (extraction && extraction.status !== 'failed') break;
        if (extraction && !isRetryable(extraction)) break;
        if (attempts < maxAttempts) {
          issues.push(`Attempt ${attempts} failed; retrying.`);
        }
      }

      if (!extraction) {
        results[entry.index] = {
          documentId: entry.documentId,
          fileName: entry.document.fileName,
          sha256: entry.sha256,
          status: 'failed',
          attempts,
          reusedFromCache: false,
          extraction: null,
          summary: null,
          issues,
        };
        documentsCompleted += 1;
        continue;
      }

      if (extraction.status !== 'failed') {
        writeCache(entry.sha256, extraction);
      }

      pagesExtracted += extraction.pagesExtracted;
      results[entry.index] = {
        documentId: entry.documentId,
        fileName: entry.document.fileName,
        sha256: entry.sha256,
        status: extraction.status,
        attempts,
        reusedFromCache: false,
        extraction,
        summary: summarizeExtraction(extraction),
        issues: [...issues, ...extraction.errors],
      };
      documentsCompleted += 1;
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length || 1) }, worker));

  const items = results.filter((item): item is DocumentJobItemResult => item !== undefined);
  const documentsFailed = items.filter((item) => item.status === 'failed').length;
  const documentsRejected = items.filter((item) => item.status === 'rejected').length;
  const duplicatesSkipped = items.filter((item) => item.status === 'duplicate').length;
  const documentsProcessed = items.filter(
    (item) => item.status === 'succeeded' || item.status === 'partial'
  ).length;

  const billablePagesProcessed = items
    .filter((item) => !item.reusedFromCache && item.extraction)
    .reduce((total, item) => total + (item.extraction?.pagesExtracted ?? 0), 0);

  const status: ProcessingJobStatus =
    documentsProcessed === 0
      ? 'failed'
      : documentsFailed + documentsRejected > 0 || items.some((item) => item.status === 'partial')
        ? 'partial'
        : 'succeeded';

  const finishedAtMs = Date.now();

  options.onProgress?.({
    jobId,
    documentsCompleted,
    documentsSubmitted: submitted.length,
    currentFileName: null,
    pagesExtracted,
  });

  return {
    jobId,
    status,
    startedAt,
    finishedAt: new Date(finishedAtMs).toISOString(),
    durationMs: finishedAtMs - startedAtMs,
    documentsSubmitted: submitted.length,
    documentsProcessed,
    documentsFailed,
    documentsRejected,
    duplicatesSkipped,
    pagesExtracted,
    billablePagesProcessed,
    items,
    warnings,
  };
}
