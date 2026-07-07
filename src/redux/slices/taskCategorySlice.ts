import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as taskCategoryApi from '@/api/taskCategoryApi';
import type {
  TaskCategory,
  CreateTaskCategoryData,
  UpdateTaskCategoryData,
  TaskCategoryQueryParams,
} from '@/types/taskCategory';
import { toast } from 'sonner';

interface TaskCategoryState {
  taskCategories: TaskCategory[];
  currentTaskCategory: TaskCategory | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: TaskCategoryState = {
  taskCategories: [],
  currentTaskCategory: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

// Async Thunks
export const fetchTaskCategories = createAsyncThunk(
  'taskCategories/fetchTaskCategories',
  async (params: TaskCategoryQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await taskCategoryApi.getTaskCategories(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch task categories';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchTaskCategoryById = createAsyncThunk(
  'taskCategories/fetchTaskCategoryById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await taskCategoryApi.getTaskCategoryById(id);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch task category';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const createTaskCategory = createAsyncThunk(
  'taskCategories/createTaskCategory',
  async (data: CreateTaskCategoryData, { rejectWithValue }) => {
    try {
      const response = await taskCategoryApi.createTaskCategory(data);
      toast.success('Task category created successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || 'Failed to create task category';
      const details = error.response?.data?.errors;
      if (details) {
        toast.error(`${message}: ${JSON.stringify(details)}`);
      } else {
        toast.error(message);
      }
      return rejectWithValue({ message, details });
    }
  }
);

export const updateTaskCategory = createAsyncThunk(
  'taskCategories/updateTaskCategory',
  async ({ id, data }: { id: string; data: UpdateTaskCategoryData }, { rejectWithValue }) => {
    try {
      const response = await taskCategoryApi.updateTaskCategory(id, data);
      toast.success('Task category updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update task category';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteTaskCategory = createAsyncThunk(
  'taskCategories/deleteTaskCategory',
  async (id: string, { rejectWithValue }) => {
    try {
      await taskCategoryApi.deleteTaskCategory(id);
      toast.success('Task category deleted successfully!');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete task category';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Slice
const taskCategorySlice = createSlice({
  name: 'taskCategories',
  initialState,
  reducers: {
    clearCurrentTaskCategory: (state) => {
      state.currentTaskCategory = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Task Categories
    builder
      .addCase(fetchTaskCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTaskCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.taskCategories = action.payload.data ?? [];
        state.total = action.payload.total ?? action.payload.count ?? 0;
        state.page = action.payload.page || 1;
        state.pages = action.payload.pages || 1;
      })
      .addCase(fetchTaskCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Task Category By ID
    builder
      .addCase(fetchTaskCategoryById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTaskCategoryById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTaskCategory = action.payload;
      })
      .addCase(fetchTaskCategoryById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create Task Category
    builder
      .addCase(createTaskCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTaskCategory.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createTaskCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as any)?.message ?? (action.payload as string);
      });

    // Update Task Category
    builder
      .addCase(updateTaskCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTaskCategory.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.taskCategories.findIndex((cat) => cat._id === action.payload._id);
        if (index !== -1) {
          state.taskCategories[index] = action.payload;
        }
        if (state.currentTaskCategory?._id === action.payload._id) {
          state.currentTaskCategory = action.payload;
        }
      })
      .addCase(updateTaskCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete Task Category
    builder
      .addCase(deleteTaskCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTaskCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.taskCategories = state.taskCategories.filter((cat) => cat._id !== action.payload);
        state.total -= 1;
        if (state.currentTaskCategory?._id === action.payload) {
          state.currentTaskCategory = null;
        }
      })
      .addCase(deleteTaskCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentTaskCategory, clearError } = taskCategorySlice.actions;
export default taskCategorySlice.reducer;
