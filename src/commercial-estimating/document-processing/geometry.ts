/**
 * Vector path geometry and classification.
 *
 * The governing rule from the product spec: *a vector line is not
 * automatically a wall*. This module measures paths deterministically and then
 * assigns each one a drawing-context classification with written reasons. The
 * best it will ever say about a path is `construction_candidate` — turning a
 * candidate into a measured building element is Phase 2 work and requires a
 * verified scale.
 */

import { roundTo } from '../domain/units';
import type {
  BoundingBox,
  PathClassification,
  PathKind,
  PathSubpath,
  Point,
  TextSpan,
  VectorPath,
} from './types';

export type Matrix = [number, number, number, number, number, number];

export const IDENTITY_MATRIX: Matrix = [1, 0, 0, 1, 0, 0];

/** Standard PDF matrix composition: applies `a` first, then `b`. */
export function multiplyMatrix(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
    a[4] * b[0] + a[5] * b[2] + b[4],
    a[4] * b[1] + a[5] * b[3] + b[5],
  ];
}

export function applyMatrix(m: Matrix, x: number, y: number): Point {
  return {
    x: m[0] * x + m[2] * y + m[4],
    y: m[1] * x + m[3] * y + m[5],
  };
}

/** Average scale factor of a matrix, used to bring line widths into page space. */
export function matrixScale(m: Matrix): number {
  const sx = Math.hypot(m[0], m[1]);
  const sy = Math.hypot(m[2], m[3]);
  return (sx + sy) / 2;
}

