import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import * as proposalApi from '@/api/proposalApi';
import { effectiveLayout, MAX_CUSTOM_SECTIONS, newCustomId } from '@/lib/proposalLayout';
import type {
  ImplLine,
  LegalEntity,
  LicenseLine,
  Milestone,
  ModuleMode,
  Proposal,
  ProposalCatalog,
  SowAttachment,
  SowSection,
} from '@/types/proposal.types';

// The Proposal Builder's working copy (PROPOSAL_BUILDER_SPEC.md §5.3). Every
// edit is a sync reducer that marks the draft dirty; `saveProposal` sends the
// whole document and takes the server's copy back (totals are recomputed there).

interface ProposalBuilderState {
  proposal: Proposal | null;
  catalog: ProposalCatalog | null;
  status: 'idle' | 'loading' | 'saving' | 'error';
  dirty: boolean;
  /** Bumped on every edit; a save only clears `dirty` if nothing changed while it was in flight. */
  rev: number;
  lastSavedAt: string | null;
  error: string | null;
}

const initialState: ProposalBuilderState = {
  proposal: null,
  catalog: null,
  status: 'idle',
  dirty: false,
  rev: 0,
  lastSavedAt: null,
  error: null,
};

const touch = (s: ProposalBuilderState) => {
  s.dirty = true;
  s.rev += 1;
};

const apiMessage = (error: unknown, fallback: string): string =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

let attachmentSeq = 0;
/** Client-only key so attachment rows keep their identity while reordering. */
const withKey = (a: SowAttachment): SowAttachment => ({
  ...a,
  _key: a._key ?? `a${++attachmentSeq}`,
});
const sectionKey = () => `s${++attachmentSeq}`;
const keyed = (p: Proposal): Proposal => ({
  ...p,
  layout: effectiveLayout(p),
  sow: {
    ...p.sow,
    sections: p.sow.sections.map((s) => ({
      ...s,
      _key: s._key ?? sectionKey(),
      attachments: (s.attachments ?? []).map(withKey),
    })),
  },
});
/** What the API receives: no client-only keys. */
const forApi = (p: Proposal): Proposal => ({
  ...p,
  sow: {
    ...p.sow,
    sections: p.sow.sections.map((sec) => {
      const s = { ...sec };
      delete s._key;
      return {
        ...s,
        attachments: s.attachments.map((a) => {
          const rest = { ...a };
          delete rest._key;
          return rest;
        }),
      };
    }),
  },
});

// ── Thunks ───────────────────────────────────────────────────────────────────

export const fetchCatalog = createAsyncThunk('proposalBuilder/fetchCatalog', async (_: void, { rejectWithValue }) => {
  try {
    return (await proposalApi.getProposalCatalog()).data;
  } catch (error) {
    return rejectWithValue(apiMessage(error, 'Failed to load the price list'));
  }
});

export const fetchProposal = createAsyncThunk('proposalBuilder/fetchProposal', async (id: string, { rejectWithValue }) => {
  try {
    return (await proposalApi.getProposal(id)).data;
  } catch (error) {
    return rejectWithValue(apiMessage(error, 'Failed to load the proposal'));
  }
});

