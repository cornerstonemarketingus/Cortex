/**
 * Document ingestion and the persisted drawing register.
 *
 * This is where PDF Intelligence stops being request-scoped: the original bytes
 * go to the document store, the file gets a Document + immutable
 * DocumentRevision, and the extracted sheet register is written as DrawingSheet
 * rows that survive the request.
 */

import { ApiError } from '@/src/crm/core/api';
import { sha256Hex } from '../document-processing/validation';
import type { DocumentExtraction } from '../document-processing/types';
import { buildDocumentKey, getDocumentStore } from '../storage/document-store';
import type { CommercialDb } from './client';
import { recordAuditEvent } from './audit';
import { requireProjectAccess, requireWriteRole, scopedWhere, type OrgScope } from './tenancy';

export type IngestDocumentInput = {
  projectId: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  revisionLabel?: string;
};

export type IngestedDocument = {
  documentId: string;
  documentRevisionId: string;
  sha256: string;
  storageKey: string;
  byteSize: number;
  /** True when these exact bytes were already stored for this project. */
  duplicate: boolean;
  /** True when this upload superseded an earlier revision of the same file. */
  newRevision: boolean;
};

/**
 * Store an uploaded drawing package.
 *
 * Idempotent on content: re-uploading identical bytes returns the existing
 * document rather than creating a second one, which is what stops a retried
 * upload from being processed — or billed — twice. Different bytes under the
 * same file name add a revision; nothing is ever overwritten.
 */
