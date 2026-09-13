import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchLeads, deleteLead, importLeads } from '@/redux/slices/teleSalesLeadsSlice';
import { fetchAgents } from '@/redux/slices/teleSalesAgentsSlice';
import { fetchIndustrySectors } from '@/redux/slices/industrySectorSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneLink } from '@/components/PhoneLink';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import {
  Plus, Search, Phone, User, Eye, Pencil, Trash2, Send,
  ChevronLeft, ChevronRight, Filter, X, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle,
  ClipboardList,
} from 'lucide-react';
import GmailCompose from '@/components/tele-sales/GmailCompose';
import { StatusRulesModal } from '@/components/tele-sales/StatusRulesModal';
import { LeadFormModal } from '@/components/tele-sales/LeadFormModal';
import { LEAD_STATUSES, STATUS_COLORS, type LeadStatus } from '@/config/leadStatusWorkflow';
import type {
  Lead, LeadPriority, LeadSource, ImportLeadsResponse,
  EntityType, IndustrySector, SalesType,
} from '@/types/teleSales.types';
import { ENTITY_TYPES, INDUSTRY_SECTORS, SALES_TYPES } from '@/types/teleSales.types';
import { parseLeadsFile, FIELD_LABELS, type ParsedImport } from '@/utils/leadImport';

const LEAD_SOURCES: LeadSource[] = ['LinkedIn', 'Website', 'Referral', 'Cold Call', 'Exhibition', 'Partner', 'Other'];

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

interface LeadsProps {
  /** When set, the page is locked to this status: the status filter is fixed and
   *  hidden, and the list only shows those leads. */
  lockedStatus?: LeadStatus;
  /** When set, the page is locked to this sales type (used by the "Opportunities"
   *  tab): the sales-type filter is fixed and hidden, and new leads created from
   *  this page default to it. */
  lockedSalesType?: SalesType;
  /** Optional page heading override (defaults to "Leads"). */
  title?: string;
}

