import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Building2, Loader2, Plus, RefreshCw, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchSelect } from '@/components/ui/search-select';
import { Field, SelectField } from '@/components/tele-sales/LeadFieldControls';
import { useLeadPickerOptions, withCurrent } from '@/hooks/useLeadPickerOptions';
import { useTeamAgents } from '@/hooks/useTeamAgents';
import * as teleSalesApi from '@/api/teleSalesApi';
import { createOpportunityFromCustomer, createProposal, getCustomerOpportunities } from '@/api/proposalApi';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchIndustrySectors } from '@/redux/slices/industrySectorSlice';
import { fetchBusinessClassifications } from '@/redux/slices/businessClassificationSlice';
import { fetchTeams } from '@/redux/slices/teleSalesTeamsSlice';
import { canManageTeam, isSuperAdmin, ownTeamId, ownTeams } from '@/lib/teleSalesRole';
import {
  ENTITY_TYPES,
  LEAD_SOURCES,
  LEAD_SOURCE_DETAILS,
  isValidUrl,
  type AccountContact,
  type AccountRef,
  type EntityType,
  type IndustrySector,
  type LeadSource,
} from '@/types/teleSales.types';
import {
  personName,
  type CustomerOpportunity,
  type FromCustomerFields,
  type MissingLeadField,
} from '@/types/proposal.types';

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const apiError = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
/** The 400 `missing` list of POST /opportunities/from-customer, if the error carries one. */
const missingFrom = (e: unknown): MissingLeadField[] | null => {
  const m = (e as { response?: { status?: number; data?: { missing?: MissingLeadField[] } } })?.response;
  return m?.status === 400 && Array.isArray(m.data?.missing) && m.data.missing.length ? m.data.missing : null;
};
const ownerName = (o: CustomerOpportunity) => (o.assignedTo ? personName(o.assignedTo) : 'Unassigned');

/** Owner fields the API may report missing; shown as the team / agent selects, not as lead fields. */
const OWNER_FIELDS = new Set(['assignedTo', 'team']);
/** Plain text fields of the "complete the opportunity" form. */
const TEXT_FIELDS: Partial<Record<keyof FromCustomerFields, { placeholder: string; type?: string }>> = {
  website: { placeholder: 'https://example.com' },
  companyName: { placeholder: 'Acme Corp' },
  contactPersonName: { placeholder: 'John Doe' },
  phonePrimary: { placeholder: 'Phone with country code' },
  email: { placeholder: 'john@example.com', type: 'email' },
};

/**
 * "New proposal" → Existing customers: pick a company and its contact, reuse one
 * of the customer's open opportunities or create a new Opportunity for them
 * (POST /opportunities/from-customer), then open a proposal on it. When the API
 * reports missing mandatory lead fields, a compact form asks for just those —
 * with the lead form's pickers — plus the owner for non-agents.
 */
