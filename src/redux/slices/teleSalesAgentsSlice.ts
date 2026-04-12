import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import * as teleSalesApi from '@/api/teleSalesApi';
import type { TeleSalesAgent, AgentQueryParams, CreateAgentData, UpdateAgentData } from '@/types/teleSales.types';

interface TeleSalesAgentsState {
  agents: TeleSalesAgent[];
  currentAgent: TeleSalesAgent | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: TeleSalesAgentsState = {
  agents: [],
  currentAgent: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

export const fetchAgents = createAsyncThunk(
  'teleSalesAgents/fetchAgents',
  async (params: AgentQueryParams | undefined, { rejectWithValue }) => {
    try {
      return await teleSalesApi.getAgents(params);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch agents';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const createAgent = createAsyncThunk(
  'teleSalesAgents/createAgent',
  async (data: CreateAgentData, { rejectWithValue }) => {
    try {
      const response = await teleSalesApi.createAgent(data);
      toast.success('Agent created successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create agent';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateAgent = createAsyncThunk(
  'teleSalesAgents/updateAgent',
  async ({ id, data }: { id: string; data: UpdateAgentData }, { rejectWithValue }) => {
    try {
      const response = await teleSalesApi.updateAgent(id, data);
      toast.success('Agent updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update agent';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteAgent = createAsyncThunk(
  'teleSalesAgents/deleteAgent',
  async (id: string, { rejectWithValue }) => {
    try {
      await teleSalesApi.deleteAgent(id);
      toast.success('Agent deleted successfully!');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete agent';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const toggleAgentStatus = createAsyncThunk(
  'teleSalesAgents/toggleStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await teleSalesApi.toggleAgentStatus(id);
      toast.success(`Agent status updated to ${response.data.status}`);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to toggle status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const teleSalesAgentsSlice = createSlice({
  name: 'teleSalesAgents',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAgents.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAgents.fulfilled, (state, action) => {
        state.loading = false;
        state.agents = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchAgents.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(createAgent.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createAgent.fulfilled, (state, action) => {
        state.loading = false;
        state.agents.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createAgent.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(updateAgent.pending, (state) => { state.loading = true; })
      .addCase(updateAgent.fulfilled, (state, action) => {
        state.loading = false;
        const idx = state.agents.findIndex((a) => a._id === action.payload._id);
        if (idx !== -1) state.agents[idx] = action.payload;
      })
      .addCase(updateAgent.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(deleteAgent.fulfilled, (state, action) => {
        state.agents = state.agents.filter((a) => a._id !== action.payload);
        state.total -= 1;
      });

    builder
      .addCase(toggleAgentStatus.fulfilled, (state, action) => {
        const idx = state.agents.findIndex((a) => a._id === action.payload._id);
        if (idx !== -1) state.agents[idx] = action.payload;
      });
  },
});

export const { clearError } = teleSalesAgentsSlice.actions;
export default teleSalesAgentsSlice.reducer;
