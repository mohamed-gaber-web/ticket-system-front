import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import * as teleSalesApi from '@/api/teleSalesApi';
import type { Lead, LeadStats, LeadQueryParams, CreateLeadData, UpdateLeadData, ImportLeadsRequest } from '@/types/teleSales.types';

interface TeleSalesLeadsState {
  leads: Lead[];
  currentLead: Lead | null;
  stats: LeadStats | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: TeleSalesLeadsState = {
  leads: [],
  currentLead: null,
  stats: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

export const fetchLeads = createAsyncThunk(
  'teleSalesLeads/fetchLeads',
  async (params: LeadQueryParams | undefined, { rejectWithValue }) => {
    try {
      return await teleSalesApi.getLeads(params);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch leads';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchLeadById = createAsyncThunk(
  'teleSalesLeads/fetchLeadById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await teleSalesApi.getLeadById(id);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch lead';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchLeadStats = createAsyncThunk(
  'teleSalesLeads/fetchLeadStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await teleSalesApi.getLeadStats();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch stats');
    }
  }
);

export const createLead = createAsyncThunk(
  'teleSalesLeads/createLead',
  async (data: CreateLeadData, { rejectWithValue }) => {
    try {
      const response = await teleSalesApi.createLead(data);
      toast.success('Lead created successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create lead';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const importLeads = createAsyncThunk(
  'teleSalesLeads/importLeads',
  async (data: ImportLeadsRequest, { rejectWithValue }) => {
    try {
      const response = await teleSalesApi.importLeads(data);
      if (response.inserted > 0) {
        toast.success(`Imported ${response.inserted} lead${response.inserted === 1 ? '' : 's'} successfully!`);
      } else {
        toast.error('No leads were imported');
      }
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to import leads';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateLead = createAsyncThunk(
  'teleSalesLeads/updateLead',
  async ({ id, data }: { id: string; data: UpdateLeadData }, { rejectWithValue }) => {
    try {
      const response = await teleSalesApi.updateLead(id, data);
      toast.success('Lead updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update lead';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteLead = createAsyncThunk(
  'teleSalesLeads/deleteLead',
  async (id: string, { rejectWithValue }) => {
    try {
      await teleSalesApi.deleteLead(id);
      toast.success('Lead deleted successfully!');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete lead';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const teleSalesLeadsSlice = createSlice({
  name: 'teleSalesLeads',
  initialState,
  reducers: {
    clearCurrentLead: (state) => { state.currentLead = null; },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeads.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchLeads.fulfilled, (state, action) => {
        state.loading = false;
        state.leads = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchLeads.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(fetchLeadById.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchLeadById.fulfilled, (state, action) => { state.loading = false; state.currentLead = action.payload; })
      .addCase(fetchLeadById.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(fetchLeadStats.fulfilled, (state, action) => { state.stats = action.payload; });

    builder
      .addCase(createLead.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createLead.fulfilled, (state) => { state.loading = false; })
      .addCase(createLead.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(importLeads.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(importLeads.fulfilled, (state) => { state.loading = false; })
      .addCase(importLeads.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(updateLead.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateLead.fulfilled, (state, action) => {
        state.loading = false;
        state.currentLead = action.payload;
        const idx = state.leads.findIndex((l) => l._id === action.payload._id);
        if (idx !== -1) state.leads[idx] = action.payload;
      })
      .addCase(updateLead.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(deleteLead.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteLead.fulfilled, (state, action) => {
        state.loading = false;
        state.leads = state.leads.filter((l) => l._id !== action.payload);
      })
      .addCase(deleteLead.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });
  },
});

export const { clearCurrentLead, clearError } = teleSalesLeadsSlice.actions;
export default teleSalesLeadsSlice.reducer;
