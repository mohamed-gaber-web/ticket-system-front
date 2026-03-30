import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type {
  Company,
  CreateCompanyData,
  UpdateCompanyData,
  CompanyQueryParams,
} from '@/types/company.types';
import * as companyApi from '@/api/companyApi';
import { toast } from 'sonner';

interface CompanyState {
  companies: Company[];
  currentCompany: Company | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: CompanyState = {
  companies: [],
  currentCompany: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

export const fetchCompanies = createAsyncThunk(
  'companies/fetchAll',
  async (params: CompanyQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await companyApi.getCompanies(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch companies');
    }
  }
);

export const fetchCompanyById = createAsyncThunk(
  'companies/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await companyApi.getCompanyById(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch company');
    }
  }
);

export const createCompany = createAsyncThunk(
  'companies/create',
  async (data: CreateCompanyData, { rejectWithValue }) => {
    try {
      const response = await companyApi.createCompany(data);
      toast.success('Company created successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create company';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateCompany = createAsyncThunk(
  'companies/update',
  async ({ id, data }: { id: string; data: UpdateCompanyData }, { rejectWithValue }) => {
    try {
      const response = await companyApi.updateCompany(id, data);
      toast.success('Company updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update company';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteCompany = createAsyncThunk(
  'companies/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await companyApi.deleteCompany(id);
      toast.success('Company deleted successfully!');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete company';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const toggleCompanyStatus = createAsyncThunk(
  'companies/toggleStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await companyApi.toggleCompanyStatus(id);
      toast.success('Company status updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to toggle company status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const companySlice = createSlice({
  name: 'companies',
  initialState,
  reducers: {
    clearCurrentCompany: (state) => {
      state.currentCompany = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all companies
      .addCase(fetchCompanies.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanies.fulfilled, (state, action) => {
        state.loading = false;
        state.companies = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchCompanies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch company by ID
      .addCase(fetchCompanyById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanyById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCompany = action.payload;
      })
      .addCase(fetchCompanyById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create company
      .addCase(createCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCompany.fulfilled, (state, action) => {
        state.loading = false;
        state.companies.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update company
      .addCase(updateCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCompany.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.companies.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) {
          state.companies[index] = action.payload;
        }
        if (state.currentCompany?._id === action.payload._id) {
          state.currentCompany = action.payload;
        }
      })
      .addCase(updateCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete company
      .addCase(deleteCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCompany.fulfilled, (state, action) => {
        state.loading = false;
        state.companies = state.companies.filter((c) => c._id !== action.payload);
        state.total -= 1;
        if (state.currentCompany?._id === action.payload) {
          state.currentCompany = null;
        }
      })
      .addCase(deleteCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Toggle company status
      .addCase(toggleCompanyStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleCompanyStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.companies.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) {
          state.companies[index] = action.payload;
        }
        if (state.currentCompany?._id === action.payload._id) {
          state.currentCompany = action.payload;
        }
      })
      .addCase(toggleCompanyStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentCompany, clearError } = companySlice.actions;
export default companySlice.reducer;
