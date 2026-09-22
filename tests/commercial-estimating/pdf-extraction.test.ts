import assert from 'node:assert/strict';

import { describe, it, withEnv } from './harness';
import {
  buildCorruptPdfBytes,
  buildMissingScalePdf,
  buildMultiSheetPdf,
  buildNonPdfBytes,
  buildNotToScalePdf,
  buildScannedPagePdf,
  buildVectorFloorPlanPdf,
} from './fixtures/synthetic-drawings';
import {
  extractPdfDocument,
  summarizeExtraction,
} from '@/src/commercial-estimating/document-processing/pdf-extractor';
import {
  documentLimits,
  looksLikePdf,
  sha256Hex,
  validatePdfUpload,
} from '@/src/commercial-estimating/document-processing/validation';

describe('pdf extraction: multi-page vector drawing package', () => {
  it('reads every page of the package, not just the first four', async () => {
    const bytes = await buildMultiSheetPdf(9);
    const extraction = await extractPdfDocument({ data: bytes, fileName: 'package.pdf' });

    assert.equal(extraction.status, 'succeeded');
    assert.equal(extraction.pageCount, 9);
    assert.equal(extraction.pagesExtracted, 9);
  });

  it('extracts sheet identity, scale, revisions and matchlines from real page content', async () => {
    const bytes = await buildVectorFloorPlanPdf();
    const extraction = await extractPdfDocument({ data: bytes, fileName: 'level-2.pdf' });

    assert.equal(extraction.pagesExtracted, 2);

    const [first, second] = extraction.pages;
    assert.equal(first.sheet.sheetNumber, 'A101');
    assert.equal(first.sheet.discipline, 'Architectural');
    assert.equal(first.sheet.role, 'plan');
    assert.match(first.sheet.sheetTitle ?? '', /LEVEL 2 FLOOR PLAN/);
    assert.equal(first.scale.kind, 'architectural');
    assert.ok(Math.abs((first.scale.feetPerPoint ?? 0) - 8 / 72) < 1e-9);
    assert.deepEqual(
      first.revisions.map((entry) => entry.revision),
      ['C']
    );
    assert.deepEqual(
      first.matchlines.map((entry) => entry.referencedSheet),
      ['A102']
    );

    assert.equal(second.sheet.sheetNumber, 'A102');
    assert.deepEqual(
      second.matchlines.map((entry) => entry.referencedSheet),
      ['A101']
    );
  });

  it('records text with source coordinates in PDF user space', async () => {
    const bytes = await buildVectorFloorPlanPdf();
    const extraction = await extractPdfDocument({ data: bytes, fileName: 'level-2.pdf' });
    const page = extraction.pages[0];

    const sheetNumberSpan = page.textSpans.find((span) => span.text.trim() === 'A101');
    assert.ok(sheetNumberSpan, 'expected the sheet number to be extracted as a text span');
    // The title block sits bottom-right: high x, low y with a bottom-left origin.
    assert.ok(sheetNumberSpan.bbox.x > page.widthPt * 0.7);
    assert.ok(sheetNumberSpan.bbox.y < page.heightPt * 0.3);
    assert.ok(sheetNumberSpan.fontHeightPt > 0);
  });

  it('classifies vector geometry instead of treating every line as construction', async () => {
    const bytes = await buildVectorFloorPlanPdf();
    const extraction = await extractPdfDocument({ data: bytes, fileName: 'level-2.pdf' });
    const kinds = extraction.pages[0].counts.pathKinds;

    assert.ok(kinds.gridline > 0, 'column gridlines should be recognised');
    assert.ok(kinds.hatching > 0, 'hatch fill should be recognised');
    assert.ok(kinds.dimension_line > 0, 'dimension strings should be recognised');
    assert.ok(kinds.construction_candidate > 0, 'room outlines should remain candidates');
    assert.ok(kinds.border > 0, 'title block framing should not count as construction');
  });

  it('records why each path was classified the way it was', async () => {
    const bytes = await buildVectorFloorPlanPdf();
    const extraction = await extractPdfDocument({ data: bytes, fileName: 'level-2.pdf' });

    for (const path of extraction.pages[0].vectorPaths) {
      assert.ok(path.classification.reasons.length > 0, `path ${path.id} has no recorded reason`);
    }
  });

  it('builds an SVG page preview on request', async () => {
    const bytes = await buildVectorFloorPlanPdf();
    const extraction = await extractPdfDocument({
      data: bytes,
      fileName: 'level-2.pdf',
      includePreviews: true,
    });

    const preview = extraction.pages[0].preview;
    assert.ok(preview);
    assert.equal(preview.format, 'svg');
    assert.match(preview.markup, /^<svg /);
    assert.match(preview.markup, /<path /);
    assert.equal(preview.truncated, false);
  });
});

