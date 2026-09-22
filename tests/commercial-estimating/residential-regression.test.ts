/**
 * Regression cover for the existing residential estimator.
 *
 * PDF intelligence is additive: none of it may change how a residential deck,
 * bathroom or roof estimate comes out.
 */

import assert from 'node:assert/strict';

import { describe, it } from './harness';
import { buildVectorFloorPlanPdf } from './fixtures/synthetic-drawings';
import {
  createBidEstimate,
  createTakeoffEstimate,
  getProjectCategoryOptions,
} from '@/src/estimating/ai-takeoff';
import { processPlanDocuments } from '@/src/commercial-estimating/takeoff/plan-documents';
import { clearExtractionCache } from '@/src/commercial-estimating/document-processing/job';
import { GET } from '@/app/api/estimating/takeoff/route';

describe('residential estimating: unchanged behaviour', () => {
  it('still detects residential categories and prices them', () => {
    const estimate = createTakeoffEstimate({
      files: [{ name: 'deck-plan.pdf', type: 'application/pdf', size: 1024 }],
      description: '16x16 treated lumber deck with composite railing and stairs',
    });

    assert.equal(estimate.mode, 'plan-takeoff');
    assert.equal(estimate.detectedCategory, 'deck');
    assert.ok(estimate.totals.grandTotal > 0);
    assert.ok(estimate.materials.length > 0);
    assert.ok(estimate.labor.length > 0);
    assert.ok(estimate.proposalMarkdown.length > 0);
  });

  it('still generates bid-only estimates without files', () => {
    const estimate = createBidEstimate({
      description: 'Asphalt shingle roof replacement, 2,400 sq ft with tear-off',
    });

    assert.equal(estimate.mode, 'bid-generator');
    assert.equal(estimate.detectedCategory, 'roof-replacement');
    assert.ok(estimate.totals.grandTotal > 0);
  });

  it('keeps the residential category list intact', () => {
    const categories = getProjectCategoryOptions().map((option) => option.id);
    assert.deepEqual(categories, [
      'deck',
      'bathroom-remodel',
      'kitchen-gut',
      'roof-replacement',
      'basement-finish',
      'general-construction',
    ]);
  });

  it('is deterministic for the same input', () => {
    const input = {
      files: [],
      description: 'Basement finish 800 sq ft - drywall, flooring, lighting and trim',
      zipCode: '55123',
    };

    const first = createTakeoffEstimate(input);
    const second = createTakeoffEstimate(input);

    assert.deepEqual(first.totals, second.totals);
    assert.equal(first.detectedCategory, second.detectedCategory);
  });

  it('leaves the new fields empty when no documents were processed', () => {
    const estimate = createTakeoffEstimate({
      files: [],
      description: 'Master bath remodel - tile, vanity, shower glass',
    });

    assert.equal(estimate.planDocumentIntelligence, null);
    assert.equal(estimate.aiPlanFindings, null);
  });

  it('labels AI vision quantities as inferred rather than measured', () => {
    const estimate = createTakeoffEstimate({
      files: [{ name: 'kitchen.png', type: 'image/png', size: 2048 }],
      aiScopeNotes: ['Galley kitchen with upper and lower cabinet runs.'],
      aiDetectedItems: [{ item: 'Cabinet run', quantity: 18, unit: 'lf', basis: 'visual_estimate' }],
    });

    assert.equal(estimate.aiPlanFindings?.measurementBasis, 'ai_inferred');
    assert.match(estimate.aiPlanFindings?.disclaimer ?? '', /not verified geometric measurements/i);
    assert.equal(estimate.aiPlanFindings?.items[0].basis, 'visual_estimate');
  });
});

describe('residential estimating: PDF intelligence is additive', () => {
  it('attaches document intelligence without disturbing the estimate contract', async () => {
    clearExtractionCache();
    const planDocuments = await processPlanDocuments({
      documents: [
        {
          fileName: 'level-2.pdf',
          mimeType: 'application/pdf',
          bytes: await buildVectorFloorPlanPdf(),
        },
      ],
    });

    const estimate = createTakeoffEstimate({
      files: [{ name: 'level-2.pdf', type: 'application/pdf', size: 4096 }],
      description: 'Commercial interior finishes - level 2',
      planDocuments,
    });

    assert.equal(estimate.planDocumentIntelligence?.sheets.length, 2);
    assert.match(estimate.inputSummary, /PDF intelligence read 2 drawing page\(s\)/);
    // Every field the existing UI and exports rely on is still present.
    assert.ok(estimate.totals.grandTotal > 0);
    assert.ok(Array.isArray(estimate.materials));
    assert.ok(Array.isArray(estimate.labor));
    assert.ok(Array.isArray(estimate.assumptions));
    assert.ok(estimate.calibrationBand.expected > 0);
    assert.ok(estimate.confidenceBreakdown.overall > 0);
  });
});

describe('takeoff API metadata', () => {
  it('advertises real PDF document intelligence', async () => {
    const response = await GET();
    const payload = (await response.json()) as {
      acceptedFileTypes?: string[];
      documentIntelligence?: { enabled: boolean; maxPagesPerDocument: number; notes: string };
      aiVision?: { maxImagesPerRequest: number };
    };

    assert.equal(response.status, 200);
    assert.ok(payload.acceptedFileTypes?.includes('PDF'));
    assert.equal(payload.documentIntelligence?.enabled, true);
    assert.ok(
      (payload.documentIntelligence?.maxPagesPerDocument ?? 0) > 4,
      'PDF processing must no longer be capped at four pages'
    );
    assert.equal(payload.aiVision?.maxImagesPerRequest, 4);
  });
});