export default function Leads({ lockedStatus, lockedSalesType, title }: LeadsProps = {}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { leads, loading, total, pages } = useAppSelector((s) => s.teleSalesLeads);
  const { agents } = useAppSelector((s) => s.teleSalesAgents);
  const { industrySectors } = useAppSelector((s) => s.industrySectors);
  const { user } = useAppSelector((s) => s.auth);
  const isAdmin = (user as any)?.role === 'admin';

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
  const [salesTypeFilter, setSalesTypeFilter] = useState<string>(lockedSalesType ?? '');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(PAGE_SIZE_OPTIONS[0]);
  const [showFilters, setShowFilters] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Import state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportLeadsResponse | null>(null);
  const [importAssignedTo, setImportAssignedTo] = useState('');
  const [importStatus, setImportStatus] = useState<LeadStatus>('New Lead');
  const [importSource, setImportSource] = useState<string>('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    dispatch(fetchLeads({
      search: search || undefined,
      status: (lockedStatus ?? (statusFilter as LeadStatus)) || undefined,
      priority: priorityFilter as LeadPriority || undefined,
      salesType: (lockedSalesType ?? (salesTypeFilter as SalesType)) || undefined,
      entityType: entityTypeFilter as EntityType || undefined,
      industrySector: sectorFilter as IndustrySector || undefined,
      page,
      limit: itemsPerPage,
    }));
  }, [dispatch, lockedStatus, lockedSalesType, search, statusFilter, priorityFilter, salesTypeFilter, entityTypeFilter, sectorFilter, page, itemsPerPage]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (isAdmin) dispatch(fetchAgents(undefined)); }, [isAdmin, dispatch]);
  // Load the sector lookup once so the filter dropdown can render it.
  useEffect(() => { dispatch(fetchIndustrySectors({ limit: 1000 })); }, [dispatch]);

  // Reset page on filter / page-size change
  useEffect(() => { setPage(1); }, [search, statusFilter, priorityFilter, salesTypeFilter, entityTypeFilter, sectorFilter, itemsPerPage]);

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

  const handleDelete = async (lead: Lead) => {
    const result = await Swal.fire({
      title: 'Delete Lead?',
      text: `"${lead.companyName}" will be permanently deleted.`,
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
    setImportStatus('New Lead');
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
        toast.error('No valid rows found in the file. Make sure it has a header row with a name and phone column.');
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
        assignedTo: isAdmin && importAssignedTo ? importAssignedTo : undefined,
        status: importStatus,
        leadSource: (importSource as LeadSource) || undefined,
        skipDuplicates,
      }));
      if (importLeads.fulfilled.match(action)) {
        setImportResult(action.payload);
        if (action.payload.inserted > 0) load();
      }
    } finally {
      setImporting(false);
    }
  };

  const formatDate = (d?: string) => !d ? '—' : new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">{title ?? 'Leads'}</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {total} {lockedSalesType
              ? `${lockedSalesType.toLowerCase()} record${total === 1 ? '' : 's'}`
              : lockedStatus ? `${lockedStatus.toLowerCase()} leads` : 'total leads'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setComposeOpen(true)} className="gap-2">
            <Send className="w-4 h-4" /> Send Email
          </Button>
          <Button variant="outline" onClick={openImport} className="gap-2">
            <Upload className="w-4 h-4" /> Import
          </Button>
          <Button variant="outline" onClick={() => setStatusRulesOpen(true)} className="gap-2">
            <ClipboardList className="w-4 h-4" /> Status Rules
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> New Lead
          </Button>
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
            {!lockedSalesType && (
              <select
                value={salesTypeFilter}
                onChange={(e) => setSalesTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">All Sales Types</option>
                {SALES_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
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
            {((!lockedStatus && statusFilter) || priorityFilter || (!lockedSalesType && salesTypeFilter) || entityTypeFilter || sectorFilter) && (
              <button onClick={() => { if (!lockedStatus) setStatusFilter(''); setPriorityFilter(''); if (!lockedSalesType) setSalesTypeFilter(''); setEntityTypeFilter(''); setSectorFilter(''); }}
                className="flex items-center gap-1 text-sm text-error hover:text-error/80">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-on-surface-variant">
            <Phone className="w-10 h-10 mb-3 opacity-30" />
            <p className="font-medium">No leads found</p>
            <p className="text-sm mt-1">Try adjusting your filters or create a new lead</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container/50">
                  {['Customer ID', 'Company Name', 'Contact Person', 'Phone', 'Entity Type', 'Sector', 'Status', 'Sales Type', 'Source', 'Next Follow-up', 'Assigned To', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {leads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-surface-container/40 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {lead.customerId ? (
                        <button
                          onClick={() => navigate(`/tele-sales/leads/${lead._id}`)}
                          className="font-mono text-xs text-on-surface-variant hover:text-primary hover:underline underline-offset-2 transition-colors cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          title={`View ${lead.companyName}`}
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
                        title={`View ${lead.companyName}`}
                      >
                        {lead.companyName}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {lead.contactPersonName}
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
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        lead.salesType === 'Opportunity'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-sky-100 text-sky-700'
                      }`}>{lead.salesType || 'Lead'}</span>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{lead.leadSource || '—'}</td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{formatDate(lead.nextFollowUpDate)}</td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                      {(lead.assignedTo as any)?.firstName
                        ? `${(lead.assignedTo as any).firstName} ${(lead.assignedTo as any).lastName}`
                        : '—'}
                    </td>
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
                        <button onClick={() => openEdit(lead)}
                          className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-brand-500 transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {isAdmin && (
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
        defaultSalesType={lockedSalesType}
        onClose={() => setIsDialogOpen(false)}
        onSaved={load}
      />

      {/* Import Dialog */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/20">
              <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-brand-500" /> Import Leads
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
                          Preview — {parsed.rows.length} lead{parsed.rows.length === 1 ? '' : 's'} ready
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
                                  <td className="px-3 py-1.5 text-on-surface whitespace-nowrap">{r.contactPersonName}</td>
                                  <td className="px-3 py-1.5 text-on-surface-variant whitespace-nowrap">{r.companyName || <span className="italic opacity-50">= contact</span>}</td>
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
                        <div>
                          <label className="text-sm font-medium text-on-surface mb-1 block">Default Status</label>
                          <select value={importStatus} onChange={(e) => setImportStatus(e.target.value as LeadStatus)}
                            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
                            {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-on-surface mb-1 block">Lead Source</label>
                          <select value={importSource} onChange={(e) => setImportSource(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
                            <option value="">None</option>
                            {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        {isAdmin && (
                          <div className="col-span-2">
                            <label className="text-sm font-medium text-on-surface mb-1 block">Assign All To</label>
                            <select value={importAssignedTo} onChange={(e) => setImportAssignedTo(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
                              <option value="">Unassigned</option>
                              {agents.filter((a) => a.status === 'active').map((a) => (
                                <option key={a._id} value={a._id}>{a.firstName} {a.lastName}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="col-span-2 flex items-center gap-3">
                          <input type="checkbox" id="skipDup" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} className="w-4 h-4" />
                          <label htmlFor="skipDup" className="text-sm text-on-surface">Skip duplicates (by phone number)</label>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-2 border-t border-outline-variant/20">
                    <Button variant="outline" onClick={() => setIsImportOpen(false)}>Cancel</Button>
                    <Button onClick={handleImport} disabled={!parsed || parsed.rows.length === 0 || importing}>
                      {importing ? 'Importing…' : parsed?.rows.length ? `Import ${parsed.rows.length} Lead${parsed.rows.length === 1 ? '' : 's'}` : 'Import'}
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
          contextLabel={emailLead.contactPersonName || emailLead.companyName}
          fromLabel={user?.email}
        />
      )}

      {/* Blank compose, opened from the toolbar — not tied to any lead */}
      {composeOpen && (
        <GmailCompose
          open
          onClose={() => setComposeOpen(false)}
          fromLabel={user?.email}
        />
      )}

      <StatusRulesModal open={statusRulesOpen} onClose={() => setStatusRulesOpen(false)} />
    </div>
  );
}
