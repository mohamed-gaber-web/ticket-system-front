import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import * as ticketSettingsApi from '@/api/ticketSettingsApi';
import type { TicketSettings, UpdateTicketSettingsData } from '@/types/ticket';
import { logout } from './authSlice';

interface TicketSettingsState {
  settings: TicketSettings | null;
  /** The user the settings were loaded for — another login reloads them. */
  loadedFor: string | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: TicketSettingsState = {
  settings: null,
  loadedFor: null,
  loading: false,
  saving: false,
  error: null,
};

const errorMessage = (error: unknown, fallback: string): string => {
  const data = (error as { response?: { data?: { message?: string } } })?.response?.data;
  return data?.message || fallback;
};

/** Load once per signed-in employee (`userId`). Pass `force` to reload. */
export const fetchTicketSettings = createAsyncThunk<
  TicketSettings,
  { userId: string; force?: boolean },
  { state: { ticketSettings: TicketSettingsState }; rejectValue: string }
>(
  'ticketSettings/fetch',
  async (_, { rejectWithValue }) => {
    try {
      return await ticketSettingsApi.getTicketSettings();
    } catch (error) {
      // Silent: without settings the R&D pages simply stay hidden.
      return rejectWithValue(errorMessage(error, 'Failed to load ticket settings'));
    }
  },
  {
    condition: ({ userId, force }, { getState }) => {
      const s = getState().ticketSettings;
      if (s.loading) return false;
      return force || s.loadedFor !== userId;
    },
  },
);

export const saveTicketSettings = createAsyncThunk<TicketSettings, UpdateTicketSettingsData, { rejectValue: string }>(
  'ticketSettings/save',
  async (data, { rejectWithValue }) => {
    try {
      const settings = await ticketSettingsApi.updateTicketSettings(data);
      toast.success('R&D settings saved');
      return settings;
    } catch (error) {
      const message = errorMessage(error, 'Failed to save R&D settings');
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

const ticketSettingsSlice = createSlice({
  name: 'ticketSettings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTicketSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTicketSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
        state.loadedFor = action.meta.arg.userId;
      })
      .addCase(fetchTicketSettings.rejected, (state, action) => {
        state.loading = false;
        // Remember the attempt so screens don't retry in a loop; `force` retries.
        state.loadedFor = action.meta.arg.userId;
        state.error = action.payload ?? 'Failed to load ticket settings';
      })
      .addCase(saveTicketSettings.pending, (state) => {
        state.saving = true;
      })
      .addCase(saveTicketSettings.fulfilled, (state, action) => {
        state.saving = false;
        state.settings = action.payload;
        state.error = null;
      })
      .addCase(saveTicketSettings.rejected, (state) => {
        state.saving = false;
      })
      .addCase(logout, () => initialState);
  },
});

export default ticketSettingsSlice.reducer;
