import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import { assignmentApi } from '../../api/assignmentApi';
import type {
  TicketAssignment,
  AssignmentQueryParams,
  AssignmentStats,
  CreateAssignmentData,
  ReassignTicketData,
} from '../../types/assignment.types';

interface AssignmentState {
  assignments: TicketAssignment[];
  currentAssignment: TicketAssignment | null;
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
  currentAssignment: null,
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

export const createAssignment = createAsyncThunk(
  'assignment/createAssignment',
  async (data: CreateAssignmentData, { rejectWithValue }) => {
    try {
      const response = await assignmentApi.createAssignment(data);
      toast.success('Ticket assigned successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to assign ticket';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const acceptAssignment = createAsyncThunk(
  'assignment/acceptAssignment',
  async ({ assignmentId, teamMemberId }: { assignmentId: string; teamMemberId: string }, { rejectWithValue }) => {
    try {
      const response = await assignmentApi.acceptAssignment(assignmentId, teamMemberId);
      toast.success('Assignment accepted successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to accept assignment';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchCurrentAssignment = createAsyncThunk(
  'assignment/fetchCurrentAssignment',
  async (ticketId: string, { rejectWithValue }) => {
    try {
      const response = await assignmentApi.getCurrentAssignment(ticketId);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch current assignment';
      // Only show error toast if it's not a "not found" error (404)
      // Tickets without assignments are normal and shouldn't show an error
      if (error.response?.status !== 404) {
        toast.error(message);
      }
      return rejectWithValue(message);
    }
  }
);

export const fetchAssignmentsByTeam = createAsyncThunk(
  'assignment/fetchAssignmentsByTeam',
  async ({ teamId, params }: { teamId: string; params?: AssignmentQueryParams }, { rejectWithValue }) => {
    try {
      const response = await assignmentApi.getAssignmentsByTeam(teamId, params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch team assignments';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchAssignmentsByTeamMember = createAsyncThunk(
  'assignment/fetchAssignmentsByTeamMember',
  async ({ memberId, params }: { memberId: string; params?: AssignmentQueryParams }, { rejectWithValue }) => {
    try {
      const response = await assignmentApi.getAssignmentsByTeamMember(memberId, params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch member assignments';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const reassignTicket = createAsyncThunk(
  'assignment/reassignTicket',
  async ({ assignmentId, data }: { assignmentId: string; data: ReassignTicketData }, { rejectWithValue }) => {
    try {
      const response = await assignmentApi.reassignTicket(assignmentId, data);
      toast.success('Ticket reassigned successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to reassign ticket';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const assignConsultants = createAsyncThunk(
  'assignment/assignConsultants',
  async ({ assignmentId, consultants }: { assignmentId: string; consultants: string[] }, { rejectWithValue }) => {
    try {
      const response = await assignmentApi.assignConsultants(assignmentId, { consultants });
      toast.success('Consultants assigned successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to assign consultants';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateConsultantStatus = createAsyncThunk(
  'assignment/updateConsultantStatus',
  async (
    { assignmentId, consultantId, status, notes }:
    { assignmentId: string; consultantId: string; status: 'pending' | 'accepted' | 'declined' | 'completed'; notes?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await assignmentApi.updateConsultantStatus(assignmentId, consultantId, { status, notes });
      toast.success('Status updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const removeConsultant = createAsyncThunk(
  'assignment/removeConsultant',
  async ({ assignmentId, consultantId }: { assignmentId: string; consultantId: string }, { rejectWithValue }) => {
    try {
      const response = await assignmentApi.removeConsultant(assignmentId, consultantId);
      toast.success('Consultant removed successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to remove consultant';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchConsultantAssignments = createAsyncThunk(
  'assignment/fetchConsultantAssignments',
  async ({ consultantId, params }: { consultantId: string; params?: { page?: number; limit?: number; status?: string } }, { rejectWithValue }) => {
    try {
      const response = await assignmentApi.getConsultantAssignments(consultantId, params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch consultant assignments';
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
      })

      // Create Assignment
      .addCase(createAssignment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAssignment.fulfilled, (state, action) => {
        state.loading = false;
        state.assignments.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createAssignment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Accept Assignment
      .addCase(acceptAssignment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(acceptAssignment.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.assignments.findIndex(a => a._id === action.payload._id);
        if (index !== -1) {
          state.assignments[index] = action.payload;
        }
        if (state.currentAssignment && state.currentAssignment._id === action.payload._id) {
          state.currentAssignment = action.payload;
        }
      })
      .addCase(acceptAssignment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch Current Assignment
      .addCase(fetchCurrentAssignment.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentAssignment = null;
      })
      .addCase(fetchCurrentAssignment.fulfilled, (state, action) => {
        state.loading = false;
        state.currentAssignment = action.payload;
      })
      .addCase(fetchCurrentAssignment.rejected, (state, action) => {
        state.loading = false;
        state.currentAssignment = null;
        state.error = action.payload as string;
      })

      // Fetch Assignments by Team
      .addCase(fetchAssignmentsByTeam.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAssignmentsByTeam.fulfilled, (state, action) => {
        state.loading = false;
        state.assignments = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchAssignmentsByTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch Assignments by Team Member
      .addCase(fetchAssignmentsByTeamMember.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAssignmentsByTeamMember.fulfilled, (state, action) => {
        state.loading = false;
        state.assignments = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchAssignmentsByTeamMember.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Reassign Ticket
      .addCase(reassignTicket.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(reassignTicket.fulfilled, (state, action) => {
        state.loading = false;
        state.assignments.unshift(action.payload);
      })
      .addCase(reassignTicket.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Assign Consultants
      .addCase(assignConsultants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(assignConsultants.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.assignments.findIndex(a => a._id === action.payload._id);
        if (index !== -1) {
          state.assignments[index] = action.payload;
        }
        if (state.currentAssignment && state.currentAssignment._id === action.payload._id) {
          state.currentAssignment = action.payload;
        }
      })
      .addCase(assignConsultants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Update Consultant Status
      .addCase(updateConsultantStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateConsultantStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.assignments.findIndex(a => a._id === action.payload._id);
        if (index !== -1) {
          state.assignments[index] = action.payload;
        }
        if (state.currentAssignment && state.currentAssignment._id === action.payload._id) {
          state.currentAssignment = action.payload;
        }
      })
      .addCase(updateConsultantStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Remove Consultant
      .addCase(removeConsultant.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeConsultant.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.assignments.findIndex(a => a._id === action.payload._id);
        if (index !== -1) {
          state.assignments[index] = action.payload;
        }
        if (state.currentAssignment && state.currentAssignment._id === action.payload._id) {
          state.currentAssignment = action.payload;
        }
      })
      .addCase(removeConsultant.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearTicketHistory } = assignmentSlice.actions;
export default assignmentSlice.reducer;