export async function ingestDocument(
  db: CommercialDb,
  scope: OrgScope,
  input: IngestDocumentInput
): Promise<IngestedDocument> {
  requireWriteRole(scope);

  const access = await requireProjectAccess(db, scope, input.projectId);
  if (!access.owned) {
    throw new ApiError(
      403,
      'Documents can only be uploaded to a project your organization owns.',
      'PROJECT_NOT_OWNED'
    );
  }

  const fileName = input.fileName.trim();
  if (!fileName) {
    throw new ApiError(400, 'A file name is required.', 'FILE_NAME_REQUIRED');
  }
  if (input.bytes.length === 0) {
    throw new ApiError(400, `${fileName} is empty.`, 'EMPTY_FILE');
  }

  const sha256 = sha256Hex(input.bytes);
  const storageKey = buildDocumentKey({ organizationId: scope.organizationId, sha256 });

  const existingByHash = await db.document.findFirst({
    where: scopedWhere(scope, { projectId: input.projectId, sha256 }),
    include: { revisions: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });

  if (existingByHash && existingByHash.revisions[0]) {
    await recordAuditEvent(db, scope, {
      action: 'document.duplicate_ignored',
      subjectType: 'document',
      subjectId: existingByHash.id,
      metadata: { fileName, sha256 },
    });

    return {
      documentId: existingByHash.id,
      documentRevisionId: existingByHash.revisions[0].id,
      sha256,
      storageKey: existingByHash.storageKey,
      byteSize: existingByHash.byteSize,
      duplicate: true,
      newRevision: false,
    };
  }

  // Bytes first: a storage failure must not leave a database row pointing at
  // nothing. The reverse (an orphaned blob) is recoverable.
  await getDocumentStore().put(storageKey, input.bytes);

  const sameName = await db.document.findFirst({
    where: scopedWhere(scope, { projectId: input.projectId, fileName }),
    include: { revisions: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });

  if (sameName) {
    const previous = sameName.revisions[0];
    const revision = await db.documentRevision.create({
      data: {
        documentId: sameName.id,
        revisionLabel: input.revisionLabel?.trim() || null,
        sha256,
        storageKey,
        byteSize: input.bytes.length,
        supersedesId: previous?.id ?? null,
        createdBy: scope.actor,
      },
    });

    // The Document row points at the current revision's bytes; every earlier
    // revision remains readable through the revision chain.
    await db.document.update({
      where: { id: sameName.id },
      data: { sha256, storageKey, byteSize: input.bytes.length, status: 'UPLOADED' },
    });

    await recordAuditEvent(db, scope, {
      action: 'document.revision_added',
      subjectType: 'document',
      subjectId: sameName.id,
      metadata: { fileName, sha256, supersedes: previous?.id ?? null },
    });

    return {
      documentId: sameName.id,
      documentRevisionId: revision.id,
      sha256,
      storageKey,
      byteSize: input.bytes.length,
      duplicate: false,
      newRevision: true,
    };
  }

  const created = await db.document.create({
    data: {
      organizationId: scope.organizationId,
      projectId: input.projectId,
      fileName,
      mimeType: input.mimeType || 'application/pdf',
      byteSize: input.bytes.length,
      sha256,
      storageKey,
      uploadedBy: scope.actor,
      revisions: {
        create: {
          revisionLabel: input.revisionLabel?.trim() || null,
          sha256,
          storageKey,
          byteSize: input.bytes.length,
          createdBy: scope.actor,
        },
      },
    },
    include: { revisions: true },
  });

  await recordAuditEvent(db, scope, {
    action: 'document.uploaded',
    subjectType: 'document',
    subjectId: created.id,
    metadata: { fileName, sha256, byteSize: input.bytes.length },
  });

  return {
    documentId: created.id,
    documentRevisionId: created.revisions[0].id,
    sha256,
    storageKey,
    byteSize: input.bytes.length,
    duplicate: false,
    newRevision: false,
  };
}

/**
 * Write an extraction's sheet register to the database.
 *
 * Replaces any sheets previously recorded for this revision, so a reprocessed
 * document converges rather than accumulating duplicates. Revisions themselves
 * are still immutable — this only rewrites derived data.
 */
export async function persistExtraction(
  db: CommercialDb,
  scope: OrgScope,
  params: { documentId: string; documentRevisionId: string; extraction: DocumentExtraction }
): Promise<{ sheetsWritten: number }> {
  const document = await db.document.findFirst({
    where: scopedWhere(scope, { id: params.documentId }),
    select: { id: true, projectId: true, organizationId: true },
  });

  if (!document) {
    throw new ApiError(404, 'Document not found.', 'DOCUMENT_NOT_FOUND');
  }

  const { extraction } = params;

  const rows = extraction.pages.map((page) => ({
    organizationId: scope.organizationId,
    projectId: document.projectId,
    documentRevisionId: params.documentRevisionId,
    pageNumber: page.pageNumber,
    sheetNumber: page.sheet.sheetNumber,
    sheetTitle: page.sheet.sheetTitle,
    discipline: page.sheet.discipline,
    role: page.sheet.role,
    classification: page.classification,
    measurementSuitability: page.measurementSuitability,
    scaleRaw: page.scale.raw,
    scaleKind: page.scale.kind,
    feetPerPoint: page.scale.feetPerPoint,
    scaleVerification: page.scale.verificationStatus,
    revisionLabels: page.revisions.map((entry) => entry.revision),
    matchlineTargets: page.matchlines
      .map((entry) => entry.referencedSheet)
      .filter((sheet): sheet is string => Boolean(sheet)),
    widthPt: page.widthPt,
    heightPt: page.heightPt,
    rotationDeg: page.rotationDeg,
    textSpanCount: page.counts.textSpans,
    vectorPathCount: page.counts.vectorPaths,
    warnings: page.warnings,
  }));

  const status =
    extraction.status === 'failed'
      ? ('FAILED' as const)
      : extraction.status === 'partial'
        ? ('PARTIAL' as const)
        : ('PROCESSED' as const);

  await db.$transaction([
    db.drawingSheet.deleteMany({ where: { documentRevisionId: params.documentRevisionId } }),
    ...(rows.length > 0 ? [db.drawingSheet.createMany({ data: rows })] : []),
    db.document.update({
      where: { id: params.documentId },
      data: { status, pageCount: extraction.pageCount },
    }),
  ]);

  await recordAuditEvent(db, scope, {
    action: extraction.status === 'failed' ? 'document.extraction_failed' : 'document.extraction_persisted',
    subjectType: 'document_revision',
    subjectId: params.documentRevisionId,
    metadata: {
      pagesExtracted: extraction.pagesExtracted,
      pageCount: extraction.pageCount,
      engine: extraction.extractionEngine,
    },
  });

  return { sheetsWritten: rows.length };
}

export type PersistedSheet = {
  pageNumber: number;
  sheetNumber: string | null;
  sheetTitle: string | null;
  discipline: string | null;
  role: string;
  classification: string;
  measurementSuitability: string;
  scale: string | null;
  scaleVerified: boolean;
  revisions: string[];
  matchlineTargets: string[];
  fileName: string;
  documentRevisionId: string;
};

/**
 * The drawing register for a project — the thing that makes a package worth
 * re-opening a week later.
 */
export async function getProjectDrawingRegister(
  db: CommercialDb,
  scope: OrgScope,
  projectId: string
): Promise<PersistedSheet[]> {
  await requireProjectAccess(db, scope, projectId);

  const sheets = await db.drawingSheet.findMany({
    where: { projectId },
    orderBy: [{ documentRevisionId: 'asc' }, { pageNumber: 'asc' }],
    include: { documentRevision: { select: { id: true, document: { select: { fileName: true } } } } },
  });

  return sheets.map((sheet) => ({
    pageNumber: sheet.pageNumber,
    sheetNumber: sheet.sheetNumber,
    sheetTitle: sheet.sheetTitle,
    discipline: sheet.discipline,
    role: sheet.role,
    classification: sheet.classification,
    measurementSuitability: sheet.measurementSuitability,
    scale: sheet.scaleRaw,
    scaleVerified: sheet.scaleVerification === 'verified_against_dimension',
    revisions: sheet.revisionLabels,
    matchlineTargets: sheet.matchlineTargets,
    fileName: sheet.documentRevision.document.fileName,
    documentRevisionId: sheet.documentRevision.id,
  }));
}
