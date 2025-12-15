import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as commentApi from '@/api/commentApi';
import { toast } from 'sonner';
import type {
  TicketComment,
  CreateCommentPayload,
  UpdateCommentPayload,
  CommentQueryParams,
} from '@/types/comment.types';

interface CommentState {
  comments: TicketComment[];
  currentComment: TicketComment | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: CommentState = {
  comments: [],
  currentComment: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

export const fetchTicketComments = createAsyncThunk(
  'comments/fetchTicketComments',
  async ({ ticketId, params }: { ticketId: string; params?: CommentQueryParams }, { rejectWithValue }) => {
    try {
      const response = await commentApi.getTicketComments(ticketId, params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch comments';
      return rejectWithValue(message);
    }
  }
);

export const fetchPublicComments = createAsyncThunk(
  'comments/fetchPublicComments',
  async (
    { ticketId, params }: { ticketId: string; params?: { page?: number; limit?: number } },
    { rejectWithValue }
  ) => {
    try {
      const response = await commentApi.getPublicComments(ticketId, params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch public comments';
      return rejectWithValue(message);
    }
  }
);

export const fetchInternalComments = createAsyncThunk(
  'comments/fetchInternalComments',
  async (
    { ticketId, params }: { ticketId: string; params?: { page?: number; limit?: number } },
    { rejectWithValue }
  ) => {
    try {
      const response = await commentApi.getInternalComments(ticketId, params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch internal comments';
      return rejectWithValue(message);
    }
  }
);

export const createComment = createAsyncThunk(
  'comments/createComment',
  async (data: CreateCommentPayload, { rejectWithValue }) => {
    try {
      const response = await commentApi.createComment(data);
      toast.success('Comment added successfully');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create comment';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateComment = createAsyncThunk(
  'comments/updateComment',
  async ({ commentId, data }: { commentId: string; data: UpdateCommentPayload }, { rejectWithValue }) => {
    try {
      const response = await commentApi.updateComment(commentId, data);
      toast.success('Comment updated successfully');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update comment';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteComment = createAsyncThunk(
  'comments/deleteComment',
  async (commentId: string, { rejectWithValue }) => {
    try {
      await commentApi.deleteComment(commentId);
      toast.success('Comment deleted successfully');
      return commentId;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete comment';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchCommentById = createAsyncThunk(
  'comments/fetchCommentById',
  async (commentId: string, { rejectWithValue }) => {
    try {
      const response = await commentApi.getCommentById(commentId);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch comment';
      return rejectWithValue(message);
    }
  }
);

const commentSlice = createSlice({
  name: 'comments',
  initialState,
  reducers: {
    clearComments: (state) => {
      state.comments = [];
      state.total = 0;
      state.page = 1;
      state.pages = 1;
    },
    clearCurrentComment: (state) => {
      state.currentComment = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTicketComments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTicketComments.fulfilled, (state, action) => {
        state.loading = false;
        state.comments = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchTicketComments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchPublicComments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPublicComments.fulfilled, (state, action) => {
        state.loading = false;
        state.comments = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchPublicComments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchInternalComments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInternalComments.fulfilled, (state, action) => {
        state.loading = false;
        state.comments = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchInternalComments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(createComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createComment.fulfilled, (state, action) => {
        state.loading = false;
        state.comments.push(action.payload.data);
        state.total += 1;
      })
      .addCase(createComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(updateComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateComment.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.comments.findIndex((c) => c._id === action.payload.data._id);
        if (index !== -1) {
          state.comments[index] = action.payload.data;
        }
        if (state.currentComment?._id === action.payload.data._id) {
          state.currentComment = action.payload.data;
        }
      })
      .addCase(updateComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(deleteComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        state.loading = false;
        state.comments = state.comments.filter((c) => c._id !== action.payload);
        state.total -= 1;
        if (state.currentComment?._id === action.payload) {
          state.currentComment = null;
        }
      })
      .addCase(deleteComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchCommentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCommentById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentComment = action.payload.data;
      })
      .addCase(fetchCommentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearComments, clearCurrentComment, clearError } = commentSlice.actions;
export default commentSlice.reducer;