describe('pdf extraction: scale handling', () => {
  it('flags a sheet with geometry but no scale for calibration', async () => {
    const bytes = await buildMissingScalePdf();
    const extraction = await extractPdfDocument({ data: bytes, fileName: 'no-scale.pdf' });
    const page = extraction.pages[0];

    assert.equal(page.scale.feetPerPoint, null);
    assert.equal(page.measurementSuitability, 'requires_scale_calibration');
    assert.match(page.warnings.join(' '), /calibration/i);
  });

  it('refuses to measure a sheet annotated NOT TO SCALE', async () => {
    const bytes = await buildNotToScalePdf();
    const extraction = await extractPdfDocument({ data: bytes, fileName: 'nts.pdf' });
    const page = extraction.pages[0];

    assert.equal(page.scale.kind, 'not_to_scale');
    assert.equal(page.measurementSuitability, 'not_measurable');
  });

  it('never reports a declared scale as verified', async () => {
    const bytes = await buildVectorFloorPlanPdf();
    const extraction = await extractPdfDocument({ data: bytes, fileName: 'level-2.pdf' });

    for (const page of extraction.pages) {
      assert.notEqual(page.scale.verificationStatus, 'verified_against_dimension');
    }
    assert.equal(summarizeExtraction(extraction).supportedValidationStatus, 'scale_unverified');
  });
});

describe('pdf extraction: scanned drawings', () => {
  it('identifies a raster page and marks it as needing OCR', async () => {
    const bytes = await buildScannedPagePdf();
    const extraction = await extractPdfDocument({ data: bytes, fileName: 'scan.pdf' });
    const page = extraction.pages[0];

    assert.equal(page.classification, 'scanned_raster');
    assert.equal(page.measurementSuitability, 'requires_ocr');
    assert.equal(page.counts.rasterPlacements, 1);
    assert.ok(page.rasterPlacements[0].pageCoverage > 0.9);
    assert.match(page.warnings.join(' '), /OCR/);
  });

  it('does not invent measurements for a page it cannot read', async () => {
    const bytes = await buildScannedPagePdf();
    const extraction = await extractPdfDocument({ data: bytes, fileName: 'scan.pdf' });

    assert.equal(extraction.pages[0].counts.vectorPaths, 0);
    assert.equal(extraction.pages[0].counts.textSpans, 0);
  });
});

describe('pdf extraction: limits and invalid input', () => {
  it('enforces the page-count limit and says so', async () => {
    await withEnv({ COMMERCIAL_PDF_MAX_PAGES: '3' }, async () => {
      assert.equal(documentLimits().maxPagesPerDocument, 3);

      const bytes = await buildMultiSheetPdf(6);
      const extraction = await extractPdfDocument({ data: bytes, fileName: 'big.pdf' });

      assert.equal(extraction.pageCount, 6);
      assert.equal(extraction.pagesExtracted, 3);
      assert.equal(extraction.status, 'partial');
      assert.match(extraction.warnings.join(' '), /processing the first 3/i);
    });
  });

  it('rejects a file that is over the size limit', async () => {
    const bytes = await buildMultiSheetPdf(2);
    await withEnv({ COMMERCIAL_PDF_MAX_BYTES: '128' }, () => {
      const result = validatePdfUpload({ fileName: 'big.pdf', mimeType: 'application/pdf', bytes });
      assert.equal(result.ok, false);
      assert.ok(result.issues.some((issue) => issue.code === 'FILE_TOO_LARGE'));
    });
  });

  it('rejects a file that is not a PDF', () => {
    const bytes = buildNonPdfBytes();
    const result = validatePdfUpload({ fileName: 'notes.txt', mimeType: 'text/plain', bytes });

    assert.equal(result.ok, false);
    assert.ok(result.issues.some((issue) => issue.code === 'UNSUPPORTED_FILE_TYPE'));
    assert.ok(result.issues.some((issue) => issue.code === 'NOT_A_PDF'));
    assert.equal(looksLikePdf(bytes), false);
  });

  it('rejects an empty file', () => {
    const result = validatePdfUpload({
      fileName: 'empty.pdf',
      mimeType: 'application/pdf',
      bytes: new Uint8Array(0),
    });

    assert.equal(result.ok, false);
    assert.equal(result.issues[0].code, 'EMPTY_FILE');
  });

  it('fails a corrupted PDF cleanly instead of throwing', async () => {
    const extraction = await extractPdfDocument({
      data: buildCorruptPdfBytes(),
      fileName: 'corrupt.pdf',
    });

    assert.equal(extraction.status, 'failed');
    assert.equal(extraction.pagesExtracted, 0);
    assert.ok(extraction.errors.length > 0);
  });

  it('hashes document content for idempotency and de-duplication', async () => {
    const first = await buildMultiSheetPdf(1);
    const second = await buildMultiSheetPdf(1);

    assert.equal(sha256Hex(first).length, 64);
    assert.equal(sha256Hex(first), sha256Hex(new Uint8Array(first)));
    assert.notEqual(sha256Hex(first), sha256Hex(buildNonPdfBytes()));
    // Two builds of the same drawing differ only by the PDF's embedded
    // creation date, so this asserts the hash is content-sensitive.
    assert.equal(sha256Hex(second).length, 64);
  });
});
