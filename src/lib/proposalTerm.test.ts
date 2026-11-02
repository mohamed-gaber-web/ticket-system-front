import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { licenseTermMonths, termLabel } from './proposalMath.ts';

describe('billing term in months + days', () => {
  it('a day is 1/30 of a month; days only allowed; nothing → 12 months', () => {
    assert.equal(licenseTermMonths({ termMonths: 2, termDays: 15 }), 2.5);
    assert.ok(Math.abs(licenseTermMonths({ termMonths: 0, termDays: 20 }) - 20 / 30) < 1e-9);
    assert.equal(licenseTermMonths({ termMonths: 12 }), 12);
    assert.equal(licenseTermMonths({ termMonths: 0, termDays: 0 }), 12);
  });

  it('labels the term as written', () => {
    assert.equal(termLabel({ termMonths: 2, termDays: 15 }), '2 months 15 days');
    assert.equal(termLabel({ termMonths: 0, termDays: 1 }), '1 day');
    assert.equal(termLabel({ termMonths: 1 }), '1 month');
  });
});
