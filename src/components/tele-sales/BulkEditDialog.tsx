import { useEffect, useState } from 'react';
import { X, Layers, UserCheck, CircleDot, CheckCircle2, AlertTriangle, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTeams } from '@/redux/slices/teleSalesTeamsSlice';
import { useTeamAgents } from '@/hooks/useTeamAgents';
import { isCrossTeamReader, ownTeams, ownTeamId } from '@/lib/teleSalesRole';
import { fetchIndustrySectors } from '@/redux/slices/industrySectorSlice';
import { fetchCountries } from '@/redux/slices/countrySlice';
import { fetchBusinessClassifications } from '@/redux/slices/businessClassificationSlice';
import * as teleSalesApi from '@/api/teleSalesApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusUpdateForm } from '@/components/tele-sales/StatusUpdateForm';
import { LEAD_STATUSES, type LeadStatus } from '@/config/leadStatusWorkflow';
import {
  ENTITY_TYPES, LEAD_SOURCE_DETAILS,
  type Lead, type LeadSource, type BulkUpdateLeadsRequest, type BulkUpdateLeadsResponse,
} from '@/types/teleSales.types';

const LEAD_SOURCES: LeadSource[] = ['LinkedIn', 'Website', 'Referral', 'Cold Call', 'Exhibition', 'Partner', 'Other'];

/**
 * Statuses the bulk update accepts — mirrors BULK_STATUSES in the backend's
 * leadBulkController.js. Left out: "No Action" (imports only), and Proposal Sent
 * / Closed Won, whose quote, file and deal value belong to one deal each.
 */
const BULK_STATUSES = LEAD_STATUSES.filter((s) => !['No Action', 'Proposal Sent', 'Closed Won'].includes(s)) as LeadStatus[];

/** The status form needs a lead; in bulk mode it only reads these blanks. */
const STAND_IN = { _id: 'bulk', status: 'No Action', meetingsCount: 0, assignedTo: null, tags: [] } as unknown as Lead;

const selectCls =
  'h-10 w-full appearance-none cursor-pointer rounded-[0.5rem] bg-surface-container-high border-none pl-3 pr-9 text-sm text-on-surface outline-none focus-visible:ring-[2px] focus-visible:ring-primary/40';

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-on-surface mb-1.5 block">{label}</span>
      <span className="relative block">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
          <option value="">— No change —</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
      </span>
    </label>
  );
}

/** Comma-separated tags → a clean list. */
const parseTags = (raw: string) => [...new Set(raw.split(',').map((t) => t.trim()).filter(Boolean))];

interface BulkEditDialogProps {
  open: boolean;
  ids: string[];
  /** Managers and admins may reassign; the owner section is hidden for others. */
  canReassign: boolean;
  onClose: () => void;
  /** After anything was saved — reload the list and clear the selection. */
  onDone: () => void;
}

type Tab = 'fields' | 'status';