export function boundingBoxOf(points: Point[]): BoundingBox {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;

  for (const point of points) {
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function polylineLength(points: Point[], closed: boolean): number {
  if (points.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  if (closed && points.length > 2) {
    const first = points[0];
    const last = points[points.length - 1];
    total += Math.hypot(first.x - last.x, first.y - last.y);
  }

  return total;
}

/** Shoelace area of a closed polygon, in squared page units. Always positive. */
export function polygonArea(points: Point[]): number {
  if (points.length < 3) return 0;

  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    sum += current.x * next.y - next.x * current.y;
  }

  return Math.abs(sum) / 2;
}

/** Segment orientation folded into [0,180). */
export function segmentAngleDeg(from: Point, to: Point): number {
  const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  const folded = ((angle % 180) + 180) % 180;
  return roundTo(folded, 3);
}

function centerOf(bbox: BoundingBox): Point {
  return { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
}

/**
 * The bottom-right corner of a sheet is title-block territory. Rules and boxes
 * drawn there frame the title block; they are not construction geometry.
 */
function isInsideTitleBlock(bbox: BoundingBox, context: ClassificationContext): boolean {
  const leftEdge = context.pageWidthPt * 0.7;
  const topEdge = context.pageHeightPt * 0.35;
  return bbox.x >= leftEdge && bbox.y + bbox.height <= topEdge;
}

const DIMENSION_TEXT = /^\s*\d+(?:\.\d+)?\s*'(?:\s*-?\s*\d+(?:\s+\d+\/\d+)?\s*")?\s*$|^\s*\d+(?:\s+\d+\/\d+)?\s*"\s*$|^\s*\d{1,3}'\s*-\s*\d{1,2}"\s*$/;

export function looksLikeDimensionText(text: string): boolean {
  const normalized = text
    .replace(/[′’]/g, "'")
    .replace(/[″”]/g, '"')
    .trim();
  if (!normalized) return false;
  return DIMENSION_TEXT.test(normalized);
}

export type ClassificationContext = {
  pageWidthPt: number;
  pageHeightPt: number;
  /** Spans whose text parses as a dimension, used to spot dimension strings. */
  dimensionSpans: TextSpan[];
  /** Counts of straight segments per rounded angle, used to spot hatching. */
  angleHistogram: Map<number, number>;
};

export function buildClassificationContext(params: {
  pageWidthPt: number;
  pageHeightPt: number;
  spans: TextSpan[];
  straightSegments: Array<{ angleDeg: number }>;
}): ClassificationContext {
  const angleHistogram = new Map<number, number>();
  for (const segment of params.straightSegments) {
    const bucket = Math.round(segment.angleDeg);
    angleHistogram.set(bucket, (angleHistogram.get(bucket) ?? 0) + 1);
  }

  return {
    pageWidthPt: params.pageWidthPt,
    pageHeightPt: params.pageHeightPt,
    dimensionSpans: params.spans.filter((span) => looksLikeDimensionText(span.text)),
    angleHistogram,
  };
}

const DIMENSION_TEXT_PROXIMITY_PT = 20;
const SHORT_SEGMENT_PT = 6;
const HATCH_SEGMENT_PT = 30;
const HATCH_ANGLE_CLUSTER = 8;

/**
 * Classify one path using its own geometry plus page context. Each branch
 * records why it fired so the decision is auditable in the takeoff workspace.
 */
export function classifyPath(
  path: Omit<VectorPath, 'classification'>,
  context: ClassificationContext
): PathClassification {
  const reasons: string[] = [];
  const pageArea = context.pageWidthPt * context.pageHeightPt;
  const bboxArea = path.bbox.width * path.bbox.height;

  const isRectangular =
    path.subpaths.length === 1 && path.subpaths[0].closed && path.subpaths[0].points.length <= 5;

  if (pageArea > 0 && bboxArea / pageArea > 0.85 && isRectangular) {
    reasons.push('Rectangular path covering more than 85% of the page — sheet border.');
    return { kind: 'border', reasons };
  }

  if (isRectangular && isInsideTitleBlock(path.bbox, context)) {
    reasons.push('Rectangle contained entirely within the bottom-right title-block zone — title block framing.');
    return { kind: 'border', reasons };
  }

  if (path.isStraightSegment && path.angleDeg !== null) {
    const spansPage =
      (Math.abs(path.angleDeg) < 2 || Math.abs(path.angleDeg - 180) < 2) &&
      path.lengthPt > context.pageWidthPt * 0.7;
    const spansPageVertical =
      Math.abs(path.angleDeg - 90) < 2 && path.lengthPt > context.pageHeightPt * 0.7;

    if ((spansPage || spansPageVertical) && path.strokeWidthPt <= 1.2) {
      reasons.push('Thin straight line spanning more than 70% of the sheet — column gridline.');
      return { kind: 'gridline', reasons };
    }

    const center = centerOf(path.bbox);
    const nearDimensionText = context.dimensionSpans.some((span) => {
      const spanCenter = centerOf(span.bbox);
      return Math.hypot(spanCenter.x - center.x, spanCenter.y - center.y) <= DIMENSION_TEXT_PROXIMITY_PT;
    });

    if (nearDimensionText) {
      reasons.push('Straight segment with a labelled dimension within 20 pt — dimension string, not construction.');
      return { kind: 'dimension_line', reasons };
    }

    if (path.lengthPt < SHORT_SEGMENT_PT) {
      reasons.push('Segment shorter than 6 pt — tick, arrowhead or leader detail.');
      return { kind: 'annotation', reasons };
    }

    if (path.lengthPt < HATCH_SEGMENT_PT) {
      const bucket = Math.round(path.angleDeg);
      const clustered =
        (context.angleHistogram.get(bucket) ?? 0) +
        (context.angleHistogram.get(bucket - 1) ?? 0) +
        (context.angleHistogram.get(bucket + 1) ?? 0);

      if (clustered >= HATCH_ANGLE_CLUSTER) {
        reasons.push(
          `Short segment sharing its angle (${bucket}°) with ${clustered} others — hatching or poche fill.`
        );
        return { kind: 'hatching', reasons };
      }
    }

    reasons.push(
      `Straight segment ${roundTo(path.lengthPt, 1)} pt long at ${path.angleDeg}°, stroke ${roundTo(
        path.strokeWidthPt,
        2
      )} pt — candidate construction geometry pending scale verification.`
    );
    return { kind: 'construction_candidate', reasons };
  }

  if (isRectangular && bboxArea > 0) {
    reasons.push('Closed rectangle — candidate room, opening or element outline pending verification.');
    return { kind: 'construction_candidate', reasons };
  }

  if (path.lengthPt < SHORT_SEGMENT_PT) {
    reasons.push('Path shorter than 6 pt — symbol or annotation detail.');
    return { kind: 'annotation', reasons };
  }

  reasons.push('Path geometry did not match any classification rule.');
  return { kind: 'unclassified', reasons };
}

export function emptyPathKindCounts(): Record<PathKind, number> {
  return {
    construction_candidate: 0,
    dimension_line: 0,
    gridline: 0,
    annotation: 0,
    hatching: 0,
    border: 0,
    unclassified: 0,
  };
}

export function measureSubpaths(subpaths: PathSubpath[]): {
  bbox: BoundingBox;
  lengthPt: number;
  isStraightSegment: boolean;
  angleDeg: number | null;
} {
  const allPoints = subpaths.flatMap((subpath) => subpath.points);
  const bbox = boundingBoxOf(allPoints);
  const lengthPt = subpaths.reduce(
    (total, subpath) => total + polylineLength(subpath.points, subpath.closed),
    0
  );

  const isStraightSegment =
    subpaths.length === 1 && !subpaths[0].closed && subpaths[0].points.length === 2;

  const angleDeg = isStraightSegment
    ? segmentAngleDeg(subpaths[0].points[0], subpaths[0].points[1])
    : null;

  return {
    bbox: {
      x: roundTo(bbox.x, 3),
      y: roundTo(bbox.y, 3),
      width: roundTo(bbox.width, 3),
      height: roundTo(bbox.height, 3),
    },
    lengthPt: roundTo(lengthPt, 3),
    isStraightSegment,
    angleDeg,
  };
}
