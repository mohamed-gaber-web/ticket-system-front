import type {
  CreateTeamMemberData,
  TeamMember,
  TeamMemberQueryParams,
  TeamMemberStats,
  UpdateTeamMemberData,
} from '@/types/teamMember.types';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import * as teamMemberApi from '@/api/teamMemberApi';

// State interface
interface TeamMemberState {
  teamMembers: TeamMember[];
  currentTeamMember: TeamMember | null;
  stats: TeamMemberStats | null;
  loading: boolean;
  statsLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

// Initial state
const initialState: TeamMemberState = {
  teamMembers: [],
  currentTeamMember: null,
  stats: null,
  loading: false,
  statsLoading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

// Async thunks

// Fetch all team members
export const fetchTeamMembers = createAsyncThunk(
  'teamMembers/fetchTeamMembers',
  async (params: TeamMemberQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await teamMemberApi.getTeamMembers(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch team members';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Fetch team member by ID
export const fetchTeamMemberById = createAsyncThunk(
  'teamMembers/fetchTeamMemberById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await teamMemberApi.getTeamMemberById(id);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch team member';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Create team member
export const createTeamMember = createAsyncThunk(
  'teamMembers/createTeamMember',
  async (data: CreateTeamMemberData, { rejectWithValue }) => {
    try {
      const response = await teamMemberApi.createTeamMember(data);
      toast.success('Team member created successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create team member';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Update team member
export const updateTeamMember = createAsyncThunk(
  'teamMembers/updateTeamMember',
  async ({ id, data }: { id: string; data: UpdateTeamMemberData }, { rejectWithValue }) => {
    try {
      const response = await teamMemberApi.updateTeamMember(id, data);
      toast.success('Team member updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update team member';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Delete team member
export const deleteTeamMember = createAsyncThunk(
  'teamMembers/deleteTeamMember',
  async (id: string, { rejectWithValue }) => {
    try {
      await teamMemberApi.deleteTeamMember(id);
      toast.success('Team member deleted successfully!');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete team member';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Fetch team member stats
export const fetchTeamMemberStats = createAsyncThunk(
  'teamMembers/fetchTeamMemberStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await teamMemberApi.getTeamMemberStats();
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch team member stats';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Fetch team members by team ID
export const fetchTeamMembersByTeam = createAsyncThunk(
  'teamMembers/fetchTeamMembersByTeam',
  async ({ teamId, params }: { teamId: string; params?: TeamMemberQueryParams }, { rejectWithValue }) => {
    try {
      const response = await teamMemberApi.getTeamMembersByTeam(teamId, params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch team members';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Fetch active team members
export const fetchActiveTeamMembers = createAsyncThunk(
  'teamMembers/fetchActiveTeamMembers',
  async (params: TeamMemberQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await teamMemberApi.getActiveTeamMembers(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch active team members';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Team Member slice
const teamMemberSlice = createSlice({
  name: 'teamMembers',
  initialState,
  reducers: {
    clearCurrentTeamMember: (state) => {
      state.currentTeamMember = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearStats: (state) => {
      state.stats = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch team members
    builder
      .addCase(fetchTeamMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeamMembers.fulfilled, (state, action) => {
        state.loading = false;
        state.teamMembers = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchTeamMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch team member by ID
    builder
      .addCase(fetchTeamMemberById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeamMemberById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTeamMember = action.payload;
      })
      .addCase(fetchTeamMemberById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create team member
    builder
      .addCase(createTeamMember.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTeamMember.fulfilled, (state, action) => {
        state.loading = false;
        state.teamMembers.push(action.payload);
        state.total += 1;
      })
      .addCase(createTeamMember.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update team member
    builder
      .addCase(updateTeamMember.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTeamMember.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.teamMembers.findIndex((member) => member._id === action.payload._id);
        if (index !== -1) {
          state.teamMembers[index] = action.payload;
        }
        if (state.currentTeamMember && state.currentTeamMember._id === action.payload._id) {
          state.currentTeamMember = action.payload;
        }
      })
      .addCase(updateTeamMember.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete team member
    builder
      .addCase(deleteTeamMember.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTeamMember.fulfilled, (state, action) => {
        state.loading = false;
        state.teamMembers = state.teamMembers.filter((member) => member._id !== action.payload);
        state.total = Math.max(0, state.total - 1);
        if (state.currentTeamMember && state.currentTeamMember._id === action.payload) {
          state.currentTeamMember = null;
        }
      })
      .addCase(deleteTeamMember.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch team member stats
    builder
      .addCase(fetchTeamMemberStats.pending, (state) => {
        state.statsLoading = true;
        state.error = null;
      })
      .addCase(fetchTeamMemberStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchTeamMemberStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.error = action.payload as string;
      });

    // Fetch team members by team
    builder
      .addCase(fetchTeamMembersByTeam.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeamMembersByTeam.fulfilled, (state, action) => {
        state.loading = false;
        state.teamMembers = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchTeamMembersByTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch active team members
    builder
      .addCase(fetchActiveTeamMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActiveTeamMembers.fulfilled, (state, action) => {
        state.loading = false;
        state.teamMembers = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchActiveTeamMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions and reducer
export const { clearCurrentTeamMember, clearError, clearStats } = teamMemberSlice.actions;
export default teamMemberSlice.reducer;
