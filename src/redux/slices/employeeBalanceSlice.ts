import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import * as employeeBalanceApi from '@/api/employeeBalanceApi';
import type {
  EmployeeBalance,
  EmployeeBalanceQueryParams,
  UpsertBalanceData,
} from '@/types/employeeBalance.types';

interface EmployeeBalanceState {
  balances: EmployeeBalance[];
  myBalance: EmployeeBalance | null;
  loading: boolean;
  error: string | null;
}

const initialState: EmployeeBalanceState = {
  balances: [],
  myBalance: null,
  loading: false,
  error: null,
};

export const fetchEmployeeBalances = createAsyncThunk(
  'employeeBalances/fetch',
  async (params: EmployeeBalanceQueryParams | undefined, { rejectWithValue }) => {
    try {
      return await employeeBalanceApi.getEmployeeBalances(params);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch balances';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchMyBalance = createAsyncThunk(
  'employeeBalances/fetchMine',
  async (year: number | undefined, { rejectWithValue }) => {
    try {
      const response = await employeeBalanceApi.getMyBalance(year);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch balance';
      return rejectWithValue(message);
    }
  }
);

export const upsertEmployeeBalance = createAsyncThunk(
  'employeeBalances/upsert',
  async (data: UpsertBalanceData, { rejectWithValue }) => {
    try {
      const response = await employeeBalanceApi.upsertEmployeeBalance(data);
      toast.success('Balance updated successfully');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update balance';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const employeeBalanceSlice = createSlice({
  name: 'employeeBalances',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployeeBalances.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchEmployeeBalances.fulfilled, (state, action) => {
        state.loading = false;
        state.balances = action.payload.data;
      })
      .addCase(fetchEmployeeBalances.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(fetchMyBalance.fulfilled, (state, action) => { state.myBalance = action.payload; });

    builder
      .addCase(upsertEmployeeBalance.fulfilled, (state, action) => {
        const idx = state.balances.findIndex((b) => b._id === action.payload._id);
        if (idx !== -1) state.balances[idx] = action.payload;
        else state.balances.unshift(action.payload);
      });
  },
});

export const { clearError } = employeeBalanceSlice.actions;
export default employeeBalanceSlice.reducer;
