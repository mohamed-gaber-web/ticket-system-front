import api from './axiosConfig';
import type { LeadEmailResponse, SendLeadEmailData } from '@/types/teleSales.types';
import type {
  AssistantOverview,
  CommunicationLog,
  CommunicationMeta,
  CompanySettings,
  CompanySettingsInput,
  ItemResponse,
  ListResponse,
  MessageTemplate,
  MessageTemplateInput,
  MessageTemplateQueryParams,
  PrepareMessageRequest,
  PreparedMessage,
  Product,
  ProductInput,
  ProductQueryParams,
  SalesDocument,
  SalesDocumentInput,
  SalesDocumentQueryParams,
  TemplatePreview,
  TemplatePreviewRequest,
  TemplateVariable,
} from '@/types/salesAssistant.types';

// ── Products ──────────────────────────────────────────────────────────────────

export const getProducts = (params?: ProductQueryParams): Promise<ListResponse<Product>> =>
  api.get('/products', { params }).then((r) => r.data);

export const getProductCategories = (): Promise<{ success: boolean; data: string[] }> =>
  api.get('/products/categories').then((r) => r.data);

export const getProductById = (id: string): Promise<ItemResponse<Product>> =>
  api.get(`/products/${id}`).then((r) => r.data);

export const createProduct = (data: ProductInput): Promise<ItemResponse<Product>> =>
  api.post('/products', data).then((r) => r.data);

export const updateProduct = (id: string, data: Partial<ProductInput>): Promise<ItemResponse<Product>> =>
  api.patch(`/products/${id}`, data).then((r) => r.data);

export const toggleProductStatus = (id: string): Promise<ItemResponse<Product>> =>
  api.patch(`/products/${id}/toggle-status`).then((r) => r.data);

export const deleteProduct = (id: string): Promise<{ success: boolean; message: string }> =>
  api.delete(`/products/${id}`).then((r) => r.data);

// ── Sales documents ───────────────────────────────────────────────────────────

export const getSalesDocuments = (params?: SalesDocumentQueryParams): Promise<ListResponse<SalesDocument>> =>
  api.get('/sales-documents', { params }).then((r) => r.data);

export const getSalesDocumentById = (id: string): Promise<ItemResponse<SalesDocument>> =>
  api.get(`/sales-documents/${id}`).then((r) => r.data);

export const createSalesDocument = (data: SalesDocumentInput): Promise<ItemResponse<SalesDocument>> =>
  api.post('/sales-documents', data).then((r) => r.data);

export const updateSalesDocument = (id: string, data: Partial<SalesDocumentInput>): Promise<ItemResponse<SalesDocument>> =>
  api.patch(`/sales-documents/${id}`, data).then((r) => r.data);

export const toggleSalesDocumentStatus = (id: string): Promise<ItemResponse<SalesDocument>> =>
  api.patch(`/sales-documents/${id}/toggle-status`).then((r) => r.data);

export const deleteSalesDocument = (id: string): Promise<{ success: boolean; message: string }> =>
  api.delete(`/sales-documents/${id}`).then((r) => r.data);

// ── Message templates ─────────────────────────────────────────────────────────

export const getMessageTemplates = (params?: MessageTemplateQueryParams): Promise<ListResponse<MessageTemplate>> =>
  api.get('/message-templates', { params }).then((r) => r.data);

export const getTemplateVariables = (): Promise<{ success: boolean; data: TemplateVariable[] }> =>
  api.get('/message-templates/variables').then((r) => r.data);

export const getMessageTemplateById = (id: string): Promise<ItemResponse<MessageTemplate>> =>
  api.get(`/message-templates/${id}`).then((r) => r.data);

export const createMessageTemplate = (data: MessageTemplateInput): Promise<ItemResponse<MessageTemplate>> =>
  api.post('/message-templates', data).then((r) => r.data);

export const updateMessageTemplate = (id: string, data: Partial<MessageTemplateInput>): Promise<ItemResponse<MessageTemplate>> =>
  api.patch(`/message-templates/${id}`, data).then((r) => r.data);

export const toggleMessageTemplateStatus = (id: string): Promise<ItemResponse<MessageTemplate>> =>
  api.patch(`/message-templates/${id}/toggle-status`).then((r) => r.data);

export const deleteMessageTemplate = (id: string): Promise<{ success: boolean; message: string }> =>
  api.delete(`/message-templates/${id}`).then((r) => r.data);

/** Render a saved or draft template against a lead (or sample data). */
export const previewTemplate = (data: TemplatePreviewRequest): Promise<ItemResponse<TemplatePreview>> =>
  api.post('/message-templates/preview', data).then((r) => r.data);

// ── Company settings ──────────────────────────────────────────────────────────

export const getCompanySettings = (): Promise<ItemResponse<CompanySettings>> =>
  api.get('/company-settings').then((r) => r.data);

export const updateCompanySettings = (data: Partial<CompanySettingsInput>): Promise<ItemResponse<CompanySettings>> =>
  api.put('/company-settings', data).then((r) => r.data);

// ── Assistant ─────────────────────────────────────────────────────────────────

export const getAssistantOverview = (leadId: string): Promise<ItemResponse<AssistantOverview>> =>
  api.get('/sales-assistant/overview', { params: { leadId } }).then((r) => r.data);

export const prepareMessage = (data: PrepareMessageRequest): Promise<ItemResponse<PreparedMessage>> =>
  api.post('/sales-assistant/prepare', data).then((r) => r.data);

/** Same payload as the lead email compose, plus the audit meta. */
export const sendAssistantEmail = (
  leadId: string,
  data: SendLeadEmailData,
  meta: CommunicationMeta,
): Promise<LeadEmailResponse> =>
  api.post('/sales-assistant/send-email', { leadId, ...data, meta }).then((r) => r.data);

export const prepareWhatsApp = (
  leadId: string,
  message: string,
  meta: CommunicationMeta,
  phone?: string,
): Promise<ItemResponse<{ log: CommunicationLog; whatsappNumber: string; whatsappUrl: string }>> =>
  api.post('/sales-assistant/whatsapp', { leadId, message, meta, phone }).then((r) => r.data);

export const getLeadCommunications = (leadId: string, limit = 50): Promise<ListResponse<CommunicationLog>> =>
  api.get(`/leads/${leadId}/communications`, { params: { limit } }).then((r) => r.data);
