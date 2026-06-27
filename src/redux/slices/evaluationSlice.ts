import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import * as evaluationApi from '@/api/evaluationApi';
import type { AdminScores, EvaluationData, EvaluationState } from '@/types/evaluation.types';

const initialState: EvaluationState = {
  data: null,
  loading: false,
  saving: false,
  error: null,
};

export const fetchEvaluation = createAsyncThunk(
  'evaluation/fetch',
  async (
    { employeeId, year, month }: { employeeId: string; year: number; month: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await evaluationApi.getEvaluation(employeeId, year, month);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to load evaluation';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const saveEvaluation = createAsyncThunk(
  'evaluation/save',
  async (
    {
      employeeId,
      year,
      month,
      scores,
    }: { employeeId: string; year: number; month: number; scores: Partial<AdminScores> },
    { rejectWithValue }
  ) => {
    try {
      await evaluationApi.saveEvaluation(employeeId, year, month, scores);
      // Re-fetch to get the recalculated totals
      const updated = await evaluationApi.getEvaluation(employeeId, year, month);
      toast.success('Evaluation saved');
      return updated.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save evaluation';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const evaluationSlice = createSlice({
  name: 'evaluation',
  initialState,
  reducers: {
    clearEvaluation: (state) => {
      state.data = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchEvaluation
      .addCase(fetchEvaluation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEvaluation.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload as EvaluationData;
      })
      .addCase(fetchEvaluation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // saveEvaluation
      .addCase(saveEvaluation.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveEvaluation.fulfilled, (state, action) => {
        state.saving = false;
        state.data = action.payload as EvaluationData;
      })
      .addCase(saveEvaluation.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearEvaluation } = evaluationSlice.actions;
export default evaluationSlice.reducer;
