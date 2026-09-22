# Cortex PDF Intelligence V1

Phase 1 of the commercial estimating platform. This milestone makes Cortex read
the **actual contents** of uploaded construction PDFs instead of inferring scope
from file names and project notes.

It does not yet produce commercial quantities. Everything it reports is either
read literally out of the document or computed arithmetically from what was
read, and the API says so explicitly.

---

## What shipped

| Capability | Status |
| --- | --- |
| Multi-page PDF page extraction (no four-page ceiling) | Done |
| Embedded text with source coordinates | Done |
| Vector geometry with the page transform applied | Done |
| Page dimensions and rotation | Done |
| Drawing sheet number, title and discipline | Done |
| Drawing scale annotation parsing and conflict reporting | Done |
| Revision identification | Done |
| Matchline reference capture | Done (references only — reconciliation is Phase 2) |
| SVG page previews | Done |
| Bounded batched jobs with retries, progress and idempotency | Done |
| Measurement validation vocabulary (`verified_geometry` / `ai_inferred` / …) | Done |
| Quantity takeoff from geometry | **Not in V1 — Phase 2** |
| OCR of scanned sheets | **Not in V1** |
| Commercial pricing, bids, QC engine | **Not in V1 — Phases 3–4** |

---

## Local setup

```bash
npm install                 # installs pdfjs-dist alongside existing deps
npm run test:commercial     # runs the commercial estimating suite
npm run build               # prisma generate && next build
npm run lint
```

No database, API key, or external service is required to run document
intelligence or its tests. The extractor is pure Node.

### Dependencies added

| Package | Why |
| --- | --- |
| `pdfjs-dist` (^4.10.38) | PDF object parsing, text extraction with transforms, and operator lists for vector geometry. Loaded lazily from its `legacy` Node build. |

`pdfjs-dist` is declared in `serverExternalPackages` (both `next.config.ts` and
`next.config.js`) so it is required at runtime rather than inlined into every
server bundle.

There is **no Python service**. The spec suggested PyMuPDF behind a separate
service; the existing app is a single Next.js deployment with no service mesh or
Python runtime, so introducing one would have added an operational surface the
milestone does not need. `pdfjs-dist` covers everything V1 requires inside the
runtime that already exists. If raster OCR later needs native tooling, that is
the point to revisit a sidecar — the extractor interface is already async and
job-based, so swapping the engine behind `extractPdfDocument` is contained.

---

## Architecture

```
src/commercial-estimating/
  domain/
    units.ts             deterministic unit conversion + dimension-string parsing
    measurement.ts       validation statuses, provenance, measurement records
  document-processing/
    validation.ts        file type/size/page limits, SHA-256 content hashing
    pdf-extractor.ts     pdf.js driver: pages, text, CTM-aware vector geometry
    geometry.ts          matrix math, path measurement, path classification
    scale.ts             scale annotation parsing + verification
    sheet-metadata.ts    sheet number/title/role, revisions, matchlines
    preview.ts           SVG page previews rendered from extracted geometry
    job.ts               batched, retried, idempotent processing jobs
  takeoff/
    plan-documents.ts    bridge into the existing takeoff workflow
```

### Design rules this code holds to

1. **No AI in the extraction path.** Nothing in `document-processing/` calls a
   model. Everything it reports came out of the file or out of arithmetic.
2. **A vector line is not a wall.** Paths are classified into
   `construction_candidate`, `dimension_line`, `gridline`, `annotation`,
   `hatching`, `border` or `unclassified`, and every classification records the
   reasons that produced it. The strongest claim available is *candidate*.
3. **A declared scale is a claim, not a fact.** A parsed annotation is
   `declared_unverified` until `verifyScaleAgainstDimension` checks it against a
   labelled dimension measured off real geometry. Sheets carrying several scales
   report all of them rather than silently picking one.
4. **Missing information is reported, never filled in.** No fallback scale, no
   inferred sheet number, no estimated page count.
5. **Coordinates are preserved.** Text spans, paths and raster placements all
   carry PDF user-space boxes (origin bottom-left, units of points) so an
   estimator can trace any value back to where it sits on the sheet.

### Coordinate handling

pdf.js reports path coordinates in the *current* user space. The extractor
maintains its own CTM stack (`save` / `restore` / `transform` /
`paintFormXObjectBegin` / `paintFormXObjectEnd`) and applies it to every vertex,
because architectural sheets are drawn through viewport transforms — skipping
this step misplaces every measurement on the page.

### Page classification and measurement readiness

| Page classification | Meaning |
| --- | --- |
| `vector_drawing` | Vector geometry present |
| `scanned_raster` | Raster image dominates, little or no vector content |
| `mixed` | Both |
| `text_only` | Text without drawing geometry |
| `empty` | Nothing extractable |

