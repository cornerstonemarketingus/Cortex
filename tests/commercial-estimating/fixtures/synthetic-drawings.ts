/**
 * Synthetic reference drawings.
 *
 * Real commercial drawing packages cannot be committed to the repository, so
 * the extraction tests run against PDFs generated here with pdfkit. They are
 * deliberately built to exercise the cases the extractor has to get right:
 * title blocks, sheet numbers, scale annotations, revisions, matchlines,
 * gridlines, dimension strings, hatching, raster pages and missing scales.
 */

import { deflateSync } from 'node:zlib';
import PDFDocument from 'pdfkit';

const SHEET_WIDTH_PT = 1224; // 17in
const SHEET_HEIGHT_PT = 792; // 11in

type PdfBuilder = (doc: PDFKit.PDFDocument) => void;

async function buildPdf(build: PdfBuilder): Promise<Uint8Array> {
  const doc = new PDFDocument({ size: [SHEET_WIDTH_PT, SHEET_HEIGHT_PT], margin: 0, autoFirstPage: false });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<void>((resolve) => doc.on('end', () => resolve()));

  build(doc);
  doc.end();
  await finished;

  return new Uint8Array(Buffer.concat(chunks));
}

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

/** Minimal RGB PNG, used to stand in for a scanned drawing page. */
export function makeGrayscalePng(width: number, height: number): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(2, 9); // color type: truecolor
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const raw = Buffer.alloc(height * (1 + width * 3));
  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    raw.writeUInt8(0, offset); // no filter
    offset += 1;
    for (let x = 0; x < width; x += 1) {
      // A faint diagonal so the image is not a single flat colour.
      const value = (x + y) % 32 < 2 ? 40 : 235;
      raw.writeUInt8(value, offset);
      raw.writeUInt8(value, offset + 1);
      raw.writeUInt8(value, offset + 2);
      offset += 3;
    }
  }

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function drawTitleBlock(
  doc: PDFKit.PDFDocument,
  params: { sheetNumber: string; sheetTitle: string; scale: string | null; revision: string | null }
): void {
  // pdfkit uses a top-left origin; the title block sits bottom-right on the sheet.
  doc.lineWidth(1).rect(SHEET_WIDTH_PT - 260, SHEET_HEIGHT_PT - 160, 250, 150).stroke();
  doc.fontSize(18).text(params.sheetNumber, SHEET_WIDTH_PT - 240, SHEET_HEIGHT_PT - 50);
  doc.fontSize(11).text(params.sheetTitle, SHEET_WIDTH_PT - 240, SHEET_HEIGHT_PT - 90);
  if (params.scale) {
    doc.fontSize(9).text(params.scale, SHEET_WIDTH_PT - 240, SHEET_HEIGHT_PT - 115);
  }
  if (params.revision) {
    doc.fontSize(9).text(params.revision, SHEET_WIDTH_PT - 240, SHEET_HEIGHT_PT - 138);
  }
}

function drawColumnGrid(doc: PDFKit.PDFDocument): void {
  doc.lineWidth(0.5);
  for (let i = 1; i <= 4; i += 1) {
    const x = 120 + i * 180;
    doc.moveTo(x, 40).lineTo(x, SHEET_HEIGHT_PT - 180).stroke();
  }
  for (let i = 1; i <= 3; i += 1) {
    const y = 80 + i * 150;
    doc.moveTo(60, y).lineTo(SHEET_WIDTH_PT - 280, y).stroke();
  }
}

function drawHatchedArea(doc: PDFKit.PDFDocument, x: number, y: number): void {
  doc.lineWidth(0.4);
  for (let i = 0; i < 14; i += 1) {
    doc
      .moveTo(x + i * 6, y)
      .lineTo(x + i * 6 + 14, y + 14)
      .stroke();
  }
}

/**
 * Two-sheet vector floor plan with a matchline between them, mirroring the
 * A101/A102 corridor-overlap case from the product spec.
 */
