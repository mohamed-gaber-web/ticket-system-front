import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as vaultApi from '@/api/vaultApi';
import { apiError, apiMissing } from '@/lib/vault';
import type { VaultEntry, VaultEntryDetail, VaultEntryInput } from '@/types/vault.types';

// Credentials Vault accounts. The filters live in the URL (Accounts page query
// params); this slice holds the current page of results and the opened detail.
// Revealed passwords are NEVER stored here — see components/vault/PasswordReveal.

type Status = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface VaultSaveError {
  message: string;
  missing: string[];
}

interface VaultEntriesState {
  items: VaultEntry[];
  total: number;
  pages: number;
  status: Status;
  error: string | null;
  /** Only the latest list request may write the results. */
  requestId: string | null;
  selected: VaultEntryDetail | null;
  selectedStatus: Status;
  selectedError: string | null;
}

const initialState: VaultEntriesState = {
  items: [],
  total: 0,
  pages: 1,
  status: 'idle',
  error: null,
  requestId: null,
  selected: null,
  selectedStatus: 'idle',
  selectedError: null,
};

export const fetchVaultEntries = createAsyncThunk(
  'vaultEntries/fetch',
  async (params: vaultApi.VaultEntryListParams, { rejectWithValue }) => {
    try {
      return await vaultApi.getVaultEntries(params);
    } catch (e) {
      return rejectWithValue(apiError(e, 'Could not load the accounts'));
    }
  },
);

export const fetchVaultEntry = createAsyncThunk('vaultEntries/fetchOne', async (id: string, { rejectWithValue }) => {
  try {
    return (await vaultApi.getVaultEntry(id)).data;
  } catch (e) {
    return rejectWithValue(apiError(e, 'Could not load the account'));
  }
});

export const saveVaultEntry = createAsyncThunk<
  VaultEntry,
  { id?: string; body: VaultEntryInput },
  { rejectValue: VaultSaveError }
>('vaultEntries/save', async ({ id, body }, { rejectWithValue }) => {
  try {
    const res = id ? await vaultApi.updateVaultEntry(id, body) : await vaultApi.createVaultEntry(body);
    return res.data;
  } catch (e) {
    return rejectWithValue({ message: apiError(e, 'Could not save the account'), missing: apiMissing(e) });
  }
});

export const deleteVaultEntry = createAsyncThunk('vaultEntries/delete', async (id: string, { rejectWithValue }) => {
  try {
    await vaultApi.deleteVaultEntry(id);
    return id;
  } catch (e) {
    return rejectWithValue(apiError(e, 'Could not delete the account'));
  }
});

const vaultEntriesSlice = createSlice({
  name: 'vaultEntries',
  initialState,
  reducers: {
    clearSelectedEntry(state) {
      state.selected = null;
      state.selectedStatus = 'idle';
      state.selectedError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVaultEntries.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.requestId = action.meta.requestId;
      })
      .addCase(fetchVaultEntries.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.status = 'succeeded';
        state.items = action.payload.data ?? [];
        state.total = action.payload.total ?? state.items.length;
        state.pages = Math.max(1, action.payload.pages ?? 1);
      })
      .addCase(fetchVaultEntries.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Could not load the accounts';
      })
      .addCase(fetchVaultEntry.pending, (state) => {
        state.selectedStatus = 'loading';
        state.selectedError = null;
      })
      .addCase(fetchVaultEntry.fulfilled, (state, action) => {
        state.selectedStatus = 'succeeded';
        state.selected = action.payload;
      })
      .addCase(fetchVaultEntry.rejected, (state, action) => {
        state.selectedStatus = 'failed';
        state.selectedError = (action.payload as string) ?? 'Could not load the account';
      })
      .addCase(deleteVaultEntry.fulfilled, (state, action) => {
        state.items = state.items.filter((e) => e._id !== action.payload);
        state.total = Math.max(0, state.total - 1);
      });
  },
});

export const { clearSelectedEntry } = vaultEntriesSlice.actions;
export default vaultEntriesSlice.reducer;
