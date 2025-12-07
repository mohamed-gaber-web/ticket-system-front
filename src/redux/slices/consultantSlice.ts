import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import * as consultantApi from '../../api/consultantApi';
import type {
  Consultant,
  ConsultantQueryParams,
  ConsultantStats,
  CreateConsultantData,
  UpdateConsultantData,
} from '../../types/consultant.types';

interface ConsultantState {
  consultants: Consultant[];
  currentConsultant: Consultant | null;
  stats: ConsultantStats | null;
  loading: boolean;
  statsLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: ConsultantState = {
  consultants: [],
  currentConsultant: null,
  stats: null,
  loading: false,
  statsLoading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

export const fetchConsultants = createAsyncThunk(
  'consultant/fetchConsultants',
  async (params: ConsultantQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await consultantApi.getConsultants(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch consultants';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchConsultantStats = createAsyncThunk(
  'consultant/fetchConsultantStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await consultantApi.getConsultantStats();
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch consultant statistics';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchConsultantById = createAsyncThunk(
  'consultant/fetchConsultantById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await consultantApi.getConsultantById(id);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch consultant details';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const createConsultant = createAsyncThunk(
  'consultant/createConsultant',
  async (data: CreateConsultantData, { rejectWithValue }) => {
    try {
      const response = await consultantApi.createConsultant(data);
      toast.success('Consultant created successfully');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create consultant';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateConsultant = createAsyncThunk(
  'consultant/updateConsultant',
  async ({ id, data }: { id: string; data: UpdateConsultantData }, { rejectWithValue }) => {
    try {
      const response = await consultantApi.updateConsultant(id, data);
      toast.success('Consultant updated successfully');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update consultant';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteConsultant = createAsyncThunk(
  'consultant/deleteConsultant',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await consultantApi.deleteConsultant(id);
      toast.success(response.message || 'Consultant deleted successfully');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete consultant';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const consultantSlice = createSlice({
  name: 'consultant',
  initialState,
  reducers: {
    clearCurrentConsultant: (state) => {
      state.currentConsultant = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Consultants
      .addCase(fetchConsultants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConsultants.fulfilled, (state, action) => {
        state.loading = false;
        state.consultants = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchConsultants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch Consultant Stats
      .addCase(fetchConsultantStats.pending, (state) => {
        state.statsLoading = true;
        state.error = null;
      })
      .addCase(fetchConsultantStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.stats = action.payload.data;
      })
      .addCase(fetchConsultantStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.error = action.payload as string;
      })

      // Fetch Consultant By ID
      .addCase(fetchConsultantById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConsultantById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentConsultant = action.payload.data;
      })
      .addCase(fetchConsultantById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Create Consultant
      .addCase(createConsultant.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createConsultant.fulfilled, (state, action) => {
        state.loading = false;
        state.consultants.unshift(action.payload.data);
        state.total += 1;
      })
      .addCase(createConsultant.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Update Consultant
      .addCase(updateConsultant.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateConsultant.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.consultants.findIndex((c) => c._id === action.payload.data._id);
        if (index !== -1) {
          state.consultants[index] = action.payload.data;
        }
        state.currentConsultant = action.payload.data;
      })
      .addCase(updateConsultant.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Delete Consultant
      .addCase(deleteConsultant.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteConsultant.fulfilled, (state, action) => {
        state.loading = false;
        state.consultants = state.consultants.filter((c) => c._id !== action.payload);
        state.total -= 1;
      })
      .addCase(deleteConsultant.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentConsultant, clearError } = consultantSlice.actions;
export default consultantSlice.reducer;
