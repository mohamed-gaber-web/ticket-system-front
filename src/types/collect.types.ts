// Grow Path Collect (/api/collect) — mirrors the backend controllers' payloads.

export type Currency = 'EGP' | 'SAR' | 'USD';
export type ContractStatus = 'active' | 'closed' | 'renewed' | 'cancelled';
export type BillingMode = 'phases' | 'recurring' | 'renewal';
export type PhaseAnchor = 'start' | 'delivery' | 'end';
export type SignatureStatus = 'draft' | 'sent' | 'review' | 'signed' | 'original';
export type ChequeKind = 'guarantee' | 'payment';
export type ChequeStatus = 'held' | 'deposited' | 'cleared' | 'returned' | 'released';
export type Trigger = 'due' | 'overdue' | 'renewal' | 'sign' | 'cheque';
export type Recipient = 'client' | 'internal' | 'both';
export type Tone = 'ok' | 'crit' | 'info' | 'warn' | 'neutral';
export type CollectionFilter = 'overdue' | 'month' | 'next30' | 'next90' | 'paid' | 'all';

export interface Phase {
  name: string;
  pct: number;
  anchor: PhaseAnchor;
  offset: number;
}

export interface ContractType {
  id: string;
  key: string;
  name: string;
  color: string;
  billingMode: BillingMode;
  phases: Phase[];
  periodMonths: number;
  payInAdvance: boolean;
  renewable: boolean;
  renewalUpliftPct: number;
  needsGuarantee: boolean;
  defaultScope: string;
  paymentTerms: string;
  active: boolean;
  contractCount?: number;
}

export interface Badges {
  collection: number;
  signatures: number;
  reminders: number;
}

export interface CollectMeta {
  today: string;
  simulated: boolean;
  company: string;
  rates: { SAR: number; USD: number };
  contractPrefix: string;
  reminderMode: 'manual' | 'auto';
  internalEmailSet: boolean;
  smtpConfigured: boolean;
  types: ContractType[];
  badges: Badges;
  canAdmin: boolean;
}

export interface Clause {
  _id?: string;
  title: string;
  body: string;
  appliesTo?: string[];
}

export interface DocumentSettings {
  paper: 'designed' | 'preprinted' | 'plain';
  topMm: number;
  bottomMm: number;
  logo: string | null;
  mark: string | null;
  watermark: boolean;
  phone: string;
  email: string;
  web: string;
  footAddr: string;
  title: string;
  legalName: string;
  legalForm: string;
  cr: string;
  crOffice: string;
  taxNo: string;
  address: string;
  signer: string;
  signerTitle: string;
  bank: string;
  showVat: boolean;
  vatEG: number;
  vatSA: number;
  preamble: string;
  payTerms: string;
  usdTerm: string;
  lawEG: string;
  courtEG: string;
  lawSA: string;
  courtSA: string;
}

export interface CollectSettings {
  company: string;
  senderEmail: string;
  internalEmail: string;
  contractPrefix: string;
  nextContractNo: number;
  simulatedToday: string | null;
  reminderMode: 'manual' | 'auto';
  rates: { SAR: number; USD: number };
  document: DocumentSettings;
  clauses: Clause[];
  smtpConfigured: boolean;
}

export interface Customer {
  id: string;
  name: string;
  contactName: string;
  email: string;
  isActive: boolean;
  country: string;
  currency: Currency;
  accountManager: string;
  legalForm: string;
  cr: string;
  crOffice: string;
  taxNo: string;
  address: string;
  signer: string;
  signerTitle: string;
  inCollect: boolean;
  contractCount?: number;
}

export type CustomerInput = Omit<Customer, 'id' | 'isActive' | 'inCollect' | 'contractCount'>;

export interface InstStatus {
  key: 'paid' | 'late' | 'partial' | 'soon' | 'scheduled';
  label: string;
  tone: Tone;
  days: number;
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
  chequeId: string | null;
}

export interface Installment {
  id: string;
  name: string;
  dueDate: string;
  amount: number;
  paid: number;
  remaining: number;
  status: InstStatus;
  payments: Payment[];
}

export interface ContractSummary {
  id: string;
  no: string;
  name: string;
  customer: { id: string; name: string };
  typeKey: string;
  typeId: string;
  value: number;
  currency: Currency;
  startDate: string;
  endDate: string | null;
  deliveryDate: string | null;
  status: ContractStatus;
  renewedFrom: string | null;
  instCount: number;
  instSum: number;
  collected: number;
  remaining: number;
  overdue: number;
  overdueCount: number;
  hasPayments: boolean;
  customized: { version: number } | null;
  signatureStatus: SignatureStatus;
  followUpDate: string | null;
  unsigned: boolean;
  needsGuarantee: boolean;
  renewInDays: number | null;
}

export interface ContractDocument {
  title: string;
  preamble: string;
  typeTerms: string;
  payTerms: string;
  clauses: Clause[];
  version?: number;
  copiedFrom?: string | null;
}

