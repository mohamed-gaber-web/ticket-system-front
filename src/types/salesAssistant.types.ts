// Types for the tele-sales assistant: product catalog, sales documents,
// message templates, company profile and the one-click send flow.
// Mirrors the backend models in ticket-backend/src/models.

// ── Shared ────────────────────────────────────────────────────────────────────

/** A stored file reference (GridFS), same shape as email attachments. */
export interface FileRef {
  fileId: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
}

export interface ListResponse<T> {
  success: boolean;
  count: number;
  total: number;
  page?: number;
  pages?: number;
  data: T[];
}

export interface ItemResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// ── Products ──────────────────────────────────────────────────────────────────

export type ProductStatus = 'active' | 'archived';

export interface ProductPrice {
  amount?: number;
  currency?: string;
  note?: string;
}

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface Product {
  _id: string;
  name: string;
  sku?: string;
  category?: string;
  shortDescription?: string;
  description?: string;
  features: string[];
  benefits: string[];
  specifications: ProductSpecification[];
  price?: ProductPrice;
  link?: string;
  images: FileRef[];
  /** Populated on detail; ids on list. */
  documents: Array<SalesDocument | string>;
  relatedProducts: Array<Pick<Product, '_id' | 'name' | 'sku' | 'category' | 'shortDescription' | 'status' | 'price' | 'images'> | string>;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  sku?: string;
  category?: string;
  shortDescription?: string;
  description?: string;
  features?: string[];
  benefits?: string[];
  specifications?: ProductSpecification[];
  price?: ProductPrice;
  link?: string;
  images?: FileRef[];
  documents?: string[];
  relatedProducts?: string[];
  status?: ProductStatus;
}

export interface ProductQueryParams {
  search?: string;
  category?: string;
  status?: ProductStatus | 'all';
  page?: number;
  limit?: number;
}

// ── Sales documents ───────────────────────────────────────────────────────────

export type SalesDocumentType =
  | 'company_profile'
  | 'brochure'
  | 'catalog'
  | 'pricing'
  | 'service_overview'
  | 'faq'
  | 'terms'
  | 'other';

export const SALES_DOCUMENT_TYPE_LABELS: Record<SalesDocumentType, string> = {
  company_profile: 'Company Profile',
  brochure: 'Brochure',
  catalog: 'Product Catalog',
  pricing: 'Pricing Sheet',
  service_overview: 'Service Overview',
  faq: 'FAQ',
  terms: 'Terms & Conditions',
  other: 'Other',
};

export type SalesDocumentStatus = 'active' | 'archived';

