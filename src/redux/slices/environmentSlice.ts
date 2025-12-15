import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type {
  Environment,
  CreateEnvironmentData,
  UpdateEnvironmentData,
  EnvironmentQueryParams,
} from '@/types/environment.types';
import * as environmentApi from '@/api/environmentApi';
import { toast } from 'sonner';

interface EnvironmentState {
  environments: Environment[];
  currentEnvironment: Environment | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: EnvironmentState = {
  environments: [],
  currentEnvironment: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

// Async thunks
export const fetchEnvironments = createAsyncThunk(
  'environments/fetchAll',
  async (params: EnvironmentQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await environmentApi.getEnvironments(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch environments');
    }
  }
);

export const fetchEnvironmentById = createAsyncThunk(
  'environments/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await environmentApi.getEnvironmentById(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch environment');
    }
  }
);

export const createEnvironment = createAsyncThunk(
  'environments/create',
  async (data: CreateEnvironmentData, { rejectWithValue }) => {
    try {
      const response = await environmentApi.createEnvironment(data);
      toast.success('Environment created successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create environment';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateEnvironment = createAsyncThunk(
  'environments/update',
  async ({ id, data }: { id: string; data: UpdateEnvironmentData }, { rejectWithValue }) => {
    try {
      const response = await environmentApi.updateEnvironment(id, data);
      toast.success('Environment updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update environment';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteEnvironment = createAsyncThunk(
  'environments/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await environmentApi.deleteEnvironment(id);
      toast.success('Environment deleted successfully!');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete environment';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const toggleEnvironmentStatus = createAsyncThunk(
  'environments/toggleStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await environmentApi.toggleEnvironmentStatus(id);
      toast.success('Environment status updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to toggle environment status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Slice
const environmentSlice = createSlice({
  name: 'environments',
  initialState,
  reducers: {
    clearCurrentEnvironment: (state) => {
      state.currentEnvironment = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all environments
      .addCase(fetchEnvironments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEnvironments.fulfilled, (state, action) => {
        state.loading = false;
        state.environments = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchEnvironments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch environment by ID
      .addCase(fetchEnvironmentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEnvironmentById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentEnvironment = action.payload;
      })
      .addCase(fetchEnvironmentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create environment
      .addCase(createEnvironment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createEnvironment.fulfilled, (state, action) => {
        state.loading = false;
        state.environments.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createEnvironment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update environment
      .addCase(updateEnvironment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateEnvironment.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.environments.findIndex((env) => env._id === action.payload._id);
        if (index !== -1) {
          state.environments[index] = action.payload;
        }
        if (state.currentEnvironment?._id === action.payload._id) {
          state.currentEnvironment = action.payload;
        }
      })
      .addCase(updateEnvironment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete environment
      .addCase(deleteEnvironment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteEnvironment.fulfilled, (state, action) => {
        state.loading = false;
        state.environments = state.environments.filter((env) => env._id !== action.payload);
        state.total -= 1;
        if (state.currentEnvironment?._id === action.payload) {
          state.currentEnvironment = null;
        }
      })
      .addCase(deleteEnvironment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Toggle environment status
      .addCase(toggleEnvironmentStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleEnvironmentStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.environments.findIndex((env) => env._id === action.payload._id);
        if (index !== -1) {
          state.environments[index] = action.payload;
        }
        if (state.currentEnvironment?._id === action.payload._id) {
          state.currentEnvironment = action.payload;
        }
      })
      .addCase(toggleEnvironmentStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentEnvironment, clearError } = environmentSlice.actions;
export default environmentSlice.reducer;
