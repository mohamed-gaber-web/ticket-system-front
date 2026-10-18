// Grow Path Collect — tafqeet and formatting (GROW_PATH_COLLECT_SPEC.md §7.3). Run with: npm test
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tafqeet, toArabicWords } from './collectTafqeet.ts';
import { addDays, arDate, compact, diffDays, money, relDays } from './collect.ts';

describe('toArabicWords', () => {
  it('handles the spec examples', () => {
    assert.equal(toArabicWords(4_200_000), 'أربعة ملايين ومائتا ألف');
    assert.equal(toArabicWords(360_000), 'ثلاثمائة وستون ألفًا');
  });

  it('handles units, tens, hundreds, duals and plurals', () => {
    assert.equal(toArabicWords(0), 'صفر');
    assert.equal(toArabicWords(21), 'واحد وعشرون');
    assert.equal(toArabicWords(115), 'مائة وخمسة عشر');
    assert.equal(toArabicWords(1000), 'ألف');
    assert.equal(toArabicWords(2000), 'ألفان');
    assert.equal(toArabicWords(5000), 'خمسة آلاف');
    assert.equal(toArabicWords(11_000), 'أحد عشر ألفًا');
    assert.equal(toArabicWords(1_250_000), 'مليون ومائتان وخمسون ألفًا');
    assert.equal(toArabicWords(2_000_000_000), 'ملياران');
  });

  it('wraps the amount with the currency name', () => {
    assert.equal(tafqeet(90_000, 'SAR'), 'فقط تسعون ألفًا ريال سعودي لا غير');
  });
});

describe('formatting', () => {
  it('money, compact and Arabic dates', () => {
    assert.equal(money(1_250_000, 'EGP'), '1,250,000 ج.م');
    assert.equal(compact(1_250_000), '1.25 م');
    assert.equal(compact(350_000), '350 ألف');
    assert.equal(arDate('2026-10-11'), '11 أكتوبر 2026');
  });

  it('date maths', () => {
    assert.equal(addDays('2026-10-11', 7), '2026-10-18');
    assert.equal(diffDays('2026-10-11', '2026-10-01'), 10);
    assert.equal(relDays('2026-10-08', '2026-10-11'), 'منذ 3 يوم');
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
  });
});
