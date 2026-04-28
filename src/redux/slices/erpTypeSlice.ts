import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { erpTypeApi } from '../../api/erpTypeApi';
import type {
  ErpType,
  CreateErpTypeDto,
  UpdateErpTypeDto,
  ErpTypeQueryParams,
} from '../../types/erpType.types';
import { toast } from 'sonner';

interface ErpTypeState {
  erpTypes: ErpType[];
  currentErpType: ErpType | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: ErpTypeState = {
  erpTypes: [],
  currentErpType: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 0,
};

export const fetchErpTypes = createAsyncThunk(
  'erpType/fetchAll',
  async (params: ErpTypeQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await erpTypeApi.getAll(params);
      console.log('fetchErpTypes response:', response);
      return response;
    } catch (error: any) {
      console.error('fetchErpTypes error:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch ERP types');
    }
  }
);

export const fetchErpTypeById = createAsyncThunk(
  'erpType/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await erpTypeApi.getById(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch ERP type');
    }
  }
);

export const createErpType = createAsyncThunk(
  'erpType/create',
  async (data: CreateErpTypeDto, { rejectWithValue }) => {
    try {
      const response = await erpTypeApi.create(data);
      toast.success('ERP type created successfully');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create ERP type';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateErpType = createAsyncThunk(
  'erpType/update',
  async ({ id, data }: { id: string; data: UpdateErpTypeDto }, { rejectWithValue }) => {
    try {
      const response = await erpTypeApi.update(id, data);
      toast.success('ERP type updated successfully');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update ERP type';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteErpType = createAsyncThunk(
  'erpType/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await erpTypeApi.delete(id);
      toast.success('ERP type deleted successfully');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete ERP type';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const toggleErpTypeStatus = createAsyncThunk(
  'erpType/toggleStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await erpTypeApi.toggleStatus(id);
      toast.success('ERP type status updated successfully');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to toggle ERP type status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const erpTypeSlice = createSlice({
  name: 'erpType',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentErpType: (state) => {
      state.currentErpType = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchErpTypes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchErpTypes.fulfilled, (state, action) => {
        state.loading = false;
        console.log('fetchErpTypes.fulfilled payload:', action.payload);

        const payload: any = action.payload;

        // Handle different response structures
        if (Array.isArray(payload)) {
          state.erpTypes = payload;
          state.total = payload.length;
          state.page = 1;
          state.pages = 1;
        } else if (payload.erpTypes) {
          state.erpTypes = payload.erpTypes;
          state.total = payload.total || payload.erpTypes.length;
          state.page = payload.page || 1;
          state.pages = payload.totalPages || 1;
        } else if (payload.data) {
          if (Array.isArray(payload.data)) {
            state.erpTypes = payload.data;
            state.total = payload.total || payload.data.length;
            state.page = payload.page || 1;
            state.pages = payload.totalPages || 1;
          } else {
            state.erpTypes = payload.data.erpTypes || [];
            state.total = payload.data.total || 0;
            state.page = payload.data.page || 1;
            state.pages = payload.data.totalPages || 1;
          }
        } else {
          console.error('Unexpected response structure:', payload);
          state.erpTypes = [];
        }
      })
      .addCase(fetchErpTypes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchErpTypeById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchErpTypeById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentErpType = action.payload;
      })
      .addCase(fetchErpTypeById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createErpType.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createErpType.fulfilled, (state, action) => {
        state.loading = false;
        state.erpTypes.unshift(action.payload);
      })
      .addCase(createErpType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateErpType.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateErpType.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.erpTypes.findIndex((et) => et._id === action.payload._id);
        if (index !== -1) {
          state.erpTypes[index] = action.payload;
        }
        if (state.currentErpType?._id === action.payload._id) {
          state.currentErpType = action.payload;
        }
      })
      .addCase(updateErpType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteErpType.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteErpType.fulfilled, (state, action) => {
        state.loading = false;
        state.erpTypes = state.erpTypes.filter((et) => et._id !== action.payload);
      })
      .addCase(deleteErpType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(toggleErpTypeStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleErpTypeStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.erpTypes.findIndex((et) => et._id === action.payload._id);
        if (index !== -1) {
          state.erpTypes[index] = action.payload;
        }
      })
      .addCase(toggleErpTypeStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCurrentErpType } = erpTypeSlice.actions;
export default erpTypeSlice.reducer;