export interface SalesDocument {
  _id: string;
  name: string;
  type: SalesDocumentType;
  description?: string;
  file: FileRef;
  version?: string;
  product?: { _id: string; name: string; sku?: string } | string | null;
  status: SalesDocumentStatus;
  /** Login-free download link (used in WhatsApp messages). */
  publicUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesDocumentInput {
  name: string;
  type: SalesDocumentType;
  description?: string;
  file?: FileRef;
  version?: string;
  product?: string | null;
  status?: SalesDocumentStatus;
}

export interface SalesDocumentQueryParams {
  type?: SalesDocumentType;
  product?: string;
  status?: SalesDocumentStatus | 'all';
  search?: string;
  page?: number;
  limit?: number;
}

// ── Message templates ─────────────────────────────────────────────────────────

export type TemplateChannel = 'email' | 'whatsapp';

export type TemplatePurpose =
  | 'company_profile'
  | 'catalog'
  | 'pricing'
  | 'brochure'
  | 'product_details'
  | 'general';

export const TEMPLATE_PURPOSE_LABELS: Record<TemplatePurpose, string> = {
  company_profile: 'Company Profile',
  catalog: 'Product Catalog',
  pricing: 'Pricing',
  brochure: 'Brochure',
  product_details: 'Product Details',
  general: 'General',
};

export type TemplateStatus = 'active' | 'inactive';

export interface MessageTemplate {
  _id: string;
  name: string;
  channel: TemplateChannel;
  purpose: TemplatePurpose;
  description?: string;
  subject?: string;
  body: string;
  isDefault: boolean;
  status: TemplateStatus;
  /** Present on detail responses: placeholders the template uses. */
  variables?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MessageTemplateInput {
  name: string;
  channel: TemplateChannel;
  purpose?: TemplatePurpose;
  description?: string;
  subject?: string;
  body: string;
  isDefault?: boolean;
  status?: TemplateStatus;
}

export interface MessageTemplateQueryParams {
  channel?: TemplateChannel;
  purpose?: TemplatePurpose;
  status?: TemplateStatus | 'all';
  search?: string;
}

export interface TemplateVariable {
  key: string;
  label: string;
  group: 'lead' | 'salesAgent' | 'company' | 'product' | 'document';
}

export interface TemplatePreviewRequest {
  templateId?: string;
  /** Draft preview (unsaved template). */
  channel?: TemplateChannel;
  subject?: string;
  body?: string;
  leadId?: string;
  productId?: string;
  documentId?: string;
}

export interface TemplatePreview {
  channel: TemplateChannel;
  subject: string;
  body: string;
  missing: string[];
  /** true when rendered against sample lead data. */
  sample: boolean;
}

// ── Company settings ──────────────────────────────────────────────────────────

export interface CompanySocial {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  tiktok?: string;
  youtube?: string;
  x?: string;
}

export interface CompanySettings {
  _id?: string;
  name: string;
  tagline?: string;
  logo?: { fileId?: string; fileName?: string };
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  address?: string;
  social: CompanySocial;
  updatedAt?: string;
}

export type CompanySettingsInput = Omit<CompanySettings, '_id' | 'updatedAt'>;

// ── Assistant ─────────────────────────────────────────────────────────────────

export type QuickActionKey = 'company_profile' | 'catalog' | 'pricing' | 'brochure' | 'product_details';

export interface QuickActionChannelState {
  ready: boolean;
  reason: string | null;
  templateId: string | null;
  templateName: string | null;
  documentId: string | null;
  documentName: string | null;
}

export interface QuickAction {
  key: QuickActionKey;
  label: string;
  purpose: TemplatePurpose;
  requiresProduct: boolean;
  channels: Record<TemplateChannel, QuickActionChannelState>;
}

export interface AssistantLead {
  _id: string;
  companyName: string;
  contactPersonName: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  country?: string;
  /** false when the lead belongs to another agent on the team. */
  canMessage: boolean;
}

export interface AssistantOverview {
  lead: AssistantLead | null;
  agent: { name: string; email: string; phone: string };
  company: CompanySettings;
  quickActions: QuickAction[];
  templates: Array<Pick<MessageTemplate, '_id' | 'name' | 'channel' | 'purpose' | 'subject' | 'isDefault'>>;
  documents: Array<Pick<SalesDocument, '_id' | 'name' | 'type' | 'version' | 'file' | 'publicUrl'>>;
  /** "link" — no provider API; messages open via wa.me. */
  whatsappIntegration: 'link';
}

export interface PrepareMessageRequest {
  leadId: string;
  channel: TemplateChannel;
  action?: QuickActionKey;
  templateId?: string;
  productId?: string;
  documentId?: string;
}

export interface PreparedMessage {
  channel: TemplateChannel;
  action: QuickActionKey | null;
  to: string;
  whatsappNumber: string;
  whatsappUrl: string;
  subject: string;
  body: string;
  missing: string[];
  warnings: string[];
  canSend: boolean;
  template: { _id: string; name: string; purpose: TemplatePurpose };
  product: { _id: string; name: string } | null;
  document: (Pick<SalesDocument, '_id' | 'name' | 'type' | 'version' | 'file'> & { publicUrl: string }) | null;
  attachments: FileRef[];
}

/** What the audit log records about where a message came from. */
export interface CommunicationMeta {
  action?: QuickActionKey | 'custom';
  templateId?: string;
  productId?: string;
  documentId?: string;
}

export type CommunicationStatus = 'sent' | 'failed' | 'prepared';

export interface CommunicationLog {
  _id: string;
  lead: string;
  agent: string;
  agentName?: string;
  channel: TemplateChannel;
  action?: string;
  template?: string | null;
  templateName?: string;
  product?: string | null;
  productName?: string;
  document?: string | null;
  documentName?: string;
  recipient?: string;
  subject?: string;
  status: CommunicationStatus;
  errorMessage?: string;
  leadEmail?: string | null;
  sentAt: string;
  createdAt: string;
}
