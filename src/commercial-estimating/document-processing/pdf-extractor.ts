/**
 * Cortex PDF Intelligence V1 — real architectural PDF processing.
 *
 * Reads the actual contents of an uploaded drawing package: page geometry,
 * embedded text with coordinates, vector paths with the current transformation
 * matrix applied, raster placements, sheet identity, drawing scale, revisions
 * and matchline references.
 *
 * Deliberate boundaries:
 *  - No AI is involved anywhere in this file. Everything it reports was read
 *    out of the PDF or computed arithmetically from what it read.
 *  - It produces no construction quantities. It reports geometry and metadata;
 *    converting geometry into measured building elements is Phase 2 and needs a
 *    verified scale first.
 */

import { randomUUID } from 'node:crypto';

import { roundTo } from '../domain/units';
import {
  applyMatrix,
  buildClassificationContext,
  classifyPath,
  emptyPathKindCounts,
  IDENTITY_MATRIX,
  matrixScale,
  measureSubpaths,
  multiplyMatrix,
  type Matrix,
} from './geometry';
import { renderPagePreviewSvg } from './preview';
import { looksLikeScaleAnnotation, resolvePageScale } from './scale';
import { extractMatchlines, extractRevisions, identifySheet } from './sheet-metadata';
import { documentLimits, sha256Hex } from './validation';
import type {
  BoundingBox,
  DocumentExtraction,
  DocumentExtractionSummary,
  MeasurementSuitability,
  PageClassification,
  PageExtraction,
  PathSubpath,
  Point,
  RasterPlacement,
  TextSpan,
  VectorPath,
} from './types';

export const EXTRACTION_ENGINE = 'cortex-pdf-intelligence/1.0 (pdfjs-dist)';

/* -------------------------------------------------------------------------- */
/* Minimal structural types for the pdf.js surface we use.                     */
/* -------------------------------------------------------------------------- */

type OpsTable = Record<string, number>;

type TextContentItem = {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
  hasEOL?: boolean;
};

type OperatorList = {
  fnArray: number[];
  argsArray: unknown[];
};

type PdfPageProxy = {
  rotate: number;
  getViewport: (params: { scale: number; rotation?: number }) => { width: number; height: number };
  getTextContent: (params?: { includeMarkedContent?: boolean }) => Promise<{ items: TextContentItem[] }>;
  getOperatorList: () => Promise<OperatorList>;
  cleanup: () => void;
};

type PdfDocumentProxy = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxy>;
  getMetadata: () => Promise<{ info?: Record<string, unknown> }>;
  destroy: () => Promise<void>;
};

type PdfjsModule = {
  OPS: OpsTable;
  getDocument: (params: Record<string, unknown>) => { promise: Promise<PdfDocumentProxy> };
  GlobalWorkerOptions?: { workerSrc?: string };
};

let pdfjsPromise: Promise<PdfjsModule> | null = null;

/**
 * pdf.js is loaded lazily and in its legacy (Node-friendly) build so the rest
 * of the app never pays for it and a bundling problem degrades this feature
 * rather than the whole route.
 */
async function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then(
      (mod) => mod as unknown as PdfjsModule
    );
  }
  return pdfjsPromise;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

class ExtractionTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtractionTimeoutError';
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new ExtractionTimeoutError(`${label} exceeded ${ms}ms`));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * pdf.js logs a warning for every document about standard font data, which we
 * never need because nothing here rasterizes glyphs. Default to errors-only and
 * let an operator turn the chatter back on when debugging an extraction.
 */
