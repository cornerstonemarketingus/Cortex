import assert from 'node:assert/strict';

import { describe, it } from './harness';
import {
  classifySheetRole,
  extractMatchlines,
  extractRevisions,
  identifySheet,
  parseSheetNumber,
} from '@/src/commercial-estimating/document-processing/sheet-metadata';
import type { TextSpan } from '@/src/commercial-estimating/document-processing/types';

function span(text: string, x: number, y: number, fontHeightPt = 9): TextSpan {
  return {
    id: `span-${text}`,
    text,
    bbox: { x, y, width: text.length * fontHeightPt * 0.5, height: fontHeightPt },
    fontHeightPt,
    rotationDeg: 0,
    extractionMethod: 'pdf_embedded_text',
  };
}

describe('sheet metadata: sheet numbers', () => {
  it('parses National CAD Standard sheet numbers', () => {
    assert.deepEqual(parseSheetNumber('A101'), { sheetNumber: 'A101', discipline: 'Architectural' });
    assert.deepEqual(parseSheetNumber('A-101'), { sheetNumber: 'A101', discipline: 'Architectural' });
    assert.equal(parseSheetNumber('M2.01')?.sheetNumber, 'M2.01');
    assert.equal(parseSheetNumber('FP-201')?.discipline, 'Fire Protection');
  });

  it('rejects text that merely looks sheet-shaped', () => {
    assert.equal(parseSheetNumber('CONFERENCE 201'), null);
    assert.equal(parseSheetNumber('ABC'), null);
    assert.equal(parseSheetNumber(''), null);
  });

  it('rejects sheet-shaped plan annotations whose prefix is not a discipline', () => {
    // These appear all over a floor plan and are structurally identical to a
    // sheet number. Accepting them lets a room tag outrank the real sheet.
    assert.equal(parseSheetNumber('RM 101'), null);
    assert.equal(parseSheetNumber('NO. 12'), null);
    assert.equal(parseSheetNumber('EQ 4'), null);
  });

  it('accepts the National CAD Standard discipline designators', () => {
    for (const [sheet, discipline] of [
      ['V101', 'Survey / Mapping'],
      ['B201', 'Geotechnical'],
      ['Z101', 'Contractor / Shop Drawings'],
      ['O101', 'Operations'],
      ['T101', 'Telecommunications'],
    ] as const) {
      const parsed = parseSheetNumber(sheet);
      assert.equal(parsed?.sheetNumber, sheet, `${sheet} should parse as a sheet number`);
      assert.equal(parsed?.discipline, discipline);
    }
  });
});

describe('sheet metadata: roles', () => {
  it('classifies drawing titles into sheet roles', () => {
    assert.equal(classifySheetRole('LEVEL 2 FLOOR PLAN'), 'plan');
    assert.equal(classifySheetRole('REFLECTED CEILING PLAN'), 'reflected_ceiling_plan');
    assert.equal(classifySheetRole('ROOM FINISH SCHEDULE'), 'schedule');
    assert.equal(classifySheetRole('WALL PROTECTION DETAILS'), 'detail');
    assert.equal(classifySheetRole(null), 'unknown');
  });
});

describe('sheet metadata: identification', () => {
  it('prefers the title block over a stray match elsewhere on the sheet', () => {
    const identity = identifySheet({
      widthPt: 1224,
      heightPt: 792,
      spans: [
        span('A999', 100, 600, 6), // stray reference mid-sheet
        span('A101', 1000, 40, 18), // title block
        span('LEVEL 2 FLOOR PLAN - AREA A', 1000, 80, 11),
      ],
    });

    assert.equal(identity.sheetNumber, 'A101');
    assert.equal(identity.source, 'title_block');
    assert.equal(identity.discipline, 'Architectural');
    assert.equal(identity.role, 'plan');
    assert.ok(identity.matchStrength >= 0.9);
  });

  it('reports not_found instead of guessing when no sheet number exists', () => {
    const identity = identifySheet({
      widthPt: 1224,
      heightPt: 792,
      spans: [span('GENERAL NOTES', 200, 400)],
    });

    assert.equal(identity.sheetNumber, null);
    assert.equal(identity.source, 'not_found');
    assert.equal(identity.matchStrength, 0);
  });
});

describe('sheet metadata: revisions and matchlines', () => {
  it('extracts revision identifiers and dates', () => {
    const revisions = extractRevisions([span('REV: C  09/14/2026', 1000, 20)]);
    assert.equal(revisions.length, 1);
    assert.equal(revisions[0].revision, 'C');
    assert.equal(revisions[0].date, '09/14/2026');
  });

  it('de-duplicates repeated revision notes', () => {
    const revisions = extractRevisions([
      span('REV: C', 1000, 20),
      span('REVISION C', 1000, 40),
      span('REV 2', 1000, 60),
    ]);
    assert.deepEqual(
      revisions.map((entry) => entry.revision),
      ['2', 'C']
    );
  });

  it('does not read title-block headings as revisions', () => {
    // "REVISIONS" and "ISSUED FOR BID" head the revision table on essentially
    // every commercial sheet. Matching a loose token against them invented
    // revisions "S" and "D" on nearly every page.
    assert.deepEqual(extractRevisions([span('REVISIONS', 1000, 20)]), []);
    assert.deepEqual(extractRevisions([span('ISSUED FOR BID', 1000, 20)]), []);
    assert.deepEqual(extractRevisions([span('ISSUED FOR CONSTRUCTION', 1000, 20)]), []);
    assert.deepEqual(extractRevisions([span('REVISION HISTORY', 1000, 20)]), []);
  });

  it('still reads the revision formats that appear on real title blocks', () => {
    const cases: Array<[string, string]> = [
      ['REV: C', 'C'],
      ['REV 2', '2'],
      ['REVISION NO. 4', '4'],
      ['\u0394 3', '3'],
      ['REV A1', 'A1'],
      ['REV 12A', '12A'],
    ];

    for (const [text, expected] of cases) {
      const revisions = extractRevisions([span(text, 1000, 20)]);
      assert.equal(revisions.length, 1, `expected "${text}" to yield one revision`);
      assert.equal(revisions[0].revision, expected);
    }
  });

  it('extracts matchline references and the sheet they point at', () => {
    const matchlines = extractMatchlines([span('MATCH LINE - SEE SHEET A102', 520, 270)]);
    assert.equal(matchlines.length, 1);
    assert.equal(matchlines[0].referencedSheet, 'A102');
    assert.equal(matchlines[0].bbox.x, 520);
  });

  it('records a matchline with no named sheet rather than inventing one', () => {
    const matchlines = extractMatchlines([span('MATCH LINE', 520, 270)]);
    assert.equal(matchlines.length, 1);
    assert.equal(matchlines[0].referencedSheet, null);
  });
});
