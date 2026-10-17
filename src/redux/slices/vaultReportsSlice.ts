import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as vaultApi from '@/api/vaultApi';
import { apiError } from '@/lib/vault';
import type { VaultDashboard, VaultLog, VaultLogDetail } from '@/types/vault.types';

// Credentials Vault read-only reports: the send log (server-paginated) and the
// dashboard payload. Neither ever carries a password.

type Status = 'idle' | 'loading' | 'succeeded' | 'failed';

interface VaultReportsState {
  logs: VaultLog[];
  logsTotal: number;
  logsPages: number;
  logsStatus: Status;
  logsError: string | null;
  logsRequestId: string | null;
  logDetail: VaultLogDetail | null;
  logDetailStatus: Status;
  logDetailError: string | null;
  dashboard: VaultDashboard | null;
  dashboardStatus: Status;
  dashboardError: string | null;
}

const initialState: VaultReportsState = {
  logs: [],
  logsTotal: 0,
  logsPages: 1,
  logsStatus: 'idle',
  logsError: null,
  logsRequestId: null,
  logDetail: null,
  logDetailStatus: 'idle',
  logDetailError: null,
  dashboard: null,
  dashboardStatus: 'idle',
  dashboardError: null,
};

export const fetchVaultLogs = createAsyncThunk(
  'vaultReports/logs',
  async (params: vaultApi.VaultLogListParams, { rejectWithValue }) => {
    try {
      return await vaultApi.getVaultLogs(params);
    } catch (e) {
      return rejectWithValue(apiError(e, 'Could not load the send log'));
    }
  },
);

export const fetchVaultLog = createAsyncThunk('vaultReports/log', async (id: string, { rejectWithValue }) => {
  try {
    return (await vaultApi.getVaultLog(id)).data;
  } catch (e) {
    return rejectWithValue(apiError(e, 'Could not load this send'));
  }
});

export const fetchVaultDashboard = createAsyncThunk('vaultReports/dashboard', async (_: void, { rejectWithValue }) => {
  try {
    return (await vaultApi.getVaultDashboard()).data;
  } catch (e) {
    return rejectWithValue(apiError(e, 'Could not load the dashboard'));
  }
});

const vaultReportsSlice = createSlice({
  name: 'vaultReports',
  initialState,
  reducers: {
    clearLogDetail(state) {
      state.logDetail = null;
      state.logDetailStatus = 'idle';
      state.logDetailError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVaultLogs.pending, (state, action) => {
        state.logsStatus = 'loading';
        state.logsError = null;
        state.logsRequestId = action.meta.requestId;
      })
      .addCase(fetchVaultLogs.fulfilled, (state, action) => {
        if (state.logsRequestId !== action.meta.requestId) return;
        state.logsStatus = 'succeeded';
        state.logs = action.payload.data ?? [];
        state.logsTotal = action.payload.total ?? state.logs.length;
        state.logsPages = Math.max(1, action.payload.pages ?? 1);
      })
      .addCase(fetchVaultLogs.rejected, (state, action) => {
        if (state.logsRequestId !== action.meta.requestId) return;
        state.logsStatus = 'failed';
        state.logsError = (action.payload as string) ?? 'Could not load the send log';
      })
      .addCase(fetchVaultLog.pending, (state) => {
        state.logDetailStatus = 'loading';
        state.logDetailError = null;
      })
      .addCase(fetchVaultLog.fulfilled, (state, action) => {
        state.logDetailStatus = 'succeeded';
        state.logDetail = action.payload;
      })
      .addCase(fetchVaultLog.rejected, (state, action) => {
        state.logDetailStatus = 'failed';
        state.logDetailError = (action.payload as string) ?? 'Could not load this send';
      })
      .addCase(fetchVaultDashboard.pending, (state) => {
        state.dashboardStatus = 'loading';
        state.dashboardError = null;
      })
      .addCase(fetchVaultDashboard.fulfilled, (state, action) => {
        state.dashboardStatus = 'succeeded';
        state.dashboard = action.payload;
      })
      .addCase(fetchVaultDashboard.rejected, (state, action) => {
        state.dashboardStatus = 'failed';
        state.dashboardError = (action.payload as string) ?? 'Could not load the dashboard';
      });
  },
});

export const { clearLogDetail } = vaultReportsSlice.actions;
export default vaultReportsSlice.reducer;