function pdfjsVerbosity(): number {
  const raw = process.env.COMMERCIAL_PDF_VERBOSITY;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function sampleCubicBezier(from: Point, c1: Point, c2: Point, to: Point, segments = 8): Point[] {
  const points: Point[] = [];
  for (let i = 1; i <= segments; i += 1) {
    const t = i / segments;
    const mt = 1 - t;
    points.push({
      x: mt * mt * mt * from.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * to.x,
      y: mt * mt * mt * from.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * to.y,
    });
  }
  return points;
}

/* -------------------------------------------------------------------------- */
/* Text extraction                                                             */
/* -------------------------------------------------------------------------- */

function extractTextSpans(items: TextContentItem[], maxSpans: number): {
  spans: TextSpan[];
  dropped: number;
} {
  const spans: TextSpan[] = [];
  let dropped = 0;

  for (const item of items) {
    const text = typeof item.str === 'string' ? item.str : '';
    if (!text.trim()) continue;

    if (spans.length >= maxSpans) {
      dropped += 1;
      continue;
    }

    const transform = Array.isArray(item.transform) ? item.transform : [1, 0, 0, 1, 0, 0];
    const [a, b, c, d, e, f] = transform;

    const fontHeightPt = item.height && item.height > 0 ? item.height : Math.hypot(c, d);
    const widthPt = item.width && item.width > 0 ? item.width : text.length * fontHeightPt * 0.5;
    const rotationDeg = roundTo((Math.atan2(b, a) * 180) / Math.PI, 2);

    spans.push({
      id: `span-${spans.length + 1}`,
      text,
      bbox: {
        x: roundTo(e, 3),
        y: roundTo(f, 3),
        width: roundTo(widthPt, 3),
        height: roundTo(fontHeightPt, 3),
      } satisfies BoundingBox,
      fontHeightPt: roundTo(fontHeightPt, 3),
      rotationDeg,
      extractionMethod: 'pdf_embedded_text',
    });
  }

  return { spans, dropped };
}

/* -------------------------------------------------------------------------- */
/* Vector geometry extraction                                                  */
/* -------------------------------------------------------------------------- */

type PendingPath = {
  subpaths: PathSubpath[];
  strokeWidthPt: number;
};

type GeometryResult = {
  paths: Array<Omit<VectorPath, 'classification'>>;
  rasters: RasterPlacement[];
  dropped: number;
};

/**
 * Walk the page operator list, maintaining the CTM stack ourselves so every
 * coordinate we store is in page space. pdf.js reports path coordinates in the
 * *current* user space, so skipping this step silently misplaces geometry on
 * any drawing that uses a viewport transform — which is all of them.
 */
function extractGeometry(params: {
  operatorList: OperatorList;
  ops: OpsTable;
  maxPaths: number;
  pageWidthPt: number;
  pageHeightPt: number;
}): GeometryResult {
  const { operatorList, ops, maxPaths, pageWidthPt, pageHeightPt } = params;

  const paths: Array<Omit<VectorPath, 'classification'>> = [];
  const rasters: RasterPlacement[] = [];
  let dropped = 0;

  let ctm: Matrix = [...IDENTITY_MATRIX] as Matrix;
  const ctmStack: Matrix[] = [];
  let lineWidth = 1;
  const lineWidthStack: number[] = [];

  let pending: PendingPath | null = null;
  const pageArea = pageWidthPt * pageHeightPt;

  const finalize = (
    stroked: boolean,
    filled: boolean,
    closesPath = false,
    fillOnly = false
  ) => {
    if (!pending) return;
    const current = pending;
    pending = null;

    const usable = current.subpaths.filter((subpath) => subpath.points.length >= 2);
    if (usable.length === 0) return;

    // `s`, `b` and `b*` close the current subpath before painting it. pdf.js
    // reports them as their own operators rather than appending a closePath,
    // so the implicit closing segment has to be applied here or it is lost
    // from both the measured length and the closed-shape classification.
    if (closesPath) {
      const last = usable[usable.length - 1];
      usable[usable.length - 1] = { ...last, closed: true };
    }

    // `f` and `f*` implicitly close *every* open subpath before filling
    // (PDF 32000-1 8.5.3.3), so a filled polygon drawn m/l/l/l is a closed
    // region even though no close operator was issued. Only the fill-only
    // operators get this: for `B`/`B*` the stroke still follows the path as
    // drawn, so closing them here would add a segment the stroke never
    // painted and over-measure its length.
    if (fillOnly) {
      for (let index = 0; index < usable.length; index += 1) {
        if (!usable[index].closed) {
          usable[index] = { ...usable[index], closed: true };
        }
      }
    }

    if (paths.length >= maxPaths) {
      dropped += 1;
      return;
    }

    const measured = measureSubpaths(usable);
    paths.push({
      id: `path-${paths.length + 1}`,
      subpaths: usable,
      bbox: measured.bbox,
      lengthPt: measured.lengthPt,
      strokeWidthPt: roundTo(current.strokeWidthPt, 3),
      stroked,
      filled,
      isStraightSegment: measured.isStraightSegment,
      angleDeg: measured.angleDeg,
    });
  };

  for (let i = 0; i < operatorList.fnArray.length; i += 1) {
    const fn = operatorList.fnArray[i];
    const args = operatorList.argsArray[i];

    if (fn === ops.save) {
      ctmStack.push([...ctm] as Matrix);
      lineWidthStack.push(lineWidth);
      continue;
    }

    if (fn === ops.restore) {
      const restored = ctmStack.pop();
      if (restored) ctm = restored;
      const restoredWidth = lineWidthStack.pop();
      if (restoredWidth !== undefined) lineWidth = restoredWidth;
      continue;
    }

    if (fn === ops.transform && Array.isArray(args) && args.length >= 6) {
      ctm = multiplyMatrix(args.slice(0, 6) as Matrix, ctm);
      continue;
    }

    if (fn === ops.paintFormXObjectBegin) {
      // pdf.js passes a null matrix when the form carries no /Matrix entry
      // (it defaults to identity), so the push has to happen unconditionally —
      // paintFormXObjectEnd always pops, and an unbalanced stack would apply a
      // stale CTM to every path drawn after the form.
      ctmStack.push([...ctm] as Matrix);
      lineWidthStack.push(lineWidth);

      const formMatrix = Array.isArray(args) ? args[0] : null;
      if (Array.isArray(formMatrix) && formMatrix.length >= 6) {
        ctm = multiplyMatrix((formMatrix as number[]).slice(0, 6) as Matrix, ctm);
      }
      continue;
    }

    if (fn === ops.paintFormXObjectEnd) {
      const restored = ctmStack.pop();
      if (restored) ctm = restored;
      const restoredWidth = lineWidthStack.pop();
      if (restoredWidth !== undefined) lineWidth = restoredWidth;
      continue;
    }

    if (fn === ops.setLineWidth && Array.isArray(args) && typeof args[0] === 'number') {
      lineWidth = args[0];
      continue;
    }

    if (fn === ops.setGState && Array.isArray(args) && Array.isArray(args[0])) {
      // pdf.js forwards ExtGState entries as [key, value] pairs; /LW sets the
      // stroke width just as the `w` operator does.
      for (const pair of args[0] as unknown[]) {
        if (!Array.isArray(pair)) continue;
        if (pair[0] === 'LW' && typeof pair[1] === 'number') lineWidth = pair[1];
      }
      continue;
    }

    if (fn === ops.constructPath && Array.isArray(args)) {
      const pathOps = args[0];
      const coords = args[1];
      if (!Array.isArray(pathOps) || !coords) continue;

      const values: number[] = Array.from(coords as ArrayLike<number>);
      const subpaths: PathSubpath[] = [];
      let currentPoints: Point[] = [];
      let currentClosed = false;
      let cursor: Point = { x: 0, y: 0 };
      let coordIndex = 0;

      const flushSubpath = () => {
        if (currentPoints.length >= 2) {
          subpaths.push({ closed: currentClosed, points: currentPoints });
        }
        currentPoints = [];
        currentClosed = false;
      };

      for (const pathOp of pathOps as number[]) {
        if (pathOp === ops.moveTo) {
          flushSubpath();
          cursor = applyMatrix(ctm, values[coordIndex], values[coordIndex + 1]);
          currentPoints = [cursor];
          coordIndex += 2;
        } else if (pathOp === ops.lineTo) {
          cursor = applyMatrix(ctm, values[coordIndex], values[coordIndex + 1]);
          currentPoints.push(cursor);
          coordIndex += 2;
        } else if (pathOp === ops.curveTo) {
          const c1 = applyMatrix(ctm, values[coordIndex], values[coordIndex + 1]);
          const c2 = applyMatrix(ctm, values[coordIndex + 2], values[coordIndex + 3]);
          const end = applyMatrix(ctm, values[coordIndex + 4], values[coordIndex + 5]);
          currentPoints.push(...sampleCubicBezier(cursor, c1, c2, end));
          cursor = end;
          coordIndex += 6;
        } else if (pathOp === ops.curveTo2) {
          const c2 = applyMatrix(ctm, values[coordIndex], values[coordIndex + 1]);
          const end = applyMatrix(ctm, values[coordIndex + 2], values[coordIndex + 3]);
          currentPoints.push(...sampleCubicBezier(cursor, cursor, c2, end));
          cursor = end;
          coordIndex += 4;
        } else if (pathOp === ops.curveTo3) {
          const c1 = applyMatrix(ctm, values[coordIndex], values[coordIndex + 1]);
          const end = applyMatrix(ctm, values[coordIndex + 2], values[coordIndex + 3]);
          currentPoints.push(...sampleCubicBezier(cursor, c1, end, end));
          cursor = end;
          coordIndex += 4;
        } else if (pathOp === ops.closePath) {
          currentClosed = true;
          flushSubpath();
        } else if (pathOp === ops.rectangle) {
          flushSubpath();
          const x = values[coordIndex];
          const y = values[coordIndex + 1];
          const w = values[coordIndex + 2];
          const h = values[coordIndex + 3];
          coordIndex += 4;

          const corners: Point[] = [
            applyMatrix(ctm, x, y),
            applyMatrix(ctm, x + w, y),
            applyMatrix(ctm, x + w, y + h),
            applyMatrix(ctm, x, y + h),
          ];
          subpaths.push({ closed: true, points: corners });
          cursor = corners[0];
        }
      }
      flushSubpath();

      if (subpaths.length > 0) {
        pending = {
          subpaths,
          strokeWidthPt: Math.abs(lineWidth) * matrixScale(ctm),
        };
      }
      continue;
    }

    if (fn === ops.stroke || fn === ops.closeStroke) {
      finalize(true, false, fn === ops.closeStroke);
      continue;
    }

    if (fn === ops.fill || fn === ops.eoFill) {
      finalize(false, true, false, true);
      continue;
    }

    if (fn === ops.fillStroke || fn === ops.eoFillStroke || fn === ops.closeFillStroke || fn === ops.closeEOFillStroke) {
      finalize(true, true, fn === ops.closeFillStroke || fn === ops.closeEOFillStroke);
      continue;
    }

    if (fn === ops.endPath) {
      // Reached after a clipping path — the geometry is not drawn, so drop it.
      pending = null;
      continue;
    }

    if (
      fn === ops.paintImageXObject ||
      fn === ops.paintImageMaskXObject ||
      fn === ops.paintInlineImageXObject ||
      fn === ops.paintImageXObjectRepeat
    ) {
      const corners: Point[] = [
        applyMatrix(ctm, 0, 0),
        applyMatrix(ctm, 1, 0),
        applyMatrix(ctm, 1, 1),
        applyMatrix(ctm, 0, 1),
      ];
      const xs = corners.map((point) => point.x);
      const ys = corners.map((point) => point.y);
      const bbox: BoundingBox = {
        x: roundTo(Math.min(...xs), 3),
        y: roundTo(Math.min(...ys), 3),
        width: roundTo(Math.max(...xs) - Math.min(...xs), 3),
        height: roundTo(Math.max(...ys) - Math.min(...ys), 3),
      };

      rasters.push({
        id: `raster-${rasters.length + 1}`,
        bbox,
        pageCoverage: pageArea > 0 ? roundTo(Math.min(1, (bbox.width * bbox.height) / pageArea), 4) : 0,
      });
      continue;
    }
  }

  return { paths, rasters, dropped };
}

/* -------------------------------------------------------------------------- */
/* Page classification                                                         */
/* -------------------------------------------------------------------------- */

/**
 * A page needs a handful of paths before it is treated as a drawing rather
 * than a text sheet. Real plan sheets carry thousands; the threshold only has
 * to separate "has geometry" from "has a rule under a heading".
 */
const VECTOR_DRAWING_MIN_PATHS = 6;

export function classifyPage(params: {
  textSpanCount: number;
  constructionPathCount: number;
  totalPathCount: number;
  rasterCoverage: number;
}): PageClassification {
  const { textSpanCount, totalPathCount, rasterCoverage } = params;

  if (textSpanCount === 0 && totalPathCount === 0 && rasterCoverage === 0) return 'empty';

  if (rasterCoverage >= 0.5 && totalPathCount < VECTOR_DRAWING_MIN_PATHS) return 'scanned_raster';
  if (rasterCoverage >= 0.3 && totalPathCount >= VECTOR_DRAWING_MIN_PATHS) return 'mixed';
  if (totalPathCount >= VECTOR_DRAWING_MIN_PATHS) return 'vector_drawing';
  if (rasterCoverage >= 0.5) return 'scanned_raster';
  if (textSpanCount > 0) return 'text_only';

  return 'empty';
}

export function determineMeasurementSuitability(params: {
  classification: PageClassification;
  hasUsableScale: boolean;
  notToScale: boolean;
  constructionPathCount: number;
}): MeasurementSuitability {
  const { classification, hasUsableScale, notToScale, constructionPathCount } = params;

  if (classification === 'scanned_raster') return 'requires_ocr';
  if (classification === 'text_only' || classification === 'empty') return 'not_measurable';
  // An explicit NOT TO SCALE note overrides any geometry on the sheet.
  if (notToScale) return 'not_measurable';
  if (constructionPathCount === 0) return 'not_measurable';

  return hasUsableScale ? 'measurable' : 'requires_scale_calibration';
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

export type ExtractPdfOptions = {
  data: Uint8Array;
  fileName: string;
  documentId?: string;
  /** Hard cap on pages extracted from this document. */
  maxPages?: number;
  /** Build SVG previews. Off by default — previews add weight to API payloads. */
  includePreviews?: boolean;
  /** Keep the full per-page span/path arrays. Off by default for API responses. */
  includeRawGeometry?: boolean;
  onProgress?: (progress: { pageNumber: number; pagesExtracted: number; pageCount: number }) => void;
};

/**
 * Extract one PDF. Never throws for per-page problems: a page that fails is
 * recorded as a warning and the document comes back `partial`, so a 300-sheet
 * package is not lost to one bad sheet.
 */
export async function extractPdfDocument(options: ExtractPdfOptions): Promise<DocumentExtraction> {
  const startedAt = Date.now();
  const limits = documentLimits();
  const documentId = options.documentId ?? randomUUID();
  const sha256 = sha256Hex(options.data);
  const maxPages = Math.max(1, Math.min(options.maxPages ?? limits.maxPagesPerDocument, limits.maxPagesPerDocument));

  const warnings: string[] = [];
  const errors: string[] = [];
  const pages: PageExtraction[] = [];

  let pdf: PdfDocumentProxy | null = null;
  let pageCount = 0;
  let producer: string | null = null;

  try {
    const pdfjs = await loadPdfjs();
    const ops = pdfjs.OPS;

    const loadingTask = pdfjs.getDocument({
      // pdf.js transfers ownership of the buffer, so hand it a private copy.
      data: new Uint8Array(options.data),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: false,
      disableFontFace: true,
      stopAtErrors: false,
      // We read text and geometry, never render glyphs, so pdf.js's font
      // warnings are noise. Our own warnings carry anything that matters.
      verbosity: pdfjsVerbosity(),
    });

    pdf = await withTimeout(loadingTask.promise, limits.perDocumentTimeoutMs, `Opening ${options.fileName}`);
    pageCount = pdf.numPages;

    try {
      const metadata = await pdf.getMetadata();
      const info = metadata.info ?? {};
      const rawProducer = info.Producer ?? info.Creator;
      producer = typeof rawProducer === 'string' ? rawProducer : null;
    } catch {
      // Metadata is a nicety; a package without it still processes.
    }

    if (pageCount > maxPages) {
      warnings.push(
        `${options.fileName} has ${pageCount} pages; processing the first ${maxPages}. Raise COMMERCIAL_PDF_MAX_PAGES or process the package in ranges.`
      );
    }

    const pagesToProcess = Math.min(pageCount, maxPages);

    for (let pageNumber = 1; pageNumber <= pagesToProcess; pageNumber += 1) {
      let page: PdfPageProxy | null = null;
      try {
        page = await withTimeout(
          pdf.getPage(pageNumber),
          limits.perPageTimeoutMs,
          `Loading page ${pageNumber} of ${options.fileName}`
        );

        const extracted = await withTimeout(
          extractPage({ page, ops, pageNumber, limits, options }),
          limits.perPageTimeoutMs,
          `Extracting page ${pageNumber} of ${options.fileName}`
        );

        pages.push(extracted);
        options.onProgress?.({ pageNumber, pagesExtracted: pages.length, pageCount });
      } catch (error) {
        warnings.push(`Page ${pageNumber} of ${options.fileName} could not be extracted: ${errorMessage(error)}`);
      } finally {
        // Release pdf.js's per-page state whether or not extraction succeeded;
        // a 250-sheet package cannot afford to leak the pages that timed out.
        try {
          page?.cleanup();
        } catch {
          // A page that never loaded has nothing to clean up.
        }
      }
    }
  } catch (error) {
    errors.push(`${options.fileName} could not be opened: ${errorMessage(error)}`);
  } finally {
    if (pdf) {
      await pdf.destroy().catch(() => undefined);
    }
  }

  const status: DocumentExtraction['status'] =
    errors.length > 0 && pages.length === 0
      ? 'failed'
      : pages.length < Math.min(pageCount, maxPages) || warnings.length > 0
        ? 'partial'
        : 'succeeded';

  return {
    documentId,
    fileName: options.fileName,
    sha256,
    byteSize: options.data.length,
    status,
    pageCount,
    pagesExtracted: pages.length,
    pages,
    producer,
    extractionEngine: EXTRACTION_ENGINE,
    extractedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    warnings,
    errors,
  };
}

async function extractPage(params: {
  page: PdfPageProxy;
  ops: OpsTable;
  pageNumber: number;
  limits: ReturnType<typeof documentLimits>;
  options: ExtractPdfOptions;
}): Promise<PageExtraction> {
  const { page, ops, pageNumber, limits, options } = params;
  const warnings: string[] = [];

  // Scale 1, rotation 0 keeps coordinates in raw PDF user space.
  const viewport = page.getViewport({ scale: 1, rotation: 0 });
  const widthPt = roundTo(viewport.width, 3);
  const heightPt = roundTo(viewport.height, 3);

  const textContent = await page.getTextContent({ includeMarkedContent: false });
  const { spans, dropped: droppedSpans } = extractTextSpans(textContent.items, limits.maxTextSpansPerPage);
  if (droppedSpans > 0) {
    warnings.push(`${droppedSpans} text spans were dropped at the per-page cap of ${limits.maxTextSpansPerPage}.`);
  }

  const operatorList = await page.getOperatorList();
  const geometry = extractGeometry({
    operatorList,
    ops,
    maxPaths: limits.maxVectorPathsPerPage,
    pageWidthPt: widthPt,
    pageHeightPt: heightPt,
  });
  if (geometry.dropped > 0) {
    warnings.push(
      `${geometry.dropped} vector paths were dropped at the per-page cap of ${limits.maxVectorPathsPerPage}. Measurements from this page would be incomplete.`
    );
  }

  const context = buildClassificationContext({
    pageWidthPt: widthPt,
    pageHeightPt: heightPt,
    spans,
    straightSegments: geometry.paths
      .filter((path) => path.isStraightSegment && path.angleDeg !== null)
      .map((path) => ({ angleDeg: path.angleDeg as number })),
  });

  const vectorPaths: VectorPath[] = geometry.paths.map((path) => ({
    ...path,
    classification: classifyPath(path, context),
  }));

  const pathKinds = emptyPathKindCounts();
  for (const path of vectorPaths) {
    pathKinds[path.classification.kind] += 1;
  }

  const scaleAnnotations = spans
    .map((span) => span.text)
    .filter((text) => looksLikeScaleAnnotation(text));
  const scale = resolvePageScale(scaleAnnotations);

  const sheet = identifySheet({ spans, widthPt, heightPt });
  const revisions = extractRevisions(spans);
  const matchlines = extractMatchlines(spans);

  const rasterCoverage = geometry.rasters.reduce(
    (max, raster) => Math.max(max, raster.pageCoverage),
    0
  );

  const classification = classifyPage({
    textSpanCount: spans.length,
    constructionPathCount: pathKinds.construction_candidate,
    totalPathCount: vectorPaths.length,
    rasterCoverage,
  });

  const measurementSuitability = determineMeasurementSuitability({
    classification,
    hasUsableScale: scale.feetPerPoint !== null,
    notToScale: scale.kind === 'not_to_scale',
    constructionPathCount: pathKinds.construction_candidate,
  });

  if (measurementSuitability === 'requires_ocr') {
    warnings.push(
      'Page is a raster scan with no vector geometry. Nothing on it can be measured until OCR/vision extraction runs, and no quantity from it may be reported as verified.'
    );
  }
  if (measurementSuitability === 'requires_scale_calibration') {
    warnings.push(
      'Page has vector geometry but no usable drawing scale. Measurements require estimator calibration before they can be trusted.'
    );
  }
  if (matchlines.length > 0) {
    warnings.push(
      `Page carries ${matchlines.length} matchline reference(s). Quantities from this sheet may overlap adjoining sheets and must be reconciled before totalling.`
    );
  }

  const preview = options.includePreviews
    ? renderPagePreviewSvg({
        widthPt,
        heightPt,
        vectorPaths,
        textSpans: spans,
        rasterPlacements: geometry.rasters,
      })
    : null;

  const keepRaw = options.includeRawGeometry ?? true;

  return {
    pageNumber,
    widthPt,
    heightPt,
    rotationDeg: page.rotate ?? 0,
    classification,
    measurementSuitability,
    sheet,
    scale,
    revisions,
    matchlines,
    textSpans: keepRaw ? spans : [],
    vectorPaths: keepRaw ? vectorPaths : [],
    rasterPlacements: geometry.rasters,
    preview,
    counts: {
      textSpans: spans.length,
      vectorPaths: vectorPaths.length,
      rasterPlacements: geometry.rasters.length,
      droppedVectorPaths: geometry.dropped,
      pathKinds,
    },
    warnings,
  };
}

/**
 * Compact roll-up of an extraction, safe to return from an API without
 * shipping every coordinate on a 300-sheet package.
 */
export function summarizeExtraction(extraction: DocumentExtraction): DocumentExtractionSummary {
  const measurementReadiness: Record<MeasurementSuitability, number> = {
    measurable: 0,
    requires_scale_calibration: 0,
    requires_ocr: 0,
    not_measurable: 0,
  };

  for (const page of extraction.pages) {
    measurementReadiness[page.measurementSuitability] += 1;
  }

  return {
    documentId: extraction.documentId,
    fileName: extraction.fileName,
    sha256: extraction.sha256,
    status: extraction.status,
    pageCount: extraction.pageCount,
    pagesExtracted: extraction.pagesExtracted,
    sheets: extraction.pages.map((page) => ({
      pageNumber: page.pageNumber,
      sheetNumber: page.sheet.sheetNumber,
      sheetTitle: page.sheet.sheetTitle,
      discipline: page.sheet.discipline,
      role: page.sheet.role,
      classification: page.classification,
      measurementSuitability: page.measurementSuitability,
      scale: page.scale.raw,
      scaleVerification: page.scale.verificationStatus,
      revisions: page.revisions.map((revision) => revision.revision),
      matchlineTargets: page.matchlines
        .map((matchline) => matchline.referencedSheet)
        .filter((sheet): sheet is string => Boolean(sheet)),
      textSpanCount: page.counts.textSpans,
      vectorPathCount: page.counts.vectorPaths,
    })),
    measurementReadiness,
    // V1 extracts geometry but does not yet convert it into building elements,
    // so nothing it produces may be labelled a verified measurement.
    supportedValidationStatus: 'scale_unverified',
    warnings: [...extraction.warnings, ...extraction.pages.flatMap((page) => page.warnings)],
  };
}
