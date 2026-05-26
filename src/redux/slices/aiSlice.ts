import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import * as aiApi from '@/api/aiApi';
import type { Ticket } from '@/types/ticket';
import type {
  AnalyzeTicketRequest,
  AnalyzeTicketResponse,
  DraftReplyRequest,
  DraftReplyResponse,
  TicketInsightsResponse,
  ParseSearchResponse,
} from '@/api/aiApi';

interface AIState {
  autoFill: {
    loading: boolean;
    suggestions: AnalyzeTicketResponse | null;
    error: string | null;
    acceptedFields: string[];
  };
  replyDraft: {
    loading: boolean;
    draft: string | null;
    error: string | null;
  };
  insights: {
    loading: boolean;
    data: TicketInsightsResponse | null;
    error: string | null;
    lastTicketId: string | null;
  };
  nlSearch: {
    loading: boolean;
    parsedParams: ParseSearchResponse | null;
    error: string | null;
    rawQuery: string;
  };
}

const initialState: AIState = {
  autoFill: { loading: false, suggestions: null, error: null, acceptedFields: [] },
  replyDraft: { loading: false, draft: null, error: null },
  insights: { loading: false, data: null, error: null, lastTicketId: null },
  nlSearch: { loading: false, parsedParams: null, error: null, rawQuery: '' },
};

export const fetchAutoFillSuggestions = createAsyncThunk(
  'ai/fetchAutoFillSuggestions',
  async (payload: AnalyzeTicketRequest, { rejectWithValue }) => {
    try {
      return await aiApi.analyzeTicket(payload);
    } catch (error: any) {
      const message = error.response?.data?.message || 'AI analysis unavailable. Please fill in the fields manually.';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchAiReplyDraft = createAsyncThunk(
  'ai/fetchAiReplyDraft',
  async (payload: DraftReplyRequest, { rejectWithValue }) => {
    try {
      return await aiApi.draftReply(payload);
    } catch (error: any) {
      const message = error.response?.data?.message || 'AI draft unavailable. Please write your reply manually.';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchTicketInsights = createAsyncThunk(
  'ai/fetchTicketInsights',
  async (ticket: Ticket, { rejectWithValue }) => {
    try {
      return await aiApi.getTicketInsights(ticket);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Could not generate insights. Please try again.';
      return rejectWithValue(message);
    }
  }
);

export const fetchNlSearch = createAsyncThunk(
  'ai/fetchNlSearch',
  async (query: string, { rejectWithValue }) => {
    try {
      return await aiApi.parseSearch(query);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Could not parse your query. Try the standard filters instead.';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    clearAutoFillSuggestions(state) {
      state.autoFill = { loading: false, suggestions: null, error: null, acceptedFields: [] };
    },
    acceptAutoFillField(state, action) {
      if (!state.autoFill.acceptedFields.includes(action.payload)) {
        state.autoFill.acceptedFields.push(action.payload);
      }
    },
    clearReplyDraft(state) {
      state.replyDraft = { loading: false, draft: null, error: null };
    },
    clearInsights(state) {
      state.insights = { loading: false, data: null, error: null, lastTicketId: null };
    },
    clearNlSearch(state) {
      state.nlSearch = { loading: false, parsedParams: null, error: null, rawQuery: '' };
    },
  },
  extraReducers: (builder) => {
    builder
      // Auto-fill
      .addCase(fetchAutoFillSuggestions.pending, (state) => {
        state.autoFill.loading = true;
        state.autoFill.error = null;
      })
      .addCase(fetchAutoFillSuggestions.fulfilled, (state, action) => {
        state.autoFill.loading = false;
        state.autoFill.suggestions = action.payload;
        state.autoFill.acceptedFields = [];
      })
      .addCase(fetchAutoFillSuggestions.rejected, (state, action) => {
        state.autoFill.loading = false;
        state.autoFill.error = action.payload as string;
      })
      // Reply draft
      .addCase(fetchAiReplyDraft.pending, (state) => {
        state.replyDraft.loading = true;
        state.replyDraft.draft = null;
        state.replyDraft.error = null;
      })
      .addCase(fetchAiReplyDraft.fulfilled, (state, action) => {
        state.replyDraft.loading = false;
        state.replyDraft.draft = (action.payload as DraftReplyResponse).draft;
      })
      .addCase(fetchAiReplyDraft.rejected, (state, action) => {
        state.replyDraft.loading = false;
        state.replyDraft.error = action.payload as string;
      })
      // Insights
      .addCase(fetchTicketInsights.pending, (state) => {
        state.insights.loading = true;
        state.insights.error = null;
      })
      .addCase(fetchTicketInsights.fulfilled, (state, action) => {
        state.insights.loading = false;
        state.insights.data = action.payload as TicketInsightsResponse;
        state.insights.lastTicketId = (action.meta.arg as Ticket)._id;
      })
      .addCase(fetchTicketInsights.rejected, (state, action) => {
        state.insights.loading = false;
        state.insights.error = action.payload as string;
      })
      // NL search
      .addCase(fetchNlSearch.pending, (state, action) => {
        state.nlSearch.loading = true;
        state.nlSearch.error = null;
        state.nlSearch.rawQuery = action.meta.arg as string;
      })
      .addCase(fetchNlSearch.fulfilled, (state, action) => {
        state.nlSearch.loading = false;
        state.nlSearch.parsedParams = action.payload as ParseSearchResponse;
      })
      .addCase(fetchNlSearch.rejected, (state, action) => {
        state.nlSearch.loading = false;
        state.nlSearch.error = action.payload as string;
      });
  },
});

export const {
  clearAutoFillSuggestions,
  acceptAutoFillField,
  clearReplyDraft,
  clearInsights,
  clearNlSearch,
} = aiSlice.actions;

export default aiSlice.reducer;
