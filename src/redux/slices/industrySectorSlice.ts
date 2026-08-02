import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type {
  IndustrySector,
  CreateIndustrySectorData,
  UpdateIndustrySectorData,
  IndustrySectorQueryParams,
} from '@/types/industrySector.types';
import * as industrySectorApi from '@/api/industrySectorApi';
import { toast } from 'sonner';

interface IndustrySectorState {
  industrySectors: IndustrySector[];
  currentIndustrySector: IndustrySector | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: IndustrySectorState = {
  industrySectors: [],
  currentIndustrySector: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

export const fetchIndustrySectors = createAsyncThunk(
  'industrySectors/fetchAll',
  async (params: IndustrySectorQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await industrySectorApi.getIndustrySectors(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch industry sectors'
      );
    }
  }
);

export const fetchIndustrySectorById = createAsyncThunk(
  'industrySectors/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await industrySectorApi.getIndustrySectorById(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch industry sector'
      );
    }
  }
);

export const createIndustrySector = createAsyncThunk(
  'industrySectors/create',
  async (data: CreateIndustrySectorData, { rejectWithValue }) => {
    try {
      const response = await industrySectorApi.createIndustrySector(data);
      toast.success('Industry sector created successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create industry sector';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateIndustrySector = createAsyncThunk(
  'industrySectors/update',
  async ({ id, data }: { id: string; data: UpdateIndustrySectorData }, { rejectWithValue }) => {
    try {
      const response = await industrySectorApi.updateIndustrySector(id, data);
      toast.success('Industry sector updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update industry sector';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteIndustrySector = createAsyncThunk(
  'industrySectors/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await industrySectorApi.deleteIndustrySector(id);
      toast.success('Industry sector deleted successfully!');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete industry sector';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const toggleIndustrySectorStatus = createAsyncThunk(
  'industrySectors/toggleStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await industrySectorApi.toggleIndustrySectorStatus(id);
      toast.success('Industry sector status updated successfully!');
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Failed to toggle industry sector status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const industrySectorSlice = createSlice({
  name: 'industrySectors',
  initialState,
  reducers: {
    clearCurrentIndustrySector: (state) => {
      state.currentIndustrySector = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all
      .addCase(fetchIndustrySectors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIndustrySectors.fulfilled, (state, action) => {
        state.loading = false;
        state.industrySectors = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchIndustrySectors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch by ID
      .addCase(fetchIndustrySectorById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIndustrySectorById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentIndustrySector = action.payload;
      })
      .addCase(fetchIndustrySectorById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create
      .addCase(createIndustrySector.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createIndustrySector.fulfilled, (state, action) => {
        state.loading = false;
        state.industrySectors.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createIndustrySector.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update
      .addCase(updateIndustrySector.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateIndustrySector.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.industrySectors.findIndex((s) => s._id === action.payload._id);
        if (index !== -1) {
          state.industrySectors[index] = action.payload;
        }
        if (state.currentIndustrySector?._id === action.payload._id) {
          state.currentIndustrySector = action.payload;
        }
      })
      .addCase(updateIndustrySector.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete
      .addCase(deleteIndustrySector.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteIndustrySector.fulfilled, (state, action) => {
        state.loading = false;
        state.industrySectors = state.industrySectors.filter((s) => s._id !== action.payload);
        state.total -= 1;
        if (state.currentIndustrySector?._id === action.payload) {
          state.currentIndustrySector = null;
        }
      })
      .addCase(deleteIndustrySector.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Toggle status
      .addCase(toggleIndustrySectorStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleIndustrySectorStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.industrySectors.findIndex((s) => s._id === action.payload._id);
        if (index !== -1) {
          state.industrySectors[index] = action.payload;
        }
        if (state.currentIndustrySector?._id === action.payload._id) {
          state.currentIndustrySector = action.payload;
        }
      })
      .addCase(toggleIndustrySectorStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentIndustrySector, clearError } = industrySectorSlice.actions;
export default industrySectorSlice.reducer;
