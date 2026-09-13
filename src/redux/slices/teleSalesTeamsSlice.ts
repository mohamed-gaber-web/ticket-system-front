import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import * as teleSalesApi from '@/api/teleSalesApi';
import type { TeleSalesTeam, CreateTeamData, UpdateTeamData } from '@/types/teleSales.types';

interface TeleSalesTeamsState {
  teams: TeleSalesTeam[];
  loading: boolean;
  error: string | null;
  total: number;
}

const initialState: TeleSalesTeamsState = {
  teams: [],
  loading: false,
  error: null,
  total: 0,
};

/**
 * Loads the teams the caller is allowed to see — every team for a super admin,
 * only their own for everyone else. Screens can therefore treat a single-entry
 * list as "this user has no team choice to make".
 */
export const fetchTeams = createAsyncThunk(
  'teleSalesTeams/fetchTeams',
  async (params: { isActive?: boolean; search?: string } | undefined, { rejectWithValue }) => {
    try {
      return await teleSalesApi.getTeams(params);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch teams';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const createTeam = createAsyncThunk(
  'teleSalesTeams/createTeam',
  async (data: CreateTeamData, { rejectWithValue }) => {
    try {
      const response = await teleSalesApi.createTeam(data);
      toast.success('Team created successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create team';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateTeam = createAsyncThunk(
  'teleSalesTeams/updateTeam',
  async ({ id, data }: { id: string; data: UpdateTeamData }, { rejectWithValue }) => {
    try {
      const response = await teleSalesApi.updateTeam(id, data);
      toast.success('Team updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update team';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteTeam = createAsyncThunk(
  'teleSalesTeams/deleteTeam',
  async (id: string, { rejectWithValue }) => {
    try {
      await teleSalesApi.deleteTeam(id);
      toast.success('Team deleted successfully!');
      return id;
    } catch (error: any) {
      // The API refuses to delete a team that still holds agents or leads, and
      // explains what is in the way — surface that verbatim rather than a generic
      // failure, since it tells the user exactly what to clear first.
      const message = error.response?.data?.message || 'Failed to delete team';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const toggleTeamStatus = createAsyncThunk(
  'teleSalesTeams/toggleStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await teleSalesApi.toggleTeamStatus(id);
      toast.success(`Team ${response.data.isActive ? 'activated' : 'deactivated'}`);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to toggle team status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const teleSalesTeamsSlice = createSlice({
  name: 'teleSalesTeams',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeams.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.loading = false;
        state.teams = action.payload.data;
        state.total = action.payload.total;
      })
      .addCase(fetchTeams.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(createTeam.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createTeam.fulfilled, (state, action) => {
        state.loading = false;
        state.teams.push(action.payload);
        state.teams.sort((a, b) => a.name.localeCompare(b.name));
        state.total += 1;
      })
      .addCase(createTeam.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(updateTeam.pending, (state) => { state.loading = true; })
      .addCase(updateTeam.fulfilled, (state, action) => {
        state.loading = false;
        const idx = state.teams.findIndex((t) => t._id === action.payload._id);
        if (idx !== -1) state.teams[idx] = action.payload;
      })
      .addCase(updateTeam.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(deleteTeam.fulfilled, (state, action) => {
        state.teams = state.teams.filter((t) => t._id !== action.payload);
        state.total -= 1;
      });

    builder
      .addCase(toggleTeamStatus.fulfilled, (state, action) => {
        const idx = state.teams.findIndex((t) => t._id === action.payload._id);
        if (idx !== -1) state.teams[idx] = action.payload;
      });
  },
});

export const { clearError } = teleSalesTeamsSlice.actions;
export default teleSalesTeamsSlice.reducer;
