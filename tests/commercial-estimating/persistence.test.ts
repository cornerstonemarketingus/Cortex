/**
 * Integration tests for M1 persistence, run against a real PostgreSQL database.
 *
 * These are deliberately NOT written against a fake client. The thing M1 has to
 * get right is tenant isolation at the query layer, and a fake that returns
 * whatever the repository asks for cannot prove isolation — only a real
 * database with real rows from two organizations can.
 *
 * Set COMMERCIAL_DATABASE_URL to run them. Without it the suite reports as
 * skipped rather than passing vacuously.
 */

import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describeIf, it } from './harness';
import { buildVectorFloorPlanPdf, buildMultiSheetPdf } from './fixtures/synthetic-drawings';
import {
  commercialDb,
  isCommercialDbConfigured,
  type CommercialDb,
} from '@/src/commercial-estimating/data/client';
import {
  resolveOrgScope,
  requireProjectAccess,
  TenantAccessError,
  type OrgScope,
} from '@/src/commercial-estimating/data/tenancy';
import {
  createProject,
  getProject,
  listProjects,
} from '@/src/commercial-estimating/data/projects';
import {
  getProjectDrawingRegister,
  ingestDocument,
  persistExtraction,
} from '@/src/commercial-estimating/data/documents';
import {
  FilesystemDocumentStore,
  buildDocumentKey,
  setDocumentStore,
} from '@/src/commercial-estimating/storage/document-store';
import { extractPdfDocument } from '@/src/commercial-estimating/document-processing/pdf-extractor';
import { processDocument } from '@/src/commercial-estimating/data/processing';
import { buildNonPdfBytes } from './fixtures/synthetic-drawings';

const dbConfigured = isCommercialDbConfigured();

async function resetDatabase(db: CommercialDb): Promise<void> {
  // Organization cascades to everything tenant-scoped.
  await db.auditEvent.deleteMany({});
  await db.drawingSheet.deleteMany({});
  await db.processingJob.deleteMany({});
  await db.documentRevision.deleteMany({});
  await db.document.deleteMany({});
  await db.projectAccessGrant.deleteMany({});
  await db.project.deleteMany({});
  await db.organizationMember.deleteMany({});
  await db.organization.deleteMany({});
}

async function seedOrg(
  db: CommercialDb,
  slug: string,
  actor: string,
  role: 'OWNER' | 'ADMIN' | 'ESTIMATOR' | 'VIEWER' = 'OWNER'
): Promise<OrgScope> {
  const org = await db.organization.create({
    data: {
      slug,
      name: slug,
      members: { create: { userRef: actor, role } },
    },
  });
  return resolveOrgScope(db, { organizationId: org.id, actor });
}

describeIf(dbConfigured, 'COMMERCIAL_DATABASE_URL is not set', 'persistence: tenant isolation', () => {
  it('grants a scope to a member and refuses a non-member', async () => {
    const db = commercialDb();
    await resetDatabase(db);

    const scope = await seedOrg(db, 'acme-drywall', 'anna@acme.test');
    assert.equal(scope.role, 'OWNER');
    assert.equal(scope.actor, 'anna@acme.test');

    await assert.rejects(
      () => resolveOrgScope(db, { organizationId: scope.organizationId, actor: 'mallory@other.test' }),
      (error: unknown) => error instanceof TenantAccessError
    );
  });

  it('does not reveal whether an organization exists to a non-member', async () => {
    const db = commercialDb();
    await resetDatabase(db);
    const scope = await seedOrg(db, 'acme-drywall', 'anna@acme.test');

    const realOrgDenial = await resolveOrgScope(db, {
      organizationId: scope.organizationId,
      actor: 'mallory@other.test',
    }).catch((error: TenantAccessError) => error);
    const fakeOrgDenial = await resolveOrgScope(db, {
      organizationId: 'does-not-exist',
      actor: 'mallory@other.test',
    }).catch((error: TenantAccessError) => error);

    assert.equal((realOrgDenial as TenantAccessError).code, (fakeOrgDenial as TenantAccessError).code);
    assert.equal((realOrgDenial as TenantAccessError).message, (fakeOrgDenial as TenantAccessError).message);
  });

  it('refuses writes from a viewer', async () => {
    const db = commercialDb();
    await resetDatabase(db);
    const viewer = await seedOrg(db, 'viewer-co', 'val@viewer.test', 'VIEWER');

    await assert.rejects(
      () => createProject(db, viewer, { name: 'Should not exist' }),
      (error: unknown) => error instanceof TenantAccessError
    );
  });

  it('never lists another organization projects', async () => {
    const db = commercialDb();
    await resetDatabase(db);

    const acme = await seedOrg(db, 'acme', 'anna@acme.test');
    const rival = await seedOrg(db, 'rival', 'rick@rival.test');

    await createProject(db, acme, { name: 'Acme Medical Center' });
    await createProject(db, rival, { name: 'Rival Office Fitout' });

    const acmeProjects = await listProjects(db, acme);
    const rivalProjects = await listProjects(db, rival);

    assert.deepEqual(acmeProjects.map((p) => p.name), ['Acme Medical Center']);
    assert.deepEqual(rivalProjects.map((p) => p.name), ['Rival Office Fitout']);
  });

  it('reports another organization project as not found, not forbidden', async () => {
    const db = commercialDb();
    await resetDatabase(db);

    const acme = await seedOrg(db, 'acme', 'anna@acme.test');
    const rival = await seedOrg(db, 'rival', 'rick@rival.test');
    const project = await createProject(db, acme, { name: 'Acme Medical Center' });

    // 404 rather than 403: a competitor must not be able to probe for the
    // existence of a project id.
    await assert.rejects(
      () => getProject(db, rival, project.id),
      (error: { status?: number; code?: string }) =>
        error.status === 404 && error.code === 'PROJECT_NOT_FOUND'
    );
  });
});

