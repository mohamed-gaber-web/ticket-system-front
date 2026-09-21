import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import * as salesAssistantApi from '@/api/salesAssistantApi';
import type {
  CompanySettings,
  CompanySettingsInput,
  MessageTemplate,
  MessageTemplateInput,
  MessageTemplateQueryParams,
  Product,
  ProductInput,
  ProductQueryParams,
  SalesDocument,
  SalesDocumentInput,
  SalesDocumentQueryParams,
  TemplateVariable,
} from '@/types/salesAssistant.types';

// Shared catalog data for the tele-sales assistant: products, sales documents,
// message templates and the company profile. Per-lead state (the prepared
// message, the open compose window) is deliberately local to the assistant
// panel — it is short-lived and never shared between screens.

interface SalesAssistantState {
  products: Product[];
  productsTotal: number;
  productsPage: number;
  productsPages: number;
  productCategories: string[];
  currentProduct: Product | null;
  productsLoading: boolean;

  documents: SalesDocument[];
  documentsTotal: number;
  documentsLoading: boolean;

  templates: MessageTemplate[];
  templateVariables: TemplateVariable[];
  templatesLoading: boolean;

  companySettings: CompanySettings | null;
  companySettingsLoading: boolean;

  error: string | null;
}

const initialState: SalesAssistantState = {
  products: [],
  productsTotal: 0,
  productsPage: 1,
  productsPages: 1,
  productCategories: [],
  currentProduct: null,
  productsLoading: false,

  documents: [],
  documentsTotal: 0,
  documentsLoading: false,

  templates: [],
  templateVariables: [],
  templatesLoading: false,

  companySettings: null,
  companySettingsLoading: false,

  error: null,
};

const apiMessage = (error: unknown, fallback: string): string =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

// ── Products ──────────────────────────────────────────────────────────────────

export const fetchProducts = createAsyncThunk(
  'salesAssistant/fetchProducts',
  async (params: ProductQueryParams | undefined, { rejectWithValue }) => {
    try {
      return await salesAssistantApi.getProducts(params);
    } catch (error) {
      return rejectWithValue(apiMessage(error, 'Failed to fetch products'));
    }
  },
);

export const fetchProductCategories = createAsyncThunk(
  'salesAssistant/fetchProductCategories',
  async (_: void, { rejectWithValue }) => {
    try {
      return (await salesAssistantApi.getProductCategories()).data;
    } catch (error) {
      return rejectWithValue(apiMessage(error, 'Failed to fetch categories'));
    }
  },
);

export const fetchProductById = createAsyncThunk(
  'salesAssistant/fetchProductById',
  async (id: string, { rejectWithValue }) => {
    try {
      return (await salesAssistantApi.getProductById(id)).data;
    } catch (error) {
      return rejectWithValue(apiMessage(error, 'Failed to fetch product'));
    }
  },
);

