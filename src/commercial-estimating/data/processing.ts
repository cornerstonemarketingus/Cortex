/**
 * Document processing orchestration with durable job records.
 *
 * Every extraction is represented by a ProcessingJob row keyed on the document
 * revision, which is what makes reprocessing idempotent: a revision that has
 * already been extracted returns the recorded result instead of re-running the
 * parser and re-counting billable pages.
 *
 * SCOPE NOTE: M1 runs the extraction inline. The job record, its status
 * transitions and its idempotency key are the real durable contract, so moving
 * execution onto the existing bullmq worker is a change of caller, not of
 * schema. That handoff is the next task — see the milestone docs for why it is
 * not in this commit.
 */

import { ApiError } from '@/src/crm/core/api';
import { extractPdfDocument } from '../document-processing/pdf-extractor';
import type { DocumentExtraction } from '../document-processing/types';
import { validatePdfUpload } from '../document-processing/validation';
import type { CommercialDb } from './client';
import { persistExtraction } from './documents';
import { scopedWhere, type OrgScope } from './tenancy';

export type ProcessDocumentResult = {
  jobId: string;
  status: 'SUCCEEDED' | 'PARTIAL' | 'FAILED';
  sheetsWritten: number;
  pagesExtracted: number;
  billablePages: number;
  reusedFromCache: boolean;
  warnings: string[];
  error: string | null;
};

export type ProcessDocumentInput = {
  documentId: string;
  documentRevisionId: string;
  projectId: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  /** Injectable for tests; defaults to the real pdf.js-backed extractor. */
  extractor?: typeof extractPdfDocument;
};

export async function processDocument(
  db: CommercialDb,
  scope: OrgScope,
  input: ProcessDocumentInput
): Promise<ProcessDocumentResult> {
  const idempotencyKey = `extract:${input.documentRevisionId}`;

  const existing = await db.processingJob.findUnique({
    where: {
      organizationId_idempotencyKey: { organizationId: scope.organizationId, idempotencyKey },
    },
  });

  if (existing && (existing.status === 'SUCCEEDED' || existing.status === 'PARTIAL')) {
    // Already done for these exact bytes. Report it, bill nothing further.
    const sheetsWritten = await db.drawingSheet.count({
      where: { documentRevisionId: input.documentRevisionId },
    });

    return {
      jobId: existing.id,
      status: existing.status,
      sheetsWritten,
      pagesExtracted: existing.pagesExtracted,
      billablePages: 0,
      reusedFromCache: true,
      warnings: existing.warnings,
      error: existing.error,
    };
  }

  const validation = validatePdfUpload({
    fileName: input.fileName,
    mimeType: input.mimeType,
    bytes: input.bytes,
  });

  if (!validation.ok) {
    const issues = validation.issues.map((issue) => issue.message);
    const job = await upsertJob(db, scope, {
      idempotencyKey,
      existingId: existing?.id,
      projectId: input.projectId,
      documentId: input.documentId,
      status: 'FAILED',
      error: issues.join(' '),
      warnings: issues,
      finished: true,
    });

    await db.document.update({ where: { id: input.documentId }, data: { status: 'REJECTED' } });

    throw new ApiError(400, issues.join(' '), 'DOCUMENT_REJECTED', { jobId: job.id, issues });
  }

  const running = await upsertJob(db, scope, {
    idempotencyKey,
    existingId: existing?.id,
    projectId: input.projectId,
    documentId: input.documentId,
    status: 'RUNNING',
    started: true,
    incrementAttempt: true,
  });

  await db.document.update({ where: { id: input.documentId }, data: { status: 'PROCESSING' } });

  let extraction: DocumentExtraction;
  try {
    const extract = input.extractor ?? extractPdfDocument;
    extraction = await extract({
      data: input.bytes,
      fileName: input.fileName,
      documentId: input.documentId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await upsertJob(db, scope, {
      idempotencyKey,
      existingId: running.id,
      projectId: input.projectId,
      documentId: input.documentId,
      status: 'FAILED',
      error: message,
      finished: true,
    });
    await db.document.update({ where: { id: input.documentId }, data: { status: 'FAILED' } });

    return {
      jobId: running.id,
      status: 'FAILED',
      sheetsWritten: 0,
      pagesExtracted: 0,
      billablePages: 0,
      reusedFromCache: false,
      warnings: [],
      error: message,
    };
  }

  const { sheetsWritten } = await persistExtraction(db, scope, {
    documentId: input.documentId,
    documentRevisionId: input.documentRevisionId,
    extraction,
  });

  const status =
    extraction.status === 'failed' ? 'FAILED' : extraction.status === 'partial' ? 'PARTIAL' : 'SUCCEEDED';
  const warnings = [...extraction.warnings, ...extraction.pages.flatMap((page) => page.warnings)];

  const finished = await upsertJob(db, scope, {
    idempotencyKey,
    existingId: running.id,
    projectId: input.projectId,
    documentId: input.documentId,
    status,
    pagesExtracted: extraction.pagesExtracted,
    billablePages: extraction.pagesExtracted,
    warnings: [...new Set(warnings)].slice(0, 50),
    error: extraction.errors[0] ?? null,
    progress: 100,
    finished: true,
  });

  return {
    jobId: finished.id,
    status,
    sheetsWritten,
    pagesExtracted: extraction.pagesExtracted,
    billablePages: extraction.pagesExtracted,
    reusedFromCache: false,
    warnings: finished.warnings,
    error: finished.error,
  };
}

async function upsertJob(
  db: CommercialDb,
  scope: OrgScope,
  input: {
    idempotencyKey: string;
    existingId?: string;
    projectId: string;
    documentId: string;
    status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'PARTIAL' | 'FAILED';
    pagesExtracted?: number;
    billablePages?: number;
    warnings?: string[];
    error?: string | null;
    progress?: number;
    started?: boolean;
    finished?: boolean;
    incrementAttempt?: boolean;
  }
) {
  const data = {
    status: input.status,
    ...(input.pagesExtracted !== undefined ? { pagesExtracted: input.pagesExtracted } : {}),
    ...(input.billablePages !== undefined ? { billablePages: input.billablePages } : {}),
    ...(input.warnings ? { warnings: input.warnings } : {}),
    ...(input.error !== undefined ? { error: input.error } : {}),
    ...(input.progress !== undefined ? { progress: input.progress } : {}),
    ...(input.started ? { startedAt: new Date() } : {}),
    ...(input.finished ? { finishedAt: new Date() } : {}),
  };

  if (input.existingId) {
    return db.processingJob.update({
      where: { id: input.existingId },
      data: { ...data, ...(input.incrementAttempt ? { attempts: { increment: 1 } } : {}) },
    });
  }

  return db.processingJob.create({
    data: {
      organizationId: scope.organizationId,
      projectId: input.projectId,
      documentId: input.documentId,
      idempotencyKey: input.idempotencyKey,
      attempts: input.incrementAttempt ? 1 : 0,
      ...data,
    },
  });
}

/** Jobs for a project, newest first. Scoped; never reads across tenants. */
export async function listProcessingJobs(db: CommercialDb, scope: OrgScope, projectId: string) {
  return db.processingJob.findMany({
    where: scopedWhere(scope, { projectId }),
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}