describeIf(dbConfigured, 'COMMERCIAL_DATABASE_URL is not set', 'persistence: access grants', () => {
  it('lets a granted organization read a project it does not own', async () => {
    const db = commercialDb();
    await resetDatabase(db);

    const gc = await seedOrg(db, 'general-contractor', 'gina@gc.test');
    const sub = await seedOrg(db, 'subcontractor', 'sam@sub.test');
    const project = await createProject(db, gc, { name: 'Shared Bid Package' });

    await db.projectAccessGrant.create({
      data: { projectId: project.id, organizationId: sub.organizationId, accessLevel: 'READ_DOCUMENTS' },
    });

    const access = await requireProjectAccess(db, sub, project.id);
    assert.equal(access.owned, false);
    assert.equal(access.accessLevel, 'READ_DOCUMENTS');

    const seen = await getProject(db, sub, project.id);
    assert.equal(seen.owned, false);
    assert.equal(seen.name, 'Shared Bid Package');
  });

  it('refuses an expired grant', async () => {
    const db = commercialDb();
    await resetDatabase(db);

    const gc = await seedOrg(db, 'general-contractor', 'gina@gc.test');
    const sub = await seedOrg(db, 'subcontractor', 'sam@sub.test');
    const project = await createProject(db, gc, { name: 'Expired Package' });

    await db.projectAccessGrant.create({
      data: {
        projectId: project.id,
        organizationId: sub.organizationId,
        accessLevel: 'READ_DOCUMENTS',
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    await assert.rejects(
      () => requireProjectAccess(db, sub, project.id),
      (error: { code?: string }) => error.code === 'PROJECT_ACCESS_EXPIRED'
    );
  });

  it('does not let a granted organization upload into the owner project', async () => {
    const db = commercialDb();
    await resetDatabase(db);

    const gc = await seedOrg(db, 'general-contractor', 'gina@gc.test');
    const sub = await seedOrg(db, 'subcontractor', 'sam@sub.test');
    const project = await createProject(db, gc, { name: 'Shared Bid Package' });
    await db.projectAccessGrant.create({
      data: { projectId: project.id, organizationId: sub.organizationId, accessLevel: 'FULL' },
    });

    await assert.rejects(
      () =>
        ingestDocument(db, sub, {
          projectId: project.id,
          fileName: 'sneaky.pdf',
          mimeType: 'application/pdf',
          bytes: new Uint8Array([1, 2, 3]),
        }),
      (error: { code?: string }) => error.code === 'PROJECT_NOT_OWNED'
    );
  });
});

describeIf(dbConfigured, 'COMMERCIAL_DATABASE_URL is not set', 'persistence: documents and revisions', () => {
  it('stores an upload once and treats identical bytes as a duplicate', async () => {
    const db = commercialDb();
    await resetDatabase(db);

    const root = await mkdtemp(join(tmpdir(), 'cortex-docstore-'));
    setDocumentStore(new FilesystemDocumentStore(root));

    try {
      const acme = await seedOrg(db, 'acme', 'anna@acme.test');
      const project = await createProject(db, acme, { name: 'Medical Center' });
      const bytes = await buildVectorFloorPlanPdf();

      const first = await ingestDocument(db, acme, {
        projectId: project.id,
        fileName: 'level-2.pdf',
        mimeType: 'application/pdf',
        bytes,
      });
      assert.equal(first.duplicate, false);
      assert.equal(first.newRevision, false);

      const second = await ingestDocument(db, acme, {
        projectId: project.id,
        fileName: 'level-2.pdf',
        mimeType: 'application/pdf',
        bytes,
      });
      assert.equal(second.duplicate, true, 'identical bytes must not create a second document');
      assert.equal(second.documentId, first.documentId);

      assert.equal(await db.document.count(), 1);
      assert.equal(await db.documentRevision.count(), 1);
    } finally {
      setDocumentStore(null);
      await rm(root, { recursive: true, force: true });
    }
  });

  it('adds a superseding revision when the same file changes, keeping the original', async () => {
    const db = commercialDb();
    await resetDatabase(db);

    const root = await mkdtemp(join(tmpdir(), 'cortex-docstore-'));
    const store = new FilesystemDocumentStore(root);
    setDocumentStore(store);

    try {
      const acme = await seedOrg(db, 'acme', 'anna@acme.test');
      const project = await createProject(db, acme, { name: 'Medical Center' });

      const original = await buildVectorFloorPlanPdf();
      const revised = await buildMultiSheetPdf(3);

      const first = await ingestDocument(db, acme, {
        projectId: project.id,
        fileName: 'level-2.pdf',
        mimeType: 'application/pdf',
        bytes: original,
      });
      const second = await ingestDocument(db, acme, {
        projectId: project.id,
        fileName: 'level-2.pdf',
        mimeType: 'application/pdf',
        bytes: revised,
        revisionLabel: 'C',
      });

      assert.equal(second.newRevision, true);
      assert.equal(second.documentId, first.documentId);
      assert.equal(await db.documentRevision.count(), 2);

      const chained = await db.documentRevision.findUnique({ where: { id: second.documentRevisionId } });
      assert.equal(chained?.supersedesId, first.documentRevisionId, 'revision chain must be recorded');
      assert.equal(chained?.revisionLabel, 'C');

      // The superseded drawing is still retrievable — an estimate measured
      // against it must remain traceable.
      const originalBytes = await store.get(first.storageKey);
      assert.equal(originalBytes.length, original.length);
      assert.notEqual(first.storageKey, second.storageKey);
    } finally {
      setDocumentStore(null);
      await rm(root, { recursive: true, force: true });
    }
  });

  it('isolates stored documents by organization in the storage key', () => {
    const keyA = buildDocumentKey({ organizationId: 'orgA', sha256: 'a'.repeat(64) });
    const keyB = buildDocumentKey({ organizationId: 'orgB', sha256: 'a'.repeat(64) });
    assert.notEqual(keyA, keyB, 'identical bytes in different orgs must not share a key');
    assert.match(keyA, /^org\/orgA\//);
  });

  it('rejects a storage key built from unsafe input', () => {
    assert.throws(() => buildDocumentKey({ organizationId: '../etc', sha256: 'a'.repeat(64) }));
    assert.throws(() => buildDocumentKey({ organizationId: 'orgA', sha256: 'not-a-digest' }));
  });
});

describeIf(dbConfigured, 'COMMERCIAL_DATABASE_URL is not set', 'persistence: drawing register survives the request', () => {
  it('extracts, persists, and reads back the sheet register', async () => {
    const db = commercialDb();
    await resetDatabase(db);

    const root = await mkdtemp(join(tmpdir(), 'cortex-docstore-'));
    setDocumentStore(new FilesystemDocumentStore(root));

    try {
      const acme = await seedOrg(db, 'acme', 'anna@acme.test');
      const project = await createProject(db, acme, { name: 'Medical Center' });
      const bytes = await buildVectorFloorPlanPdf();

      const ingested = await ingestDocument(db, acme, {
        projectId: project.id,
        fileName: 'level-2.pdf',
        mimeType: 'application/pdf',
        bytes,
      });

      const extraction = await extractPdfDocument({ data: bytes, fileName: 'level-2.pdf' });
      const { sheetsWritten } = await persistExtraction(db, acme, {
        documentId: ingested.documentId,
        documentRevisionId: ingested.documentRevisionId,
        extraction,
      });
      assert.equal(sheetsWritten, 2);

      // The whole point of M1: a *new* scope, as if on a later request.
      const laterScope = await resolveOrgScope(db, {
        organizationId: acme.organizationId,
        actor: 'anna@acme.test',
      });
      const register = await getProjectDrawingRegister(db, laterScope, project.id);

      assert.deepEqual(register.map((s) => s.sheetNumber), ['A101', 'A102']);
      assert.match(register[0].sheetTitle ?? '', /LEVEL 2 FLOOR PLAN/);
      assert.match(register[0].scale ?? '', /1\/8/);
      assert.deepEqual(register[0].revisions, ['C']);
      assert.deepEqual(register[0].matchlineTargets, ['A102']);
      assert.equal(register[0].scaleVerified, false);
      assert.equal(register[0].fileName, 'level-2.pdf');

      const stored = await db.document.findUnique({ where: { id: ingested.documentId } });
      assert.equal(stored?.status, 'PROCESSED');
      assert.equal(stored?.pageCount, 2);
    } finally {
      setDocumentStore(null);
      await rm(root, { recursive: true, force: true });
    }
  });

  it('reprocessing converges instead of duplicating sheets', async () => {
    const db = commercialDb();
    await resetDatabase(db);

    const root = await mkdtemp(join(tmpdir(), 'cortex-docstore-'));
    setDocumentStore(new FilesystemDocumentStore(root));

    try {
      const acme = await seedOrg(db, 'acme', 'anna@acme.test');
      const project = await createProject(db, acme, { name: 'Medical Center' });
      const bytes = await buildVectorFloorPlanPdf();
      const ingested = await ingestDocument(db, acme, {
        projectId: project.id,
        fileName: 'level-2.pdf',
        mimeType: 'application/pdf',
        bytes,
      });
      const extraction = await extractPdfDocument({ data: bytes, fileName: 'level-2.pdf' });

      await persistExtraction(db, acme, { ...ingested, extraction });
      await persistExtraction(db, acme, { ...ingested, extraction });

      assert.equal(await db.drawingSheet.count(), 2, 'a reprocess must replace, not append');
    } finally {
      setDocumentStore(null);
      await rm(root, { recursive: true, force: true });
    }
  });

  it('writes an audit trail for project and document writes', async () => {
    const db = commercialDb();
    await resetDatabase(db);

    const root = await mkdtemp(join(tmpdir(), 'cortex-docstore-'));
    setDocumentStore(new FilesystemDocumentStore(root));

    try {
      const acme = await seedOrg(db, 'acme', 'anna@acme.test');
      const project = await createProject(db, acme, { name: 'Medical Center' });
      await ingestDocument(db, acme, {
        projectId: project.id,
        fileName: 'level-2.pdf',
        mimeType: 'application/pdf',
        bytes: await buildVectorFloorPlanPdf(),
      });

      const events = await db.auditEvent.findMany({ orderBy: { createdAt: 'asc' } });
      const actions = events.map((event) => event.action);
      assert.ok(actions.includes('project.created'));
      assert.ok(actions.includes('document.uploaded'));
      assert.ok(events.every((event) => event.organizationId === acme.organizationId));
      assert.ok(events.every((event) => event.actor === 'anna@acme.test'));
    } finally {
      setDocumentStore(null);
      await rm(root, { recursive: true, force: true });
    }
  });
});

describeIf(dbConfigured, 'COMMERCIAL_DATABASE_URL is not set', 'persistence: processing jobs', () => {
  async function setup() {
    const db = commercialDb();
    await resetDatabase(db);
    const root = await mkdtemp(join(tmpdir(), 'cortex-docstore-'));
    setDocumentStore(new FilesystemDocumentStore(root));
    const acme = await seedOrg(db, 'acme', 'anna@acme.test');
    const project = await createProject(db, acme, { name: 'Medical Center' });
    return { db, acme, project, root };
  }

  it('records a durable job and writes the sheets', async () => {
    const { db, acme, project, root } = await setup();
    try {
      const bytes = await buildVectorFloorPlanPdf();
      const ingested = await ingestDocument(db, acme, {
        projectId: project.id,
        fileName: 'level-2.pdf',
        mimeType: 'application/pdf',
        bytes,
      });

      const result = await processDocument(db, acme, {
        documentId: ingested.documentId,
        documentRevisionId: ingested.documentRevisionId,
        projectId: project.id,
        fileName: 'level-2.pdf',
        mimeType: 'application/pdf',
        bytes,
      });

      assert.equal(result.status, 'SUCCEEDED');
      assert.equal(result.sheetsWritten, 2);
      assert.equal(result.pagesExtracted, 2);
      assert.equal(result.billablePages, 2);
      assert.equal(result.reusedFromCache, false);

      const job = await db.processingJob.findUnique({ where: { id: result.jobId } });
      assert.equal(job?.status, 'SUCCEEDED');
      assert.equal(job?.attempts, 1);
      assert.ok(job?.startedAt && job?.finishedAt, 'job must record its own timing');
    } finally {
      setDocumentStore(null);
      await rm(root, { recursive: true, force: true });
    }
  });

  it('does not reprocess or re-bill the same revision', async () => {
    const { db, acme, project, root } = await setup();
    try {
      const bytes = await buildVectorFloorPlanPdf();
      const ingested = await ingestDocument(db, acme, {
        projectId: project.id,
        fileName: 'level-2.pdf',
        mimeType: 'application/pdf',
        bytes,
      });
      const args = {
        documentId: ingested.documentId,
        documentRevisionId: ingested.documentRevisionId,
        projectId: project.id,
        fileName: 'level-2.pdf',
        mimeType: 'application/pdf',
        bytes,
      };

      const first = await processDocument(db, acme, args);
      let extractorCalls = 0;
      const second = await processDocument(db, acme, {
        ...args,
        extractor: (async (options) => {
          extractorCalls += 1;
          return extractPdfDocument(options);
        }) as typeof extractPdfDocument,
      });

      assert.equal(extractorCalls, 0, 'a completed revision must not re-run the parser');
      assert.equal(second.reusedFromCache, true);
      assert.equal(second.billablePages, 0, 'a reprocessed revision must not be billed twice');
      assert.equal(second.jobId, first.jobId);
      assert.equal(second.sheetsWritten, 2);
      assert.equal(await db.processingJob.count(), 1);
    } finally {
      setDocumentStore(null);
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects a non-PDF and records why', async () => {
    const { db, acme, project, root } = await setup();
    try {
      const bytes = buildNonPdfBytes();
      const ingested = await ingestDocument(db, acme, {
        projectId: project.id,
        fileName: 'notes.txt',
        mimeType: 'text/plain',
        bytes,
      });

      await assert.rejects(
        () =>
          processDocument(db, acme, {
            documentId: ingested.documentId,
            documentRevisionId: ingested.documentRevisionId,
            projectId: project.id,
            fileName: 'notes.txt',
            mimeType: 'text/plain',
            bytes,
          }),
        (error: { code?: string }) => error.code === 'DOCUMENT_REJECTED'
      );

      const document = await db.document.findUnique({ where: { id: ingested.documentId } });
      assert.equal(document?.status, 'REJECTED');

      const job = await db.processingJob.findFirst({ where: { documentId: ingested.documentId } });
      assert.equal(job?.status, 'FAILED');
      assert.ok((job?.error ?? '').length > 0, 'a rejection must record its reason');
    } finally {
      setDocumentStore(null);
      await rm(root, { recursive: true, force: true });
    }
  });

  it('survives an extractor that throws and leaves the job retryable', async () => {
    const { db, acme, project, root } = await setup();
    try {
      const bytes = await buildVectorFloorPlanPdf();
      const ingested = await ingestDocument(db, acme, {
        projectId: project.id,
        fileName: 'level-2.pdf',
        mimeType: 'application/pdf',
        bytes,
      });

      const result = await processDocument(db, acme, {
        documentId: ingested.documentId,
        documentRevisionId: ingested.documentRevisionId,
        projectId: project.id,
        fileName: 'level-2.pdf',
        mimeType: 'application/pdf',
        bytes,
        extractor: (async () => {
          throw new Error('worker died');
        }) as typeof extractPdfDocument,
      });

      assert.equal(result.status, 'FAILED');
      assert.match(result.error ?? '', /worker died/);

      const document = await db.document.findUnique({ where: { id: ingested.documentId } });
      assert.equal(document?.status, 'FAILED');

      // A failed job is NOT treated as complete, so a retry re-runs it.
      const retry = await processDocument(db, acme, {
        documentId: ingested.documentId,
        documentRevisionId: ingested.documentRevisionId,
        projectId: project.id,
        fileName: 'level-2.pdf',
        mimeType: 'application/pdf',
        bytes,
      });
      assert.equal(retry.status, 'SUCCEEDED');
      assert.equal(retry.reusedFromCache, false);
      assert.equal(retry.sheetsWritten, 2);
    } finally {
      setDocumentStore(null);
      await rm(root, { recursive: true, force: true });
    }
  });
});
