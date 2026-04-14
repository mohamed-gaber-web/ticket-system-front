import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type {
  Module,
  CreateModuleData,
  UpdateModuleData,
  ModuleQueryParams,
} from '@/types/module.types';
import * as moduleApi from '@/api/moduleApi';
import { toast } from 'sonner';

interface ModuleState {
  modules: Module[];
  currentModule: Module | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: ModuleState = {
  modules: [],
  currentModule: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

// Async thunks
export const fetchModules = createAsyncThunk(
  'modules/fetchAll',
  async (params: ModuleQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await moduleApi.getModules(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch modules');
    }
  }
);

export const fetchModuleById = createAsyncThunk(
  'modules/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await moduleApi.getModuleById(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch module');
    }
  }
);

export const createModule = createAsyncThunk(
  'modules/create',
  async (data: CreateModuleData, { rejectWithValue }) => {
    try {
      const response = await moduleApi.createModule(data);
      toast.success('Module created successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create module';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateModule = createAsyncThunk(
  'modules/update',
  async ({ id, data }: { id: string; data: UpdateModuleData }, { rejectWithValue }) => {
    try {
      const response = await moduleApi.updateModule(id, data);
      toast.success('Module updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update module';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteModule = createAsyncThunk(
  'modules/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await moduleApi.deleteModule(id);
      toast.success('Module deleted successfully!');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete module';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const toggleModuleStatus = createAsyncThunk(
  'modules/toggleStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await moduleApi.toggleModuleStatus(id);
      toast.success('Module status updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to toggle module status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Slice
const moduleSlice = createSlice({
  name: 'modules',
  initialState,
  reducers: {
    clearCurrentModule: (state) => {
      state.currentModule = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all modules
      .addCase(fetchModules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchModules.fulfilled, (state, action) => {
        state.loading = false;
        state.modules = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.totalPages;
      })
      .addCase(fetchModules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch module by ID
      .addCase(fetchModuleById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchModuleById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentModule = action.payload;
      })
      .addCase(fetchModuleById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create module
      .addCase(createModule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createModule.fulfilled, (state, action) => {
        state.loading = false;
        state.modules.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createModule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update module
      .addCase(updateModule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateModule.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.modules.findIndex((s) => s._id === action.payload._id);
        if (index !== -1) {
          state.modules[index] = action.payload;
        }
        if (state.currentModule?._id === action.payload._id) {
          state.currentModule = action.payload;
        }
      })
      .addCase(updateModule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete module
      .addCase(deleteModule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteModule.fulfilled, (state, action) => {
        state.loading = false;
        state.modules = state.modules.filter((s) => s._id !== action.payload);
        state.total -= 1;
        if (state.currentModule?._id === action.payload) {
          state.currentModule = null;
        }
      })
      .addCase(deleteModule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Toggle module status
      .addCase(toggleModuleStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleModuleStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.modules.findIndex((s) => s._id === action.payload._id);
        if (index !== -1) {
          state.modules[index] = action.payload;
        }
        if (state.currentModule?._id === action.payload._id) {
          state.currentModule = action.payload;
        }
      })
      .addCase(toggleModuleStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentModule, clearError } = moduleSlice.actions;
export default moduleSlice.reducer;
