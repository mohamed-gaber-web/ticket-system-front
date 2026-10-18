import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { getCollectMeta } from '@/api/collectApi';
import { apiError } from '@/lib/collect';
import type { CollectMeta, CollectionFilter } from '@/types/collect.types';

// Grow Path Collect state: the header meta (today, contract types, tab
// badges), the screens' shared filters and the open contract drawer. Screen
// data is fetched by each page; every successful write dispatches
// `collectChanged`, which refetches the meta (badges) and bumps `dataVersion`
// so whatever is on screen reloads.

export interface CollectUi {
  year: number;
  type: string;
  customer: string;
  backlogStatus: 'active' | 'ended' | 'all';
  collectionFilter: CollectionFilter;
  chequeFilter: 'open' | 'due30' | 'guarantee' | 'returned' | 'closed' | 'all';
  drawerId: string | null;
  /** Contract editor: null = closed, 'new' = create, else the contract id. */
  editorId: string | null;
}

interface CollectState {
  meta: CollectMeta | null;
  metaStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  metaError: string | null;
  dataVersion: number;
  ui: CollectUi;
}

const initialState: CollectState = {
  meta: null,
  metaStatus: 'idle',
  metaError: null,
  dataVersion: 0,
  ui: {
    year: new Date().getFullYear(),
    type: 'all',
    customer: 'all',
    backlogStatus: 'active',
    collectionFilter: 'overdue',
    chequeFilter: 'open',
    drawerId: null,
    editorId: null,
  },
};

export const fetchCollectMeta = createAsyncThunk('collect/meta', async (_: void, { rejectWithValue }) => {
  try {
    return await getCollectMeta();
  } catch (e) {
    return rejectWithValue(apiError(e, 'تعذر تحميل البيانات'));
  }
});

/** After any write: badges and on-screen data refresh. */
export const collectChanged = createAsyncThunk('collect/changed', async (_: void, { dispatch }) => {
  await dispatch(fetchCollectMeta());
});

const collectSlice = createSlice({
  name: 'collect',
  initialState,
  reducers: {
    setCollectUi(state, action: PayloadAction<Partial<CollectUi>>) {
      Object.assign(state.ui, action.payload);
    },
    openDrawer(state, action: PayloadAction<string | null>) {
      state.ui.drawerId = action.payload;
    },
    openEditor(state, action: PayloadAction<string | null>) {
      state.ui.editorId = action.payload;
    },
  },
  extraReducers: (b) => {
    b.addCase(collectChanged.pending, (state) => {
      state.dataVersion += 1;
    })
      .addCase(fetchCollectMeta.pending, (state) => {
        state.metaStatus = 'loading';
      })
      .addCase(fetchCollectMeta.fulfilled, (state, action) => {
        const firstLoad = !state.meta;
        state.meta = action.payload;
        state.metaStatus = 'succeeded';
        state.metaError = null;
        if (firstLoad) state.ui.year = Number(action.payload.today.slice(0, 4));
      })
      .addCase(fetchCollectMeta.rejected, (state, action) => {
        state.metaStatus = 'failed';
        state.metaError = (action.payload as string) ?? 'تعذر تحميل البيانات';
      });
  },
});

export const { setCollectUi, openDrawer, openEditor } = collectSlice.actions;
export default collectSlice.reducer;