export default function ExistingCustomerStart({ active }: { active: boolean }) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { teams } = useAppSelector((s) => s.teleSalesTeams);
  const { sectorOptions, classificationOptions } = useLeadPickerOptions();

  // Owner rules mirror the lead form: a plain agent owns what they create; a
  // manager / admin picks the agent; admins and multi-team users pick the team.
  const superAdmin = isSuperAdmin(user);
  const needsOwner = canManageTeam(user);
  const myTeams = ownTeams(user);
  const pickTeam = superAdmin || myTeams.length > 1;
  const teamOptions = superAdmin ? teams.filter((t) => t.isActive).map((t) => ({ _id: t._id, name: t.name })) : myTeams;

  // ── company → contact ──
  const [accounts, setAccounts] = useState<AccountRef[]>([]);
  const [accountsState, setAccountsState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [account, setAccount] = useState('');
  const [contacts, setContacts] = useState<AccountContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contact, setContact] = useState('');

  // ── the customer's open opportunities ──
  const [opps, setOpps] = useState<CustomerOpportunity[]>([]);
  const [oppsState, setOppsState] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle');
  const [oppsKey, setOppsKey] = useState(0);

  // ── create ──
  const [step, setStep] = useState<'pick' | 'details'>('pick');
  const [missing, setMissing] = useState<MissingLeadField[]>([]);
  const [missingMessage, setMissingMessage] = useState('');
  const [fields, setFields] = useState<FromCustomerFields>({});
  const [team, setTeam] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  // The API may also report the owner missing (`team` for an admin without a home
  // team, `assignedTo` for a non-agent) — those open the same selects.
  const missingKeys = new Set(missing.map((m) => m.field));
  const showTeam = pickTeam || missingKeys.has('team');
  const showOwner = needsOwner || missingKeys.has('assignedTo');
  const agentTeam = showTeam ? team : ownTeamId(user);
  const { agents, loading: agentsLoading } = useTeamAgents(showOwner && active ? agentTeam : null);

  const loadAccounts = () => {
    setAccountsState('loading');
    teleSalesApi
      .getLeadAccounts()
      .then((r) => {
        setAccounts(r.data ?? []);
        setAccountsState('ready');
      })
      .catch(() => setAccountsState('error'));
  };

  // Companies (and the lookups of the details form) load the first time the tab opens.
  useEffect(() => {
    if (!active || accountsState === 'ready') return;
    loadAccounts();
    dispatch(fetchIndustrySectors({ limit: 1000 }));
    dispatch(fetchBusinessClassifications({ limit: 1000 }));
    if (superAdmin) dispatch(fetchTeams(undefined));
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  // The company's contacts.
  useEffect(() => {
    setContacts([]);
    if (!account) return;
    let alive = true;
    setContactsLoading(true);
    teleSalesApi
      .getLeadAccountContacts(account)
      .then((r) => alive && setContacts(r.data ?? []))
      .catch(() => alive && toast.error("Could not load the company's contacts"))
      .finally(() => alive && setContactsLoading(false));
    return () => {
      alive = false;
    };
  }, [account]);

  // The company's open opportunities.
  useEffect(() => {
    setOpps([]);
    if (!account) {
      setOppsState('idle');
      return;
    }
    let alive = true;
    setOppsState('loading');
    getCustomerOpportunities(account)
      .then((r) => {
        if (!alive) return;
        setOpps(r.data ?? []);
        setOppsState('ready');
      })
      .catch(() => alive && setOppsState('error'));
    return () => {
      alive = false;
    };
  }, [account, oppsKey]);

  const pickAccount = (id: string) => {
    setAccount(id);
    setContact('');
    setStep('pick');
    setMissing([]);
    setFields({});
  };

  const openProposal = async (leadId: string, key: string) => {
    setBusy(key);
    try {
      const res = await createProposal(leadId);
      toast.success(`Proposal ${res.data.number} created`);
      navigate(`/proposals/${res.data._id}`);
    } catch (e) {
      toast.error(apiError(e, 'Could not create the proposal'));
      setBusy(null);
    }
  };

  /** POST from-customer; a 400 `missing` opens (or refreshes) the details form. */
  const createOpportunity = async () => {
    if (!account || !contact) {
      toast.error('Choose the company and the contact first');
      return;
    }
    setBusy('create');
    try {
      const res = await createOpportunityFromCustomer({
        account,
        accountContact: contact,
        ...(showTeam && team ? { team } : {}),
        ...(showOwner && assignedTo ? { assignedTo } : {}),
        fields: cleanFields(fields),
      });
      toast.success(`Opportunity created for ${res.data.companyName || 'the customer'}`);
      await openProposal(res.data._id, 'create');
    } catch (e) {
      const list = missingFrom(e);
      if (list) {
        setMissing(list);
        setMissingMessage(apiError(e, 'Some mandatory fields are missing'));
        setStep('details');
      } else {
        toast.error(apiError(e, 'Could not create the opportunity'));
      }
      setBusy(null);
    }
  };

  // Lead fields the API reported missing (owner fields go to the selects below).
  const showSource = missingKeys.has('leadSource') || missingKeys.has('leadSourceDetail');
  const sourceSpec = fields.leadSource ? LEAD_SOURCE_DETAILS[fields.leadSource] : undefined;
  const labelOf = (key: string, fallback: string) => missing.find((m) => m.field === key)?.label || fallback;
  const textMissing = (Object.keys(TEXT_FIELDS) as (keyof FromCustomerFields)[]).filter((k) => missingKeys.has(k));
  const unknownMissing = missing.filter(
    (m) => !OWNER_FIELDS.has(m.field) && !(m.field in TEXT_FIELDS) && !['leadSource', 'leadSourceDetail', 'entityType', 'industrySector', 'businessClassification'].includes(m.field),
  );
  const setField = <K extends keyof FromCustomerFields>(key: K, value: FromCustomerFields[K]) => setFields((f) => ({ ...f, [key]: value }));

  const submitDetails = (e: React.FormEvent) => {
    e.preventDefault();
    const empty: string[] = [];
    for (const k of textMissing) if (!String(fields[k] ?? '').trim()) empty.push(labelOf(k, k));
    if (showSource && !fields.leadSource) empty.push(labelOf('leadSource', 'Lead source'));
    if (sourceSpec && !fields.leadSourceDetail?.trim()) empty.push(sourceSpec.label);
    for (const k of ['entityType', 'industrySector', 'businessClassification'] as const) {
      if (missingKeys.has(k) && !fields[k]) empty.push(labelOf(k, k));
    }
    if (showTeam && !team) empty.push(labelOf('team', 'Owning team'));
    if (showOwner && !assignedTo) empty.push(labelOf('assignedTo', 'Assign to'));
    if (empty.length) {
      toast.error(`${empty.join(', ')} ${empty.length > 1 ? 'are' : 'is'} required`);
      return;
    }
    if (sourceSpec?.type === 'url' && !isValidUrl(fields.leadSourceDetail)) {
      toast.error('Enter a valid LinkedIn URL (e.g. https://linkedin.com/in/jane-doe)');
      return;
    }
    createOpportunity();
  };

  /** "Create a new opportunity": non-agents choose the owner first; agents go straight to the API. */
  const startCreate = () => {
    if ((needsOwner && !assignedTo) || (pickTeam && !team)) {
      setMissing([]);
      setMissingMessage('');
      setStep('details');
      return;
    }
    createOpportunity();
  };

  const companyName = accounts.find((a) => a._id === account)?.name ?? '';

  // ── render ──
  if (accountsState === 'error') {
    return (
      <div className="space-y-3 rounded-xl border border-dashed border-outline-variant/60 p-4 text-center text-sm text-on-surface-variant">
        <p>The customer companies could not be loaded.</p>
        <Button type="button" variant="outline" size="sm" onClick={loadAccounts}>
          <RefreshCw /> Try again
        </Button>
      </div>
    );
  }

  if (step === 'details') {
    return (
      <form onSubmit={submitDetails} className="space-y-4" aria-label="Complete the new opportunity">
        <div className="flex items-start gap-2">
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Back to the customer" onClick={() => setStep('pick')}>
            <ArrowLeft />
          </Button>
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-on-surface">New opportunity for {companyName}</p>
            <p className="text-on-surface-variant">
              {missing.length ? missingMessage || 'Fill in the missing mandatory fields.' : 'Choose who owns the new opportunity.'}
            </p>
          </div>
        </div>

        <div className="grid max-h-[50vh] grid-cols-1 gap-4 overflow-y-auto p-0.5 sm:grid-cols-2">
          {textMissing.map((k) => (
            <Field key={k} label={labelOf(k, k)} required htmlFor={`fc-${k}`} className={k === 'website' ? 'sm:col-span-2' : ''}>
              <Input
                id={`fc-${k}`}
                type={TEXT_FIELDS[k]?.type ?? 'text'}
                value={String(fields[k] ?? '')}
                onChange={(e) => setField(k, e.target.value)}
                placeholder={TEXT_FIELDS[k]?.placeholder}
              />
            </Field>
          ))}
          {showSource && (
            <Field label={labelOf('leadSource', 'Lead source')} required htmlFor="fc-leadSource">
              <SelectField
                id="fc-leadSource"
                value={fields.leadSource ?? ''}
                onChange={(e) => setFields((f) => ({ ...f, leadSource: (e.target.value as LeadSource) || undefined, leadSourceDetail: '' }))}
              >
                <option value="">Select source</option>
                {LEAD_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectField>
            </Field>
          )}
          {sourceSpec && (
            <Field label={sourceSpec.label} required htmlFor="fc-leadSourceDetail">
              <Input
                id="fc-leadSourceDetail"
                type={sourceSpec.type === 'url' ? 'url' : 'text'}
                value={fields.leadSourceDetail ?? ''}
                onChange={(e) => setField('leadSourceDetail', e.target.value)}
                placeholder={sourceSpec.placeholder}
              />
            </Field>
          )}
          {missingKeys.has('entityType') && (
            <Field label={labelOf('entityType', 'Entity type')} required htmlFor="fc-entityType">
              <SelectField id="fc-entityType" value={fields.entityType ?? ''} onChange={(e) => setField('entityType', (e.target.value as EntityType) || undefined)}>
                <option value="">Select type</option>
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </SelectField>
            </Field>
          )}
          {missingKeys.has('industrySector') && (
            <Field label={labelOf('industrySector', 'Industry sector')} required htmlFor="fc-industrySector">
              <SelectField
                id="fc-industrySector"
                value={fields.industrySector ?? ''}
                onChange={(e) => setField('industrySector', (e.target.value as IndustrySector) || undefined)}
              >
                <option value="">Select sector</option>
                {withCurrent(sectorOptions, fields.industrySector).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectField>
            </Field>
          )}
          {missingKeys.has('businessClassification') && (
            <Field label={labelOf('businessClassification', 'Business classification')} required htmlFor="fc-businessClassification" className="sm:col-span-2">
              <SelectField
                id="fc-businessClassification"
                value={fields.businessClassification ?? ''}
                onChange={(e) => setField('businessClassification', e.target.value)}
              >
                <option value="">Select classification</option>
                {withCurrent(classificationOptions, fields.businessClassification).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </SelectField>
            </Field>
          )}
          {showTeam && (
            <Field label="Owning Team" required htmlFor="fc-team" hint="Only this team will see the opportunity.">
              <SelectField
                id="fc-team"
                value={team}
                onChange={(e) => {
                  // A different team invalidates the chosen agent.
                  if (e.target.value !== team) setAssignedTo('');
                  setTeam(e.target.value);
                }}
              >
                <option value="">Select a team</option>
                {teamOptions.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </SelectField>
            </Field>
          )}
          {showOwner && (
            <Field label="Assign To" required htmlFor="fc-assignedTo" hint={!agentTeam ? 'Choose the owning team first.' : 'Employees of the owning team.'}>
              <SelectField id="fc-assignedTo" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                <option value="">{!agentTeam ? 'Select a team first' : agentsLoading ? 'Loading…' : 'Select agent'}</option>
                {agents.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.firstName} {a.lastName}
                  </option>
                ))}
              </SelectField>
            </Field>
          )}
          {unknownMissing.length > 0 && (
            <p className="text-xs text-error sm:col-span-2">
              Also missing: {unknownMissing.map((m) => m.label).join(', ')}. Complete them on the opportunity in Tele-sales.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setStep('pick')} disabled={Boolean(busy)}>
            Back
          </Button>
          <Button type="submit" disabled={Boolean(busy)}>
            {busy ? <Loader2 className="animate-spin" /> : <Plus />} Create opportunity & proposal
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SearchSelect
          label="Company / Account *"
          icon={<Building2 className="h-4 w-4" />}
          placeholder={accountsState === 'loading' ? 'Loading companies…' : accounts.length ? 'Select the company' : 'No customer companies'}
          disabled={accountsState === 'loading' || !accounts.length}
          value={account}
          options={accounts.map((a) => ({ value: a._id, label: a.name }))}
          onChange={pickAccount}
        />
        <SearchSelect
          label="Contact *"
          icon={<User className="h-4 w-4" />}
          disabled={!account}
          placeholder={!account ? 'Select the company first' : contactsLoading ? 'Loading…' : contacts.length ? 'Select the contact' : 'No contacts for this company'}
          value={contact}
          options={contacts.map((c) => ({ value: c._id, label: c.contactPerson, sub: [c.email, c.phone].filter(Boolean).join(' · ') || undefined }))}
          onChange={setContact}
        />
      </div>

      {account && (
        <div className="space-y-2" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Open opportunities of {companyName}</p>
          {oppsState === 'loading' ? (
            <p className="flex items-center gap-2 p-2 text-sm text-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : oppsState === 'error' ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-error/10 px-3 py-2 text-sm text-error">
              Could not load this customer's opportunities.
              <Button type="button" variant="outline" size="sm" onClick={() => setOppsKey((k) => k + 1)}>
                <RefreshCw /> Retry
              </Button>
            </div>
          ) : opps.length ? (
            <ul className="max-h-56 space-y-1.5 overflow-y-auto">
              {opps.map((o) => (
                <li
                  key={o._id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-3"
                >
                  <span className="min-w-0">
                    <b className="block truncate text-sm text-on-surface">{o.companyName || companyName}</b>
                    <small className="block truncate text-xs text-on-surface-variant">
                      {[o.contactPersonName, o.status, ownerName(o), o.updatedAt && `updated ${fmtDate(o.updatedAt)}`].filter(Boolean).join(' · ')}
                    </small>
                  </span>
                  <Button type="button" size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => openProposal(o._id, o._id)}>
                    {busy === o._id ? <Loader2 className="animate-spin" /> : <Plus />} Use this opportunity
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-outline-variant/60 p-3 text-center text-sm text-on-surface-variant">
              This customer has no open opportunity. Create one to start the proposal.
            </p>
          )}
        </div>
      )}

      {account && oppsState !== 'loading' && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!contact && <span className="text-xs text-on-surface-variant">Choose the contact to create a new opportunity.</span>}
          <Button type="button" variant={opps.length ? 'outline' : 'default'} disabled={!contact || Boolean(busy)} onClick={startCreate}>
            {busy === 'create' ? <Loader2 className="animate-spin" /> : <Plus />}
            {opps.length ? 'Create a new opportunity instead' : 'Create opportunity & proposal'}
          </Button>
        </div>
      )}
    </div>
  );
}

/** Only the values typed in (trimmed); empty ones are left out so the API keeps the contact's. */
function cleanFields(f: FromCustomerFields): FromCustomerFields {
  const out: FromCustomerFields = {};
  for (const [k, v] of Object.entries(f) as [keyof FromCustomerFields, string | undefined][]) {
    const t = typeof v === 'string' ? v.trim() : v;
    if (t) (out as Record<string, string>)[k] = t;
  }
  return out;
}
