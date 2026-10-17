import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as vaultApi from '@/api/vaultApi';
import { apiError } from '@/lib/vault';
import type {
  VaultClient,
  VaultClientInput,
  VaultLookupInput,
  VaultLookupPatch,
  VaultLookupsByType,
  VaultUser,
} from '@/types/vault.types';

// Credentials Vault setup lists: the lookups (grouped by type), the clients
// (ticketing companies) and the employee roster. Every dropdown in the vault
// reads from here; writes refetch the list so usage counts stay right.

type Status = 'idle' | 'loading' | 'succeeded' | 'failed';

export const EMPTY_LOOKUPS: VaultLookupsByType = {
  category: [],
  environment: [],
  accessLevel: [],
  mfaMethod: [],
  sensitivity: [],
  department: [],
  sendPurpose: [],
};

interface VaultLookupsState {
  byType: VaultLookupsByType;
  clients: VaultClient[];
  users: VaultUser[];
  status: Status;
  error: string | null;
}

const initialState: VaultLookupsState = {
  byType: EMPTY_LOOKUPS,
  clients: [],
  users: [],
  status: 'idle',
  error: null,
};

/** Lookups + clients + employees in one go (they are always needed together). */
export const fetchVaultSetup = createAsyncThunk('vaultLookups/fetchAll', async (_: void, { rejectWithValue }) => {
  try {
    const [lookups, clients, users] = await Promise.all([
      vaultApi.getVaultLookups(),
      vaultApi.getVaultClients(),
      vaultApi.getVaultUsers(),
    ]);
    return { byType: { ...EMPTY_LOOKUPS, ...lookups.data }, clients: clients.data ?? [], users: users.data ?? [] };
  } catch (e) {
    return rejectWithValue(apiError(e, 'Could not load the vault settings'));
  }
});

export const refreshVaultLookups = createAsyncThunk('vaultLookups/refreshLookups', async (_: void, { rejectWithValue }) => {
  try {
    return { ...EMPTY_LOOKUPS, ...(await vaultApi.getVaultLookups()).data };
  } catch (e) {
    return rejectWithValue(apiError(e, 'Could not load the lists'));
  }
});

export const refreshVaultClients = createAsyncThunk('vaultLookups/refreshClients', async (_: void, { rejectWithValue }) => {
  try {
    return (await vaultApi.getVaultClients()).data ?? [];
  } catch (e) {
    return rejectWithValue(apiError(e, 'Could not load the clients'));
  }
});

export const createLookup = createAsyncThunk(
  'vaultLookups/create',
  async (body: VaultLookupInput, { dispatch, rejectWithValue }) => {
    try {
      const res = await vaultApi.createVaultLookup(body);
      await dispatch(refreshVaultLookups());
      return res.data;
    } catch (e) {
      return rejectWithValue(apiError(e, 'Could not add the item'));
    }
  },
);

export const updateLookup = createAsyncThunk(
  'vaultLookups/update',
  async (arg: { id: string; body: VaultLookupPatch }, { dispatch, rejectWithValue }) => {
    try {
      const res = await vaultApi.updateVaultLookup(arg.id, arg.body);
      await dispatch(refreshVaultLookups());
      return res.data;
    } catch (e) {
      return rejectWithValue(apiError(e, 'Could not save the item'));
    }
  },
);

export const deleteLookup = createAsyncThunk('vaultLookups/delete', async (id: string, { dispatch, rejectWithValue }) => {
  try {
    await vaultApi.deleteVaultLookup(id);
    await dispatch(refreshVaultLookups());
    return id;
  } catch (e) {
    return rejectWithValue(apiError(e, 'Could not delete the item'));
  }
});

export const createClient = createAsyncThunk(
  'vaultLookups/createClient',
  async (body: VaultClientInput, { dispatch, rejectWithValue }) => {
    try {
      const res = await vaultApi.createVaultClient(body);
      await dispatch(refreshVaultClients());
      return res.data;
    } catch (e) {
      return rejectWithValue(apiError(e, 'Could not add the client'));
    }
  },
);

export const updateClient = createAsyncThunk(
  'vaultLookups/updateClient',
  async (arg: { id: string; body: Partial<VaultClientInput> }, { dispatch, rejectWithValue }) => {
    try {
      const res = await vaultApi.updateVaultClient(arg.id, arg.body);
      await dispatch(refreshVaultClients());
      return res.data;
    } catch (e) {
      return rejectWithValue(apiError(e, 'Could not save the client'));
    }
  },
);

export const deleteClient = createAsyncThunk('vaultLookups/deleteClient', async (id: string, { dispatch, rejectWithValue }) => {
  try {
    await vaultApi.deleteVaultClient(id);
    await dispatch(refreshVaultClients());
    return id;
  } catch (e) {
    return rejectWithValue(apiError(e, 'Could not delete the client'));
  }
});

const vaultLookupsSlice = createSlice({
  name: 'vaultLookups',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchVaultSetup.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchVaultSetup.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.byType = action.payload.byType;
        state.clients = action.payload.clients;
        state.users = action.payload.users;
      })
      .addCase(fetchVaultSetup.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Could not load the vault settings';
      })
      .addCase(refreshVaultLookups.fulfilled, (state, action) => {
        state.byType = action.payload;
      })
      .addCase(refreshVaultClients.fulfilled, (state, action) => {
        state.clients = action.payload;
      });
  },
});

export default vaultLookupsSlice.reducer;