export const createFromOpportunity = createAsyncThunk(
  'proposalBuilder/createFromOpportunity',
  async ({ leadId, fromProposalId }: { leadId: string; fromProposalId?: string }, { rejectWithValue }) => {
    try {
      const res = await proposalApi.createProposal(leadId, fromProposalId);
      toast.success(`Proposal ${res.data.number} created`);
      return res.data;
    } catch (error) {
      const message = apiMessage(error, 'Failed to create the proposal');
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

export const saveProposal = createAsyncThunk(
  'proposalBuilder/saveProposal',
  async ({ quiet }: { quiet?: boolean } | undefined = {}, { getState, rejectWithValue }) => {
    const { proposalBuilder } = getState() as {
      proposalBuilder: ProposalBuilderState;
    };
    const p = proposalBuilder.proposal;
    if (!p) return rejectWithValue('Nothing to save');
    const rev = proposalBuilder.rev;
    try {
      const res = await proposalApi.saveProposal(p._id, forApi(p));
      // A content change on a Pending approval / Approved proposal sends it back to
      // Draft; say so even on a quiet autosave (the API's message explains it).
      const reopened = (p.status === 'Pending approval' || p.status === 'Approved') && res.data.status === 'Draft';
      if (reopened) toast.info(res.message || 'Changes need approval again.');
      else if (!quiet) toast.success(res.message || `Saved ${res.data.number}`);
      return { proposal: res.data, rev };
    } catch (error) {
      const message = apiMessage(error, 'Failed to save the proposal');
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

/** Saves pending edits first, then runs a workflow action on the server copy. */
const workflowThunk = (type: string, call: (id: string) => Promise<{ data: Proposal; message?: string }>, ok: string) =>
  createAsyncThunk(`proposalBuilder/${type}`, async (_: void, { getState, dispatch, rejectWithValue }) => {
    const { proposalBuilder } = getState() as {
      proposalBuilder: ProposalBuilderState;
    };
    const p = proposalBuilder.proposal;
    if (!p) return rejectWithValue('No proposal');
    try {
      if (proposalBuilder.dirty) await dispatch(saveProposal({ quiet: true })).unwrap();
      const res = await call(p._id);
      toast.success(res.message || ok);
      return res.data;
    } catch (error) {
      const message = typeof error === 'string' ? error : apiMessage(error, 'Action failed');
      if (typeof error !== 'string') toast.error(message);
      return rejectWithValue(message);
    }
  });

export const requestApproval = workflowThunk('requestApproval', proposalApi.requestProposalApproval, 'Sent for approval');
export const approveProposal = workflowThunk('approveProposal', proposalApi.approveProposal, 'Proposal approved');
/** Admin only: sends a Pending approval proposal back to Draft with the reason. */
export const rejectProposal = createAsyncThunk(
  'proposalBuilder/rejectProposal',
  async ({ reason }: { reason: string }, { getState, rejectWithValue }) => {
    const p = (getState() as { proposalBuilder: ProposalBuilderState }).proposalBuilder.proposal;
    if (!p) return rejectWithValue('No proposal');
    try {
      const res = await proposalApi.rejectProposal(p._id, reason);
      toast.success(res.message || 'Proposal sent back to Draft');
      return res.data;
    } catch (error) {
      const message = apiMessage(error, 'Could not reject the proposal');
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);
export const rebuildFromOpportunity = workflowThunk('rebuild', proposalApi.rebuildProposal, 'Proposal rebuilt from the opportunity');

export const uploadAttachment = createAsyncThunk(
  'proposalBuilder/uploadAttachment',
  async (
    {
      sectionIdx,
      blob,
      width,
      height,
      caption = '',
    }: {
      sectionIdx: number;
      blob: Blob;
      width: number;
      height: number;
      caption?: string;
    },
    { getState, rejectWithValue },
  ) => {
    const { proposalBuilder } = getState() as {
      proposalBuilder: ProposalBuilderState;
    };
    const p = proposalBuilder.proposal;
    if (!p) return rejectWithValue('No proposal');
    // Sections can be removed or replaced while the upload runs: aim at this one by key.
    const targetKey = p.sow.sections[sectionIdx]?._key;
    try {
      const res = await proposalApi.uploadProposalImage(p._id, blob, width, height);
      const now = (getState() as { proposalBuilder: ProposalBuilderState }).proposalBuilder.proposal;
      if (!now?.sow.sections.some((x) => x._key === targetKey)) {
        toast.warning('That section was removed before the image finished uploading, so the image was not added.');
      } else toast.success('Image added');
      return {
        sectionKey: targetKey,
        attachment: {
          type: 'image',
          caption,
          widthPct: 100,
          ...res.data,
        } as SowAttachment,
      };
    } catch (error) {
      const message = apiMessage(error, 'Could not upload the image');
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

// ── Slice ────────────────────────────────────────────────────────────────────

const slice = createSlice({
  name: 'proposalBuilder',
  initialState,
  reducers: {
    resetBuilder: (s) => {
      s.proposal = null;
      s.dirty = false;
      s.status = 'idle';
      s.error = null;
    },
    markSaved: (s) => {
      s.dirty = false;
    },
    setField: <K extends 'presentedDate' | 'vat'>(s: ProposalBuilderState, a: PayloadAction<{ key: K; value: Proposal[K] }>) => {
      if (!s.proposal) return;
      s.proposal[a.payload.key] = a.payload.value;
      touch(s);
    },
    setNotes: (s, a: PayloadAction<string[]>) => {
      if (!s.proposal) return;
      s.proposal.notes = a.payload;
      touch(s);
    },
    setTerms: (s, a: PayloadAction<string[]>) => {
      if (!s.proposal) return;
      s.proposal.terms = a.payload;
      touch(s);
    },
    // section layout (order + visibility + the rep's own sections)
    toggleLayoutItem: (s, a: PayloadAction<number>) => {
      const item = s.proposal?.layout?.[a.payload];
      if (!item) return;
      item.visible = !item.visible;
      touch(s);
    },
    moveLayoutItem: (s, a: PayloadAction<{ i: number; dir: -1 | 1 }>) => {
      const list = s.proposal?.layout;
      if (!list) return;
      const { i, dir } = a.payload;
      const k = i + dir;
      if (k < 0 || k >= list.length) return;
      [list[i], list[k]] = [list[k], list[i]];
      touch(s);
    },
    addCustomSection: (s, a: PayloadAction<{ at: number }>) => {
      const list = s.proposal?.layout;
      if (!list || list.filter((x) => x.key === 'custom').length >= MAX_CUSTOM_SECTIONS) return;
      const at = Math.max(0, Math.min(list.length, a.payload.at));
      list.splice(at, 0, {
        key: 'custom',
        id: newCustomId(),
        title: 'New section',
        body: '',
        visible: true,
      });
      touch(s);
    },
    updateCustomSection: (s, a: PayloadAction<{ i: number; patch: { title?: string; body?: string } }>) => {
      const item = s.proposal?.layout?.[a.payload.i];
      if (!item || item.key !== 'custom') return;
      Object.assign(item, a.payload.patch);
      touch(s);
    },
    removeCustomSection: (s, a: PayloadAction<number>) => {
      const list = s.proposal?.layout;
      if (!list || list[a.payload]?.key !== 'custom') return;
      list.splice(a.payload, 1);
      touch(s);
    },
    setModule: (
      s,
      a: PayloadAction<{
        group: string;
        module: string;
        mode: ModuleMode | '';
      }>,
    ) => {
      if (!s.proposal) return;
      const { group, module, mode } = a.payload;
      const list = s.proposal.modules;
      const i = list.findIndex((m) => m.group === group && m.module === module);
      if (!mode) {
        if (i >= 0) list.splice(i, 1);
      } else if (i >= 0) list[i].mode = mode;
      else list.push({ group, module, mode });
      touch(s);
    },

    // legal entities
    addEntity: (s) => {
      if (!s.proposal) return;
      s.proposal.legalEntities.push({
        name: '',
        location: s.proposal.country,
        industry: '',
      });
      touch(s);
    },
    updateEntity: (s, a: PayloadAction<{ i: number; patch: Partial<LegalEntity> }>) => {
      const e = s.proposal?.legalEntities[a.payload.i];
      if (!e) return;
      Object.assign(e, a.payload.patch);
      touch(s);
    },
    removeEntity: (s, a: PayloadAction<number>) => {
      if (!s.proposal) return;
      s.proposal.legalEntities.splice(a.payload, 1);
      touch(s);
    },

    // SOW
    setSowTemplate: (s, a: PayloadAction<string>) => {
      if (!s.proposal || !s.catalog) return;
      const tpl = s.catalog.config.sowTemplates[a.payload] ?? [];
      s.proposal.sow.templateKey = a.payload;
      s.proposal.sow.sections = tpl.map((t) => ({
        _key: sectionKey(),
        title: t.t,
        body: t.b,
        attachments: [],
      }));
      touch(s);
    },
    setDuration: (s, a: PayloadAction<string>) => {
      if (!s.proposal) return;
      s.proposal.sow.duration = a.payload;
      touch(s);
    },
    updateSection: (
      s,
      a: PayloadAction<{
        i: number;
        patch: Partial<Pick<SowSection, 'title' | 'body'>>;
      }>,
    ) => {
      const sec = s.proposal?.sow.sections[a.payload.i];
      if (!sec) return;
      Object.assign(sec, a.payload.patch);
      touch(s);
    },
    addSection: (s) => {
      if (!s.proposal) return;
      s.proposal.sow.sections.push({
        _key: sectionKey(),
        title: 'New section',
        body: '',
        attachments: [],
      });
      touch(s);
    },
    removeSection: (s, a: PayloadAction<number>) => {
      if (!s.proposal) return;
      s.proposal.sow.sections.splice(a.payload, 1);
      touch(s);
    },
    appendSectionText: (s, a: PayloadAction<{ i: number; text: string }>) => {
      const sec = s.proposal?.sow.sections[a.payload.i];
      if (!sec) return;
      sec.body = sec.body ? `${sec.body}\n${a.payload.text}` : a.payload.text;
      touch(s);
    },
    addAttachment: (s, a: PayloadAction<{ i: number; attachment: SowAttachment }>) => {
      const sec = s.proposal?.sow.sections[a.payload.i];
      if (!sec) return;
      sec.attachments.push(withKey(a.payload.attachment));
      touch(s);
    },
    updateAttachment: (s, a: PayloadAction<{ i: number; j: number; patch: Partial<SowAttachment> }>) => {
      const att = s.proposal?.sow.sections[a.payload.i]?.attachments[a.payload.j];
      if (!att) return;
      Object.assign(att, a.payload.patch);
      touch(s);
    },
    moveAttachment: (s, a: PayloadAction<{ i: number; j: number; dir: -1 | 1 }>) => {
      const list = s.proposal?.sow.sections[a.payload.i]?.attachments;
      if (!list) return;
      const { j, dir } = a.payload;
      const k = j + dir;
      if (k < 0 || k >= list.length) return;
      [list[j], list[k]] = [list[k], list[j]];
      touch(s);
    },
    removeAttachment: (s, a: PayloadAction<{ i: number; j: number }>) => {
      const list = s.proposal?.sow.sections[a.payload.i]?.attachments;
      if (!list) return;
      list.splice(a.payload.j, 1);
      touch(s);
    },

    // pricing
    addImplGroup: (s) => {
      if (!s.proposal) return;
      s.proposal.implementation.groups.push({
        title: 'Implementation',
        lines: [],
      });
      touch(s);
    },
    updateImplGroup: (s, a: PayloadAction<{ g: number; title: string }>) => {
      const grp = s.proposal?.implementation.groups[a.payload.g];
      if (!grp) return;
      grp.title = a.payload.title;
      touch(s);
    },
    removeImplGroup: (s, a: PayloadAction<number>) => {
      if (!s.proposal) return;
      s.proposal.implementation.groups.splice(a.payload, 1);
      touch(s);
    },
    addImplLine: (s, a: PayloadAction<{ g: number; line: ImplLine }>) => {
      const grp = s.proposal?.implementation.groups[a.payload.g];
      if (!grp) return;
      grp.lines.push(a.payload.line);
      touch(s);
    },
    updateImplLine: (s, a: PayloadAction<{ g: number; i: number; patch: Partial<ImplLine> }>) => {
      const line = s.proposal?.implementation.groups[a.payload.g]?.lines[a.payload.i];
      if (!line) return;
      Object.assign(line, a.payload.patch);
      touch(s);
    },
    removeImplLine: (s, a: PayloadAction<{ g: number; i: number }>) => {
      const grp = s.proposal?.implementation.groups[a.payload.g];
      if (!grp) return;
      grp.lines.splice(a.payload.i, 1);
      touch(s);
    },
    setImplDiscount: (s, a: PayloadAction<number>) => {
      if (!s.proposal) return;
      s.proposal.implementation.discountPct = a.payload;
      touch(s);
    },
    addLicense: (s, a: PayloadAction<LicenseLine>) => {
      if (!s.proposal) return;
      s.proposal.licenses.lines.push(a.payload);
      touch(s);
    },
    updateLicense: (s, a: PayloadAction<{ i: number; patch: Partial<LicenseLine> }>) => {
      const line = s.proposal?.licenses.lines[a.payload.i];
      if (!line) return;
      Object.assign(line, a.payload.patch);
      touch(s);
    },
    removeLicense: (s, a: PayloadAction<number>) => {
      if (!s.proposal) return;
      s.proposal.licenses.lines.splice(a.payload, 1);
      touch(s);
    },
    setLicenseField: (
      s,
      a: PayloadAction<{ key: 'discountPct' | 'termMonths'; value: number } | { key: 'payInAdvance'; value: boolean }>,
    ) => {
      if (!s.proposal) return;
      (s.proposal.licenses as Record<string, unknown>)[a.payload.key] = a.payload.value;
      touch(s);
    },

    // payment terms
    setPaymentPreset: (s, a: PayloadAction<string>) => {
      if (!s.proposal || !s.catalog) return;
      s.proposal.payment.preset = a.payload;
      const preset = s.catalog.config.paymentPresets[a.payload];
      if (preset)
        s.proposal.payment.milestones = preset.map((m) => ({
          phase: m.phase,
          items: m.items
            .split('\n')
            .map((x) => x.trim())
            .filter(Boolean),
          pct: m.pct,
        }));
      touch(s);
    },
    updateMilestone: (s, a: PayloadAction<{ i: number; patch: Partial<Milestone> }>) => {
      const m = s.proposal?.payment.milestones[a.payload.i];
      if (!m || !s.proposal) return;
      Object.assign(m, a.payload.patch);
      s.proposal.payment.preset = 'Custom';
      touch(s);
    },
    addMilestone: (s) => {
      if (!s.proposal) return;
      s.proposal.payment.milestones.push({
        phase: 'Milestone',
        items: [],
        pct: 0,
      });
      s.proposal.payment.preset = 'Custom';
      touch(s);
    },
    removeMilestone: (s, a: PayloadAction<number>) => {
      if (!s.proposal) return;
      s.proposal.payment.milestones.splice(a.payload, 1);
      s.proposal.payment.preset = 'Custom';
      touch(s);
    },
  },
  extraReducers: (builder) => {
    const loaded = (s: ProposalBuilderState, p: Proposal) => {
      s.proposal = keyed(p);
      s.status = 'idle';
      s.dirty = false;
      s.error = null;
    };
    builder
      .addCase(fetchCatalog.fulfilled, (s, a) => {
        s.catalog = a.payload;
      })
      .addCase(fetchCatalog.rejected, (s, a) => {
        s.error = (a.payload as string) ?? 'Failed to load the price list';
      })
      .addCase(fetchProposal.pending, (s) => {
        s.status = 'loading';
        s.error = null;
      })
      .addCase(fetchProposal.fulfilled, (s, a) => loaded(s, a.payload))
      .addCase(fetchProposal.rejected, (s, a) => {
        s.status = 'error';
        s.error = (a.payload as string) ?? 'Failed to load the proposal';
      })
      .addCase(createFromOpportunity.fulfilled, (s, a) => loaded(s, a.payload))
      .addCase(saveProposal.pending, (s) => {
        s.status = 'saving';
      })
      .addCase(saveProposal.fulfilled, (s, a) => {
        // Keep edits typed while the request was in flight: only the server-owned
        // fields are taken from the response unless nothing changed meanwhile.
        const { proposal: saved, rev } = a.payload;
        const cur = s.proposal;
        if (!cur || cur._id !== saved._id) return; // a late save of a proposal no longer open
        cur.status = saved.status;
        cur.totals = saved.totals;
        cur.approvedBy = saved.approvedBy;
        cur.approvedAt = saved.approvedAt;
        cur.rejection = saved.rejection;
        cur.updatedAt = saved.updatedAt;
        cur.permissions = saved.permissions;
        s.status = 'idle';
        s.dirty = s.rev !== rev;
        s.lastSavedAt = new Date().toISOString();
      })
      .addCase(saveProposal.rejected, (s) => {
        s.status = 'idle';
      });
    for (const thunk of [requestApproval, approveProposal, rejectProposal, rebuildFromOpportunity]) {
      builder.addCase(thunk.fulfilled, (s, a) => {
        loaded(s, a.payload);
        s.lastSavedAt = new Date().toISOString();
      });
    }
    builder.addCase(uploadAttachment.fulfilled, (s, a) => {
      const sec = s.proposal?.sow.sections.find((x) => x._key === a.payload.sectionKey);
      if (!sec) return;
      sec.attachments.push(withKey(a.payload.attachment));
      touch(s);
    });
  },
});

export const {
  resetBuilder,
  markSaved,
  setField,
  setNotes,
  setTerms,
  toggleLayoutItem,
  moveLayoutItem,
  addCustomSection,
  updateCustomSection,
  removeCustomSection,
  setModule,
  addEntity,
  updateEntity,
  removeEntity,
  setSowTemplate,
  setDuration,
  updateSection,
  addSection,
  removeSection,
  appendSectionText,
  addAttachment,
  updateAttachment,
  moveAttachment,
  removeAttachment,
  addImplGroup,
  updateImplGroup,
  removeImplGroup,
  addImplLine,
  updateImplLine,
  removeImplLine,
  setImplDiscount,
  addLicense,
  updateLicense,
  removeLicense,
  setLicenseField,
  setPaymentPreset,
  updateMilestone,
  addMilestone,
  removeMilestone,
} = slice.actions;

export default slice.reducer;
