/**
 * Page previews.
 *
 * Previews are rendered as SVG directly from the geometry we extracted, so a
 * preview is literally a picture of the data the takeoff engine is working
 * from — if a preview looks wrong, the extraction is wrong. This also keeps the
 * processor free of native raster dependencies, which matters on serverless.
 */

import { roundTo } from '../domain/units';
import type { PagePreview, PageExtraction, PathKind } from './types';

const PATH_COLORS: Record<PathKind, string> = {
  construction_candidate: '#38bdf8',
  dimension_line: '#f59e0b',
  gridline: '#64748b',
  annotation: '#a78bfa',
  hatching: '#334155',
  border: '#475569',
  unclassified: '#94a3b8',
};

const MAX_PREVIEW_PATHS = 4000;
const MAX_PREVIEW_LABELS = 120;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export type PreviewOptions = {
  maxPaths?: number;
  includeText?: boolean;
  /** When false, every path renders in one neutral color. */
  colorByClassification?: boolean;
};

/**
 * Build an SVG preview of an extracted page.
 *
 * The SVG uses a flipped Y transform so PDF user space (origin bottom-left)
 * renders the right way up without mutating any stored coordinate.
 */
export function renderPagePreviewSvg(
  page: Pick<PageExtraction, 'widthPt' | 'heightPt' | 'vectorPaths' | 'textSpans' | 'rasterPlacements'>,
  options: PreviewOptions = {}
): PagePreview {
  const maxPaths = options.maxPaths ?? MAX_PREVIEW_PATHS;
  const includeText = options.includeText ?? true;
  const colorByClassification = options.colorByClassification ?? true;

  const width = roundTo(page.widthPt, 2);
  const height = roundTo(page.heightPt, 2);

  const visiblePaths = page.vectorPaths.slice(0, maxPaths);
  const truncated = page.vectorPaths.length > visiblePaths.length;

  const pathMarkup = visiblePaths
    .map((path) => {
      const d = path.subpaths
        .map((subpath) => {
          if (subpath.points.length === 0) return '';
          const [first, ...rest] = subpath.points;
          const commands = [`M ${roundTo(first.x, 2)} ${roundTo(first.y, 2)}`];
          for (const point of rest) {
            commands.push(`L ${roundTo(point.x, 2)} ${roundTo(point.y, 2)}`);
          }
          if (subpath.closed) commands.push('Z');
          return commands.join(' ');
        })
        .filter(Boolean)
        .join(' ');

      if (!d) return '';

      const stroke = colorByClassification ? PATH_COLORS[path.classification.kind] : '#94a3b8';
      const strokeWidth = Math.max(0.4, roundTo(path.strokeWidthPt || 0.6, 2));

      return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" vector-effect="non-scaling-stroke" />`;
    })
    .filter(Boolean)
    .join('');

  const rasterMarkup = page.rasterPlacements
    .map(
      (placement) =>
        `<rect x="${roundTo(placement.bbox.x, 2)}" y="${roundTo(placement.bbox.y, 2)}" width="${roundTo(
          placement.bbox.width,
          2
        )}" height="${roundTo(
          placement.bbox.height,
          2
        )}" fill="#1e293b" fill-opacity="0.35" stroke="#0ea5e9" stroke-dasharray="4 3" stroke-width="1" />`
    )
    .join('');

  const textMarkup = includeText
    ? page.textSpans
        .slice(0, MAX_PREVIEW_LABELS)
        .filter((span) => span.text.trim().length > 0)
        .map((span) => {
          const size = Math.max(3, roundTo(span.fontHeightPt || 6, 2));
          const x = roundTo(span.bbox.x, 2);
          const y = roundTo(span.bbox.y, 2);
          // Counter-flip so glyphs read normally inside the flipped page group.
          return `<text x="${x}" y="${y}" transform="scale(1,-1) translate(0, ${roundTo(
            -2 * y,
            2
          )})" font-family="monospace" font-size="${size}" fill="#e2e8f0">${escapeXml(
            span.text.slice(0, 60)
          )}</text>`;
        })
        .join('')
    : '';

  const markup = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Extracted drawing page preview">`,
    `<rect x="0" y="0" width="${width}" height="${height}" fill="#0f172a" />`,
    `<g transform="translate(0, ${height}) scale(1, -1)">`,
    rasterMarkup,
    pathMarkup,
    textMarkup,
    '</g>',
    '</svg>',
  ].join('');

  return {
    format: 'svg',
    markup,
    widthPt: width,
    heightPt: height,
    truncated,
  };
}
