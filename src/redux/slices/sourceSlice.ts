import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type {
  Source,
  CreateSourceData,
  UpdateSourceData,
  SourceQueryParams,
} from '@/types/source.types';
import * as sourceApi from '@/api/sourceApi';
import { toast } from 'sonner';

interface SourceState {
  sources: Source[];
  currentSource: Source | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: SourceState = {
  sources: [],
  currentSource: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

export const fetchSources = createAsyncThunk(
  'sources/fetchAll',
  async (params: SourceQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await sourceApi.getSources(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch sources');
    }
  }
);

export const fetchSourceById = createAsyncThunk(
  'sources/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await sourceApi.getSourceById(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch source');
    }
  }
);

export const createSource = createAsyncThunk(
  'sources/create',
  async (data: CreateSourceData, { rejectWithValue }) => {
    try {
      const response = await sourceApi.createSource(data);
      toast.success('Source created successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create source';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateSource = createAsyncThunk(
  'sources/update',
  async ({ id, data }: { id: string; data: UpdateSourceData }, { rejectWithValue }) => {
    try {
      const response = await sourceApi.updateSource(id, data);
      toast.success('Source updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update source';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteSource = createAsyncThunk(
  'sources/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await sourceApi.deleteSource(id);
      toast.success('Source deleted successfully!');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete source';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const toggleSourceStatus = createAsyncThunk(
  'sources/toggleStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await sourceApi.toggleSourceStatus(id);
      toast.success('Source status updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to toggle source status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const sourceSlice = createSlice({
  name: 'sources',
  initialState,
  reducers: {
    clearCurrentSource: (state) => {
      state.currentSource = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all sources
      .addCase(fetchSources.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSources.fulfilled, (state, action) => {
        state.loading = false;
        state.sources = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchSources.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch source by ID
      .addCase(fetchSourceById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSourceById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSource = action.payload;
      })
      .addCase(fetchSourceById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create source
      .addCase(createSource.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSource.fulfilled, (state, action) => {
        state.loading = false;
        state.sources.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createSource.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update source
      .addCase(updateSource.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSource.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.sources.findIndex((s) => s._id === action.payload._id);
        if (index !== -1) {
          state.sources[index] = action.payload;
        }
        if (state.currentSource?._id === action.payload._id) {
          state.currentSource = action.payload;
        }
      })
      .addCase(updateSource.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete source
      .addCase(deleteSource.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSource.fulfilled, (state, action) => {
        state.loading = false;
        state.sources = state.sources.filter((s) => s._id !== action.payload);
        state.total -= 1;
        if (state.currentSource?._id === action.payload) {
          state.currentSource = null;
        }
      })
      .addCase(deleteSource.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Toggle source status
      .addCase(toggleSourceStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleSourceStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.sources.findIndex((s) => s._id === action.payload._id);
        if (index !== -1) {
          state.sources[index] = action.payload;
        }
        if (state.currentSource?._id === action.payload._id) {
          state.currentSource = action.payload;
        }
      })
      .addCase(toggleSourceStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentSource, clearError } = sourceSlice.actions;
export default sourceSlice.reducer;
