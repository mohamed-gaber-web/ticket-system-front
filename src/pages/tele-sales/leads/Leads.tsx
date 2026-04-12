import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchLeads, createLead, updateLead, deleteLead } from '@/redux/slices/teleSalesLeadsSlice';
import { fetchAgents } from '@/redux/slices/teleSalesAgentsSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import {
  Plus, Search, Phone, User, Eye, Pencil, Trash2,
  ChevronLeft, ChevronRight, Filter, X,
} from 'lucide-react';
import type { Lead, LeadStatus, LeadPriority, LeadSource, CreateLeadData } from '@/types/teleSales.types';

const ALL_STATUSES: LeadStatus[] = [
  'New Lead', 'No Answer', 'Not Available', 'Call Back Later', 'Interested',
  'Not Interested', 'Wrong Number', 'Invalid Lead', 'Follow-up',
  'Meeting Scheduled', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost',
];

const LEAD_SOURCES: LeadSource[] = ['LinkedIn', 'Website', 'Referral', 'Cold Call', 'Exhibition', 'Partner', 'Other'];

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
  const [showFilters, setShowFilters] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<CreateLeadData>(emptyForm);
  const [tagInput, setTagInput] = useState('');

  const load = useCallback(() => {
    dispatch(fetchLeads({
      search: search || undefined,
      status: statusFilter as LeadStatus || undefined,
      priority: priorityFilter as LeadPriority || undefined,
      page,
      limit: 15,
    }));
  }, [dispatch, search, statusFilter, priorityFilter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (isAdmin) dispatch(fetchAgents(undefined)); }, [isAdmin, dispatch]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, statusFilter, priorityFilter]);

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

  const formatDate = (d?: string) => !d ? '—' : new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Leads</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">{total} total leads</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> New Lead
        </Button>
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
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant/20">
            <span className="text-sm text-on-surface-variant">Page {page} of {pages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
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
                    <div key={i} className="flex gap-2">
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
    </div>
  );
}
