import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { departmentApi } from '../../api/departmentApi';
import type {
  Department,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentQueryParams,
} from '../../types/department.types';
import { toast } from 'sonner';

interface DepartmentState {
  departments: Department[];
  currentDepartment: Department | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
}

const initialState: DepartmentState = {
  departments: [],
  currentDepartment: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  totalPages: 0,
};

export const fetchDepartments = createAsyncThunk(
  'department/fetchAll',
  async (params: DepartmentQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await departmentApi.getAll(params);
      console.log('fetchDepartments response:', response);
      return response;
    } catch (error: any) {
      console.error('fetchDepartments error:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch departments');
    }
  }
);

export const fetchDepartmentById = createAsyncThunk(
  'department/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await departmentApi.getById(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch department');
    }
  }
);

export const createDepartment = createAsyncThunk(
  'department/create',
  async (data: CreateDepartmentDto, { rejectWithValue }) => {
    try {
      const response = await departmentApi.create(data);
      toast.success('Department created successfully');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create department';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateDepartment = createAsyncThunk(
  'department/update',
  async ({ id, data }: { id: string; data: UpdateDepartmentDto }, { rejectWithValue }) => {
    try {
      const response = await departmentApi.update(id, data);
      toast.success('Department updated successfully');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update department';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteDepartment = createAsyncThunk(
  'department/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await departmentApi.delete(id);
      toast.success('Department deleted successfully');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete department';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const toggleDepartmentStatus = createAsyncThunk(
  'department/toggleStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await departmentApi.toggleStatus(id);
      toast.success('Department status updated successfully');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to toggle department status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const departmentSlice = createSlice({
  name: 'department',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentDepartment: (state) => {
      state.currentDepartment = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDepartments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDepartments.fulfilled, (state, action) => {
        state.loading = false;
        console.log('fetchDepartments.fulfilled payload:', action.payload);

        const payload: any = action.payload;

        // Handle different response structures
        if (Array.isArray(payload)) {
          state.departments = payload;
          state.total = payload.length;
          state.page = 1;
          state.totalPages = 1;
        } else if (payload.departments) {
          state.departments = payload.departments;
          state.total = payload.total || payload.departments.length;
          state.page = payload.page || 1;
          state.totalPages = payload.totalPages || 1;
        } else if (payload.data) {
          if (Array.isArray(payload.data)) {
            state.departments = payload.data;
            state.total = payload.total || payload.data.length;
            state.page = payload.page || 1;
            state.totalPages = payload.totalPages || 1;
          } else {
            state.departments = payload.data.departments || [];
            state.total = payload.data.total || 0;
            state.page = payload.data.page || 1;
            state.totalPages = payload.data.totalPages || 1;
          }
        } else {
          console.error('Unexpected response structure:', payload);
          state.departments = [];
        }
      })
      .addCase(fetchDepartments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchDepartmentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDepartmentById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDepartment = action.payload;
      })
      .addCase(fetchDepartmentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createDepartment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDepartment.fulfilled, (state, action) => {
        state.loading = false;
        state.departments.unshift(action.payload);
      })
      .addCase(createDepartment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateDepartment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateDepartment.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.departments.findIndex((dept) => dept._id === action.payload._id);
        if (index !== -1) {
          state.departments[index] = action.payload;
        }
        if (state.currentDepartment?._id === action.payload._id) {
          state.currentDepartment = action.payload;
        }
      })
      .addCase(updateDepartment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteDepartment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDepartment.fulfilled, (state, action) => {
        state.loading = false;
        state.departments = state.departments.filter((dept) => dept._id !== action.payload);
      })
      .addCase(deleteDepartment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(toggleDepartmentStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleDepartmentStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.departments.findIndex((dept) => dept._id === action.payload._id);
        if (index !== -1) {
          state.departments[index] = action.payload;
        }
      })
      .addCase(toggleDepartmentStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCurrentDepartment } = departmentSlice.actions;
export default departmentSlice.reducer;
