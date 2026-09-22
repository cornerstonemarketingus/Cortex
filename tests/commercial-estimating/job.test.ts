import assert from 'node:assert/strict';

import { describe, it } from './harness';
import { buildMultiSheetPdf, buildNonPdfBytes, buildVectorFloorPlanPdf } from './fixtures/synthetic-drawings';
import {
  clearExtractionCache,
  runDocumentProcessingJob,
} from '@/src/commercial-estimating/document-processing/job';
import { processPlanDocuments } from '@/src/commercial-estimating/takeoff/plan-documents';
import type { DocumentExtraction } from '@/src/commercial-estimating/document-processing/types';

function pdfInput(fileName: string, bytes: Uint8Array) {
  return { fileName, mimeType: 'application/pdf', bytes };
}

function fakeExtraction(fileName: string, status: DocumentExtraction['status']): DocumentExtraction {
  return {
    documentId: 'doc',
    fileName,
    sha256: 'f'.repeat(64),
    byteSize: 10,
    status,
    pageCount: 1,
    pagesExtracted: status === 'failed' ? 0 : 1,
    pages: [],
    producer: null,
    extractionEngine: 'test',
    extractedAt: new Date().toISOString(),
    durationMs: 1,
    warnings: [],
    errors: status === 'failed' ? ['transient worker crash'] : [],
  };
}

describe('processing jobs: batching and partial results', () => {
  it('processes several documents and reports per-document status', async () => {
    clearExtractionCache();
    const [plan, pack] = await Promise.all([buildVectorFloorPlanPdf(), buildMultiSheetPdf(3)]);

    const job = await runDocumentProcessingJob({
      documents: [pdfInput('plan.pdf', plan), pdfInput('pack.pdf', pack)],
      concurrency: 2,
    });

    assert.equal(job.documentsSubmitted, 2);
    assert.equal(job.documentsProcessed, 2);
    assert.equal(job.pagesExtracted, 5);
    assert.equal(job.items.length, 2);
    assert.ok(job.items.every((item) => item.summary !== null));
  });

  it('reports progress as documents complete', async () => {
    clearExtractionCache();
    const plan = await buildVectorFloorPlanPdf();
    const seen: number[] = [];

    await runDocumentProcessingJob({
      documents: [pdfInput('plan.pdf', plan)],
      concurrency: 1,
      onProgress: (progress) => seen.push(progress.documentsCompleted),
    });

    assert.ok(seen.length >= 2, 'expected progress at start and finish');
    assert.equal(seen[seen.length - 1], 1);
  });

  it('keeps going when one document in the batch is unusable', async () => {
    clearExtractionCache();
    const plan = await buildVectorFloorPlanPdf();

    const job = await runDocumentProcessingJob({
      documents: [
        pdfInput('plan.pdf', plan),
        { fileName: 'notes.txt', mimeType: 'text/plain', bytes: buildNonPdfBytes() },
      ],
    });

    assert.equal(job.status, 'partial');
    assert.equal(job.documentsProcessed, 1);
    assert.equal(job.documentsRejected, 1);

    const rejected = job.items.find((item) => item.fileName === 'notes.txt');
    assert.equal(rejected?.status, 'rejected');
    assert.equal(rejected?.attempts, 0);
    assert.ok(rejected?.issues.length);
  });
});

describe('processing jobs: duplicates and idempotency', () => {
  it('processes an identical file submitted twice only once', async () => {
    clearExtractionCache();
    const plan = await buildVectorFloorPlanPdf();

    const job = await runDocumentProcessingJob({
      documents: [pdfInput('plan.pdf', plan), pdfInput('plan-copy.pdf', plan)],
    });

    assert.equal(job.duplicatesSkipped, 1);
    assert.equal(job.pagesExtracted, 2, 'the duplicate must not add pages');

    const duplicate = job.items.find((item) => item.fileName === 'plan-copy.pdf');
    assert.equal(duplicate?.status, 'duplicate');
    assert.ok(duplicate?.duplicateOfDocumentId);
  });

  it('reuses the cached extraction on a resubmitted upload and bills nothing for it', async () => {
    clearExtractionCache();
    const plan = await buildVectorFloorPlanPdf();

    const first = await runDocumentProcessingJob({ documents: [pdfInput('plan.pdf', plan)] });
    assert.equal(first.items[0].reusedFromCache, false);
    assert.equal(first.billablePagesProcessed, 2);

    const second = await runDocumentProcessingJob({ documents: [pdfInput('plan.pdf', plan)] });
    assert.equal(second.items[0].reusedFromCache, true);
    assert.equal(second.billablePagesProcessed, 0, 'a retried upload must not be billed twice');
    assert.equal(second.items[0].summary?.sheets.length, 2);
  });
});

