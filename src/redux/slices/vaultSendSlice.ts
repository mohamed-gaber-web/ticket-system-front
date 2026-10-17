import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import * as vaultApi from '@/api/vaultApi';
import { apiError } from '@/lib/vault';
import type { VaultEntry, VaultSendInput, VaultSendPreview, VaultSendResult } from '@/types/vault.types';

// The Send Credentials screen: the form draft (kept while the user moves
// between vault tabs, so a card's "Send" button can pre-select an account),
// the masked live preview and the accounts offered in the checklist.

type Status = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface VaultSendDraft {
  recipientName: string;
  recipientEmail: string;
  purposeId: string;
  entryIds: string[];
  includePasswords: boolean;
  approval: { confirmed: boolean; approverName: string };
}

const emptyDraft = (): VaultSendDraft => ({
  recipientName: '',
  recipientEmail: '',
  purposeId: '',
  entryIds: [],
  includePasswords: true,
  approval: { confirmed: false, approverName: '' },
});

interface VaultSendState {
  draft: VaultSendDraft;
  options: VaultEntry[];
  optionsStatus: Status;
  optionsError: string | null;
  preview: VaultSendPreview | null;
  previewStatus: Status;
  previewError: string | null;
  previewRequestId: string | null;
  sendStatus: Status;
}

const initialState: VaultSendState = {
  draft: emptyDraft(),
  options: [],
  optionsStatus: 'idle',
  optionsError: null,
  preview: null,
  previewStatus: 'idle',
  previewError: null,
  previewRequestId: null,
  sendStatus: 'idle',
};

/** The draft as the API body (approval only when it carries something). */
export const toSendBody = (d: VaultSendDraft): VaultSendInput => ({
  recipientName: d.recipientName.trim(),
  recipientEmail: d.recipientEmail.trim(),
  purposeId: d.purposeId || undefined,
  entryIds: d.entryIds,
  includePasswords: d.includePasswords,
  approval: d.approval.confirmed || d.approval.approverName.trim()
    ? { confirmed: d.approval.confirmed, approverName: d.approval.approverName.trim() }
    : undefined,
});

/** Every account, for the checklist (the vault is small; 500 is plenty). */
export const fetchSendOptions = createAsyncThunk('vaultSend/options', async (_: void, { rejectWithValue }) => {
  try {
    return (await vaultApi.getVaultEntries({ limit: 500, page: 1 })).data ?? [];
  } catch (e) {
    return rejectWithValue(apiError(e, 'Could not load the accounts'));
  }
});

export const fetchSendPreview = createAsyncThunk('vaultSend/preview', async (body: VaultSendInput, { rejectWithValue }) => {
  try {
    return (await vaultApi.previewVaultSend(body)).data;
  } catch (e) {
    return rejectWithValue(apiError(e, 'Could not build the preview'));
  }
});

export const sendCredentials = createAsyncThunk<VaultSendResult, VaultSendInput, { rejectValue: string }>(
  'vaultSend/send',
  async (body, { rejectWithValue }) => {
    try {
      return (await vaultApi.sendVaultCredentials(body)).data;
    } catch (e) {
      return rejectWithValue(apiError(e, 'Could not send the email'));
    }
  },
);

const vaultSendSlice = createSlice({
  name: 'vaultSend',
  initialState,
  reducers: {
    /** Used by an account card's "Send" button before navigating to /vault/send. */
    setSendDraftEntries(state, action: PayloadAction<string[]>) {
      state.draft.entryIds = [...new Set(action.payload)];
    },
    updateSendDraft(state, action: PayloadAction<Partial<Omit<VaultSendDraft, 'approval'>>>) {
      Object.assign(state.draft, action.payload);
    },
    updateSendApproval(state, action: PayloadAction<Partial<VaultSendDraft['approval']>>) {
      Object.assign(state.draft.approval, action.payload);
    },
    toggleSendEntry(state, action: PayloadAction<string>) {
      const ids = state.draft.entryIds;
      state.draft.entryIds = ids.includes(action.payload) ? ids.filter((x) => x !== action.payload) : [...ids, action.payload];
    },
    resetSendDraft(state) {
      state.draft = emptyDraft();
      state.preview = null;
      state.previewStatus = 'idle';
      state.previewError = null;
      state.previewRequestId = null;
    },
    clearSendPreview(state) {
      state.preview = null;
      state.previewStatus = 'idle';
      state.previewError = null;
      state.previewRequestId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSendOptions.pending, (state) => {
        state.optionsStatus = 'loading';
        state.optionsError = null;
      })
      .addCase(fetchSendOptions.fulfilled, (state, action) => {
        state.optionsStatus = 'succeeded';
        state.options = action.payload;
        // Drop selections that no longer exist (deleted meanwhile).
        const ids = new Set(action.payload.map((e) => e._id));
        state.draft.entryIds = state.draft.entryIds.filter((id) => ids.has(id));
      })
      .addCase(fetchSendOptions.rejected, (state, action) => {
        state.optionsStatus = 'failed';
        state.optionsError = (action.payload as string) ?? 'Could not load the accounts';
      })
      .addCase(fetchSendPreview.pending, (state, action) => {
        state.previewStatus = 'loading';
        state.previewRequestId = action.meta.requestId;
      })
      .addCase(fetchSendPreview.fulfilled, (state, action) => {
        if (state.previewRequestId !== action.meta.requestId) return;
        state.previewStatus = 'succeeded';
        state.previewError = null;
        state.preview = action.payload;
      })
      .addCase(fetchSendPreview.rejected, (state, action) => {
        if (state.previewRequestId !== action.meta.requestId) return;
        state.previewStatus = 'failed';
        state.previewError = (action.payload as string) ?? 'Could not build the preview';
      })
      .addCase(sendCredentials.pending, (state) => {
        state.sendStatus = 'loading';
      })
      .addCase(sendCredentials.fulfilled, (state) => {
        state.sendStatus = 'succeeded';
      })
      .addCase(sendCredentials.rejected, (state) => {
        state.sendStatus = 'failed';
      });
  },
});

export const {
  setSendDraftEntries,
  updateSendDraft,
  updateSendApproval,
  toggleSendEntry,
  resetSendDraft,
  clearSendPreview,
} = vaultSendSlice.actions;
export default vaultSendSlice.reducer;