/** Bulk Edit / Mass Reassignment for the records selected in a pipeline tab. */
export function BulkEditDialog({ open, ids, canReassign, onClose, onDone }: BulkEditDialogProps) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { teams } = useAppSelector((s) => s.teleSalesTeams);
  const { industrySectors } = useAppSelector((s) => s.industrySectors);
  const { countries } = useAppSelector((s) => s.countries);
  const { businessClassifications } = useAppSelector((s) => s.businessClassifications);

  const [tab, setTab] = useState<Tab>('fields');
  const [assignedTo, setAssignedTo] = useState('');
  // Team → Agent: pick the team first, then one of its employees. Someone on a
  // single team skips the picker; their own team is used.
  const crossTeam = isCrossTeamReader(user);
  const myTeams = ownTeams(user);
  const teamChoices = crossTeam ? teams.filter((t) => t.isActive) : myTeams;
  const pickTeam = crossTeam || myTeams.length > 1;
  const [reassignTeam, setReassignTeam] = useState('');
  const agentTeam = pickTeam ? reassignTeam : ownTeamId(user);
  const { agents: teamAgents, loading: agentsLoading } = useTeamAgents(open && canReassign ? agentTeam : null);
  const [set, setSet] = useState<NonNullable<BulkUpdateLeadsRequest['set']>>({});
  const [tagsAdd, setTagsAdd] = useState('');
  const [tagsRemove, setTagsRemove] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<BulkUpdateLeadsResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    setTab('fields');
    setAssignedTo('');
    setReassignTeam('');
    setSet({});
    setTagsAdd('');
    setTagsRemove('');
    setResult(null);
    if (canReassign && isCrossTeamReader(user)) dispatch(fetchTeams(undefined));
    dispatch(fetchIndustrySectors({ limit: 1000 }));
    dispatch(fetchCountries({ limit: 1000 }));
    dispatch(fetchBusinessClassifications({ limit: 1000 }));
  }, [open, canReassign, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const setField = (k: keyof NonNullable<BulkUpdateLeadsRequest['set']>, v: string) =>
    setSet((p) => ({ ...p, [k]: v || undefined, ...(k === 'leadSource' ? { leadSourceDetail: undefined } : {}) }));
  const sourceDetail = set.leadSource ? LEAD_SOURCE_DETAILS[set.leadSource] : undefined;
  const count = ids.length;

  const run = async (body: Omit<BulkUpdateLeadsRequest, 'ids'>) => {
    setSaving(true);
    try {
      const r = await teleSalesApi.bulkUpdateLeads({ ids, ...body });
      setResult(r);
      if (r.updated > 0) {
        toast.success(r.message);
        onDone();
      } else {
        toast.error('No record was updated');
      }
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(message || 'Bulk update failed');
    } finally {
      setSaving(false);
    }
  };

  const applyFields = () => {
    const cleanSet = Object.fromEntries(Object.entries(set).filter(([, v]) => v)) as BulkUpdateLeadsRequest['set'];
    const add = parseTags(tagsAdd);
    const remove = parseTags(tagsRemove);
    if (sourceDetail && !set.leadSourceDetail?.trim()) {
      toast.error(`${sourceDetail.label} is required for the "${set.leadSource}" lead source`);
      return;
    }
    if (!assignedTo && Object.keys(cleanSet ?? {}).length === 0 && !add.length && !remove.length) {
      toast.error('Choose at least one change to apply');
      return;
    }
    run({
      set: cleanSet,
      tags: add.length || remove.length ? { add, remove } : undefined,
      assignedTo: assignedTo || undefined,
    });
  };

  const active = (list: { name: string; isActive?: boolean }[]) => list.filter((x) => x.isActive !== false).map((x) => x.name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="bulk-edit-title"
        className="bg-surface rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-outline-variant/30">
        <div className="flex items-center justify-between px-7 py-5 border-b border-outline-variant/20 bg-surface-container-lowest">
          <div>
            <h2 id="bulk-edit-title" className="text-xl font-bold text-on-surface flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" /> Bulk Edit
            </h2>
            <p className="text-sm text-on-surface-variant mt-0.5">
              {count} selected record{count === 1 ? '' : 's'} — only the changes you choose are applied
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-xl hover:bg-surface-container text-on-surface-variant">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5">
          {result ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center py-2">
                {result.updated > 0
                  ? <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />
                  : <AlertTriangle className="w-12 h-12 text-amber-500 mb-2" />}
                <p className="text-lg font-semibold text-on-surface">{result.message}</p>
              </div>
              {result.skipped.length > 0 && (
                <div className="border border-outline-variant/20 rounded-xl overflow-hidden">
                  <p className="px-4 py-2 text-xs font-semibold text-on-surface-variant uppercase tracking-wide bg-surface-container/50">
                    Skipped ({result.skipped.length})
                  </p>
                  <div className="max-h-64 overflow-y-auto divide-y divide-outline-variant/10">
                    {result.skipped.map((s) => (
                      <div key={s._id} className="px-4 py-2 text-sm flex gap-3">
                        <span className="font-medium text-on-surface min-w-0 max-w-[40%] truncate" title={s.name}>{s.name}</span>
                        <span className="text-error">{s.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex gap-1 border-b border-outline-variant/20" role="tablist">
                {([['fields', 'Fields & Owner'], ['status', 'Change Status']] as [Tab, string][]).map(([t, label]) => (
                  <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                    className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'fields' ? (
                <div className="space-y-5">
                  {canReassign && (
                    <section className="rounded-2xl border border-outline-variant/30 p-5">
                      <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2 mb-3">
                        <UserCheck className="w-4 h-4 text-primary" /> Reassign Owner
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {pickTeam && (
                          <label className="block">
                            <span className="text-sm font-medium text-on-surface mb-1.5 block">Team</span>
                            <span className="relative block">
                              {/* A new team invalidates the agent picked for the old one. */}
                              <select value={reassignTeam} onChange={(e) => { setReassignTeam(e.target.value); setAssignedTo(''); }} className={selectCls}>
                                <option value="">Select a team</option>
                                {teamChoices.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                            </span>
                          </label>
                        )}
                        <label className="block">
                          <span className="text-sm font-medium text-on-surface mb-1.5 block">Assign all selected to</span>
                          <span className="relative block">
                            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={selectCls} disabled={!agentTeam}>
                              <option value="">{!agentTeam ? 'Select a team first' : agentsLoading ? 'Loading…' : '— No change —'}</option>
                              {teamAgents.map((a) => (
                                <option key={a._id} value={a._id}>{a.firstName} {a.lastName}</option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                          </span>
                        </label>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1.5">Only employees of the chosen team are listed; selected records owned by another team are skipped.</p>
                    </section>
                  )}

                  <section className="rounded-2xl border border-outline-variant/30 p-5">
                    <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2 mb-3">
                      <Layers className="w-4 h-4 text-primary" /> Field Values
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Select label="Priority" value={set.priority ?? ''} onChange={(v) => setField('priority', v)} options={['High', 'Medium', 'Low']} />
                      <Select label="Entity Type" value={set.entityType ?? ''} onChange={(v) => setField('entityType', v)} options={[...ENTITY_TYPES]} />
                      <Select label="Industry Sector" value={set.industrySector ?? ''} onChange={(v) => setField('industrySector', v)} options={active(industrySectors)} />
                      <Select label="Business Classification" value={set.businessClassification ?? ''} onChange={(v) => setField('businessClassification', v)} options={active(businessClassifications)} />
                      <Select label="Country" value={set.country ?? ''} onChange={(v) => setField('country', v)} options={active(countries)} />
                      <Select label="Lead Source" value={set.leadSource ?? ''} onChange={(v) => setField('leadSource', v)} options={LEAD_SOURCES} />
                      {sourceDetail && (
                        <label className="block sm:col-span-2">
                          <span className="text-sm font-medium text-on-surface mb-1.5 block">{sourceDetail.label} <span className="text-error">*</span></span>
                          <Input value={set.leadSourceDetail ?? ''} onChange={(e) => setSet((p) => ({ ...p, leadSourceDetail: e.target.value }))} placeholder={sourceDetail.placeholder} />
                        </label>
                      )}
                      <label className="block sm:col-span-2">
                        <span className="text-sm font-medium text-on-surface mb-1.5 block">Data Source</span>
                        <Input value={set.dataSource ?? ''} onChange={(e) => setField('dataSource', e.target.value)} placeholder="Leave empty for no change" />
                      </label>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-outline-variant/30 p-5">
                    <h3 className="text-sm font-semibold text-on-surface mb-3">Tags</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="block">
                        <span className="text-sm font-medium text-on-surface mb-1.5 block">Add tags</span>
                        <Input value={tagsAdd} onChange={(e) => setTagsAdd(e.target.value)} placeholder="vip, expo-2026" />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-on-surface mb-1.5 block">Remove tags</span>
                        <Input value={tagsRemove} onChange={(e) => setTagsRemove(e.target.value)} placeholder="old-list" />
                      </label>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1.5">Separate several tags with commas. Other tags stay as they are.</p>
                  </section>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-on-surface-variant mb-4 flex items-center gap-2">
                    <CircleDot className="w-4 h-4 text-primary" />
                    Each record still follows the status workflow; its history and reminders are recorded as usual.
                  </p>
                  <StatusUpdateForm
                    lead={STAND_IN}
                    variant="dialog"
                    bulk={{ targets: BULK_STATUSES, count, onSubmit: (newStatus, values) => run({ status: { newStatus, values } }) }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 px-7 py-4 border-t border-outline-variant/20 bg-surface-container-lowest">
          <Button variant="outline" onClick={onClose}>{result ? 'Done' : 'Cancel'}</Button>
          {!result && tab === 'fields' && (
            <Button onClick={applyFields} disabled={saving}>
              {saving ? 'Saving…' : `Apply to ${count} record${count === 1 ? '' : 's'}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
