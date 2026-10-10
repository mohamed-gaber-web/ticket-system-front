import type { Lead, SalesType, CreateLeadData } from '@/types/teleSales.types';
import { LEAD_SOURCE_DETAILS, isValidUrl } from '@/types/teleSales.types';

/**
 * The three stages of the sales pipeline (Lead.salesType). Mirrors the backend's
 * src/utils/leadStages.js — keep the two in step.
 *
 *   Data        → raw records, the only place imports land; nothing mandatory.
 *   Lead        → a Data record completed (every REQUIRED_LEAD_FIELDS + an owner)
 *                 and converted by its agent.
 *   Opportunity → a Lead converted for the sales push.
 *
 * Records only move forward, through the convert action — never the lead form.
 */
export const STAGE_META: Record<SalesType, { label: string; plural: string; path: string; badge: string; hint: string }> = {
  Data: {
    label: 'Data',
    plural: 'Data',
    path: '/tele-sales/data',
    badge: 'bg-slate-100 text-slate-700',
    hint: 'Raw records from imports — complete them and convert to a Lead',
  },
  Lead: {
    label: 'Lead',
    plural: 'Leads',
    path: '/tele-sales/leads',
    badge: 'bg-sky-100 text-sky-700',
    hint: 'Qualified records with every mandatory field (Opportunities stay listed here too)',
  },
  Opportunity: {
    label: 'Opportunity',
    plural: 'Opportunities',
    path: '/tele-sales/opportunities',
    badge: 'bg-emerald-100 text-emerald-700',
    hint: 'Leads converted into sales opportunities',
  },
};

export const STAGE_ORDER: SalesType[] = ['Data', 'Lead', 'Opportunity'];

/** The stage each stage converts into. */
export const NEXT_STAGE: Partial<Record<SalesType, SalesType>> = { Data: 'Lead', Lead: 'Opportunity' };

/** Legacy records without a salesType are Leads (they predate the Data stage). */
export const stageOf = (lead?: Pick<Lead, 'salesType'> | null): SalesType => lead?.salesType || 'Lead';

/** Fields a Lead (and an Opportunity) must have — mirrors REQUIRED_LEAD_FIELDS on the backend. */
export const REQUIRED_LEAD_FIELDS: { key: keyof CreateLeadData & keyof Lead; label: string }[] = [
  { key: 'companyName', label: 'Company name' },
  { key: 'contactPersonName', label: 'Contact person' },
  { key: 'phonePrimary', label: 'Phone (primary)' },
  { key: 'email', label: 'Email' },
  { key: 'website', label: 'Website' },
  { key: 'leadSource', label: 'Lead source' },
  { key: 'entityType', label: 'Entity type' },
  { key: 'industrySector', label: 'Industry sector' },
  { key: 'businessClassification', label: 'Business classification' },
];

const filled = (v: unknown) => v !== undefined && v !== null && String(v).trim() !== '';

/** What a record still lacks to become a Lead; empty when it is ready to convert. */
export function missingLeadFields(lead: Partial<Lead>): string[] {
  const missing = REQUIRED_LEAD_FIELDS.filter(({ key }) => !filled(lead[key])).map(({ label }) => label);
  const spec = lead.leadSource ? LEAD_SOURCE_DETAILS[lead.leadSource] : undefined;
  if (spec) {
    if (!filled(lead.leadSourceDetail)) missing.push(spec.label);
    else if (spec.type === 'url' && !isValidUrl(lead.leadSourceDetail)) missing.push(`${spec.label} (a valid URL)`);
  }
  if (!lead.assignedTo) missing.push('Assign to');
  return missing;
}

/** At least one thing to identify a Data record by — mirrors hasIdentity on the backend. */
export const hasIdentity = (r: Partial<Lead> | CreateLeadData) =>
  (['companyName', 'contactPersonName', 'phonePrimary', 'phoneSecondary', 'phoneOther', 'email'] as const)
    .some((f) => filled((r as Record<string, unknown>)[f]));

/** A record's display name: raw Data may have no company name yet. */
export const recordName = (lead: Partial<Lead>) =>
  lead.companyName || lead.contactPersonName || lead.phonePrimary || lead.email || lead.customerId || 'Unnamed record';
