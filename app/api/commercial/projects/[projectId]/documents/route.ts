import { NextRequest } from 'next/server';

import { ApiError } from '@/src/crm/core/api';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { resolveRequestScope } from '@/src/commercial-estimating/api/auth';
import { ingestDocument } from '@/src/commercial-estimating/data/documents';
import { processDocument } from '@/src/commercial-estimating/data/processing';
import { documentLimits } from '@/src/commercial-estimating/document-processing/validation';
import { documentStorageIsDurable } from '@/src/commercial-estimating/storage/document-store';

export const runtime = 'nodejs';

/**
 * Upload drawing packages to a project.
 *
 * Multipart only — these are binary documents, and accepting a base64 JSON body
 * would triple the payload for no benefit.
 *
 * Storing and processing are separate steps on purpose: the bytes are durable
 * before any parser touches them, so a failed extraction is retryable without
 * asking the customer to upload a 200MB package again.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  return withApiHandler(async () => {
    const { projectId } = await context.params;
    const { db, scope } = await resolveRequestScope(request);

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      throw new ApiError(
        415,
        'Upload drawings as multipart/form-data with one or more "files" fields.',
        'MULTIPART_REQUIRED'
      );
    }

    const limits = documentLimits();
    const formData = await request.formData();
    const files = formData
      .getAll('files')
      .filter((entry): entry is File => entry instanceof File)
      .slice(0, limits.maxDocumentsPerRequest);

    if (files.length === 0) {
      throw new ApiError(400, 'At least one file is required.', 'NO_FILES');
    }

    const revisionLabel = parseOptionalString(formData.get('revisionLabel'));

    const results = [];
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());

      const ingested = await ingestDocument(db, scope, {
        projectId,
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        bytes,
        revisionLabel,
      });

      // A duplicate upload still reports its stored identity, but is not
      // reprocessed and not re-billed.
      const processed = await processDocument(db, scope, {
        documentId: ingested.documentId,
        documentRevisionId: ingested.documentRevisionId,
        projectId,
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        bytes,
      });

      results.push({
        fileName: file.name,
        documentId: ingested.documentId,
        documentRevisionId: ingested.documentRevisionId,
        sha256: ingested.sha256,
        duplicateUpload: ingested.duplicate,
        newRevision: ingested.newRevision,
        job: {
          id: processed.jobId,
          status: processed.status,
          pagesExtracted: processed.pagesExtracted,
          billablePages: processed.billablePages,
          reusedFromCache: processed.reusedFromCache,
          sheetsWritten: processed.sheetsWritten,
          warnings: processed.warnings.slice(0, 10),
          error: processed.error,
        },
      });
    }

    return jsonResponse(
      {
        projectId,
        documents: results,
        storageDurable: documentStorageIsDurable(),
      },
      201
    );
  });
}
