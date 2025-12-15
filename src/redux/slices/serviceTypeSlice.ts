import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { serviceTypeApi } from '../../api/serviceTypeApi';
import type {
  ServiceType,
  CreateServiceTypeDto,
  UpdateServiceTypeDto,
  ServiceTypeQueryParams,
} from '../../types/serviceType.types';
import { toast } from 'sonner';

interface ServiceTypeState {
  serviceTypes: ServiceType[];
  currentServiceType: ServiceType | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
}

const initialState: ServiceTypeState = {
  serviceTypes: [],
  currentServiceType: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  totalPages: 0,
};

export const fetchServiceTypes = createAsyncThunk(
  'serviceType/fetchAll',
  async (params: ServiceTypeQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await serviceTypeApi.getAll(params);
      console.log('fetchServiceTypes response:', response);
      return response;
    } catch (error: any) {
      console.error('fetchServiceTypes error:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch service types');
    }
  }
);

export const fetchServiceTypeById = createAsyncThunk(
  'serviceType/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await serviceTypeApi.getById(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch service type');
    }
  }
);

export const createServiceType = createAsyncThunk(
  'serviceType/create',
  async (data: CreateServiceTypeDto, { rejectWithValue }) => {
    try {
      const response = await serviceTypeApi.create(data);
      toast.success('Service type created successfully');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create service type';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateServiceType = createAsyncThunk(
  'serviceType/update',
  async ({ id, data }: { id: string; data: UpdateServiceTypeDto }, { rejectWithValue }) => {
    try {
      const response = await serviceTypeApi.update(id, data);
      toast.success('Service type updated successfully');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update service type';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteServiceType = createAsyncThunk(
  'serviceType/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await serviceTypeApi.delete(id);
      toast.success('Service type deleted successfully');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete service type';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const toggleServiceTypeStatus = createAsyncThunk(
  'serviceType/toggleStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await serviceTypeApi.toggleStatus(id);
      toast.success('Service type status updated successfully');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to toggle service type status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const serviceTypeSlice = createSlice({
  name: 'serviceType',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentServiceType: (state) => {
      state.currentServiceType = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchServiceTypes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchServiceTypes.fulfilled, (state, action) => {
        state.loading = false;
        console.log('fetchServiceTypes.fulfilled payload:', action.payload);

        const payload: any = action.payload;

        // Handle different response structures
        if (Array.isArray(payload)) {
          // If payload is directly an array
          state.serviceTypes = payload;
          state.total = payload.length;
          state.page = 1;
          state.totalPages = 1;
        } else if (payload.serviceTypes) {
          // If payload has serviceTypes property
          state.serviceTypes = payload.serviceTypes;
          state.total = payload.total || payload.serviceTypes.length;
          state.page = payload.page || 1;
          state.totalPages = payload.totalPages || 1;
        } else if (payload.data) {
          // If payload has data property (common backend pattern)
          if (Array.isArray(payload.data)) {
            state.serviceTypes = payload.data;
            state.total = payload.total || payload.data.length;
            state.page = payload.page || 1;
            state.totalPages = payload.totalPages || 1;
          } else {
            state.serviceTypes = payload.data.serviceTypes || [];
            state.total = payload.data.total || 0;
            state.page = payload.data.page || 1;
            state.totalPages = payload.data.totalPages || 1;
          }
        } else {
          console.error('Unexpected response structure:', payload);
          state.serviceTypes = [];
        }
      })
      .addCase(fetchServiceTypes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchServiceTypeById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchServiceTypeById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentServiceType = action.payload;
      })
      .addCase(fetchServiceTypeById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createServiceType.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createServiceType.fulfilled, (state, action) => {
        state.loading = false;
        state.serviceTypes.unshift(action.payload);
      })
      .addCase(createServiceType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateServiceType.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateServiceType.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.serviceTypes.findIndex((st) => st._id === action.payload._id);
        if (index !== -1) {
          state.serviceTypes[index] = action.payload;
        }
        if (state.currentServiceType?._id === action.payload._id) {
          state.currentServiceType = action.payload;
        }
      })
      .addCase(updateServiceType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteServiceType.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteServiceType.fulfilled, (state, action) => {
        state.loading = false;
        state.serviceTypes = state.serviceTypes.filter((st) => st._id !== action.payload);
      })
      .addCase(deleteServiceType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(toggleServiceTypeStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleServiceTypeStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.serviceTypes.findIndex((st) => st._id === action.payload._id);
        if (index !== -1) {
          state.serviceTypes[index] = action.payload;
        }
      })
      .addCase(toggleServiceTypeStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCurrentServiceType } = serviceTypeSlice.actions;
export default serviceTypeSlice.reducer;
