import assert from 'node:assert/strict';

import { describe, it } from './harness';
import {
  looksLikeScaleAnnotation,
  parseScaleAnnotation,
  resolvePageScale,
  verifyScaleAgainstDimension,
} from '@/src/commercial-estimating/document-processing/scale';

describe('scale: annotation parsing', () => {
  it('parses architectural scales into feet per PDF point', () => {
    const quarter = parseScaleAnnotation(`SCALE: 1/4" = 1'-0"`);
    assert.ok(quarter);
    assert.equal(quarter.kind, 'architectural');
    // 1/4in = 1ft means 4 ft per paper inch, and 72 points make an inch.
    assert.ok(Math.abs((quarter.feetPerPoint ?? 0) - 4 / 72) < 1e-9);

    const eighth = parseScaleAnnotation(`1/8" = 1'-0"`);
    assert.ok(Math.abs((eighth?.feetPerPoint ?? 0) - 8 / 72) < 1e-9);

    const oneToOne = parseScaleAnnotation(`1" = 1'-0"`);
    assert.ok(Math.abs((oneToOne?.feetPerPoint ?? 0) - 1 / 72) < 1e-9);
  });

  it('parses engineering scales', () => {
    const parsed = parseScaleAnnotation(`SCALE: 1" = 20'`);
    assert.equal(parsed?.kind, 'engineering');
    assert.ok(Math.abs((parsed?.feetPerPoint ?? 0) - 20 / 72) < 1e-9);
  });

  it('parses metric ratios', () => {
    const parsed = parseScaleAnnotation('1:100');
    assert.equal(parsed?.kind, 'ratio');
    // One paper inch represents 100 inches, i.e. 8.333 ft.
    assert.ok(Math.abs((parsed?.realFeet ?? 0) - 100 / 12) < 1e-4);
  });

  it('recognises NOT TO SCALE and refuses to produce a factor', () => {
    const parsed = parseScaleAnnotation('SCALE: N.T.S.');
    assert.equal(parsed?.kind, 'not_to_scale');
    assert.equal(parsed?.feetPerPoint, null);
  });

  it('returns null for text that carries no scale', () => {
    assert.equal(parseScaleAnnotation('LEVEL 2 FLOOR PLAN'), null);
    assert.equal(parseScaleAnnotation(''), null);
  });

  it('pre-screens candidate annotations', () => {
    assert.equal(looksLikeScaleAnnotation(`SCALE: 1/4" = 1'-0"`), true);
    assert.equal(looksLikeScaleAnnotation('1:50'), true);
    assert.equal(looksLikeScaleAnnotation('CONFERENCE 201'), false);
  });
});

describe('scale: page resolution', () => {
  it('reports unknown rather than inventing a scale', () => {
    const scale = resolvePageScale([]);
    assert.equal(scale.feetPerPoint, null);
    assert.equal(scale.verificationStatus, 'unknown');
    assert.match(scale.notes.join(' '), /require.*calibration/i);
  });

  it('never marks an annotation verified on its own', () => {
    const scale = resolvePageScale([`SCALE: 1/4" = 1'-0"`]);
    assert.equal(scale.verificationStatus, 'declared_unverified');
    assert.match(scale.notes.join(' '), /has not been verified/i);
  });

  it('reports every scale on a sheet that carries more than one', () => {
    const scale = resolvePageScale([`SCALE: 1/8" = 1'-0"`, `SCALE: 1 1/2" = 1'-0"`]);
    assert.equal(scale.candidates.length, 2);
    assert.match(scale.notes.join(' '), /different scales/i);
  });
});

describe('scale: verification against a labelled dimension', () => {
  it('verifies an annotation that agrees with the geometry', () => {
    // 32 ft drawn at 1/8" = 1'-0" occupies 32 / (8/72) = 288 points.
    const result = verifyScaleAgainstDimension({
      feetPerPoint: 8 / 72,
      measuredPoints: 288,
      labelledFeet: 32,
    });
    assert.equal(result?.status, 'verified_against_dimension');
    assert.ok((result?.relativeError ?? 1) < 1e-6);
  });

  it('flags an annotation that disagrees with the geometry', () => {
    const result = verifyScaleAgainstDimension({
      feetPerPoint: 8 / 72,
      measuredPoints: 288,
      labelledFeet: 64,
    });
    assert.equal(result?.status, 'conflicted');
  });

  it('refuses to verify from unusable inputs', () => {
    assert.equal(
      verifyScaleAgainstDimension({ feetPerPoint: 0, measuredPoints: 100, labelledFeet: 10 }),
      null
    );
  });
});
