import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchLeads, deleteLead, importLeads, convertLead, fetchLeadStats } from '@/redux/slices/teleSalesLeadsSlice';
import { fetchAgents } from '@/redux/slices/teleSalesAgentsSlice';
import { fetchTeams } from '@/redux/slices/teleSalesTeamsSlice';
import { fetchIndustrySectors } from '@/redux/slices/industrySectorSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneLink } from '@/components/PhoneLink';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import {
  Plus, Search, Phone, User, Eye, Pencil, Trash2, Send,
  ChevronLeft, ChevronRight, Filter, X, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle,
  ClipboardList, ArrowRightCircle, Layers, UserCheck,
} from 'lucide-react';
import { BulkEditDialog } from '@/components/tele-sales/BulkEditDialog';
import { useTeamAgents } from '@/hooks/useTeamAgents';
import GmailCompose from '@/components/tele-sales/GmailCompose';
import { StatusRulesModal } from '@/components/tele-sales/StatusRulesModal';
import { LeadFormModal } from '@/components/tele-sales/LeadFormModal';
import { useLeadEmailSender } from '@/hooks/useLeadEmailSender';
import { LEAD_STATUSES, STATUS_COLORS, type LeadStatus } from '@/config/leadStatusWorkflow';
import type {
  Lead, LeadPriority, LeadSource, ImportLeadsResponse,
  EntityType, IndustrySector, SalesType, NeedProductRef,
} from '@/types/teleSales.types';
import { ENTITY_TYPES, INDUSTRY_SECTORS, teamName, formatMoney } from '@/types/teleSales.types';
import { STAGE_META, STAGE_ORDER, NEXT_STAGE, recordName, stageOf } from '@/lib/leadStages';
import { parseLeadsFile, FIELD_LABELS, type ParsedImport } from '@/utils/leadImport';
import { isSuperAdmin, isCrossTeamReader, isReadOnly, canManageTeam, ownTeamId, ownTeamNames, ownTeams } from '@/lib/teleSalesRole';

const LEAD_SOURCES: LeadSource[] = ['LinkedIn', 'Website', 'Referral', 'Cold Call', 'Exhibition', 'Partner', 'Other'];

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

interface LeadsProps {
  /** When set, the page is locked to this status: the status filter is fixed and
   *  hidden, and the list only shows those leads. */
  lockedStatus?: LeadStatus;
  /**
   * The pipeline stage this tab lists — Data, Leads or Opportunities. Import and
   * "Add Data" live on Data only, "New Lead" on Leads; Opportunities only come
   * from converting a Lead.
   */
  stage?: SalesType;
}

