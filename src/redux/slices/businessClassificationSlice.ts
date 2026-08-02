import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type {
  BusinessClassification,
  CreateBusinessClassificationData,
  UpdateBusinessClassificationData,
  BusinessClassificationQueryParams,
} from '@/types/businessClassification.types';
import * as businessClassificationApi from '@/api/businessClassificationApi';
import { toast } from 'sonner';

interface BusinessClassificationState {
  businessClassifications: BusinessClassification[];
  currentBusinessClassification: BusinessClassification | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: BusinessClassificationState = {
  businessClassifications: [],
  currentBusinessClassification: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

export const fetchBusinessClassifications = createAsyncThunk(
  'businessClassifications/fetchAll',
  async (params: BusinessClassificationQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await businessClassificationApi.getBusinessClassifications(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch business classifications'
      );
    }
  }
);

export const fetchBusinessClassificationById = createAsyncThunk(
  'businessClassifications/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await businessClassificationApi.getBusinessClassificationById(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch business classification'
      );
    }
  }
);

export const createBusinessClassification = createAsyncThunk(
  'businessClassifications/create',
  async (data: CreateBusinessClassificationData, { rejectWithValue }) => {
    try {
      const response = await businessClassificationApi.createBusinessClassification(data);
      toast.success('Business classification created successfully!');
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Failed to create business classification';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateBusinessClassification = createAsyncThunk(
  'businessClassifications/update',
  async (
    { id, data }: { id: string; data: UpdateBusinessClassificationData },
    { rejectWithValue }
  ) => {
    try {
      const response = await businessClassificationApi.updateBusinessClassification(id, data);
      toast.success('Business classification updated successfully!');
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Failed to update business classification';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteBusinessClassification = createAsyncThunk(
  'businessClassifications/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await businessClassificationApi.deleteBusinessClassification(id);
      toast.success('Business classification deleted successfully!');
      return id;
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Failed to delete business classification';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const toggleBusinessClassificationStatus = createAsyncThunk(
  'businessClassifications/toggleStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await businessClassificationApi.toggleBusinessClassificationStatus(id);
      toast.success('Business classification status updated successfully!');
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Failed to toggle business classification status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const businessClassificationSlice = createSlice({
  name: 'businessClassifications',
  initialState,
  reducers: {
    clearCurrentBusinessClassification: (state) => {
      state.currentBusinessClassification = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBusinessClassifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBusinessClassifications.fulfilled, (state, action) => {
        state.loading = false;
        state.businessClassifications = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchBusinessClassifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchBusinessClassificationById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBusinessClassificationById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBusinessClassification = action.payload;
      })
      .addCase(fetchBusinessClassificationById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createBusinessClassification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBusinessClassification.fulfilled, (state, action) => {
        state.loading = false;
        state.businessClassifications.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createBusinessClassification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateBusinessClassification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBusinessClassification.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.businessClassifications.findIndex(
          (c) => c._id === action.payload._id
        );
        if (index !== -1) {
          state.businessClassifications[index] = action.payload;
        }
        if (state.currentBusinessClassification?._id === action.payload._id) {
          state.currentBusinessClassification = action.payload;
        }
      })
      .addCase(updateBusinessClassification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteBusinessClassification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteBusinessClassification.fulfilled, (state, action) => {
        state.loading = false;
        state.businessClassifications = state.businessClassifications.filter(
          (c) => c._id !== action.payload
        );
        state.total -= 1;
        if (state.currentBusinessClassification?._id === action.payload) {
          state.currentBusinessClassification = null;
        }
      })
      .addCase(deleteBusinessClassification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(toggleBusinessClassificationStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleBusinessClassificationStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.businessClassifications.findIndex(
          (c) => c._id === action.payload._id
        );
        if (index !== -1) {
          state.businessClassifications[index] = action.payload;
        }
        if (state.currentBusinessClassification?._id === action.payload._id) {
          state.currentBusinessClassification = action.payload;
        }
      })
      .addCase(toggleBusinessClassificationStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentBusinessClassification, clearError } =
  businessClassificationSlice.actions;
export default businessClassificationSlice.reducer;
