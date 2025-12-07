import type {
  CreateTeamData,
  Team,
  TeamMemberReference,
  TeamQueryParams,
  TeamWorkloadData,
  UpdateTeamData,
} from '@/types/team.types';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import * as teamApi from '@/api/teamApi';

// State interface
interface TeamState {
  teams: Team[];
  currentTeam: Team | null;
  teamMembers: TeamMemberReference[];
  teamWorkload: TeamWorkloadData | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
  membersLoading: boolean;
  workloadLoading: boolean;
}

// Initial state
const initialState: TeamState = {
  teams: [],
  currentTeam: null,
  teamMembers: [],
  teamWorkload: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
  membersLoading: false,
  workloadLoading: false,
};

// Async thunks

// Fetch all teams
export const fetchTeams = createAsyncThunk(
  'teams/fetchTeams',
  async (params: TeamQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await teamApi.getTeams(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch teams';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Fetch team by ID
export const fetchTeamById = createAsyncThunk(
  'teams/fetchTeamById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await teamApi.getTeamById(id);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch team';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Create team
export const createTeam = createAsyncThunk(
  'teams/createTeam',
  async (data: CreateTeamData, { rejectWithValue }) => {
    try {
      const response = await teamApi.createTeam(data);
      toast.success('Team created successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create team';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Update team
export const updateTeam = createAsyncThunk(
  'teams/updateTeam',
  async ({ id, data }: { id: string; data: UpdateTeamData }, { rejectWithValue }) => {
    try {
      const response = await teamApi.updateTeam(id, data);
      toast.success('Team updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update team';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Delete team
export const deleteTeam = createAsyncThunk('teams/deleteTeam', async (id: string, { rejectWithValue }) => {
  try {
    await teamApi.deleteTeam(id);
    toast.success('Team deleted successfully!');
    return id;
  } catch (error: any) {
    const message = error.response?.data?.message || 'Failed to delete team';
    toast.error(message);
    return rejectWithValue(message);
  }
});

// Fetch team members
export const fetchTeamMembers = createAsyncThunk(
  'teams/fetchTeamMembers',
  async ({ id, params }: { id: string; params?: { page?: number; limit?: number; status?: string } }, { rejectWithValue }) => {
    try {
      const response = await teamApi.getTeamMembers(id, params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch team members';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Fetch team workload
export const fetchTeamWorkload = createAsyncThunk(
  'teams/fetchTeamWorkload',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await teamApi.getTeamWorkload(id);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch team workload';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Fetch teams by department
export const fetchTeamsByDepartment = createAsyncThunk(
  'teams/fetchTeamsByDepartment',
  async ({ department, params }: { department: string; params?: { page?: number; limit?: number } }, { rejectWithValue }) => {
    try {
      const response = await teamApi.getTeamsByDepartment(department, params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch teams by department';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Fetch active teams
export const fetchActiveTeams = createAsyncThunk(
  'teams/fetchActiveTeams',
  async (params: { page?: number; limit?: number } | undefined, { rejectWithValue }) => {
    try {
      const response = await teamApi.getActiveTeams(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch active teams';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Team slice
const teamSlice = createSlice({
  name: 'teams',
  initialState,
  reducers: {
    clearCurrentTeam: (state) => {
      state.currentTeam = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearTeamMembers: (state) => {
      state.teamMembers = [];
    },
    clearTeamWorkload: (state) => {
      state.teamWorkload = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch teams
    builder
      .addCase(fetchTeams.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.loading = false;
        state.teams = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch team by ID
    builder
      .addCase(fetchTeamById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeamById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTeam = action.payload;
      })
      .addCase(fetchTeamById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create team
    builder
      .addCase(createTeam.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTeam.fulfilled, (state, action) => {
        state.loading = false;
        state.teams.push(action.payload);
        state.total += 1;
      })
      .addCase(createTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update team
    builder
      .addCase(updateTeam.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTeam.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.teams.findIndex((team) => team._id === action.payload._id);
        if (index !== -1) {
          state.teams[index] = action.payload;
        }
        if (state.currentTeam && state.currentTeam._id === action.payload._id) {
          state.currentTeam = action.payload;
        }
      })
      .addCase(updateTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete team
    builder
      .addCase(deleteTeam.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTeam.fulfilled, (state, action) => {
        state.loading = false;
        state.teams = state.teams.filter((team) => team._id !== action.payload);
        state.total = Math.max(0, state.total - 1);
        if (state.currentTeam && state.currentTeam._id === action.payload) {
          state.currentTeam = null;
        }
      })
      .addCase(deleteTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch team members
    builder
      .addCase(fetchTeamMembers.pending, (state) => {
        state.membersLoading = true;
        state.error = null;
      })
      .addCase(fetchTeamMembers.fulfilled, (state, action) => {
        state.membersLoading = false;
        state.teamMembers = action.payload.data;
      })
      .addCase(fetchTeamMembers.rejected, (state, action) => {
        state.membersLoading = false;
        state.error = action.payload as string;
      });

    // Fetch team workload
    builder
      .addCase(fetchTeamWorkload.pending, (state) => {
        state.workloadLoading = true;
        state.error = null;
      })
      .addCase(fetchTeamWorkload.fulfilled, (state, action) => {
        state.workloadLoading = false;
        state.teamWorkload = action.payload;
      })
      .addCase(fetchTeamWorkload.rejected, (state, action) => {
        state.workloadLoading = false;
        state.error = action.payload as string;
      });

    // Fetch teams by department
    builder
      .addCase(fetchTeamsByDepartment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeamsByDepartment.fulfilled, (state, action) => {
        state.loading = false;
        state.teams = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchTeamsByDepartment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch active teams
    builder
      .addCase(fetchActiveTeams.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActiveTeams.fulfilled, (state, action) => {
        state.loading = false;
        state.teams = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchActiveTeams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions and reducer
export const { clearCurrentTeam, clearError, clearTeamMembers, clearTeamWorkload } = teamSlice.actions;
export default teamSlice.reducer;
