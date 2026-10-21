// Proposal Builder (PROPOSAL_BUILDER_SPEC.md). Proposals are built from a
// tele-sales Opportunity and priced in USD only.
import type { EntityType, IndustrySector, LeadSource } from './teleSales.types';

export type ProposalStatus = 'Draft' | 'Pending approval' | 'Approved' | 'Sent' | 'Accepted' | 'Rejected';
export type ModuleMode = 'I' | 'R' | 'B';
export type ProposalCountry = 'Egypt' | 'KSA' | 'Other';
export type PageKey = 'toc' | 'about' | 'services' | 'products' | 'solutions' | 'd365' | 'd365app' | 'portfolio';
export type LayoutKey = PageKey | 'legal' | 'modules' | 'sow' | 'financial' | 'terms' | 'thanks';

/** One section of the PDF after the cover; `custom` ones are the rep's own (title + description). */
export type LayoutItem =
  | { key: LayoutKey; visible: boolean }
  | { key: 'custom'; id: string; title: string; body: string; visible: boolean };

export interface PersonRef {
  _id: string;
  firstName?: string;
  lastName?: string;
  /** Some endpoints send the full name ready-made (rejection.by, by-customer owners). */
  name?: string;
  email?: string;
}

export const personName = (p?: PersonRef | string | null) =>
  p && typeof p === 'object' ? [p.firstName, p.lastName].filter(Boolean).join(' ') || p.name || p.email || '—' : '—';

export interface LegalEntity {
  name: string;
  location: string;
  industry: string;
}

export interface ProposalRejection {
  reason: string;
  by?: PersonRef | string | null;
  at?: string | null;
}

export interface ProposalModule {
  group: string;
  module: string;
  mode: ModuleMode;
}

export interface TableAttachment {
  _key?: string;
  type: 'table';
  caption: string;
  rows: string[][];
  headerRow: boolean;
}

export interface ImageAttachment {
  _key?: string;
  type: 'image';
  caption: string;
  fileId: string;
  url?: string;
  width: number;
  height: number;
  widthPct: 40 | 60 | 80 | 100;
}

export type SowAttachment = TableAttachment | ImageAttachment;

export interface SowSection {
  /** Client-only identity (never sent to the API). */
  _key?: string;
  title: string;
  body: string;
  attachments: SowAttachment[];
}

export interface ImplLine {
  serviceId?: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface ImplGroup {
  title: string;
  lines: ImplLine[];
}

export interface LicenseLine {
  skuId?: string;
  name: string;
  skuCode: string;
  qty: number;
  pricePerUserMonth: number;
}

export interface Milestone {
  phase: string;
  items: string[];
  pct: number;
}

export interface ProposalOpportunity {
  _id: string;
  companyName?: string;
  contactPersonName?: string;
  email?: string;
  phonePrimary?: string;
  country?: string;
  industry?: string;
  status?: string;
  salesType?: string;
  legalEntities?: LegalEntity[];
  proposalInterests?: string[];
  expectedUsers?: number;
  assignedTo?: PersonRef | null;
}

export interface Proposal {
  _id: string;
  number: string;
  opportunity: string | ProposalOpportunity;
  version: number;
  status: ProposalStatus;
  client: string;
  country: ProposalCountry;
  presentedDate: string;
  preparedBy?: PersonRef | string | null;
  approvedBy?: PersonRef | string | null;
  approvedAt?: string | null;
  /** Set when an admin sends a Pending approval proposal back to Draft; cleared on the next request-approval. */
  rejection?: ProposalRejection | null;
  currency: 'USD';
  vat: number;
  legalEntities: LegalEntity[];
  modules: ProposalModule[];
  sow: { templateKey: string; duration: string; sections: SowSection[] };
  implementation: { groups: ImplGroup[]; discountPct: number };
  licenses: { lines: LicenseLine[]; discountPct: number; termMonths: number; payInAdvance: boolean };
  notes: string[];
  payment: { preset: string; milestones: Milestone[] };
  terms: string[];
  pages: Record<PageKey, boolean>;
  /** Section order + visibility (lib/proposalLayout.ts); empty on proposals saved before it existed. */
  layout?: LayoutItem[];
  totals: { implementation: number; licenses: number; grand: number };
  /** What the caller may do — computed by the API from the opportunity's access. */
  permissions?: { edit: boolean; approve: boolean; delete: boolean };
  pdf?: { generatedAt?: string | null };
  createdAt?: string;
  updatedAt?: string;
}

export interface CatalogService {
  _id?: string;
  code: string;
  category: string;
  name: string;
  price: number;
  active: boolean;
}

export interface CatalogSku {
  _id?: string;
  code: string;
  family: string;
  name: string;
  skuCode: string;
  pricePerUserMonth: number;
  active: boolean;
}

export interface PaymentPresetSeed {
  phase: string;
  items: string;
  pct: number;
}

export interface PortfolioCategory {
  cat: string;
  h: string;
  items: [string, string][];
}

export interface ProposalConfig {
  modules: Record<string, string[]>;
  interests: Record<string, { group?: string; sku?: string }>;
  sowTemplates: Record<string, { t: string; b: string }[]>;
  paymentPresets: Record<string, PaymentPresetSeed[]>;
  portfolio: PortfolioCategory[];
  defaultTerms: string[];
  staticPages: [string, string][];
}

export interface ProposalCatalog {
  settings: { maxDiscount: number; vat: Record<ProposalCountry, number> };
  services: CatalogService[];
  skus: CatalogSku[];
  config: ProposalConfig;
  updatedAt?: string;
  updatedBy?: PersonRef | null;
}

/** Row of the proposals list (GET /proposals, GET /opportunities/:id/proposals). */
export interface ProposalSummary {
  _id: string;
  number: string;
  version: number;
  status: ProposalStatus;
  client: string;
  presentedDate: string;
  preparedBy?: PersonRef | null;
  approvedBy?: PersonRef | null;
  opportunity?: ProposalOpportunity | string;
  totals: { implementation: number; licenses: number; grand: number };
  needsApproval?: boolean;
  /** A discount is above the price list's limit (information for the approving admin). */
  discountOverLimit?: boolean;
  /** What the caller may do with this row — computed by the API (delete = Draft + author/manager). */
  permissions?: { edit: boolean; approve: boolean; delete: boolean };
  updatedAt?: string;
}

// ── Start from an existing customer ──────────────────────────────────────────

/** Row of GET /opportunities/by-customer/:accountId — the customer's open opportunities. */
export interface CustomerOpportunity {
  _id: string;
  companyName?: string;
  contactPersonName?: string;
  status?: string;
  /** The owner (`{ _id, firstName, lastName, name }`), or null when unassigned. */
  assignedTo?: PersonRef | null;
  updatedAt?: string;
}

/** Fields POST /opportunities/from-customer accepts to fill gaps / override the contact's values. */
export interface FromCustomerFields {
  website?: string;
  leadSource?: LeadSource;
  leadSourceDetail?: string;
  entityType?: EntityType;
  industrySector?: IndustrySector;
  businessClassification?: string;
  companyName?: string;
  contactPersonName?: string;
  phonePrimary?: string;
  email?: string;
}

export interface FromCustomerBody {
  account: string;
  accountContact: string;
  team?: string;
  assignedTo?: string;
  fields: FromCustomerFields;
}

/** One entry of the 400 `missing` list from POST /opportunities/from-customer. */
export interface MissingLeadField {
  field: string;
  label: string;
}