| Measurement suitability | Meaning |
| --- | --- |
| `measurable` | Has construction-candidate geometry **and** a usable declared scale. Phase 2 can attempt measurement; results would still be `scale_unverified` until the scale is verified. |
| `requires_scale_calibration` | Geometry present, no usable scale. Needs estimator calibration. |
| `requires_ocr` | Raster page. Nothing measurable until OCR/vision runs. |
| `not_measurable` | Cover/spec/blank page, or annotated NOT TO SCALE. |

### Measurement validation vocabulary

Defined in `domain/measurement.ts` and carried through to the API and UI:

- `verified_geometry` — deterministic geometry at a **verified** scale. The only
  status that may be shown as a verified measurement. **Nothing in V1 produces
  it.**
- `scale_unverified` — measured geometry whose scale is unconfirmed.
- `ai_inferred` — a vision model's reading of a drawing. Never a measurement.
- `unverified` — entered or imported without verification.
- `missing` — the information was not found in the documents.

---

## Jobs, limits and idempotency

`runDocumentProcessingJob` batches documents with a concurrency cap, retries
transient failures, reports progress, and returns per-document status so a
300-sheet package is never lost to one bad sheet.

Work is keyed by the file's SHA-256:

- The same bytes submitted twice **in one job** are processed once; the second
  is returned as `duplicate`.
- The same bytes submitted again **later** are served from the extraction cache
  with `reusedFromCache: true` and contribute `0` to `billablePagesProcessed`,
  so a retried upload cannot be charged twice.
- Files that can never parse (`InvalidPDFException`, bad header) are not
  retried.

The cache is per-process with a 15-minute TTL and 32-entry LRU bound. A durable
job and result store in Postgres is the next milestone; `job.ts` is written
against the interface such a store would implement.

### Env-tunable limits

| Variable | Default | Purpose |
| --- | --- | --- |
| `COMMERCIAL_PDF_MAX_BYTES` | 62914560 (60 MB) | Per-file upload ceiling |
| `COMMERCIAL_PDF_MAX_PAGES` | 250 | Pages extracted per document |
| `COMMERCIAL_PDF_MAX_DOCUMENTS` | 25 | Documents per request |
| `COMMERCIAL_PDF_MAX_PATHS_PER_PAGE` | 20000 | Memory bound; overflow is reported as a warning |
| `COMMERCIAL_PDF_MAX_TEXT_SPANS_PER_PAGE` | 8000 | Memory bound |
| `COMMERCIAL_PDF_PAGE_TIMEOUT_MS` | 20000 | Per-page timeout |
| `COMMERCIAL_PDF_DOCUMENT_TIMEOUT_MS` | 240000 | Per-document open timeout |
| `COMMERCIAL_PDF_VERBOSITY` | 0 | pdf.js log level (0 = errors only) |
| `TAKEOFF_MAX_VISION_IMAGES` | 4 | Image-vision calls per request (unchanged default) |

---

## API contract

### `GET /api/estimating/takeoff`

Adds a `documentIntelligence` block alongside the existing `aiVision` block:

```json
{
  "acceptedFileTypes": ["PNG", "JPG", "WEBP", "PDF"],
  "documentIntelligence": {
    "enabled": true,
    "supportedTypes": ["PDF"],
    "maxPagesPerDocument": 250,
    "maxDocumentsPerRequest": 25,
    "extracts": ["page dimensions and rotation", "..."],
    "notes": "Uploaded PDFs are parsed for real..."
  },
  "aiVision": { "enabled": false, "maxImagesPerRequest": 4, "notes": "..." }
}
```

### `POST /api/estimating/takeoff`

Unchanged request contract (multipart or JSON). The response gains
`documentIntelligence`, and `estimate.planDocumentIntelligence` carries the same
object:

```json
{
  "estimate": { "...": "unchanged fields", "planDocumentIntelligence": {} },
  "documentIntelligence": {
    "analyzed": true,
    "engine": "cortex-pdf-intelligence/1.0 (pdfjs-dist)",
    "sheets": [
      {
        "fileName": "level-2.pdf",
        "pageNumber": 1,
        "sheetNumber": "A101",
        "sheetTitle": "LEVEL 2 FLOOR PLAN - AREA A",
        "discipline": "Architectural",
        "role": "plan",
        "classification": "vector_drawing",
        "measurementSuitability": "measurable",
        "scale": "SCALE: 1/8\" = 1'-0\"",
        "scaleVerified": false,
        "revisions": ["C"],
        "matchlineTargets": ["A102"],
        "vectorPathCount": 26
      }
    ],
    "measurementReadiness": {
      "measurable": 2,
      "requires_scale_calibration": 0,
      "requires_ocr": 0,
      "not_measurable": 0
    },
    "supportedValidationStatus": "scale_unverified",
    "disclaimer": "Document intelligence read these drawings ... Nothing here may be issued as a verified measurement.",
    "warnings": ["..."]
  },
  "usage": {}
}
```

