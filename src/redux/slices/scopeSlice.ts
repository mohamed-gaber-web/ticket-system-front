import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type {
  Scope,
  CreateScopeData,
  UpdateScopeData,
  ScopeQueryParams,
} from '@/types/scope.types';
import * as scopeApi from '@/api/scopeApi';
import { toast } from 'sonner';

interface ScopeState {
  scopes: Scope[];
  currentScope: Scope | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: ScopeState = {
  scopes: [],
  currentScope: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

// Async thunks
export const fetchScopes = createAsyncThunk(
  'scopes/fetchAll',
  async (params: ScopeQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await scopeApi.getScopes(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch scopes');
    }
  }
);

export const fetchScopeById = createAsyncThunk(
  'scopes/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await scopeApi.getScopeById(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch scope');
    }
  }
);

export const createScope = createAsyncThunk(
  'scopes/create',
  async (data: CreateScopeData, { rejectWithValue }) => {
    try {
      const response = await scopeApi.createScope(data);
      toast.success('Scope created successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create scope';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateScope = createAsyncThunk(
  'scopes/update',
  async ({ id, data }: { id: string; data: UpdateScopeData }, { rejectWithValue }) => {
    try {
      const response = await scopeApi.updateScope(id, data);
      toast.success('Scope updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update scope';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteScope = createAsyncThunk(
  'scopes/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await scopeApi.deleteScope(id);
      toast.success('Scope deleted successfully!');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete scope';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const toggleScopeStatus = createAsyncThunk(
  'scopes/toggleStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await scopeApi.toggleScopeStatus(id);
      toast.success('Scope status updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to toggle scope status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Slice
const scopeSlice = createSlice({
  name: 'scopes',
  initialState,
  reducers: {
    clearCurrentScope: (state) => {
      state.currentScope = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all scopes
      .addCase(fetchScopes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchScopes.fulfilled, (state, action) => {
        state.loading = false;
        state.scopes = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.totalPages;
      })
      .addCase(fetchScopes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch scope by ID
      .addCase(fetchScopeById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchScopeById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentScope = action.payload;
      })
      .addCase(fetchScopeById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create scope
      .addCase(createScope.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createScope.fulfilled, (state, action) => {
        state.loading = false;
        state.scopes.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createScope.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update scope
      .addCase(updateScope.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateScope.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.scopes.findIndex((s) => s._id === action.payload._id);
        if (index !== -1) {
          state.scopes[index] = action.payload;
        }
        if (state.currentScope?._id === action.payload._id) {
          state.currentScope = action.payload;
        }
      })
      .addCase(updateScope.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete scope
      .addCase(deleteScope.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteScope.fulfilled, (state, action) => {
        state.loading = false;
        state.scopes = state.scopes.filter((s) => s._id !== action.payload);
        state.total -= 1;
        if (state.currentScope?._id === action.payload) {
          state.currentScope = null;
        }
      })
      .addCase(deleteScope.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Toggle scope status
      .addCase(toggleScopeStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleScopeStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.scopes.findIndex((s) => s._id === action.payload._id);
        if (index !== -1) {
          state.scopes[index] = action.payload;
        }
        if (state.currentScope?._id === action.payload._id) {
          state.currentScope = action.payload;
        }
      })
      .addCase(toggleScopeStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentScope, clearError } = scopeSlice.actions;
export default scopeSlice.reducer;
