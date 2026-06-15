import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchLeads, createLead, updateLead, deleteLead, importLeads } from '@/redux/slices/teleSalesLeadsSlice';
import { fetchAgents } from '@/redux/slices/teleSalesAgentsSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import {
  Plus, Search, Phone, User, Eye, Pencil, Trash2,
  ChevronLeft, ChevronRight, Filter, X, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import type { Lead, LeadStatus, LeadPriority, LeadSource, CreateLeadData, ImportLeadsResponse } from '@/types/teleSales.types';
import { parseLeadsFile, FIELD_LABELS, type ParsedImport } from '@/utils/leadImport';

const ALL_STATUSES: LeadStatus[] = [
  'New Lead', 'No Answer', 'Not Available', 'Call Back Later', 'Interested',
  'Not Interested', 'Wrong Number', 'Invalid Lead', 'Follow-up',
  'Meeting Scheduled', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost',
];

const LEAD_SOURCES: LeadSource[] = ['LinkedIn', 'Website', 'Referral', 'Cold Call', 'Exhibition', 'Partner', 'Other'];

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

const STATUS_COLORS: Record<string, string> = {
  'New Lead': 'bg-blue-100 text-blue-700',
  'Interested': 'bg-green-100 text-green-700',
  'Follow-up': 'bg-yellow-100 text-yellow-700',
  'Meeting Scheduled': 'bg-purple-100 text-purple-700',
  'Proposal Sent': 'bg-indigo-100 text-indigo-700',
  'Negotiation': 'bg-orange-100 text-orange-700',
  'Closed Won': 'bg-emerald-100 text-emerald-700',
  'Closed Lost': 'bg-red-100 text-red-700',
  'No Answer': 'bg-gray-100 text-gray-600',
  'Not Available': 'bg-gray-100 text-gray-600',
  'Call Back Later': 'bg-yellow-50 text-yellow-600',
  'Not Interested': 'bg-red-50 text-red-500',
  'Wrong Number': 'bg-gray-50 text-gray-400',
  'Invalid Lead': 'bg-gray-50 text-gray-400',
};

const PRIORITY_COLORS: Record<string, string> = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-gray-100 text-gray-600',
};

const emptyForm: CreateLeadData = {
  companyName: '',
  contactPersonName: '',
  phones: [{ number: '', label: 'Primary' }],
  email: '',
  jobTitle: '',
  industry: '',
  companySize: '',
  address: '',
  leadSource: undefined,
  assignedTo: '',
  priority: 'Medium',
  potentialValue: undefined,
  status: 'New Lead',
  painPoints: '',
  customerNeeds: '',
  budget: '',
  isDecisionMaker: false,
  tags: [],
};

