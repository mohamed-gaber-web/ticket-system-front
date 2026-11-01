import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { subjectKey, displaySubject } from './emailSubject.ts';

describe('emailSubject — one conversation per subject', () => {
  it('drops reply / forward prefixes and the record tag', () => {
    assert.equal(subjectKey('RE: Fwd: [MIN-2026-00202]  Login   error'), 'login error');
    assert.equal(subjectKey('Re: [TASK-2026-00012] Vendor status'), subjectKey('Vendor status'));
    assert.equal(displaySubject('Re: [TASK-2026-00012] Vendor status'), 'Vendor status');
  });

  it('keeps different subjects apart', () => {
    assert.notEqual(subjectKey('Quote'), subjectKey('Invoice'));
    assert.equal(subjectKey(''), '(no subject)');
  });
});