describe('processing jobs: retries', () => {
  it('retries a transient failure and records the attempt count', async () => {
    clearExtractionCache();
    let calls = 0;

    const job = await runDocumentProcessingJob({
      documents: [pdfInput('plan.pdf', await buildMultiSheetPdf(1))],
      maxAttempts: 3,
      extractor: async ({ fileName }) => {
        calls += 1;
        return fakeExtraction(fileName, calls === 1 ? 'failed' : 'succeeded');
      },
    });

    assert.equal(calls, 2);
    assert.equal(job.items[0].attempts, 2);
    assert.equal(job.items[0].status, 'succeeded');
  });

  it('does not retry a file that will never parse', async () => {
    clearExtractionCache();
    let calls = 0;

    const job = await runDocumentProcessingJob({
      documents: [pdfInput('broken.pdf', await buildMultiSheetPdf(1))],
      maxAttempts: 3,
      extractor: async ({ fileName }) => {
        calls += 1;
        const extraction = fakeExtraction(fileName, 'failed');
        extraction.errors = ['InvalidPDFException: Invalid PDF structure.'];
        return extraction;
      },
    });

    assert.equal(calls, 1, 'an unparseable file must not be retried');
    assert.equal(job.items[0].status, 'failed');
  });

  it('survives an extractor that throws', async () => {
    clearExtractionCache();

    const job = await runDocumentProcessingJob({
      documents: [pdfInput('plan.pdf', await buildMultiSheetPdf(1))],
      maxAttempts: 2,
      extractor: async () => {
        throw new Error('worker died');
      },
    });

    assert.equal(job.items[0].status, 'failed');
    assert.equal(job.items[0].attempts, 2);
    assert.match(job.items[0].issues.join(' '), /worker died/);
  });
});

describe('takeoff integration: plan document intelligence', () => {
  it('summarizes an uploaded package for the takeoff workflow', async () => {
    clearExtractionCache();
    const plan = await buildVectorFloorPlanPdf();

    const intelligence = await processPlanDocuments({
      documents: [pdfInput('level-2.pdf', plan)],
    });

    assert.equal(intelligence.analyzed, true);
    assert.equal(intelligence.sheets.length, 2);
    assert.deepEqual(
      intelligence.sheets.map((sheet) => sheet.sheetNumber),
      ['A101', 'A102']
    );
    assert.equal(intelligence.measurementReadiness.measurable, 2);
    assert.ok(intelligence.sheets.every((sheet) => sheet.scaleVerified === false));
  });

  it('never claims a verified measurement in V1', async () => {
    clearExtractionCache();
    const intelligence = await processPlanDocuments({
      documents: [pdfInput('level-2.pdf', await buildVectorFloorPlanPdf())],
    });

    assert.equal(intelligence.supportedValidationStatus, 'scale_unverified');
    assert.match(intelligence.disclaimer, /No construction quantity has been measured/i);
  });

  it('returns a non-analyzed result when nothing could be read', async () => {
    clearExtractionCache();
    const intelligence = await processPlanDocuments({
      documents: [{ fileName: 'notes.txt', mimeType: 'text/plain', bytes: buildNonPdfBytes() }],
    });

    assert.equal(intelligence.analyzed, false);
    assert.equal(intelligence.sheets.length, 0);
    assert.equal(intelligence.totals.documentsRejected, 1);
  });
});
