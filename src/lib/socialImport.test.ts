// Social Pulse import parsers (SOCIAL_PULSE_SPEC.md §11). Run with: npm test
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  autoMap,
  buildImportRows,
  cleanTitle,
  detectHeaderRow,
  headerSignature,
  parseDate,
  parseNumber,
} from './socialImport.ts';

describe('parseNumber', () => {
  it('strips thousands separators, spaces, % and the Arabic comma', () => {
    assert.equal(parseNumber('12,400'), 12400);
    assert.equal(parseNumber(' 1 200 '), 1200);
    assert.equal(parseNumber('3.5%'), 3.5);
    assert.equal(parseNumber('12٬400'), 12400);
    assert.equal(parseNumber(42), 42);
  });

  it('turns text and blanks into null', () => {
    assert.equal(parseNumber('Lifetime'), null);
    assert.equal(parseNumber('--'), null);
    assert.equal(parseNumber(''), null);
    assert.equal(parseNumber(Number.NaN), null);
  });
});

describe('parseDate', () => {
  it('reads M/D/Y with a time', () => assert.equal(parseDate('10/03/2026 14:05'), '2026-10-03'));
  it('swaps to D/M/Y when the first part is over 12', () => assert.equal(parseDate('25/09/2026'), '2026-09-25'));
  it('zero-pads ISO dates', () => assert.equal(parseDate('2026-9-1'), '2026-09-01'));
  it('expands two-digit years', () => assert.equal(parseDate('1/2/26'), '2026-01-02'));
  it('reads Date objects as their local day', () => assert.equal(parseDate(new Date(2026, 9, 3, 23, 30)), '2026-10-03'));
  it('gives an empty string for nonsense', () => assert.equal(parseDate('soon'), ''));
});

describe('header detection and mapping', () => {
  const sheet = [
    ['Meta Business Suite export'],
    [],
    ['Post ID', 'Permalink', 'Title', 'Publish time', 'Post type', 'Reach', 'Reactions', 'Comments', 'Shares', 'Link clicks', 'Amount spent (EGP)'],
    ['1', 'https://facebook.com/p/1', '  Hello   world ', '10/03/2026 14:05', 'Reels', '12,400', '300', '20', '5', 'Lifetime', ''],
    ['', '', '', '', '', '', '', '', '', '', ''],
  ];

  it('finds the header row', () => {
    assert.deepEqual(detectHeaderRow(sheet), { index: 2, score: 11 });
    assert.equal(detectHeaderRow([['foo', 'bar']]).score, 0);
  });

  it('maps exact synonyms, then "starts with", one column per field', () => {
    const m = autoMap(sheet[2]);
    assert.equal(m.externalId, 0);
    assert.equal(m.link, 1);
    assert.equal(m.title, 2);
    assert.equal(m.date, 3);
    assert.equal(m.type, 4);
    assert.equal(m.likes, 6);
    assert.equal(m.spend, 10);
    assert.equal(m.views, -1);
  });

  it('builds clean rows and skips empty ones', () => {
    const rows = buildImportRows(sheet, 2, autoMap(sheet[2]));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].rowIndex, 3);
    assert.equal(rows[0].title, 'Hello world');
    assert.equal(rows[0].date, '2026-10-03');
    assert.equal(rows[0].metrics.reach, 12400);
    assert.equal(rows[0].metrics.clicks, null);
    assert.equal(rows[0].metrics.spend, null);
  });

  it('caps long titles at 90 characters', () => {
    const t = cleanTitle('x'.repeat(120));
    assert.equal(t.length, 89);
    assert.ok(t.endsWith('…'));
  });

  it('hashes the normalised headers', async () => {
    assert.equal(await headerSignature([' Title ', 'REACH']), await headerSignature(['title', 'reach']));
    assert.match(await headerSignature(['a']), /^[a-f0-9]{40}$/);
  });
});
