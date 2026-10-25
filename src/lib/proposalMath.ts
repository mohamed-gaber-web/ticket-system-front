// Proposal money (PROPOSAL_BUILDER_SPEC.md §4.2). Mirrors the backend's
// src/utils/proposalMath.js line for line — change both together. Round for
// display only; proposals are USD only.
import type { Proposal } from '@/types/proposal.types';

type MoneyShape = Pick<Proposal, 'vat' | 'implementation' | 'licenses'> & { approvedBy?: unknown };

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export interface GroupTotals {
  sum: number;
  disc: number;
  net: number;
  vat: number;
  total: number;
}

export const groupTotals = (
  group: { lines?: { qty: number; unitPrice: number }[] } | undefined,
  discountPct: number,
  vatPct: number,
): GroupTotals => {
  const sum = (group?.lines ?? []).reduce((a, l) => a + num(l.qty) * num(l.unitPrice), 0);
  const disc = (sum * num(discountPct)) / 100;
  const net = sum - disc;
  const vat = (net * num(vatPct)) / 100;
  return { sum, disc, net, vat, total: net + vat };
};

export const licenseUnitPrice = (line: { pricePerUserMonth: number } | undefined, termMonths: number) =>
  num(line?.pricePerUserMonth) * (num(termMonths) || 12);

export interface ProposalTotals {
  groups: GroupTotals[];
  implementation: number;
  implementationNet: number;
  licSum: number;
  licEligDisc: number;
  licBase: number;
  licDisc: number;
  licNet: number;
  licVat: number;
  licenses: number;
  grand: number;
}

export const proposalTotals = (p: Partial<MoneyShape> | null | undefined): ProposalTotals => {
  const vat = num(p?.vat);
  const implDisc = num(p?.implementation?.discountPct);
  const groups = (p?.implementation?.groups ?? []).map((g) => groupTotals(g, implDisc, vat));
  const implementation = groups.reduce((a, g) => a + g.total, 0);
  const implementationNet = groups.reduce((a, g) => a + g.net, 0);

  const term = num(p?.licenses?.termMonths) || 12;
  const licSum = (p?.licenses?.lines ?? []).reduce((a, l) => a + num(l.qty) * licenseUnitPrice(l, term), 0);
  const eligPct = p?.licenses?.eligibilityDiscount ? num(p?.licenses?.eligibilityDiscountPct) : 0;
  const licEligDisc = (licSum * eligPct) / 100;
  const licBase = licSum - licEligDisc;
  const licDisc = (licBase * num(p?.licenses?.discountPct)) / 100;
  const licNet = licBase - licDisc;
  const licVat = (licNet * vat) / 100;
  const licenses = licNet + licVat;

  return { groups, implementation, implementationNet, licSum, licEligDisc, licBase, licDisc, licNet, licVat, licenses, grand: implementation + licenses };
};

export const discountOverLimit = (p: Partial<MoneyShape> | null | undefined, maxDiscount: number) => {
  const max = num(maxDiscount);
  const eligOver = Boolean(p?.licenses?.eligibilityDiscount) && num(p?.licenses?.eligibilityDiscountPct) > max;
  return num(p?.implementation?.discountPct) > max || num(p?.licenses?.discountPct) > max || eligOver;
};

/**
 * Every proposal needs an admin's approval before its PDF / email: true while it
 * is a Draft or waiting in Pending approval. The discount limit is only shown to
 * the approver (`discountOverLimit`), it no longer triggers approval.
 */
export const needsApproval = (p: Partial<Pick<Proposal, 'status'>> | null | undefined) => {
  const status = p?.status || 'Draft'; // no status = Draft (mirrors the backend)
  return status === 'Draft' || status === 'Pending approval';
};

/** Statuses whose PDF may be built / emailed (mirrors the backend's export gate). */
export const EXPORTABLE_STATUSES: readonly Proposal['status'][] = ['Approved', 'Sent', 'Accepted'];
export const canExport = (p: Partial<Pick<Proposal, 'status'>> | null | undefined) => Boolean(p?.status && EXPORTABLE_STATUSES.includes(p.status));

export const milestonesTotal = (p: Pick<Proposal, 'payment'> | null | undefined) =>
  (p?.payment?.milestones ?? []).reduce((a, m) => a + num(m.pct), 0);

/** Do the milestones add up to 100%? Tolerant of float sums like 0.1 + 64.1 + 35.8 (mirrors the backend). */
export const milestonesComplete = (p: Pick<Proposal, 'payment'> | null | undefined) => Math.abs(milestonesTotal(p) - 100) < 0.005;

/** `$12,345.00` (or `$12,345` with `decimals: 0` for whole numbers). */
export const formatUsd = (n: number, decimals = 2) => {
  const v = num(n);
  const min = decimals === 0 && Number.isInteger(v) ? 0 : 2;
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: min, maximumFractionDigits: 2 })}`;
};
