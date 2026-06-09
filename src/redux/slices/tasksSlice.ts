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
  subTasks: Task[];
  subTasksLoading: boolean;
  subTasksTotal: number;
}

const initialState: TasksState = {
  tasks: [],
  currentTask: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
  subTasks: [],
  subTasksLoading: false,
  subTasksTotal: 0,
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

export const fetchSubTasks = createAsyncThunk(
  'tasks/fetchSubTasks',
  async (parentTaskId: string, { rejectWithValue }) => {
    try {
      return await tasksApi.getTasks({ parentTask: parentTaskId, limit: 999 });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch subtasks';
      return rejectWithValue(message);
    }
  }
);

export const createSubTask = createAsyncThunk(
  'tasks/createSubTask',
  async (data: CreateTaskData, { rejectWithValue }) => {
    try {
      const response = await tasksApi.createTask(data);
      toast.success('Subtask created successfully');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create subtask';
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
    clearSubTasks: (state) => { state.subTasks = []; state.subTasksTotal = 0; },
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
        state.subTasks = state.subTasks.filter((t) => t._id !== action.payload);
        state.total = Math.max(0, state.total - 1);
        if (state.subTasks.length < state.subTasksTotal) state.subTasksTotal = Math.max(0, state.subTasksTotal - 1);
      })
      .addCase(deleteTask.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(fetchSubTasks.pending, (state) => { state.subTasksLoading = true; })
      .addCase(fetchSubTasks.fulfilled, (state, action) => {
        state.subTasksLoading = false;
        state.subTasks = action.payload.data;
        state.subTasksTotal = action.payload.total;
      })
      .addCase(fetchSubTasks.rejected, (state) => { state.subTasksLoading = false; });

    builder
      .addCase(createSubTask.pending, (state) => { state.subTasksLoading = true; })
      .addCase(createSubTask.fulfilled, (state, action) => {
        state.subTasksLoading = false;
        state.subTasks.unshift(action.payload);
        state.subTasksTotal += 1;
      })
      .addCase(createSubTask.rejected, (state) => { state.subTasksLoading = false; });
  },
});

export const { clearCurrentTask, clearError, clearSubTasks } = tasksSlice.actions;
export default tasksSlice.reducer;
