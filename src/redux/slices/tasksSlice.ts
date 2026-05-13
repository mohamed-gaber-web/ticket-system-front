import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import * as tasksApi from '@/api/tasksApi';
import type { Task, TaskQueryParams, CreateTaskData, UpdateTaskData } from '@/types/task.types';

interface TasksState {
  tasks: Task[];
  currentTask: Task | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: TasksState = {
  tasks: [],
  currentTask: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (params: TaskQueryParams | undefined, { rejectWithValue }) => {
    try {
      return await tasksApi.getTasks(params);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch tasks';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchTaskById = createAsyncThunk(
  'tasks/fetchTaskById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await tasksApi.getTaskById(id);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch task';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (data: CreateTaskData, { rejectWithValue }) => {
    try {
      const response = await tasksApi.createTask(data);
      toast.success('Task created successfully');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create task';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ id, data }: { id: string; data: UpdateTaskData }, { rejectWithValue }) => {
    try {
      const response = await tasksApi.updateTask(id, data);
      toast.success('Task updated successfully');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update task';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (id: string, { rejectWithValue }) => {
    try {
      await tasksApi.deleteTask(id);
      toast.success('Task deleted successfully');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete task';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    clearCurrentTask: (state) => { state.currentTask = null; },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchTasks.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(fetchTaskById.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTaskById.fulfilled, (state, action) => { state.loading = false; state.currentTask = action.payload; })
      .addCase(fetchTaskById.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(createTask.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createTask.fulfilled, (state, action) => { state.loading = false; state.tasks.unshift(action.payload); state.total += 1; })
      .addCase(createTask.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(updateTask.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTask = action.payload;
        const idx = state.tasks.findIndex((t) => t._id === action.payload._id);
        if (idx !== -1) state.tasks[idx] = action.payload;
      })
      .addCase(updateTask.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(deleteTask.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = state.tasks.filter((t) => t._id !== action.payload);
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(deleteTask.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });
  },
});

export const { clearCurrentTask, clearError } = tasksSlice.actions;
export default tasksSlice.reducer;
