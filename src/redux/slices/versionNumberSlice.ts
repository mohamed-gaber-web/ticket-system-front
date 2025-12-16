import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { versionNumberApi } from '../../api/versionNumberApi';
import type {
  VersionNumber,
  CreateVersionNumberDto,
  UpdateVersionNumberDto,
  VersionNumberQueryParams,
} from '../../types/versionNumber.types';
import { toast } from 'sonner';

interface VersionNumberState {
  versionNumbers: VersionNumber[];
  currentVersionNumber: VersionNumber | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
}

const initialState: VersionNumberState = {
  versionNumbers: [],
  currentVersionNumber: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  totalPages: 0,
};

export const fetchVersionNumbers = createAsyncThunk(
  'versionNumber/fetchAll',
  async (params: VersionNumberQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await versionNumberApi.getAll(params);
      console.log('fetchVersionNumbers response:', response);
      return response;
    } catch (error: any) {
      console.error('fetchVersionNumbers error:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch version numbers');
    }
  }
);

export const fetchVersionNumberById = createAsyncThunk(
  'versionNumber/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await versionNumberApi.getById(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch version number');
    }
  }
);

export const createVersionNumber = createAsyncThunk(
  'versionNumber/create',
  async (data: CreateVersionNumberDto, { rejectWithValue }) => {
    try {
      const response = await versionNumberApi.create(data);
      toast.success('Version number created successfully');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create version number';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateVersionNumber = createAsyncThunk(
  'versionNumber/update',
  async ({ id, data }: { id: string; data: UpdateVersionNumberDto }, { rejectWithValue }) => {
    try {
      const response = await versionNumberApi.update(id, data);
      toast.success('Version number updated successfully');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update version number';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteVersionNumber = createAsyncThunk(
  'versionNumber/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await versionNumberApi.delete(id);
      toast.success('Version number deleted successfully');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete version number';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const toggleVersionNumberStatus = createAsyncThunk(
  'versionNumber/toggleStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await versionNumberApi.toggleStatus(id);
      toast.success('Version number status updated successfully');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to toggle version number status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const versionNumberSlice = createSlice({
  name: 'versionNumber',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentVersionNumber: (state) => {
      state.currentVersionNumber = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVersionNumbers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVersionNumbers.fulfilled, (state, action) => {
        state.loading = false;
        console.log('fetchVersionNumbers.fulfilled payload:', action.payload);

        const payload: any = action.payload;

        // Handle different response structures
        if (Array.isArray(payload)) {
          state.versionNumbers = payload;
          state.total = payload.length;
          state.page = 1;
          state.totalPages = 1;
        } else if (payload.data) {
          if (Array.isArray(payload.data)) {
            state.versionNumbers = payload.data;
            state.total = payload.total || payload.data.length;
            state.page = payload.page || 1;
            state.totalPages = payload.totalPages || 1;
          } else {
            state.versionNumbers = payload.data.versionNumbers || [];
            state.total = payload.data.total || 0;
            state.page = payload.data.page || 1;
            state.totalPages = payload.data.totalPages || 1;
          }
        } else {
          console.error('Unexpected response structure:', payload);
          state.versionNumbers = [];
        }
      })
      .addCase(fetchVersionNumbers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchVersionNumberById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVersionNumberById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentVersionNumber = action.payload;
      })
      .addCase(fetchVersionNumberById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createVersionNumber.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createVersionNumber.fulfilled, (state, action) => {
        state.loading = false;
        state.versionNumbers.unshift(action.payload);
      })
      .addCase(createVersionNumber.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateVersionNumber.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateVersionNumber.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.versionNumbers.findIndex((vn) => vn._id === action.payload._id);
        if (index !== -1) {
          state.versionNumbers[index] = action.payload;
        }
        if (state.currentVersionNumber?._id === action.payload._id) {
          state.currentVersionNumber = action.payload;
        }
      })
      .addCase(updateVersionNumber.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteVersionNumber.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteVersionNumber.fulfilled, (state, action) => {
        state.loading = false;
        state.versionNumbers = state.versionNumbers.filter((vn) => vn._id !== action.payload);
      })
      .addCase(deleteVersionNumber.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(toggleVersionNumberStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleVersionNumberStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.versionNumbers.findIndex((vn) => vn._id === action.payload._id);
        if (index !== -1) {
          state.versionNumbers[index] = action.payload;
        }
      })
      .addCase(toggleVersionNumberStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCurrentVersionNumber } = versionNumberSlice.actions;
export default versionNumberSlice.reducer;
