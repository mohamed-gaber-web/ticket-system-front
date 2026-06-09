import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import * as employeeRequestApi from '@/api/employeeRequestApi';
import type {
  EmployeeRequest,
  EmployeeRequestQueryParams,
  CreateEmployeeRequestData,
} from '@/types/employeeRequest.types';

interface EmployeeRequestState {
  requests: EmployeeRequest[];
  currentRequest: EmployeeRequest | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: EmployeeRequestState = {
  requests: [],
  currentRequest: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

export const fetchEmployeeRequests = createAsyncThunk(
  'employeeRequests/fetch',
  async (params: EmployeeRequestQueryParams | undefined, { rejectWithValue }) => {
    try {
      return await employeeRequestApi.getEmployeeRequests(params);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch requests';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const createEmployeeRequest = createAsyncThunk(
  'employeeRequests/create',
  async (data: CreateEmployeeRequestData, { rejectWithValue }) => {
    try {
      const response = await employeeRequestApi.createEmployeeRequest(data);
      toast.success('Request submitted successfully');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to submit request';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const approveEmployeeRequest = createAsyncThunk(
  'employeeRequests/approve',
  async ({ id, reviewNote }: { id: string; reviewNote?: string }, { rejectWithValue }) => {
    try {
      const response = await employeeRequestApi.approveEmployeeRequest(id, reviewNote);
      toast.success('Request approved');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to approve request';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const rejectEmployeeRequest = createAsyncThunk(
  'employeeRequests/reject',
  async ({ id, reviewNote }: { id: string; reviewNote?: string }, { rejectWithValue }) => {
    try {
      const response = await employeeRequestApi.rejectEmployeeRequest(id, reviewNote);
      toast.success('Request rejected');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to reject request';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const cancelEmployeeRequest = createAsyncThunk(
  'employeeRequests/cancel',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await employeeRequestApi.cancelEmployeeRequest(id);
      toast.success('Request cancelled');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to cancel request';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteEmployeeRequest = createAsyncThunk(
  'employeeRequests/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await employeeRequestApi.deleteEmployeeRequest(id);
      toast.success('Request deleted');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete request';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const upsertInList = (state: EmployeeRequestState, req: EmployeeRequest) => {
  const idx = state.requests.findIndex((r) => r._id === req._id);
  if (idx !== -1) state.requests[idx] = req;
};

const employeeRequestSlice = createSlice({
  name: 'employeeRequests',
  initialState,
  reducers: {
    clearCurrentRequest: (state) => { state.currentRequest = null; },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployeeRequests.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchEmployeeRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchEmployeeRequests.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(createEmployeeRequest.fulfilled, (state, action) => {
        state.requests.unshift(action.payload);
        state.total += 1;
      });

    builder
      .addCase(approveEmployeeRequest.fulfilled, (state, action) => { upsertInList(state, action.payload); })
      .addCase(rejectEmployeeRequest.fulfilled, (state, action) => { upsertInList(state, action.payload); })
      .addCase(cancelEmployeeRequest.fulfilled, (state, action) => { upsertInList(state, action.payload); });

    builder
      .addCase(deleteEmployeeRequest.fulfilled, (state, action) => {
        state.requests = state.requests.filter((r) => r._id !== action.payload);
        state.total = Math.max(0, state.total - 1);
      });
  },
});

export const { clearCurrentRequest, clearError } = employeeRequestSlice.actions;
export default employeeRequestSlice.reducer;
