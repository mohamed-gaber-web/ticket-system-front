import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as ticketApi from '@/api/ticketApi';
import { toast } from 'sonner';
import type { Ticket, CreateTicketData, UpdateTicketData, TicketQueryParams } from '@/types/ticket';

interface TicketState {
  tickets: Ticket[];
  currentTicket: Ticket | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: TicketState = {
  tickets: [],
  currentTicket: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

// Async thunks
export const fetchTickets = createAsyncThunk(
  'tickets/fetchTickets',
  async (params: TicketQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await ticketApi.getTickets(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch tickets';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchTicketById = createAsyncThunk(
  'tickets/fetchTicketById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await ticketApi.getTicketById(id);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch ticket';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchTicketsByStatus = createAsyncThunk(
  'tickets/fetchTicketsByStatus',
  async (status: string, { rejectWithValue }) => {
    try {
      const response = await ticketApi.getTicketsByStatus(status);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch tickets by status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchTicketsByPriority = createAsyncThunk(
  'tickets/fetchTicketsByPriority',
  async (priority: string, { rejectWithValue }) => {
    try {
      const response = await ticketApi.getTicketsByPriority(priority);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch tickets by priority';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const createTicket = createAsyncThunk(
  'tickets/createTicket',
  async (data: CreateTicketData, { rejectWithValue }) => {
    try {
      console.log('Creating ticket with data:', data);
      const response = await ticketApi.createTicket(data);
      console.log('Ticket created successfully:', response);
      toast.success('Ticket created successfully!');
      return response.data;
    } catch (error: any) {
      console.error('Ticket creation error:', error);
      console.error('Error response:', error.response?.data);
      const message = error.response?.data?.message || 'Failed to create ticket';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateTicket = createAsyncThunk(
  'tickets/updateTicket',
  async ({ id, data }: { id: string; data: UpdateTicketData }, { rejectWithValue }) => {
    try {
      const response = await ticketApi.updateTicket(id, data);
      toast.success('Ticket updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update ticket';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteTicket = createAsyncThunk(
  'tickets/deleteTicket',
  async (id: string, { rejectWithValue }) => {
    try {
      await ticketApi.deleteTicket(id);
      toast.success('Ticket deleted successfully!');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete ticket';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Slice
const ticketSlice = createSlice({
  name: 'tickets',
  initialState,
  reducers: {
    clearCurrentTicket: (state) => {
      state.currentTicket = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch tickets
    builder
      .addCase(fetchTickets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTickets.fulfilled, (state, action) => {
        state.loading = false;
        state.tickets = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchTickets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch ticket by ID
    builder
      .addCase(fetchTicketById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTicketById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTicket = action.payload;
      })
      .addCase(fetchTicketById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch tickets by status
    builder
      .addCase(fetchTicketsByStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTicketsByStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.tickets = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchTicketsByStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch tickets by priority
    builder
      .addCase(fetchTicketsByPriority.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTicketsByPriority.fulfilled, (state, action) => {
        state.loading = false;
        state.tickets = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchTicketsByPriority.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create ticket
    builder
      .addCase(createTicket.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTicket.fulfilled, (state, action) => {
        state.loading = false;
        state.tickets.unshift(action.payload);
      })
      .addCase(createTicket.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update ticket
    builder
      .addCase(updateTicket.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTicket.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.tickets.findIndex((t) => t._id === action.payload._id);
        if (index !== -1) {
          state.tickets[index] = action.payload;
        }
        state.currentTicket = action.payload;
      })
      .addCase(updateTicket.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete ticket
    builder
      .addCase(deleteTicket.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTicket.fulfilled, (state, action) => {
        state.loading = false;
        state.tickets = state.tickets.filter((t) => t._id !== action.payload);
      })
      .addCase(deleteTicket.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentTicket, clearError } = ticketSlice.actions;
export default ticketSlice.reducer;
