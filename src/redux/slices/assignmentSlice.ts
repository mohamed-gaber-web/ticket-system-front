import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import { assignmentApi } from '../../api/assignmentApi';
import type {
  TicketAssignment,
  AssignmentQueryParams,
  AssignmentStats,
} from '../../types/assignment.types';

interface AssignmentState {
  assignments: TicketAssignment[];
  stats: AssignmentStats | null;
  ticketHistory: TicketAssignment[];
  loading: boolean;
  statsLoading: boolean;
  historyLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: AssignmentState = {
  assignments: [],
  stats: null,
  ticketHistory: [],
  loading: false,
  statsLoading: false,
  historyLoading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

export const fetchAssignments = createAsyncThunk(
  'assignment/fetchAssignments',
  async (params: AssignmentQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await assignmentApi.getAssignments(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch assignments';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchAssignmentStats = createAsyncThunk(
  'assignment/fetchAssignmentStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await assignmentApi.getAssignmentStats();
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch assignment statistics';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchTicketHistory = createAsyncThunk(
  'assignment/fetchTicketHistory',
  async (ticketId: string, { rejectWithValue }) => {
    try {
      const response = await assignmentApi.getTicketHistory(ticketId);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch ticket history';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const assignmentSlice = createSlice({
  name: 'assignment',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearTicketHistory: (state) => {
      state.ticketHistory = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Assignments
      .addCase(fetchAssignments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAssignments.fulfilled, (state, action) => {
        state.loading = false;
        state.assignments = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchAssignments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch Assignment Stats
      .addCase(fetchAssignmentStats.pending, (state) => {
        state.statsLoading = true;
        state.error = null;
      })
      .addCase(fetchAssignmentStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.stats = action.payload.data;
      })
      .addCase(fetchAssignmentStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.error = action.payload as string;
      })

      // Fetch Ticket History
      .addCase(fetchTicketHistory.pending, (state) => {
        state.historyLoading = true;
        state.error = null;
      })
      .addCase(fetchTicketHistory.fulfilled, (state, action) => {
        state.historyLoading = false;
        state.ticketHistory = action.payload.data;
      })
      .addCase(fetchTicketHistory.rejected, (state, action) => {
        state.historyLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearTicketHistory } = assignmentSlice.actions;
export default assignmentSlice.reducer;
