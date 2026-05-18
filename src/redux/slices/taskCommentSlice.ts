import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import * as api from '@/api/taskCommentApi';
import type { TaskComment, TaskCommentsResponse } from '@/api/taskCommentApi';
import { toast } from 'sonner';

interface State {
  comments: TaskComment[];
  loading: boolean;
  error: string | null;
  total: number;
}

const initialState: State = { comments: [], loading: false, error: null, total: 0 };

export const fetchTaskComments = createAsyncThunk(
  'taskComments/fetch',
  async (taskId: string, { rejectWithValue }) => {
    try { return await api.getTaskComments(taskId); }
    catch (e: any) { return rejectWithValue(e.response?.data?.message || 'Failed to fetch comments'); }
  }
);

export const createTaskComment = createAsyncThunk(
  'taskComments/create',
  async (data: Parameters<typeof api.createTaskComment>[0], { rejectWithValue }) => {
    try {
      const comment = await api.createTaskComment(data);
      toast.success('Comment added');
      return comment;
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to add comment';
      toast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updateTaskComment = createAsyncThunk(
  'taskComments/update',
  async ({ id, commentText }: { id: string; commentText: string }, { rejectWithValue }) => {
    try {
      const comment = await api.updateTaskComment(id, commentText);
      toast.success('Comment updated');
      return comment;
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to update comment';
      toast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const deleteTaskComment = createAsyncThunk(
  'taskComments/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.deleteTaskComment(id);
      toast.success('Comment deleted');
      return id;
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to delete comment';
      toast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

const slice = createSlice({
  name: 'taskComments',
  initialState,
  reducers: {
    clearTaskComments: (state) => { Object.assign(state, initialState); },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTaskComments.pending, (s) => { s.loading = true; })
      .addCase(fetchTaskComments.fulfilled, (s, a: PayloadAction<TaskCommentsResponse>) => {
        s.loading = false; s.comments = a.payload.data; s.total = a.payload.total;
      })
      .addCase(fetchTaskComments.rejected, (s) => { s.loading = false; });

    builder
      .addCase(createTaskComment.pending, (s) => { s.loading = true; })
      .addCase(createTaskComment.fulfilled, (s, a: PayloadAction<TaskComment>) => {
        s.loading = false; s.comments.unshift(a.payload); s.total += 1;
      })
      .addCase(createTaskComment.rejected, (s) => { s.loading = false; });

    builder
      .addCase(updateTaskComment.fulfilled, (s, a: PayloadAction<TaskComment>) => {
        const i = s.comments.findIndex(c => c._id === a.payload._id);
        if (i !== -1) s.comments[i] = a.payload;
      });

    builder
      .addCase(deleteTaskComment.fulfilled, (s, a: PayloadAction<string>) => {
        s.comments = s.comments.filter(c => c._id !== a.payload); s.total -= 1;
      });
  },
});

export const { clearTaskComments } = slice.actions;
export default slice.reducer;
