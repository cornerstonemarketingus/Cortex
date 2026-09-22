import assert from 'node:assert/strict';

import { describe, it } from './harness';
import {
  convertQuantity,
  normalizeUnitLabel,
  parseFeetInches,
  toCanonicalQuantity,
  UnitConversionError,
} from '@/src/commercial-estimating/domain/units';
import {
  createMeasurementRecord,
  isVerifiedMeasurement,
  requiresEstimatorReview,
  summarizeValidationStatuses,
} from '@/src/commercial-estimating/domain/measurement';

describe('units: construction shorthand', () => {
  it('resolves the unit labels estimators actually type', () => {
    assert.equal(normalizeUnitLabel('LF'), 'ft');
    assert.equal(normalizeUnitLabel('lin ft'), 'ft');
    assert.equal(normalizeUnitLabel('SF'), 'sqft');
    assert.equal(normalizeUnitLabel('sq. ft.'), 'sqft');
    assert.equal(normalizeUnitLabel('CY'), 'cuyd');
    assert.equal(normalizeUnitLabel('EA'), 'ea');
    assert.equal(normalizeUnitLabel('SY'), 'sqyd');
  });

  it('returns null rather than guessing at an unknown unit', () => {
    assert.equal(normalizeUnitLabel('squiggles'), null);
    assert.equal(normalizeUnitLabel(''), null);
  });
});

describe('units: conversion', () => {
  it('converts within a dimension', () => {
    assert.equal(convertQuantity(3, 'ft', 'in'), 36);
    assert.equal(convertQuantity(9, 'sqft', 'sqyd'), 1);
    assert.equal(convertQuantity(27, 'cuft', 'cuyd'), 1);
    assert.ok(Math.abs(convertQuantity(1, 'm', 'ft') - 3.280839895) < 1e-6);
  });

  it('refuses to convert across dimensions', () => {
    assert.throws(() => convertQuantity(1, 'ft', 'sqft'), UnitConversionError);
  });

  it('normalizes onto the canonical unit for each dimension', () => {
    assert.deepEqual(toCanonicalQuantity(36, 'in'), { value: 3, unit: 'ft', dimension: 'length' });
    assert.deepEqual(toCanonicalQuantity(2, 'sqyd'), { value: 18, unit: 'sqft', dimension: 'area' });
  });
});

describe('units: architectural dimension strings', () => {
  it('parses the forms that appear on drawings', () => {
    assert.equal(parseFeetInches(`12'-6"`), 12.5);
    assert.equal(parseFeetInches(`24' - 0"`), 24);
    assert.equal(parseFeetInches(`145'`), 145);
    assert.equal(parseFeetInches(`6"`), 0.5);
    assert.equal(parseFeetInches(`3'-4 1/2"`), 3 + 4.5 / 12);
  });

  it('parses typographic prime marks', () => {
    assert.equal(parseFeetInches('12′-6″'), 12.5);
  });

  it('returns null for text that is not a dimension', () => {
    assert.equal(parseFeetInches('CONFERENCE 201'), null);
    assert.equal(parseFeetInches(''), null);
  });
});

describe('measurement validation vocabulary', () => {
  it('treats only deterministic geometry as verified', () => {
    assert.equal(isVerifiedMeasurement('verified_geometry'), true);
    assert.equal(isVerifiedMeasurement('ai_inferred'), false);
    assert.equal(isVerifiedMeasurement('scale_unverified'), false);
    assert.equal(isVerifiedMeasurement('unverified'), false);
    assert.equal(isVerifiedMeasurement('missing'), false);
  });

  it('flags everything else for estimator review', () => {
    assert.equal(requiresEstimatorReview('verified_geometry'), false);
    assert.equal(requiresEstimatorReview('ai_inferred'), true);
  });

  it('records normalized units and full provenance on every measurement', () => {
    const record = createMeasurementRecord({
      id: 'WP-001',
      description: 'Interior wall protection',
      quantity: 185,
      unit: 'ft',
      validationStatus: 'scale_unverified',
      provenance: {
        documentId: 'doc-1',
        documentSha256: 'a'.repeat(64),
        sheetNumber: 'A101',
        revision: 'C',
        pageNumber: 1,
        sourceCoordinates: { x: 100, y: 200, width: 320, height: 4 },
        extractionMethod: 'pdf_vector_geometry',
        calculationMethod: 'sum of stroked segment lengths',
      },
    });

    assert.equal(record.unit, 'ft');
    assert.equal(record.normalizedUnit, 'ft');
    assert.equal(record.normalizedQuantity, 185);
    assert.equal(record.reviewStatus, 'pending');
    assert.equal(record.provenance.sheetNumber, 'A101');
    assert.ok(record.provenance.calculationEngineVersion.length > 0);
    assert.ok(record.provenance.extractedAt.length > 0);
  });

  it('summarizes validation statuses for the quality-control panel', () => {
    const summary = summarizeValidationStatuses([
      { validationStatus: 'ai_inferred' },
      { validationStatus: 'ai_inferred' },
      { validationStatus: 'missing' },
    ]);

    assert.equal(summary.ai_inferred, 2);
    assert.equal(summary.missing, 1);
    assert.equal(summary.verified_geometry, 0);
  });
});