export default function Leads({ lockedStatus, stage = 'Lead' }: LeadsProps = {}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { leads, loading, total, pages } = useAppSelector((s) => s.teleSalesLeads);
  const { agents } = useAppSelector((s) => s.teleSalesAgents);
  const { teams } = useAppSelector((s) => s.teleSalesTeams);
  const { industrySectors } = useAppSelector((s) => s.industrySectors);
  const { user } = useAppSelector((s) => s.auth);

  // Admins span every team with write access; marketing spans every team
  // read-only; everyone else sees every lead of the teams ticked on their
  // employee record, and a sales manager also assigns and deletes.
  const superAdmin = isSuperAdmin(user);
  const crossTeam = isCrossTeamReader(user);
  const readOnly = isReadOnly(user);
  // Lead mail goes out from the sales mailbox, not the agent's own address.
  const emailSender = useLeadEmailSender();
  const canManage = canManageTeam(user);
  const myTeams = ownTeams(user);
  // A plain agent sees only the records assigned to them (the API enforces it),
  // so the owner filter would only ever offer themselves.
  const seesOnlyOwn = !crossTeam && !canManage;
  const stats = useAppSelector((s) => s.teleSalesLeads.stats);
  // More than one team on screen: offer the team filter / column / import target.
  const multiTeam = crossTeam || myTeams.length > 1;
  const teamOptions = crossTeam ? teams : myTeams;

  // Admin-managed Industry Sector lookup drives the sector filter. Only active
  // sectors are offered; INDUSTRY_SECTORS is the fallback while the list is
  // still loading (or empty before it's been seeded).
  const sectorOptions = industrySectors.length
    ? industrySectors.filter((s) => s.isActive).map((s) => s.name)
    : [...INDUSTRY_SECTORS];

  // Lead whose compose window is open, if any. `composeOpen` is the toolbar's
  // blank compose, which isn't tied to a lead.
  const [emailLead, setEmailLead] = useState<Lead | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [statusRulesOpen, setStatusRulesOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(lockedStatus ?? '');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  // Cross-team readers pick any team, a multi-team employee one of theirs.
  const [teamFilter, setTeamFilter] = useState('');
  // Narrows the shared team pipeline by owner; 'unassigned' shows the unclaimed pool.
  const [ownerFilter, setOwnerFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(PAGE_SIZE_OPTIONS[0]);
  const [showFilters, setShowFilters] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  // Data record being completed and converted to a Lead.
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  // Grid selection for bulk edit / mass reassignment (current page only).
  const [selected, setSelected] = useState<string[]>([]);
  // The ids the open Bulk Edit dialog works on, frozen when it opens.
  const [bulkIds, setBulkIds] = useState<string[] | null>(null);

  // Import state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportLeadsResponse | null>(null);
  const [importAssignedTo, setImportAssignedTo] = useState('');
  const [importTeam, setImportTeam] = useState('');
  const [importSource, setImportSource] = useState<string>('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Team → Agent lookups. The owner filter follows the team filter (with no team
  // picked it lists everyone the caller can see); the import's "Assign All To"
  // follows the team the batch lands in.
  const { agents: filterTeamAgents } = useTeamAgents(teamFilter || null);
  const ownerOptions = teamFilter ? filterTeamAgents : agents.filter((a) => a.status === 'active');
  const importTargetTeam = multiTeam ? importTeam : ownTeamId(user);
  const { agents: importAgents, loading: importAgentsLoading } = useTeamAgents(isImportOpen && canManage ? importTargetTeam : null);

  const load = useCallback(() => {
    dispatch(fetchLeads({
      search: search || undefined,
      status: (lockedStatus ?? (statusFilter as LeadStatus)) || undefined,
      priority: priorityFilter as LeadPriority || undefined,
      salesType: stage,
      entityType: entityTypeFilter as EntityType || undefined,
      industrySector: sectorFilter as IndustrySector || undefined,
      team: multiTeam && teamFilter ? teamFilter : undefined,
      assignedTo: ownerFilter || undefined,
      page,
      limit: itemsPerPage,
    }));
  }, [dispatch, lockedStatus, stage, search, statusFilter, priorityFilter, entityTypeFilter, sectorFilter, teamFilter, ownerFilter, multiTeam, page, itemsPerPage]);

  useEffect(() => { load(); }, [load]);
  // Stage counts for the tab bar; refreshed whenever the list reloads.
  const reload = useCallback(() => { load(); dispatch(fetchLeadStats()); }, [load, dispatch]);
  useEffect(() => { dispatch(fetchLeadStats()); }, [dispatch, stage]);
  // Every member of a team now needs the roster: the table shows assignee names
  // and the owner filter lists colleagues. The API returns only this team's agents.
  //
  // The explicit limit matters — the endpoint defaults to 20, which would silently
  // drop everyone but the 20 newest hires from the owner filter and the assignee
  // picker, with no indication the list was truncated.
  useEffect(() => { dispatch(fetchAgents({ limit: 200 })); }, [dispatch]);
  // Load the sector + team lookups once so the filter dropdowns can render them.
  useEffect(() => { dispatch(fetchIndustrySectors({ limit: 1000 })); }, [dispatch]);
  useEffect(() => { dispatch(fetchTeams(undefined)); }, [dispatch]);

  // Reset page on filter / page-size change
  useEffect(() => { setPage(1); }, [search, statusFilter, priorityFilter, stage, entityTypeFilter, sectorFilter, teamFilter, ownerFilter, itemsPerPage]);
  // A selection only means something for the rows on screen.
  useEffect(() => { setSelected([]); }, [search, statusFilter, priorityFilter, stage, entityTypeFilter, sectorFilter, teamFilter, ownerFilter, itemsPerPage, page]);

  const pageIds = leads.map((l) => l._id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const someOnPage = !allOnPage && pageIds.some((id) => selected.includes(id));
  const toggleRow = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleAll = () => setSelected(allOnPage ? [] : pageIds);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pages || newPage === page) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pageNumbers: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(pages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pageNumbers.push(i);
    return pageNumbers;
  };

  const startItem = total === 0 ? 0 : (page - 1) * itemsPerPage + 1;
  const endItem = Math.min(page * itemsPerPage, total);

  const openCreate = () => {
    setEditingLead(null);
    setIsDialogOpen(true);
  };
  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setIsDialogOpen(true);
  };

  // Data → Lead needs the form (mandatory fields); Lead → Opportunity is a confirm.
  const handleConvert = async (lead: Lead) => {
    if (stage === 'Data') {
      setConvertingLead(lead);
      return;
    }
    const result = await Swal.fire({
      title: 'Convert to Opportunity?',
      text: `"${recordName(lead)}" moves to Opportunities.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#003A8F',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Convert',
    });
    if (result.isConfirmed) {
      const action = await dispatch(convertLead({ id: lead._id, to: 'Opportunity' }));
      if (convertLead.fulfilled.match(action)) dispatch(fetchLeadStats());
    }
  };

  const handleDelete = async (lead: Lead) => {
    const result = await Swal.fire({
      title: `Delete ${STAGE_META[stage].label}?`,
      text: `"${recordName(lead)}" will be permanently deleted.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Delete',
    });
    if (result.isConfirmed) {
      await dispatch(deleteLead(lead._id));
    }
  };

  // ── Import handlers ──────────────────────────────────────────────────────────
  const openImport = () => {
    setParsed(null);
    setFileName('');
    setImportResult(null);
    setImportAssignedTo('');
    setImportTeam(superAdmin ? '' : ownTeamId(user));
    setImportSource('');
    setSkipDuplicates(true);
    setIsImportOpen(true);
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setImportResult(null);
    setParsing(true);
    try {
      const result = await parseLeadsFile(file);
      if (result.rows.length === 0) {
        toast.error('No rows found in the file. Make sure it has a header row (company, contact, phone or email).');
      }
      setParsed(result);
    } catch (err) {
      console.error(err);
      toast.error('Could not read the file. Supported formats: .xlsx, .xls, .csv, .md');
      setParsed(null);
    } finally {
      setParsing(false);
    }
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = ''; // allow re-selecting the same file
  };

  const handleImport = async () => {
    if (!parsed || parsed.rows.length === 0) return;
    setImporting(true);
    try {
      const action = await dispatch(importLeads({
        leads: parsed.rows,
        assignedTo: canManage && importAssignedTo ? importAssignedTo : undefined,
        // A super admin picks any team, a multi-team employee one of theirs; the
        // API ignores a team the caller is not on and uses their home team.
        team: multiTeam && importTeam ? importTeam : undefined,
        leadSource: (importSource as LeadSource) || undefined,
        skipDuplicates,
      }));
      if (importLeads.fulfilled.match(action)) {
        setImportResult(action.payload);
        if (action.payload.inserted > 0) reload();
      }
    } finally {
      setImporting(false);
    }
  };

  const formatDate = (d?: string) => !d ? '—' : new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

  const meta = STAGE_META[stage];
  const nextStage = NEXT_STAGE[stage];

  return (
    <div className="p-6 space-y-5">
      {/* Pipeline stage tabs: Data → Leads → Opportunities */}
      <nav aria-label="Pipeline stages" className="flex gap-1 border-b border-outline-variant/20">
        {STAGE_ORDER.map((s) => (
          <NavLink
            key={s}
            to={STAGE_META[s].path}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              s === stage ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {STAGE_META[s].plural}
            {stats?.byStage && (
              <span className={`text-xs tabular-nums px-2 py-0.5 rounded-full ${s === stage ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                {stats.byStage[s].toLocaleString()}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">{meta.plural}</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {total.toLocaleString()} {lockedStatus ? `${lockedStatus.toLowerCase()} ` : ''}record{total === 1 ? '' : 's'}
            {/* Makes it obvious whose pipeline is on screen — the whole point of
                the separation is that this is never "everyone's". */}
            {seesOnlyOwn
              ? <> assigned to <span className="font-medium text-on-surface">you</span></>
              : !crossTeam && <> in <span className="font-medium text-on-surface">{ownTeamNames(user)}</span></>}
            {readOnly && <> · <span className="font-medium text-on-surface">read-only</span></>}
            <span className="hidden md:inline"> · {meta.hint}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setStatusRulesOpen(true)} className="gap-2">
            <ClipboardList className="w-4 h-4" /> Status Rules
          </Button>
          {/* Marketing reads the pipeline; every control that changes it is hidden
              (and refused by the API regardless). */}
          {!readOnly && (
            <>
              <Button variant="outline" onClick={() => setComposeOpen(true)} className="gap-2">
                <Send className="w-4 h-4" /> Send Email
              </Button>
              {/* Imports land in Data, so they start here and nowhere else. Every role
                  that writes may import; an agent's batch is assigned to them. */}
              {stage === 'Data' && (
                <Button variant="outline" onClick={openImport} className="gap-2">
                  <Upload className="w-4 h-4" /> Import
                </Button>
              )}
              {/* Opportunities only come from converting a Lead. */}
              {stage !== 'Opportunity' && (
                <Button onClick={openCreate} className="gap-2">
                  <Plus className="w-4 h-4" /> {stage === 'Data' ? 'Add Data' : 'New Lead'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-4 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <Input
              placeholder="Search company, contact, customer ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${showFilters ? 'bg-primary text-white border-primary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}>
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="flex gap-3 flex-wrap">
            {!lockedStatus && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">All Statuses</option>
                {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Priorities</option>
              {(['High', 'Medium', 'Low'] as LeadPriority[]).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Entity Types</option>
              {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Sectors</option>
              {sectorOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {/* Narrow the team pipeline by owner, including the unassigned records
                still waiting to be handed out. An agent only has their own. */}
            {!seesOnlyOwn && (
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Anyone</option>
                <option value="unassigned">Unassigned</option>
                {ownerOptions.map((a) => (
                  <option key={a._id} value={a._id}>{a.firstName} {a.lastName}</option>
                ))}
              </select>
            )}
            {/* Only someone who sees more than one team has one to pick. */}
            {multiTeam && (
              <select
                value={teamFilter}
                // An owner picked for the old team means nothing in the new one.
                onChange={(e) => { setTeamFilter(e.target.value); if (ownerFilter !== 'unassigned') setOwnerFilter(''); }}
                className="px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">{crossTeam ? 'All Teams' : 'All My Teams'}</option>
                {teamOptions.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            )}
            {((!lockedStatus && statusFilter) || priorityFilter || entityTypeFilter || sectorFilter || ownerFilter || teamFilter) && (
              <button onClick={() => { if (!lockedStatus) setStatusFilter(''); setPriorityFilter(''); setEntityTypeFilter(''); setSectorFilter(''); setOwnerFilter(''); setTeamFilter(''); }}
                className="flex items-center gap-1 text-sm text-error hover:text-error/80">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk actions for the selected rows */}
      {!readOnly && selected.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3" role="region" aria-label="Bulk actions">
          <span className="text-sm font-semibold text-on-surface">{selected.length} selected</span>
          <Button size="sm" onClick={() => setBulkIds(selected)} className="gap-2">
            <Layers className="w-4 h-4" /> Bulk Edit
          </Button>
          {canManage && (
            <Button size="sm" variant="outline" onClick={() => setBulkIds(selected)} className="gap-2">
              <UserCheck className="w-4 h-4" /> Reassign
            </Button>
          )}
          <button onClick={() => setSelected([])} className="ml-auto text-sm text-on-surface-variant hover:text-on-surface flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-on-surface-variant">
            <Phone className="w-10 h-10 mb-3 opacity-30" />
            <p className="font-medium">No {meta.plural.toLowerCase()} found</p>
            <p className="text-sm mt-1">
              {stage === 'Data' ? 'Import a file or add a record'
                : stage === 'Lead' ? 'Convert a completed Data record, or create a new lead'
                  : 'Convert a Lead to see it here'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container/50">
                  {!readOnly && (
                    <th className="pl-4 pr-1 py-3 w-8">
                      <input
                        type="checkbox"
                        aria-label="Select all on this page"
                        className="w-4 h-4 accent-primary cursor-pointer align-middle"
                        checked={allOnPage}
                        ref={(el) => { if (el) el.indeterminate = someOnPage; }}
                        onChange={toggleAll}
                      />
                    </th>
                  )}
                  {['Customer ID', 'Company Name', 'Contact Person', 'Phone', 'Entity Type', 'Sector', 'Customer Need', 'Status', 'Proposal Price', 'Source', 'Next Follow-up', 'Assigned To',
                    // With a single team on screen the column would be one
                    // repeated value, so it only shows for multi-team viewers.
                    ...(multiTeam ? ['Team'] : []), ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {leads.map((lead) => (
                  <tr key={lead._id} className={`transition-colors ${selected.includes(lead._id) ? 'bg-primary/5' : 'hover:bg-surface-container/40'}`}>
                    {!readOnly && (
                      <td className="pl-4 pr-1 py-3 w-8">
                        <input
                          type="checkbox"
                          aria-label={`Select ${recordName(lead)}`}
                          className="w-4 h-4 accent-primary cursor-pointer align-middle"
                          checked={selected.includes(lead._id)}
                          onChange={() => toggleRow(lead._id)}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {lead.customerId ? (
                        <button
                          onClick={() => navigate(`/tele-sales/leads/${lead._id}`)}
                          className="font-mono text-xs text-on-surface-variant hover:text-primary hover:underline underline-offset-2 transition-colors cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          title={`View ${recordName(lead)}`}
                        >
                          {lead.customerId}
                        </button>
                      ) : (
                        <span className="font-mono text-xs text-on-surface-variant">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/tele-sales/leads/${lead._id}`)}
                        className="font-medium text-on-surface hover:text-primary hover:underline underline-offset-2 transition-colors text-left cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        title={`View ${recordName(lead)}`}
                      >
                        {lead.companyName || <span className="italic text-on-surface-variant">{recordName(lead)}</span>}
                      </button>
                      {lead.isExistingCustomer && (
                        <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700" title="Existing customer">
                          Existing
                        </span>
                      )}
                      {/* The Leads tab also lists the leads already converted to Opportunities. */}
                      {stage === 'Lead' && stageOf(lead) === 'Opportunity' && (
                        <span className={`ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STAGE_META.Opportunity.badge}`} title="Converted to an Opportunity">
                          Opportunity
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {lead.contactPersonName || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <PhoneLink number={lead.phonePrimary || lead.phoneSecondary} leadId={lead._id} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {lead.entityType
                        ? <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">{lead.entityType}</span>
                        : <span className="text-on-surface-variant">—</span>}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{lead.industrySector || '—'}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const needs = (lead.customerNeedProducts ?? []).filter((p): p is NeedProductRef => typeof p !== 'string');
                        if (needs.length === 0) return <span className="text-on-surface-variant">—</span>;
                        // Two chips keep the row short; the rest are counted and listed on hover.
                        return (
                          <div className="flex flex-wrap gap-1 max-w-[220px]" title={needs.map((p) => p.name).join(', ')}>
                            {needs.slice(0, 2).map((p) => (
                              <span key={p._id} className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface whitespace-nowrap">{p.name}</span>
                            ))}
                            {needs.length > 2 && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">+{needs.length - 2}</span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {(lead.proposalValue ?? 0) > 0
                        ? <span className="font-medium text-on-surface">{formatMoney(lead.proposalValue!, lead.proposalCurrency)}</span>
                        : <span className="text-on-surface-variant">—</span>}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{lead.leadSource || '—'}</td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{formatDate(lead.nextFollowUpDate)}</td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                      {(lead.assignedTo as any)?.firstName
                        ? `${(lead.assignedTo as any).firstName} ${(lead.assignedTo as any).lastName}`
                        : <span className="text-xs italic opacity-70">Unassigned</span>}
                    </td>
                    {multiTeam && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant">
                          {teamName(lead.team)}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/tele-sales/leads/${lead._id}`)}
                          className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEmailLead(lead)}
                          className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-brand-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={lead.email ? `Send email to ${lead.email}` : 'This lead has no email address'}
                          disabled={!lead.email}>
                          <Send className="w-4 h-4" />
                        </button>
                        {!readOnly && nextStage && stageOf(lead) === stage && !(stage === 'Lead' && lead.status === 'Closed Lost') && (
                          <button onClick={() => handleConvert(lead)}
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-colors"
                            title={stage === 'Data' ? 'Complete & convert to Lead' : 'Convert to Opportunity'}>
                            <ArrowRightCircle className="w-4 h-4" />
                          </button>
                        )}
                        {!readOnly && (
                          <button onClick={() => openEdit(lead)}
                            className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-brand-500 transition-colors" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {/* Deleting is for admins and the sales manager. */}
                        {canManage && (
                          <button onClick={() => handleDelete(lead)}
                            className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-outline-variant/20">
            <div className="flex items-center gap-3">
              <p className="text-sm text-on-surface-variant">
                Showing <span className="font-semibold text-on-surface">{startItem}-{endItem}</span> of{' '}
                <span className="font-semibold text-on-surface">{total.toLocaleString()}</span> results
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-on-surface-variant">Per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="h-7 px-2 pr-6 rounded-lg text-xs font-semibold bg-surface-container-lowest border border-outline-variant text-on-surface focus:outline-none focus:ring-2 focus:ring-brand-500/30 cursor-pointer"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            </div>

            {pages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  aria-label="Previous page"
                  className="p-2 rounded-xl bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {getPageNumbers().map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    aria-label={`Page ${pageNum}`}
                    aria-current={pageNum === page ? 'page' : undefined}
                    className={`min-w-[36px] h-9 rounded-xl text-sm font-semibold transition-colors ${
                      pageNum === page
                        ? 'bg-primary text-white'
                        : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= pages}
                  aria-label="Next page"
                  className="p-2 rounded-xl bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <LeadFormModal
        open={isDialogOpen}
        lead={editingLead}
        stage={stage}
        onClose={() => setIsDialogOpen(false)}
        onSaved={reload}
      />

      <BulkEditDialog
        open={!!bulkIds}
        ids={bulkIds ?? []}
        canReassign={canManage}
        onClose={() => setBulkIds(null)}
        onDone={() => { setSelected([]); reload(); }}
      />

      {/* Data → Lead: complete the mandatory fields, then convert */}
      <LeadFormModal
        open={!!convertingLead}
        lead={convertingLead}
        convert
        onClose={() => setConvertingLead(null)}
        onSaved={reload}
      />

      {/* Import Dialog */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/20">
              <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-brand-500" /> Import into Data
              </h2>
              <button onClick={() => setIsImportOpen(false)} className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Result summary */}
              {importResult ? (
                <div className="space-y-4">
                  <div className="flex flex-col items-center text-center py-4">
                    {importResult.inserted > 0 ? (
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />
                    ) : (
                      <AlertTriangle className="w-12 h-12 text-amber-500 mb-2" />
                    )}
                    <p className="text-lg font-semibold text-on-surface">{importResult.message}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-700">{importResult.inserted}</p>
                      <p className="text-xs text-emerald-600 mt-1">Imported</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-amber-700">{importResult.duplicates}</p>
                      <p className="text-xs text-amber-600 mt-1">Duplicates</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-gray-700">{importResult.skipped}</p>
                      <p className="text-xs text-gray-500 mt-1">Skipped</p>
                    </div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="border border-outline-variant/20 rounded-xl overflow-hidden">
                      <p className="px-4 py-2 text-xs font-semibold text-on-surface-variant uppercase tracking-wide bg-surface-container/50">
                        Issues ({importResult.errors.length})
                      </p>
                      <div className="max-h-48 overflow-y-auto divide-y divide-outline-variant/10">
                        {importResult.errors.slice(0, 100).map((err, i) => (
                          <div key={i} className="px-4 py-2 text-sm flex items-center gap-2">
                            <span className="text-on-surface-variant w-16 flex-shrink-0">Row {err.row ?? '—'}</span>
                            <span className={err.duplicate ? 'text-amber-600' : 'text-error'}>{err.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end gap-3 pt-2 border-t border-outline-variant/20">
                    <Button variant="outline" onClick={openImport}>Import Another</Button>
                    <Button onClick={() => setIsImportOpen(false)}>Done</Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* File picker */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv,.md,.markdown,.txt"
                      onChange={onFileInput}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-outline-variant rounded-2xl py-8 flex flex-col items-center gap-2 hover:border-brand-400 hover:bg-surface-container/40 transition-colors"
                    >
                      <Upload className="w-8 h-8 text-on-surface-variant" />
                      <p className="text-sm font-medium text-on-surface">{fileName || 'Click to choose a file'}</p>
                      <p className="text-xs text-on-surface-variant">Excel (.xlsx, .xls), CSV, or Markdown table (.md)</p>
                    </button>
                  </div>

                  {parsing && (
                    <div className="flex items-center justify-center gap-2 text-sm text-on-surface-variant py-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                      Parsing file…
                    </div>
                  )}

                  {parsed && parsed.rows.length > 0 && (
                    <>
                      {/* Detected column mapping */}
                      <div>
                        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">Detected Columns</p>
                        <div className="flex flex-wrap gap-2">
                          {parsed.headers.map((h, i) => (
                            <span
                              key={`${h}-${i}`}
                              className={`text-xs px-2.5 py-1 rounded-full border ${parsed.mapping[i] ? 'bg-brand-50 text-brand-700 border-brand-200' : 'bg-gray-50 text-gray-400 border-gray-200 line-through'}`}
                              title={parsed.mapping[i] ? `Mapped to ${FIELD_LABELS[parsed.mapping[i]!]}` : 'Ignored'}
                            >
                              {h || '(blank)'}{parsed.mapping[i] ? ` → ${FIELD_LABELS[parsed.mapping[i]!]}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Preview */}
                      <div>
                        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">
                          Preview — {parsed.rows.length} record{parsed.rows.length === 1 ? '' : 's'} ready (they land in Data; nothing is mandatory)
                          {parsed.skippedEmpty > 0 && `, ${parsed.skippedEmpty} empty row(s) skipped`}
                        </p>
                        <div className="border border-outline-variant/20 rounded-xl overflow-x-auto max-h-56 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-surface-container">
                              <tr className="border-b border-outline-variant/20">
                                {['Contact', 'Company', 'Phone', 'Email', 'Job Title'].map((h) => (
                                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-on-surface-variant whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/10">
                              {parsed.rows.slice(0, 50).map((r, i) => (
                                <tr key={i}>
                                  <td className="px-3 py-1.5 text-on-surface whitespace-nowrap">{r.contactPersonName || '—'}</td>
                                  <td className="px-3 py-1.5 text-on-surface-variant whitespace-nowrap">{r.companyName || (r.contactPersonName ? <span className="italic opacity-50">= contact</span> : '—')}</td>
                                  <td className="px-3 py-1.5 text-on-surface-variant whitespace-nowrap">{[r.phonePrimary, r.phoneSecondary, r.phoneOther].filter(Boolean).join(', ') || '—'}</td>
                                  <td className="px-3 py-1.5 text-on-surface-variant whitespace-nowrap">{r.email || '—'}</td>
                                  <td className="px-3 py-1.5 text-on-surface-variant whitespace-nowrap">{r.jobTitle || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {parsed.rows.length > 50 && (
                          <p className="text-xs text-on-surface-variant mt-1">Showing first 50 of {parsed.rows.length} rows.</p>
                        )}
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Imported rows are raw Data: they always start in "No
                            Action" (the API enforces it), so there is no status to pick. */}
                        <div>
                          <label className="text-sm font-medium text-on-surface mb-1 block">Lead Source</label>
                          <select value={importSource} onChange={(e) => setImportSource(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
                            <option value="">None</option>
                            {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        {/* Super admins import into any team and must say which; a
                            multi-team employee picks one of theirs (home team
                            preselected); everyone else's batch lands in their own. */}
                        {multiTeam && (
                          <div className="col-span-2">
                            <label className="text-sm font-medium text-on-surface mb-1 block">Import Into Team *</label>
                            <select value={importTeam} onChange={(e) => { setImportTeam(e.target.value); setImportAssignedTo(''); }}
                              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
                              <option value="">Select a team</option>
                              {(crossTeam ? teams.filter((t) => t.isActive) : myTeams).map((t) => (
                                <option key={t._id} value={t._id}>{t.name}</option>
                              ))}
                            </select>
                            <p className="text-xs text-on-surface-variant mt-1">
                              Only this team will see the imported leads.
                            </p>
                          </div>
                        )}
                        {canManage && (
                          <div className="col-span-2">
                            <label className="text-sm font-medium text-on-surface mb-1 block">Assign All To</label>
                            <select value={importAssignedTo} onChange={(e) => setImportAssignedTo(e.target.value)}
                              disabled={!importTargetTeam}
                              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60">
                              <option value="">
                                {!importTargetTeam ? 'Choose the team first' : importAgentsLoading ? 'Loading…' : 'Unassigned — leave in the team pool'}
                              </option>
                              {importAgents.map((a) => (
                                <option key={a._id} value={a._id}>{a.firstName} {a.lastName}</option>
                              ))}
                            </select>
                            <p className="text-xs text-on-surface-variant mt-1">Only employees of the team the records land in.</p>
                          </div>
                        )}
                        {!canManage && (
                          <p className="col-span-2 text-xs text-on-surface-variant">
                            The imported leads are assigned to you.
                          </p>
                        )}
                        <div className="col-span-2 flex items-start gap-3">
                          <input type="checkbox" id="skipDup" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} className="w-4 h-4 mt-0.5" />
                          <label htmlFor="skipDup" className="text-sm text-on-surface">
                            Skip duplicates (by phone number)
                            <span className="block text-xs text-on-surface-variant mt-0.5">
                              Checked within this team only — another team holding the same number will not block the import.
                            </span>
                          </label>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-2 border-t border-outline-variant/20">
                    <Button variant="outline" onClick={() => setIsImportOpen(false)}>Cancel</Button>
                    <Button
                      onClick={handleImport}
                      // A super admin has no home team to fall back on, so the
                      // batch would have nowhere to land.
                      disabled={!parsed || parsed.rows.length === 0 || importing || (multiTeam && !importTeam)}
                      title={multiTeam && !importTeam ? 'Choose which team these leads belong to' : undefined}
                    >
                      {importing ? 'Importing…' : parsed?.rows.length ? `Import ${parsed.rows.length} Record${parsed.rows.length === 1 ? '' : 's'}` : 'Import'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gmail-style compose window, opened from a row's send action */}
      {emailLead && (
        <GmailCompose
          key={emailLead._id}
          leadId={emailLead._id}
          open
          onClose={() => setEmailLead(null)}
          defaultTo={emailLead.email ? [emailLead.email] : []}
          contextLabel={emailLead.contactPersonName || recordName(emailLead)}
          fromLabel={emailSender ?? undefined}
        />
      )}

      {/* Blank compose, opened from the toolbar — not tied to any lead */}
      {composeOpen && (
        <GmailCompose
          open
          onClose={() => setComposeOpen(false)}
          fromLabel={emailSender ?? undefined}
        />
      )}

      <StatusRulesModal open={statusRulesOpen} onClose={() => setStatusRulesOpen(false)} />
    </div>
  );
}
