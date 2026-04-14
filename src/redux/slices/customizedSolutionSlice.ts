import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type {
  CustomizedSolution,
  CreateCustomizedSolutionData,
  UpdateCustomizedSolutionData,
  CustomizedSolutionQueryParams,
} from '@/types/customizedSolution.types';
import * as customizedSolutionApi from '@/api/customizedSolutionApi';
import { toast } from 'sonner';

interface CustomizedSolutionState {
  customizedSolutions: CustomizedSolution[];
  currentCustomizedSolution: CustomizedSolution | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: CustomizedSolutionState = {
  customizedSolutions: [],
  currentCustomizedSolution: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

// Async thunks
export const fetchCustomizedSolutions = createAsyncThunk(
  'customizedSolutions/fetchAll',
  async (params: CustomizedSolutionQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await customizedSolutionApi.getCustomizedSolutions(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch customized solutions');
    }
  }
);

export const fetchCustomizedSolutionById = createAsyncThunk(
  'customizedSolutions/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await customizedSolutionApi.getCustomizedSolutionById(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch customized solution');
    }
  }
);

export const createCustomizedSolution = createAsyncThunk(
  'customizedSolutions/create',
  async (data: CreateCustomizedSolutionData, { rejectWithValue }) => {
    try {
      const response = await customizedSolutionApi.createCustomizedSolution(data);
      toast.success('Customized solution created successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create customized solution';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateCustomizedSolution = createAsyncThunk(
  'customizedSolutions/update',
  async ({ id, data }: { id: string; data: UpdateCustomizedSolutionData }, { rejectWithValue }) => {
    try {
      const response = await customizedSolutionApi.updateCustomizedSolution(id, data);
      toast.success('Customized solution updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update customized solution';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteCustomizedSolution = createAsyncThunk(
  'customizedSolutions/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await customizedSolutionApi.deleteCustomizedSolution(id);
      toast.success('Customized solution deleted successfully!');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete customized solution';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const toggleCustomizedSolutionStatus = createAsyncThunk(
  'customizedSolutions/toggleStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await customizedSolutionApi.toggleCustomizedSolutionStatus(id);
      toast.success('Customized solution status updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to toggle customized solution status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Slice
const customizedSolutionSlice = createSlice({
  name: 'customizedSolutions',
  initialState,
  reducers: {
    clearCurrentCustomizedSolution: (state) => {
      state.currentCustomizedSolution = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all
      .addCase(fetchCustomizedSolutions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomizedSolutions.fulfilled, (state, action) => {
        state.loading = false;
        state.customizedSolutions = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.totalPages;
      })
      .addCase(fetchCustomizedSolutions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch by ID
      .addCase(fetchCustomizedSolutionById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomizedSolutionById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCustomizedSolution = action.payload;
      })
      .addCase(fetchCustomizedSolutionById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create
      .addCase(createCustomizedSolution.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCustomizedSolution.fulfilled, (state, action) => {
        state.loading = false;
        state.customizedSolutions.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createCustomizedSolution.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update
      .addCase(updateCustomizedSolution.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCustomizedSolution.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.customizedSolutions.findIndex((s) => s._id === action.payload._id);
        if (index !== -1) {
          state.customizedSolutions[index] = action.payload;
        }
        if (state.currentCustomizedSolution?._id === action.payload._id) {
          state.currentCustomizedSolution = action.payload;
        }
      })
      .addCase(updateCustomizedSolution.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete
      .addCase(deleteCustomizedSolution.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCustomizedSolution.fulfilled, (state, action) => {
        state.loading = false;
        state.customizedSolutions = state.customizedSolutions.filter((s) => s._id !== action.payload);
        state.total -= 1;
        if (state.currentCustomizedSolution?._id === action.payload) {
          state.currentCustomizedSolution = null;
        }
      })
      .addCase(deleteCustomizedSolution.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Toggle status
      .addCase(toggleCustomizedSolutionStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleCustomizedSolutionStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.customizedSolutions.findIndex((s) => s._id === action.payload._id);
        if (index !== -1) {
          state.customizedSolutions[index] = action.payload;
        }
        if (state.currentCustomizedSolution?._id === action.payload._id) {
          state.currentCustomizedSolution = action.payload;
        }
      })
      .addCase(toggleCustomizedSolutionStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentCustomizedSolution, clearError } = customizedSolutionSlice.actions;
export default customizedSolutionSlice.reducer;