`estimate.aiPlanFindings` now carries `measurementBasis: "ai_inferred"`, a
`disclaimer`, and a per-item `basis` (`labeled_dimension` / `scale_inference` /
`visual_estimate`) so the UI and CSV export can distinguish a number read off a
printed dimension from the model's eyeball.

### Billing

**Unchanged.** `estimateReaderUsageUnits` and `consumeEstimateReaderCredits` are
called with the same arguments, in the same place, for the same uploads. PDF
processing runs *after* metering and never re-meters. A retried upload reuses
the cached extraction and adds no billable pages. No Stripe product, price,
tier, or credit allowance was touched.

---

## Deployment requirements

- Node 20+ (`pdfjs-dist` requires it; the repo already pins Node 20.x).
- The takeoff route stays on `runtime = 'nodejs'`. It will not work on the edge
  runtime.
- `pdfjs-dist` must be present in `node_modules` at runtime — it is externalized
  rather than bundled. Next's file tracing already includes it for the takeoff
  route.
- Memory: a large sheet can hold tens of thousands of paths. The per-page caps
  above bound this; lower them on small instances.
- No new database migration, no schema change, no new external service.

---

## Testing

```bash
npm run test:commercial     # 74 assertions across 7 suites
npm run lint
npm run build
npx tsx tests/estimator-output.smoke.ts   # existing residential smoke test
```

Tests run against **synthetic reference drawings** generated with `pdfkit`
(`tests/commercial-estimating/fixtures/synthetic-drawings.ts`) — a two-sheet
vector floor plan with a matchline, a sheet with no scale, a NOT TO SCALE
detail sheet, a scanned raster page, an n-page package, a non-PDF file and a
corrupted PDF.

Coverage includes: multi-page packages, vector drawings, scanned drawings,
missing scales, invalid and corrupted PDFs, file-size limits, page-count limits,
duplicate uploads, processing retries, and regression cover for the existing
residential estimator.

It also covers the defects found in review: phantom revisions parsed out of
title-block headings ("REVISIONS", "ISSUED FOR BID"), plan annotations like
"RM 101" parsed as sheet numbers, the full National CAD Standard designator
set, and a cached re-submission still reporting `analyzed: true`.

---

## Known limitations

1. **No quantities are produced from PDFs.** V1 reads documents; it does not
   measure them. `supportedValidationStatus` is `scale_unverified` and no code
   path emits `verified_geometry`.
2. **No OCR.** Scanned pages are detected and marked `requires_ocr`. Their
   content is not read, and no measurement is fabricated for them.
3. **Scale verification is implemented but not yet wired.**
   `verifyScaleAgainstDimension` is tested and ready; associating a labelled
   dimension with the geometry it dimensions needs the Phase 2 geometry engine.
4. **Path classification is heuristic**, tuned against synthetic drawings and
   not yet benchmarked against real packages. It is advisory only, and the
   reasons for each decision are recorded so an estimator can audit it.
5. **Matchlines are captured, not reconciled.** Overlapping quantities cannot be
   de-duplicated until there are quantities.
6. **Rotated text bounding boxes are approximate** — the box is the unrotated
   extent of the span's advance width.
7. **No dedicated persistence.** Extractions live in a per-process cache; they
   are not yet stored per organization/project. No schema migration was made,
   per the operating rules.
8. **No organization-level access control yet**, because there is no
   `Organization` model. The takeoff route's existing subscription gating is
   unchanged.
9. **Bezier curves are flattened** to 8 segments per curve. Adequate for
   classification; Phase 2 measurement of curved walls will need adaptive
   flattening.
10. **End-to-end `POST` was not exercised against live billing** — it requires
    Stripe credentials and a CRM database that are not available in this
    environment. The route's `GET`, the extraction pipeline, and the estimator
    integration are all covered by tests, and `POST` gating was verified to
    still reject unmetered requests.

---

## Next coding tasks (Phase 2)

1. **Persistence.** Add `Organization`, `Project`, `Document`, `DrawingSheet`,
   `ProcessingJob` and `AuditEvent` models with organization-scoped access, and
   move the extraction cache into it. Additive migrations only.
2. **Scale verification loop.** Pair dimension-line paths with their dimension
   text, measure the geometry, and drive scale status to
   `verified_against_dimension` or `conflicted`.
3. **Room detection.** Close construction-candidate paths into room polygons;
   attach room-number text spans found inside them.
4. **First real measurements.** Floor area and perimeter for detected rooms,
   emitted as `MeasurementRecord`s — `verified_geometry` only where the scale
   verified, `scale_unverified` otherwise.
5. **Finish schedule extraction.** Recover the schedule table from sheets whose
   `role` is `schedule` and join it to room numbers.
6. **Matchline reconciliation.** Align overlapping sheets on gridlines, assign
   stable physical-element ids, and exclude verified duplicates while recording
   what was excluded.
7. **Commercial estimate domain.** Line items, assemblies and company pricing
   catalogs, kept separate from the residential engine.