export default function Leads() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { leads, loading, total, pages } = useAppSelector((s) => s.teleSalesLeads);
  const { agents } = useAppSelector((s) => s.teleSalesAgents);
  const { user } = useAppSelector((s) => s.auth);
  const isAdmin = (user as any)?.role === 'admin';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(PAGE_SIZE_OPTIONS[0]);
  const [showFilters, setShowFilters] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<CreateLeadData>(emptyForm);
  const [tagInput, setTagInput] = useState('');

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
      status: statusFilter as LeadStatus || undefined,
      priority: priorityFilter as LeadPriority || undefined,
      page,
      limit: itemsPerPage,
    }));
  }, [dispatch, search, statusFilter, priorityFilter, page, itemsPerPage]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (isAdmin) dispatch(fetchAgents(undefined)); }, [isAdmin, dispatch]);

  // Reset page on filter / page-size change
  useEffect(() => { setPage(1); }, [search, statusFilter, priorityFilter, itemsPerPage]);

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

  const openCreate = () => { setEditingLead(null); setForm(emptyForm); setTagInput(''); setIsDialogOpen(true); };
  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      companyName: lead.companyName,
      contactPersonName: lead.contactPersonName,
      phones: lead.phones,
      email: lead.email || '',
      jobTitle: lead.jobTitle || '',
      industry: lead.industry || '',
      companySize: lead.companySize || '',
      address: lead.address || '',
      leadSource: lead.leadSource,
      assignedTo: (lead.assignedTo as any)?._id || '',
      priority: lead.priority,
      potentialValue: lead.potentialValue,
      status: lead.status,
      painPoints: lead.painPoints || '',
      customerNeeds: lead.customerNeeds || '',
      budget: lead.budget || '',
      isDecisionMaker: lead.isDecisionMaker,
      tags: lead.tags,
    });
    setTagInput('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName || !form.contactPersonName || !form.phones[0]?.number) {
      toast.error('Company name, contact person, and at least one phone are required');
      return;
    }
    const payload = { ...form, phones: form.phones.filter((p) => p.number.trim()) };
    if (!payload.assignedTo) delete payload.assignedTo;
    if (!payload.potentialValue) delete payload.potentialValue;

    if (editingLead) {
      await dispatch(updateLead({ id: editingLead._id, data: payload }));
    } else {
      await dispatch(createLead(payload));
    }
    setIsDialogOpen(false);
    load();
  };

  const addPhone = () => setForm((p) => ({ ...p, phones: [...p.phones, { number: '', label: '' }] }));
  const removePhone = (i: number) => setForm((p) => ({ ...p, phones: p.phones.filter((_, idx) => idx !== i) }));
  const updatePhone = (i: number, field: 'number' | 'label', val: string) =>
    setForm((p) => ({ ...p, phones: p.phones.map((ph, idx) => idx === i ? { ...ph, [field]: val } : ph) }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags?.includes(t)) {
      setForm((p) => ({ ...p, tags: [...(p.tags || []), t] }));
      setTagInput('');
    }
  };
  const removeTag = (t: string) => setForm((p) => ({ ...p, tags: p.tags?.filter((x) => x !== t) }));

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
          <h1 className="text-2xl font-bold text-on-surface">Leads</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">{total} total leads</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openImport} className="gap-2">
            <Upload className="w-4 h-4" /> Import
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
              placeholder="Search company, contact..."
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
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Statuses</option>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Priorities</option>
              {(['High', 'Medium', 'Low'] as LeadPriority[]).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {(statusFilter || priorityFilter) && (
              <button onClick={() => { setStatusFilter(''); setPriorityFilter(''); }}
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
                  {['Company', 'Contact', 'Phone', 'Status', 'Priority', 'Assigned To', 'Last Call', 'Next Follow-up', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {leads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-surface-container/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-on-surface whitespace-nowrap">{lead.companyName}</td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {lead.contactPersonName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {lead.phones[0]?.number}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PRIORITY_COLORS[lead.priority]}`}>
                        {lead.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                      {(lead.assignedTo as any)?.firstName
                        ? `${(lead.assignedTo as any).firstName} ${(lead.assignedTo as any).lastName}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{formatDate(lead.lastCallDate)}</td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{formatDate(lead.nextFollowUpDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/tele-sales/leads/${lead._id}`)}
                          className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors" title="View">
                          <Eye className="w-4 h-4" />
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
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/20">
              <h2 className="text-lg font-semibold text-on-surface">{editingLead ? 'Edit Lead' : 'New Lead'}</h2>
              <button onClick={() => setIsDialogOpen(false)} className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Basic Info */}
              <div>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-3">Basic Info</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-on-surface mb-1 block">Company Name *</label>
                    <Input value={form.companyName} onChange={(e) => setForm(p => ({ ...p, companyName: e.target.value }))} placeholder="Acme Corp" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-on-surface mb-1 block">Contact Person *</label>
                    <Input value={form.contactPersonName} onChange={(e) => setForm(p => ({ ...p, contactPersonName: e.target.value }))} placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-on-surface mb-1 block">Email</label>
                    <Input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} placeholder="john@example.com" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-on-surface mb-1 block">Job Title</label>
                    <Input value={form.jobTitle} onChange={(e) => setForm(p => ({ ...p, jobTitle: e.target.value }))} placeholder="CEO" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-on-surface mb-1 block">Industry</label>
                    <Input value={form.industry} onChange={(e) => setForm(p => ({ ...p, industry: e.target.value }))} placeholder="Technology" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-on-surface mb-1 block">Company Size</label>
                    <Input value={form.companySize} onChange={(e) => setForm(p => ({ ...p, companySize: e.target.value }))} placeholder="50-200" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-on-surface mb-1 block">Address</label>
                    <Input value={form.address} onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Street, city..." />
                  </div>
                </div>
              </div>

              {/* Phones */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Phone Numbers *</p>
                  <button type="button" onClick={addPhone} className="text-xs text-brand-500 hover:text-brand-600 font-medium">+ Add</button>
                </div>
                <div className="space-y-2">
                  {form.phones.map((ph, i) => (
                    <div key={`${i}-${ph.number}`} className="flex gap-2">
                      <Input value={ph.number} onChange={(e) => updatePhone(i, 'number', e.target.value)} placeholder="Phone number" className="flex-1" />
                      <Input value={ph.label || ''} onChange={(e) => updatePhone(i, 'label', e.target.value)} placeholder="Label" className="w-28" />
                      {form.phones.length > 1 && (
                        <button type="button" onClick={() => removePhone(i)} className="p-2 text-error hover:bg-error/10 rounded-lg">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Lead Details */}
              <div>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-3">Lead Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-on-surface mb-1 block">Lead Source</label>
                    <select value={form.leadSource || ''} onChange={(e) => setForm(p => ({ ...p, leadSource: e.target.value as LeadSource || undefined }))}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option value="">Select source</option>
                      {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-on-surface mb-1 block">Priority</label>
                    <select value={form.priority || 'Medium'} onChange={(e) => setForm(p => ({ ...p, priority: e.target.value as LeadPriority }))}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
                      {(['High', 'Medium', 'Low'] as LeadPriority[]).map((pv) => <option key={pv} value={pv}>{pv}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-on-surface mb-1 block">Status</label>
                    <select value={form.status || 'New Lead'} onChange={(e) => setForm(p => ({ ...p, status: e.target.value as LeadStatus }))}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
                      {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-on-surface mb-1 block">Potential Value</label>
                    <Input type="number" value={form.potentialValue || ''} onChange={(e) => setForm(p => ({ ...p, potentialValue: e.target.value ? Number(e.target.value) : undefined }))} placeholder="0" />
                  </div>
                  {isAdmin && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-on-surface mb-1 block">Assign To</label>
                      <select value={form.assignedTo || ''} onChange={(e) => setForm(p => ({ ...p, assignedTo: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
                        <option value="">Unassigned</option>
                        {agents.filter((a) => a.status === 'active').map((a) => (
                          <option key={a._id} value={a._id}>{a.firstName} {a.lastName}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes & Insights */}
              <div>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-3">Notes & Insights</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-on-surface mb-1 block">Pain Points</label>
                    <textarea value={form.painPoints} onChange={(e) => setForm(p => ({ ...p, painPoints: e.target.value }))}
                      rows={2} className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="What challenges does the customer face?" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-on-surface mb-1 block">Customer Needs</label>
                    <textarea value={form.customerNeeds} onChange={(e) => setForm(p => ({ ...p, customerNeeds: e.target.value }))}
                      rows={2} className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="What does the customer need?" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-on-surface mb-1 block">Budget</label>
                      <Input value={form.budget} onChange={(e) => setForm(p => ({ ...p, budget: e.target.value }))} placeholder="e.g. $10,000" />
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                      <input type="checkbox" id="dm" checked={!!form.isDecisionMaker} onChange={(e) => setForm(p => ({ ...p, isDecisionMaker: e.target.checked }))} className="w-4 h-4" />
                      <label htmlFor="dm" className="text-sm text-on-surface">Decision Maker</label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">Tags</p>
                <div className="flex gap-2 flex-wrap mb-2">
                  {form.tags?.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 bg-brand-100 text-brand-700 text-xs font-medium px-2.5 py-1 rounded-full">
                      {t}
                      <button type="button" onClick={() => removeTag(t)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Add tag..." className="flex-1" />
                  <Button type="button" variant="outline" size="sm" onClick={addTag}>Add</Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-outline-variant/20">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : editingLead ? 'Update Lead' : 'Create Lead'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                                {['Contact', 'Company', 'Phone(s)', 'Email', 'Job Title'].map((h) => (
                                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-on-surface-variant whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/10">
                              {parsed.rows.slice(0, 50).map((r, i) => (
                                <tr key={i}>
                                  <td className="px-3 py-1.5 text-on-surface whitespace-nowrap">{r.contactPersonName}</td>
                                  <td className="px-3 py-1.5 text-on-surface-variant whitespace-nowrap">{r.companyName || <span className="italic opacity-50">= contact</span>}</td>
                                  <td className="px-3 py-1.5 text-on-surface-variant whitespace-nowrap">{r.phones.map((p) => p.number).join(', ')}</td>
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
                            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
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
    </div>
  );
}
