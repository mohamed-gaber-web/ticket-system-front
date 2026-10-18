// Grow Path Collect — amounts in words and formatting (GROW_PATH_COLLECT_SPEC.md §7.3). Run with: npm test
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { amountInWords, toWords } from './collectAmountWords.ts';
import { addDays, compact, diffDays, fmtDate, money, relDays } from './collect.ts';

describe('toWords', () => {
  it('handles the spec examples', () => {
    assert.equal(toWords(4_200_000), 'four million two hundred thousand');
    assert.equal(toWords(360_000), 'three hundred sixty thousand');
  });

  it('handles units, tens, hundreds and scales', () => {
    assert.equal(toWords(0), 'zero');
    assert.equal(toWords(21), 'twenty-one');
    assert.equal(toWords(115), 'one hundred fifteen');
    assert.equal(toWords(1000), 'one thousand');
    assert.equal(toWords(11_000), 'eleven thousand');
    assert.equal(toWords(1_250_000), 'one million two hundred fifty thousand');
    assert.equal(toWords(2_000_000_005), 'two billion five');
  });

  it('wraps the amount with the currency name', () => {
    assert.equal(amountInWords(90_000, 'SAR'), 'Ninety Thousand Saudi Riyals only');
    assert.equal(amountInWords(4_200_000, 'EGP'), 'Four Million Two Hundred Thousand Egyptian Pounds only');
    assert.equal(amountInWords(21, 'USD'), 'Twenty-One US Dollars only');
  });
});

describe('formatting', () => {
  it('money, compact and dates', () => {
    assert.equal(money(1_250_000, 'EGP'), '1,250,000 EGP');
    assert.equal(compact(1_250_000), '1.25M');
    assert.equal(compact(350_000), '350K');
    assert.equal(fmtDate('2026-10-11'), '11 October 2026');
  });

  it('date maths', () => {
    assert.equal(addDays('2026-10-11', 7), '2026-10-18');
    assert.equal(diffDays('2026-10-11', '2026-10-01'), 10);
    assert.equal(relDays('2026-10-08', '2026-10-11'), '3 days ago');
    assert.equal(relDays('2026-10-12', '2026-10-11'), 'in 1 day');
    // "today" not loaded yet must not throw (Invalid time value)
    assert.equal(addDays('', 7), '');
    assert.equal(diffDays('2026-10-11', ''), 0);
  });
});

describe('installment generation (mirrors the backend)', async () => {
  const { generateInstallments } = await import('./collectCalc.ts');
  it('SLA 360,000 quarterly → 4 × 90,000', () => {
    const list = generateInstallments(
      { value: 360000, startDate: '2025-11-01', endDate: '2026-10-31' },
      { billingMode: 'recurring', phases: [], periodMonths: 3, payInAdvance: true },
    );
    assert.deepEqual(list.map((i) => [i.dueDate, i.amount]), [
      ['2025-11-01', 90000],
      ['2026-02-01', 90000],
      ['2026-05-01', 90000],
      ['2026-08-01', 90000],
    ]);
    assert.equal(list[0].name, 'Period 1 (November 2025 – January 2026)');
  });
});