export async function buildVectorFloorPlanPdf(): Promise<Uint8Array> {
  return buildPdf((doc) => {
    // --- Sheet A101 -------------------------------------------------------
    doc.addPage({ size: [SHEET_WIDTH_PT, SHEET_HEIGHT_PT], margin: 0 });
    drawColumnGrid(doc);

    doc.lineWidth(2.5);
    doc.rect(150, 150, 320, 240).stroke(); // room outline
    doc.rect(150, 390, 320, 120).stroke(); // corridor portion
    doc.moveTo(470, 150).lineTo(470, 510).stroke();

    drawHatchedArea(doc, 200, 200);

    // Dimension string: a labelled run with its text right on the line.
    doc.lineWidth(0.4).moveTo(150, 130).lineTo(470, 130).stroke();
    doc.fontSize(8).text(`32'-0"`, 295, 121);

    doc.fontSize(9).text('CONFERENCE 201', 250, 300);
    doc.fontSize(9).text('MATCH LINE - SEE SHEET A102', 520, 520);

    drawTitleBlock(doc, {
      sheetNumber: 'A101',
      sheetTitle: 'LEVEL 2 FLOOR PLAN - AREA A',
      scale: `SCALE: 1/8" = 1'-0"`,
      revision: 'REV: C  09/14/2026',
    });

    // --- Sheet A102 -------------------------------------------------------
    doc.addPage({ size: [SHEET_WIDTH_PT, SHEET_HEIGHT_PT], margin: 0 });
    drawColumnGrid(doc);

    doc.lineWidth(2.5);
    doc.rect(150, 390, 320, 120).stroke(); // same corridor, other side of the matchline
    doc.rect(470, 150, 300, 240).stroke();

    doc.fontSize(9).text('MATCH LINE - SEE SHEET A101', 120, 520);
    doc.fontSize(9).text('OFFICE 202', 560, 300);

    drawTitleBlock(doc, {
      sheetNumber: 'A102',
      sheetTitle: 'LEVEL 2 FLOOR PLAN - AREA B',
      scale: `SCALE: 1/8" = 1'-0"`,
      revision: 'REV: C  09/14/2026',
    });
  });
}

/** A drawing sheet with real geometry but no scale annotation anywhere. */
export async function buildMissingScalePdf(): Promise<Uint8Array> {
  return buildPdf((doc) => {
    doc.addPage({ size: [SHEET_WIDTH_PT, SHEET_HEIGHT_PT], margin: 0 });
    drawColumnGrid(doc);

    doc.lineWidth(2.5);
    doc.rect(200, 200, 400, 300).stroke();
    doc.rect(600, 200, 200, 300).stroke();

    drawTitleBlock(doc, {
      sheetNumber: 'A201',
      sheetTitle: 'ENLARGED PLAN',
      scale: null,
      revision: null,
    });
  });
}

/** Sheet annotated NOT TO SCALE — nothing on it may be measured. */
export async function buildNotToScalePdf(): Promise<Uint8Array> {
  return buildPdf((doc) => {
    doc.addPage({ size: [SHEET_WIDTH_PT, SHEET_HEIGHT_PT], margin: 0 });
    doc.lineWidth(2).rect(200, 200, 400, 300).stroke();
    drawTitleBlock(doc, {
      sheetNumber: 'A801',
      sheetTitle: 'WALL PROTECTION DETAILS',
      scale: 'SCALE: N.T.S.',
      revision: null,
    });
  });
}

/** A scanned page: one full-bleed raster image and no embedded text. */
export async function buildScannedPagePdf(): Promise<Uint8Array> {
  const png = makeGrayscalePng(240, 160);

  return buildPdf((doc) => {
    doc.addPage({ size: [SHEET_WIDTH_PT, SHEET_HEIGHT_PT], margin: 0 });
    doc.image(png, 0, 0, { width: SHEET_WIDTH_PT, height: SHEET_HEIGHT_PT });
  });
}

/** A package with `pageCount` near-identical sheets, for page-cap testing. */
export async function buildMultiSheetPdf(pageCount: number): Promise<Uint8Array> {
  return buildPdf((doc) => {
    for (let index = 0; index < pageCount; index += 1) {
      doc.addPage({ size: [SHEET_WIDTH_PT, SHEET_HEIGHT_PT], margin: 0 });
      doc.lineWidth(2).rect(150, 150, 300, 200).stroke();
      drawTitleBlock(doc, {
        sheetNumber: `A${101 + index}`,
        sheetTitle: 'FLOOR PLAN',
        scale: `SCALE: 1/4" = 1'-0"`,
        revision: null,
      });
    }
  });
}

/** Bytes that are not a PDF at all. */
export function buildNonPdfBytes(): Uint8Array {
  return new Uint8Array(Buffer.from('this is a plain text file, not a drawing package', 'utf8'));
}

/** A PDF header followed by garbage — passes the magic check, fails to parse. */
export function buildCorruptPdfBytes(): Uint8Array {
  const header = Buffer.from('%PDF-1.7\n', 'latin1');
  const garbage = Buffer.alloc(2048);
  for (let i = 0; i < garbage.length; i += 1) {
    garbage[i] = (i * 37) % 251;
  }
  return new Uint8Array(Buffer.concat([header, garbage]));
}
