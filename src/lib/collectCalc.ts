import type { ContractType } from '../types/collect.types';
import { AR_MONTHS, addDays } from './collect.ts';

// Grow Path Collect — installment generation for the contract editor's live
// table. Mirrors the backend's utils/collect/calc.js generateInstallments
// (the server generates the same schedule when none is sent) — change both.

const pad = (n: number) => String(n).padStart(2, '0');

/** Add months, clamping to the month end (Jan 31 + 1 month = Feb 28/29). */
export const addMonths = (s: string, n: number) => {
  const [y, m, d] = s.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = total % 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${pad(nm + 1)}-${pad(Math.min(d, last))}`;
};

const arMonthYear = (s: string) => {
  const [y, m] = s.split('-').map(Number);
  return `${AR_MONTHS[m - 1]} ${y}`;
};

export interface DraftInstallment {
  _id?: string;
  name: string;
  dueDate: string;
  amount: number;
}

export const generateInstallments = (
  c: { value: number; startDate: string; endDate?: string; deliveryDate?: string },
  type: Pick<ContractType, 'billingMode' | 'phases' | 'periodMonths' | 'payInAdvance'>,
): DraftInstallment[] => {
  const value = Number(c.value) || 0;
  const start = c.startDate;
  if (!start) return [];
  let out: DraftInstallment[];
  if (type.billingMode === 'phases') {
    out = (type.phases ?? []).map((ph) => {
      const base = ph.anchor === 'delivery' ? c.deliveryDate || c.endDate || start : ph.anchor === 'end' ? c.endDate || start : start;
      return { name: `${ph.name} ${ph.pct}%`, dueDate: addDays(base, Number(ph.offset) || 0), amount: Math.round((value * (Number(ph.pct) || 0)) / 100) };
    });
  } else if (type.billingMode === 'recurring') {
    const period = Math.max(1, Number(type.periodMonths) || 1);
    const end = c.endDate || addDays(addMonths(start, 12), -1);
    const starts: string[] = [];
    for (let k = 0; k < 240; k++) {
      const s = addMonths(start, period * k);
      if (s > end) break;
      starts.push(s);
    }
    const n = starts.length || 1;
    out = starts.map((s, k) => {
      const periodEnd = addDays(addMonths(start, period * (k + 1)), -1);
      return {
        name: `الفترة ${k + 1} (${arMonthYear(s)} – ${arMonthYear(periodEnd)})`,
        dueDate: type.payInAdvance === false ? periodEnd : s,
        amount: Math.round(value / n),
      };
    });
  } else {
    out = [{ name: 'قيمة الفترة', dueDate: start, amount: Math.round(value) }];
  }
  if (out.length) out[out.length - 1].amount += Math.round(value) - out.reduce((a, i) => a + i.amount, 0);
  return out;
};

export const billingSummary = (type?: Pick<ContractType, 'billingMode' | 'phases' | 'periodMonths' | 'payInAdvance'> | null) => {
  if (!type) return '';
  if (type.billingMode === 'recurring') {
    return `دفعات متساوية كل ${type.periodMonths} شهور، ${type.payInAdvance === false ? 'في نهاية كل فترة' : 'مقدمًا في بداية كل فترة'}`;
  }
  if (type.billingMode === 'renewal') return 'دفعة واحدة مقدمًا عن كامل الفترة';
  return `${type.phases.length} دفعات مرتبطة بمراحل التنفيذ: ${type.phases.map((p) => `${p.pct}%`).join(' · ')}`;
};