export const createProduct = createAsyncThunk(
  'salesAssistant/createProduct',
  async (data: ProductInput, { rejectWithValue }) => {
    try {
      const response = await salesAssistantApi.createProduct(data);
      toast.success('Product created');
      return response.data;
    } catch (error) {
      const message = apiMessage(error, 'Failed to create product');
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

export const updateProduct = createAsyncThunk(
  'salesAssistant/updateProduct',
  async ({ id, data }: { id: string; data: Partial<ProductInput> }, { rejectWithValue }) => {
    try {
      const response = await salesAssistantApi.updateProduct(id, data);
      toast.success('Product updated');
      return response.data;
    } catch (error) {
      const message = apiMessage(error, 'Failed to update product');
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

export const toggleProductStatus = createAsyncThunk(
  'salesAssistant/toggleProductStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await salesAssistantApi.toggleProductStatus(id);
      toast.success(response.message || 'Product updated');
      return response.data;
    } catch (error) {
      const message = apiMessage(error, 'Failed to update product');
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

export const deleteProduct = createAsyncThunk(
  'salesAssistant/deleteProduct',
  async (id: string, { rejectWithValue }) => {
    try {
      await salesAssistantApi.deleteProduct(id);
      toast.success('Product deleted');
      return id;
    } catch (error) {
      const message = apiMessage(error, 'Failed to delete product');
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

// ── Sales documents ───────────────────────────────────────────────────────────

export const fetchSalesDocuments = createAsyncThunk(
  'salesAssistant/fetchSalesDocuments',
  async (params: SalesDocumentQueryParams | undefined, { rejectWithValue }) => {
    try {
      return await salesAssistantApi.getSalesDocuments(params);
    } catch (error) {
      return rejectWithValue(apiMessage(error, 'Failed to fetch documents'));
    }
  },
);

export const createSalesDocument = createAsyncThunk(
  'salesAssistant/createSalesDocument',
  async (data: SalesDocumentInput, { rejectWithValue }) => {
    try {
      const response = await salesAssistantApi.createSalesDocument(data);
      toast.success('Document added');
      return response.data;
    } catch (error) {
      const message = apiMessage(error, 'Failed to add document');
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

export const updateSalesDocument = createAsyncThunk(
  'salesAssistant/updateSalesDocument',
  async ({ id, data }: { id: string; data: Partial<SalesDocumentInput> }, { rejectWithValue }) => {
    try {
      const response = await salesAssistantApi.updateSalesDocument(id, data);
      toast.success('Document updated');
      return response.data;
    } catch (error) {
      const message = apiMessage(error, 'Failed to update document');
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

export const toggleSalesDocumentStatus = createAsyncThunk(
  'salesAssistant/toggleSalesDocumentStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await salesAssistantApi.toggleSalesDocumentStatus(id);
      toast.success(response.message || 'Document updated');
      return response.data;
    } catch (error) {
      const message = apiMessage(error, 'Failed to update document');
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

export const deleteSalesDocument = createAsyncThunk(
  'salesAssistant/deleteSalesDocument',
  async (id: string, { rejectWithValue }) => {
    try {
      await salesAssistantApi.deleteSalesDocument(id);
      toast.success('Document deleted');
      return id;
    } catch (error) {
      const message = apiMessage(error, 'Failed to delete document');
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

// ── Message templates ─────────────────────────────────────────────────────────

export const fetchMessageTemplates = createAsyncThunk(
  'salesAssistant/fetchMessageTemplates',
  async (params: MessageTemplateQueryParams | undefined, { rejectWithValue }) => {
    try {
      return await salesAssistantApi.getMessageTemplates(params);
    } catch (error) {
      return rejectWithValue(apiMessage(error, 'Failed to fetch templates'));
    }
  },
);

export const fetchTemplateVariables = createAsyncThunk(
  'salesAssistant/fetchTemplateVariables',
  async (_: void, { rejectWithValue }) => {
    try {
      return (await salesAssistantApi.getTemplateVariables()).data;
    } catch (error) {
      return rejectWithValue(apiMessage(error, 'Failed to fetch template variables'));
    }
  },
);

export const createMessageTemplate = createAsyncThunk(
  'salesAssistant/createMessageTemplate',
  async (data: MessageTemplateInput, { rejectWithValue }) => {
    try {
      const response = await salesAssistantApi.createMessageTemplate(data);
      toast.success('Template created');
      return response.data;
    } catch (error) {
      const message = apiMessage(error, 'Failed to create template');
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

export const updateMessageTemplate = createAsyncThunk(
  'salesAssistant/updateMessageTemplate',
  async ({ id, data }: { id: string; data: Partial<MessageTemplateInput> }, { rejectWithValue }) => {
    try {
      const response = await salesAssistantApi.updateMessageTemplate(id, data);
      toast.success('Template updated');
      return response.data;
    } catch (error) {
      const message = apiMessage(error, 'Failed to update template');
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

export const toggleMessageTemplateStatus = createAsyncThunk(
  'salesAssistant/toggleMessageTemplateStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await salesAssistantApi.toggleMessageTemplateStatus(id);
      toast.success(response.message || 'Template updated');
      return response.data;
    } catch (error) {
      const message = apiMessage(error, 'Failed to update template');
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

export const deleteMessageTemplate = createAsyncThunk(
  'salesAssistant/deleteMessageTemplate',
  async (id: string, { rejectWithValue }) => {
    try {
      await salesAssistantApi.deleteMessageTemplate(id);
      toast.success('Template deleted');
      return id;
    } catch (error) {
      const message = apiMessage(error, 'Failed to delete template');
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

// ── Company settings ──────────────────────────────────────────────────────────

export const fetchCompanySettings = createAsyncThunk(
  'salesAssistant/fetchCompanySettings',
  async (_: void, { rejectWithValue }) => {
    try {
      return (await salesAssistantApi.getCompanySettings()).data;
    } catch (error) {
      return rejectWithValue(apiMessage(error, 'Failed to fetch company settings'));
    }
  },
);

export const updateCompanySettings = createAsyncThunk(
  'salesAssistant/updateCompanySettings',
  async (data: Partial<CompanySettingsInput>, { rejectWithValue }) => {
    try {
      const response = await salesAssistantApi.updateCompanySettings(data);
      toast.success('Company profile saved');
      return response.data;
    } catch (error) {
      const message = apiMessage(error, 'Failed to save company profile');
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const replaceById = <T extends { _id: string }>(list: T[], item: T) => {
  const index = list.findIndex((x) => x._id === item._id);
  if (index !== -1) list[index] = item;
};

const salesAssistantSlice = createSlice({
  name: 'salesAssistant',
  initialState,
  reducers: {
    clearCurrentProduct: (state) => {
      state.currentProduct = null;
    },
    clearSalesAssistantError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Products
      .addCase(fetchProducts.pending, (state) => { state.productsLoading = true; state.error = null; })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.productsLoading = false;
        state.products = action.payload.data;
        state.productsTotal = action.payload.total;
        state.productsPage = action.payload.page ?? 1;
        state.productsPages = action.payload.pages ?? 1;
      })
      .addCase(fetchProducts.rejected, (state, action) => { state.productsLoading = false; state.error = action.payload as string; })
      .addCase(fetchProductCategories.fulfilled, (state, action) => { state.productCategories = action.payload; })
      .addCase(fetchProductById.pending, (state) => { state.productsLoading = true; })
      .addCase(fetchProductById.fulfilled, (state, action) => { state.productsLoading = false; state.currentProduct = action.payload; })
      .addCase(fetchProductById.rejected, (state, action) => { state.productsLoading = false; state.error = action.payload as string; })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.products.unshift(action.payload);
        state.productsTotal += 1;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        replaceById(state.products, action.payload);
        if (state.currentProduct?._id === action.payload._id) state.currentProduct = action.payload;
      })
      .addCase(toggleProductStatus.fulfilled, (state, action) => {
        replaceById(state.products, action.payload);
        if (state.currentProduct?._id === action.payload._id) state.currentProduct = action.payload;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.products = state.products.filter((p) => p._id !== action.payload);
        state.productsTotal = Math.max(0, state.productsTotal - 1);
        if (state.currentProduct?._id === action.payload) state.currentProduct = null;
      })

      // Documents
      .addCase(fetchSalesDocuments.pending, (state) => { state.documentsLoading = true; state.error = null; })
      .addCase(fetchSalesDocuments.fulfilled, (state, action) => {
        state.documentsLoading = false;
        state.documents = action.payload.data;
        state.documentsTotal = action.payload.total;
      })
      .addCase(fetchSalesDocuments.rejected, (state, action) => { state.documentsLoading = false; state.error = action.payload as string; })
      .addCase(createSalesDocument.fulfilled, (state, action) => {
        state.documents.unshift(action.payload);
        state.documentsTotal += 1;
      })
      .addCase(updateSalesDocument.fulfilled, (state, action) => { replaceById(state.documents, action.payload); })
      .addCase(toggleSalesDocumentStatus.fulfilled, (state, action) => { replaceById(state.documents, action.payload); })
      .addCase(deleteSalesDocument.fulfilled, (state, action) => {
        state.documents = state.documents.filter((d) => d._id !== action.payload);
        state.documentsTotal = Math.max(0, state.documentsTotal - 1);
      })

      // Templates
      .addCase(fetchMessageTemplates.pending, (state) => { state.templatesLoading = true; state.error = null; })
      .addCase(fetchMessageTemplates.fulfilled, (state, action) => {
        state.templatesLoading = false;
        state.templates = action.payload.data;
      })
      .addCase(fetchMessageTemplates.rejected, (state, action) => { state.templatesLoading = false; state.error = action.payload as string; })
      .addCase(fetchTemplateVariables.fulfilled, (state, action) => { state.templateVariables = action.payload; })
      .addCase(createMessageTemplate.fulfilled, (state, action) => {
        // Only one default per channel + purpose; the server unset the others.
        if (action.payload.isDefault) {
          state.templates.forEach((t) => {
            if (t.channel === action.payload.channel && t.purpose === action.payload.purpose) t.isDefault = false;
          });
        }
        state.templates.unshift(action.payload);
      })
      .addCase(updateMessageTemplate.fulfilled, (state, action) => {
        if (action.payload.isDefault) {
          state.templates.forEach((t) => {
            if (t._id !== action.payload._id && t.channel === action.payload.channel && t.purpose === action.payload.purpose) t.isDefault = false;
          });
        }
        replaceById(state.templates, action.payload);
      })
      .addCase(toggleMessageTemplateStatus.fulfilled, (state, action) => { replaceById(state.templates, action.payload); })
      .addCase(deleteMessageTemplate.fulfilled, (state, action) => {
        state.templates = state.templates.filter((t) => t._id !== action.payload);
      })

      // Company settings
      .addCase(fetchCompanySettings.pending, (state) => { state.companySettingsLoading = true; })
      .addCase(fetchCompanySettings.fulfilled, (state, action) => { state.companySettingsLoading = false; state.companySettings = action.payload; })
      .addCase(fetchCompanySettings.rejected, (state, action) => { state.companySettingsLoading = false; state.error = action.payload as string; })
      .addCase(updateCompanySettings.pending, (state) => { state.companySettingsLoading = true; })
      .addCase(updateCompanySettings.fulfilled, (state, action) => { state.companySettingsLoading = false; state.companySettings = action.payload; })
      .addCase(updateCompanySettings.rejected, (state) => { state.companySettingsLoading = false; });
  },
});

export const { clearCurrentProduct, clearSalesAssistantError } = salesAssistantSlice.actions;
export default salesAssistantSlice.reducer;
