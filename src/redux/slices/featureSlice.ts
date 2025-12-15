import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type {
  Feature,
  CreateFeatureData,
  UpdateFeatureData,
  FeatureQueryParams,
} from '@/types/feature.types';
import * as featureApi from '@/api/featureApi';
import { toast } from 'sonner';

interface FeatureState {
  features: Feature[];
  currentFeature: Feature | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: FeatureState = {
  features: [],
  currentFeature: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

// Async thunks
export const fetchFeatures = createAsyncThunk(
  'features/fetchAll',
  async (params: FeatureQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await featureApi.getFeatures(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch features');
    }
  }
);

export const fetchFeatureById = createAsyncThunk(
  'features/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await featureApi.getFeatureById(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch feature');
    }
  }
);

export const createFeature = createAsyncThunk(
  'features/create',
  async (data: CreateFeatureData, { rejectWithValue }) => {
    try {
      const response = await featureApi.createFeature(data);
      toast.success('Feature created successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create feature';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateFeature = createAsyncThunk(
  'features/update',
  async ({ id, data }: { id: string; data: UpdateFeatureData }, { rejectWithValue }) => {
    try {
      const response = await featureApi.updateFeature(id, data);
      toast.success('Feature updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update feature';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteFeature = createAsyncThunk(
  'features/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await featureApi.deleteFeature(id);
      toast.success('Feature deleted successfully!');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete feature';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const toggleFeatureStatus = createAsyncThunk(
  'features/toggleStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await featureApi.toggleFeatureStatus(id);
      toast.success('Feature status updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to toggle feature status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Slice
const featureSlice = createSlice({
  name: 'features',
  initialState,
  reducers: {
    clearCurrentFeature: (state) => {
      state.currentFeature = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all features
      .addCase(fetchFeatures.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeatures.fulfilled, (state, action) => {
        state.loading = false;
        state.features = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.totalPages;
      })
      .addCase(fetchFeatures.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch feature by ID
      .addCase(fetchFeatureById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeatureById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentFeature = action.payload;
      })
      .addCase(fetchFeatureById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create feature
      .addCase(createFeature.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createFeature.fulfilled, (state, action) => {
        state.loading = false;
        state.features.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createFeature.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update feature
      .addCase(updateFeature.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateFeature.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.features.findIndex((feat) => feat._id === action.payload._id);
        if (index !== -1) {
          state.features[index] = action.payload;
        }
        if (state.currentFeature?._id === action.payload._id) {
          state.currentFeature = action.payload;
        }
      })
      .addCase(updateFeature.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete feature
      .addCase(deleteFeature.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteFeature.fulfilled, (state, action) => {
        state.loading = false;
        state.features = state.features.filter((feat) => feat._id !== action.payload);
        state.total -= 1;
        if (state.currentFeature?._id === action.payload) {
          state.currentFeature = null;
        }
      })
      .addCase(deleteFeature.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Toggle feature status
      .addCase(toggleFeatureStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleFeatureStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.features.findIndex((feat) => feat._id === action.payload._id);
        if (index !== -1) {
          state.features[index] = action.payload;
        }
        if (state.currentFeature?._id === action.payload._id) {
          state.currentFeature = action.payload;
        }
      })
      .addCase(toggleFeatureStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentFeature, clearError } = featureSlice.actions;
export default featureSlice.reducer;
