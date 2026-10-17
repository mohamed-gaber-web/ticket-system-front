import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as teleSalesApi from '@/api/teleSalesApi';
import type { TeleSalesDashboardData, TeleSalesDashboardParams } from '@/types/teleSales.types';

// The tele-sales dashboard (`GET /leads/dashboard`). The last payload stays on
// screen while a new filter loads; only the newest request may land.

type Status = 'idle' | 'loading' | 'succeeded' | 'failed';

interface TeleSalesDashboardState {
  data: TeleSalesDashboardData | null;
  status: Status;
  error: string | null;
  requestId: string | null;
}

const initialState: TeleSalesDashboardState = {
  data: null,
  status: 'idle',
  error: null,
  requestId: null,
};

const apiMessage = (e: unknown, fallback: string): string =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export const fetchTeleSalesDashboard = createAsyncThunk(
  'teleSalesDashboard/fetch',
  async (params: TeleSalesDashboardParams, { rejectWithValue }) => {
    try {
      return (await teleSalesApi.getTeleSalesDashboard(params)).data;
    } catch (e) {
      return rejectWithValue(apiMessage(e, 'Could not load the dashboard'));
    }
  },
);

const teleSalesDashboardSlice = createSlice({
  name: 'teleSalesDashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeleSalesDashboard.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.requestId = action.meta.requestId;
      })
      .addCase(fetchTeleSalesDashboard.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchTeleSalesDashboard.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.status = 'failed';
        state.error = (action.payload as string | undefined) ?? 'Could not load the dashboard';
      });
  },
});

export default teleSalesDashboardSlice.reducer;