export interface SignatureLog {
  date: string;
  text: string;
}

export interface Signature {
  status: SignatureStatus;
  sentAt: string | null;
  signedAt: string | null;
  originalAt: string | null;
  followUpDate: string | null;
  log: SignatureLog[];
}

export interface Cheque {
  id: string;
  contract: { id: string; no: string; name: string };
  customer: { id: string; name: string };
  kind: ChequeKind;
  number: string;
  bank: string;
  amount: number;
  currency: Currency;
  dueDate: string | null;
  receivedDate: string | null;
  status: ChequeStatus;
  installmentId: string | null;
  notes: string;
  log: { date: string; status: ChequeStatus }[];
}

export interface ChequeInput {
  contract: string;
  kind: ChequeKind;
  number: string;
  bank: string;
  amount: number | string;
  currency: Currency;
  dueDate: string;
  receivedDate: string;
  status: ChequeStatus;
  installmentId: string;
  notes: string;
}

export interface ContractDetail extends ContractSummary {
  scope: string;
  notes: string;
  document: ContractDocument | null;
  signature: Signature;
  installments: Installment[];
  customerDetail: Customer | null;
  type: ContractType | null;
  billing: string;
  cheques: Cheque[];
  reminderLog: { id: string; sentAt: string; to: string; subject: string; channel: string; error: string | null; trigger: Trigger }[];
  renewal: { upliftPct: number; startDate: string; endDate: string } | null;
  customizedSiblings: { id: string; no: string; name: string; version: number }[];
  today: string;
}

export interface ContractInput {
  no: string;
  customer: string;
  type: string;
  name: string;
  value: number | string;
  currency: Currency;
  startDate: string;
  endDate: string;
  deliveryDate: string;
  scope: string;
  notes: string;
  installments?: { _id?: string; name: string; dueDate: string; amount: number | string }[];
}

export interface Totals {
  value: number;
  collected: number;
  remaining: number;
  overdue: number;
}

export interface MonthlyRow {
  month: string;
  planned: number;
  collected: number;
  fromMonth: number;
  fromLate: number;
  advance: number;
  diff: number;
  rate: number | null;
  prevYear: number;
  mom: number | null;
}

export interface Analytics {
  year: number;
  today: string;
  rates: { SAR: number; USD: number };
  kpis: {
    activeValue: number;
    activeCount: number;
    backlog: number;
    overdue: number;
    overduePct: number | null;
    dueThisMonth: number;
    collectedYear: number;
    discipline: number | null;
  };
  monthly: MonthlyRow[];
  totals: Omit<MonthlyRow, 'month' | 'mom'>;
  collectedByType: { key: string; values: number[] }[];
  plannedByType: { key: string; values: number[] }[];
  remainingByType: { key: string; name: string; color: string; value: number }[];
  upcoming: { key: string; label: string; value: number; late?: boolean }[];
  topOverdue: { id: string; name: string; value: number }[];
}

export interface CollectionRow {
  contractId: string;
  contractNo: string;
  contractName: string;
  customer: { id: string; name: string };
  currency: Currency;
  typeKey: string;
  installmentId: string;
  name: string;
  dueDate: string;
  amount: number;
  paid: number;
  remaining: number;
  late: number;
  status: InstStatus;
}

export interface CollectionResult {
  data: CollectionRow[];
  counts: Record<CollectionFilter, number>;
  totalRemainingEGP: number;
  today: string;
}

export interface FollowUpRow extends ContractSummary {
  sentAt: string | null;
  sinceSent: number | null;
  followLate: number | null;
  lastNote: string;
  version: number | null;
}

export interface SignaturesData {
  kpis: {
    unsignedCount: number;
    unsignedValue: number;
    followUpsDue: number;
    guaranteeValue: number;
    guaranteeCount: number;
    paymentDue30: number;
    returned: number;
  };
  followups: FollowUpRow[];
  missingGuarantee: ContractSummary[];
  cheques: Cheque[];
}

export interface Mail {
  dedupeKey: string;
  ruleKey: string;
  trigger: Trigger;
  days: number;
  recipient: Recipient;
  triggerDate: string;
  contractId: string;
  contractNo: string;
  customerName: string;
  installmentId: string | null;
  chequeId: string | null;
  to: string[];
  toText: string;
  missingEmail: boolean;
  subject: string;
  body: string;
}

export interface Outbox {
  today: string;
  outbox: Mail[];
  upcoming: Mail[];
  mode: 'manual' | 'auto';
  smtpConfigured: boolean;
  internalEmailSet: boolean;
}

export interface SentLog {
  id: string;
  sentAt: string;
  to: string;
  subject: string;
  trigger: Trigger;
  channel: 'manual' | 'smtp';
  error: string | null;
  contractId: string | null;
  by: string;
}

export interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  body: string;
}

export interface ReminderRule {
  id: string;
  key: string;
  active: boolean;
  trigger: Trigger;
  days: number;
  recipient: Recipient;
  templateKey: string;
  contractTypes: string[];
}
