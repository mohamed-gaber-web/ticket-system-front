import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as companyUserApi from '@/api/companyUserApi';
import { toast } from 'sonner';
import type { CreateCompanyUserData, Customer, CustomerQueryParams, UpdateCompanyUserData } from '@/types/customer.types';

interface CompanyUserState {
  companyUsers: Customer[];
  currentCompanyUser: Customer | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: CompanyUserState = {
  companyUsers: [],
  currentCompanyUser: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

export const fetchCompanyUsers = createAsyncThunk(
  'companyUsers/fetchCompanyUsers',
  async (params: CustomerQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await companyUserApi.getCompanyUsers(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch company users';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchCompanyUserById = createAsyncThunk(
  'companyUsers/fetchCompanyUserById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await companyUserApi.getCompanyUserById(id);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch company user';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const createCompanyUser = createAsyncThunk(
  'companyUsers/createCompanyUser',
  async (data: CreateCompanyUserData, { rejectWithValue }) => {
    try {
      const response = await companyUserApi.createCompanyUser(data);
      toast.success('Company user created successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create company user';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateCompanyUser = createAsyncThunk(
  'companyUsers/updateCompanyUser',
  async ({ id, data }: { id: string; data: UpdateCompanyUserData }, { rejectWithValue }) => {
    try {
      const response = await companyUserApi.updateCompanyUser(id, data);
      toast.success('Company user updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update company user';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const removeCompanyUser = createAsyncThunk(
  'companyUsers/removeCompanyUser',
  async (id: string, { rejectWithValue }) => {
    try {
      await companyUserApi.removeCompanyUser(id);
      toast.success('Company user deactivated successfully!');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to deactivate company user';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const companyUserSlice = createSlice({
  name: 'companyUsers',
  initialState,
  reducers: {
    clearCurrentCompanyUser: (state) => {
      state.currentCompanyUser = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCompanyUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanyUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.companyUsers = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchCompanyUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchCompanyUserById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanyUserById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCompanyUser = action.payload;
      })
      .addCase(fetchCompanyUserById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(createCompanyUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCompanyUser.fulfilled, (state, action) => {
        state.loading = false;
        state.companyUsers.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createCompanyUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(updateCompanyUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCompanyUser.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.companyUsers.findIndex((u) => u._id === action.payload._id);
        if (index !== -1) {
          state.companyUsers[index] = action.payload;
        }
        state.currentCompanyUser = action.payload;
      })
      .addCase(updateCompanyUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(removeCompanyUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeCompanyUser.fulfilled, (state, action) => {
        state.loading = false;
        // Update status to inactive in the list instead of removing
        const index = state.companyUsers.findIndex((u) => u._id === action.payload);
        if (index !== -1) {
          state.companyUsers[index] = { ...state.companyUsers[index], status: 'inactive' };
        }
      })
      .addCase(removeCompanyUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentCompanyUser, clearError } = companyUserSlice.actions;
export default companyUserSlice.reducer;
