import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchLeadById } from '@/redux/slices/teleSalesLeadsSlice';
import * as teleSalesApi from '@/api/teleSalesApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneLink } from '@/components/PhoneLink';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import {
  ArrowLeft, Phone, Mail, Building2, User, Briefcase, Tag, Edit2,
  PhoneCall, Calendar, Paperclip, Plus, CheckCircle2, Trash2, MapPin,
  Globe, FileText, Upload, Download, File as FileIcon, Image as ImageIcon,
  Send, AlertCircle, ChevronDown, ChevronRight,
} from 'lucide-react';
import GmailCompose from '@/components/tele-sales/GmailCompose';
import { StatusChangeModal } from '@/components/tele-sales/StatusChangeModal';
import { PipelineStepper } from '@/components/tele-sales/PipelineStepper';
import { StatusHistoryTab } from '@/components/tele-sales/StatusHistoryTab';
import { mergeCallEntries, mergeFollowUpEntries } from '@/utils/leadActivityMerge';
import { STATUS_COLORS, LEAD_STATUS_WORKFLOW } from '@/config/leadStatusWorkflow';
import type { CallLog, FollowUp, FollowUpType, CreateCallLogData, CreateFollowUpData, LeadAttachment, LeadEmail, LeadStatusHistoryEntry } from '@/types/teleSales.types';
import { LEAD_SOURCE_DETAILS } from '@/types/teleSales.types';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
};

const PRIORITY_COLORS: Record<string, string> = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-gray-100 text-gray-600',
};

type Tab = 'info' | 'calls' | 'followups' | 'emails' | 'attachments' | 'hist';

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { currentLead, loading } = useAppSelector((s) => s.teleSalesLeads);
  const { user } = useAppSelector((s) => s.auth);

  const [tab, setTab] = useState<Tab>('info');
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);

  // Emails
  const [emails, setEmails] = useState<LeadEmail[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  // Attachments
  const [attachments, setAttachments] = useState<LeadAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Call form
  const [callForm, setCallForm] = useState<CreateCallLogData>({ notes: '', duration: undefined });
  const [showCallForm, setShowCallForm] = useState(false);

  // Follow-up form
  const emptyFuForm: CreateFollowUpData = { reminderDate: '', followUpType: 'Call', notes: '', status: 'Pending' };
  const [fuForm, setFuForm] = useState<CreateFollowUpData>(emptyFuForm);
  const [showFuForm, setShowFuForm] = useState(false);

  // Status change modal + history
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusHistory, setStatusHistory] = useState<LeadStatusHistoryEntry[]>([]);

  // isAdmin reserved for future use (e.g. reassign controls)
  // const isAdmin = (user as any)?.role === 'admin';

  useEffect(() => {
    if (id) dispatch(fetchLeadById(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (currentLead?._id) {
      loadCalls();
      loadFollowUps();
      loadAttachments();
      loadEmails();
      loadStatusHistory();
    }
  }, [currentLead?._id]);

  const loadCalls = async () => {
    if (!id) return;
    try { const r = await teleSalesApi.getCallsByLead(id); setCallLogs(r.data); } catch {}
  };

  const loadFollowUps = async () => {
    if (!id) return;
    try { const r = await teleSalesApi.getFollowUpsByLead(id); setFollowUps(r.data); } catch {}
  };

  const loadStatusHistory = async () => {
    if (!id) return;
    try { const r = await teleSalesApi.getLeadStatusHistory(id); setStatusHistory(r.data); } catch {}
  };

  const loadAttachments = async () => {
    if (!id) return;
    try { const r = await teleSalesApi.getAttachments(id); setAttachments(r.data); } catch {}
  };

  const loadEmails = async () => {
    if (!id) return;
    try { const r = await teleSalesApi.getLeadEmails(id); setEmails(r.data); } catch {}
  };

  const handleDeleteEmail = async (emailId: string) => {
    const r = await Swal.fire({
      title: 'Remove from history?',
      text: 'The message stays delivered — this only clears the record here.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Remove',
    });
    if (r.isConfirmed && id) {
      try { await teleSalesApi.deleteLeadEmail(id, emailId); toast.success('Removed'); await loadEmails(); }
      catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    }
  };

  const handleDownloadEmailAttachment = async (att: { fileId: string; fileName: string }) => {
    try {
      const blob = await teleSalesApi.downloadFile(att.fileId);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = att.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error('Failed to download file');
    }
  };

  // Two-step add: upload the raw file to GridFS, then link the returned fileId to this lead.
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleUploadAttachment(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadAttachment = async (file: File) => {
    if (!id) return;
    if (file.size > MAX_FILE_SIZE) { toast.error('File too large. Maximum size is 15MB.'); return; }
    setUploading(true);
    try {
      const uploaded = await teleSalesApi.uploadFile(file);
      const { fileId, fileName, fileType, fileSize } = uploaded.data;
      await teleSalesApi.addAttachment(id, { fileId, fileName, fileType, fileSize });
      toast.success('Attachment uploaded');
      await loadAttachments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload attachment');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadAttachment = async (att: LeadAttachment) => {
    try {
      const blob = await teleSalesApi.downloadFile(att.fileId);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = att.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error('Failed to download file');
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    const r = await Swal.fire({ title: 'Delete attachment?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Delete' });
    if (r.isConfirmed && id) {
      try { await teleSalesApi.deleteAttachment(id, attachmentId); toast.success('Deleted'); await loadAttachments(); }
      catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    }
  };

  // Refresh calls + lead stats after a call is auto-logged from a phone link.
  const handleCallLogged = () => {
    loadCalls();
    if (id) dispatch(fetchLeadById(id));
  };

  const handleStatusChanged = () => {
    loadStatusHistory();
    loadFollowUps();
  };

  const handleAddCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await teleSalesApi.addCall(id, callForm);
      toast.success('Call logged');
      setCallForm({ notes: '', duration: undefined });
      setShowCallForm(false);
      await loadCalls();
      dispatch(fetchLeadById(id));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to log call');
    }
  };

  const handleDeleteCall = async (callId: string) => {
    const r = await Swal.fire({ title: 'Delete call log?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Delete' });
    if (r.isConfirmed && id) {
      try { await teleSalesApi.deleteCall(id, callId); toast.success('Deleted'); await loadCalls(); dispatch(fetchLeadById(id)); }
      catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    }
  };

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !fuForm.reminderDate || !fuForm.followUpType) { toast.error('Date and type are required'); return; }
    try {
      await teleSalesApi.addFollowUp(id, fuForm);
      toast.success('Follow-up added');
      setFuForm(emptyFuForm);
      setShowFuForm(false);
      await loadFollowUps();
      dispatch(fetchLeadById(id));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleMarkFollowUpDone = async (fuId: string) => {
    if (!id) return;
    try {
      await teleSalesApi.updateFollowUp(id, fuId, { status: 'Done' });
      toast.success('Marked as done');
      await loadFollowUps();
      dispatch(fetchLeadById(id));
    } catch {}
  };

  const handleDeleteFollowUp = async (fuId: string) => {
    const r = await Swal.fire({ title: 'Delete follow-up?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Delete' });
    if (r.isConfirmed && id) {
      try { await teleSalesApi.deleteFollowUp(id, fuId); toast.success('Deleted'); await loadFollowUps(); dispatch(fetchLeadById(id)); }
      catch {}
    }
  };

  const formatDate = (d?: string) => !d ? '—' : new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatDateTime = (d?: string) => !d ? '—' : new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // One-line summary of a status-history entry's field values, for the merged Calls/Follow-ups tabs.
  const summarizeFieldValues = (entry: LeadStatusHistoryEntry) => {
    const config = LEAD_STATUS_WORKFLOW[entry.newStatus];
    return Object.entries(entry.fieldValues || {})
      .filter(([k, v]) => v !== '' && v != null && config?.fields.find((f) => f.k === k)?.type !== 'auto')
      .slice(0, 3)
      .map(([k, v]) => {
        const field = config?.fields.find((f) => f.k === k);
        const val = typeof v === 'object' ? (v?.fileName || v?.link || '') : String(v);
        return `${field?.label || k}: ${val}`;
      })
      .join(' · ');
  };

  if (loading && !currentLead) {
    return <div className="flex justify-center items-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" /></div>;
  }

  if (!currentLead) return <div className="p-6 text-on-surface-variant">Lead not found.</div>;

  const lead = currentLead;
  // The follow-up detail's meaning depends on the source it was captured under.
  const sourceDetailSpec = lead.leadSource ? LEAD_SOURCE_DETAILS[lead.leadSource] : undefined;
  const assignedName = (lead.assignedTo as any)?.firstName
    ? `${(lead.assignedTo as any).firstName} ${(lead.assignedTo as any).lastName}` : '—';

  return (
    <div className="p-6 space-y-5">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/tele-sales/leads')} className="p-2 rounded-xl hover:bg-surface-container text-on-surface-variant mt-0.5">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-on-surface">{lead.companyName}</h1>
            {lead.customerId && (
              <span className="font-mono text-xs px-2 py-1 rounded-md bg-surface-container-high text-on-surface-variant">{lead.customerId}</span>
            )}
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {lead.status}
            </span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PRIORITY_COLORS[lead.priority]}`}>
              {lead.priority}
            </span>
          </div>
          <p className="text-on-surface-variant text-sm mt-1 flex items-center gap-1.5 flex-wrap">
            <span>{lead.contactPersonName}</span>
            {(lead.phonePrimary || lead.phoneSecondary) && (
              <>
                <span aria-hidden>·</span>
                <PhoneLink number={lead.phonePrimary || lead.phoneSecondary} showIcon={false} leadId={lead._id} onLogged={handleCallLogged} />
              </>
            )}
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setComposeOpen(true)}
            className="gap-2"
            title={lead.email ? `Email ${lead.email}` : 'Compose an email for this lead'}
          >
            <Send className="w-4 h-4" /> Send Email
          </Button>
          <Button
            variant="outline" size="sm" onClick={() => setStatusModalOpen(true)} className="gap-2"
            disabled={lead.status === 'Closed Won'}
          >
            <Edit2 className="w-4 h-4" /> Change Status
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/20 text-center">
          <p className="text-2xl font-bold text-on-surface">{lead.callAttempts}</p>
          <p className="text-xs text-on-surface-variant mt-1">Call Attempts</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/20 text-center">
          <p className="text-sm font-semibold text-on-surface">{formatDate(lead.lastCallDate)}</p>
          <p className="text-xs text-on-surface-variant mt-1">Last Call</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/20 text-center">
          <p className="text-sm font-semibold text-on-surface">{formatDate(lead.nextFollowUpDate)}</p>
          <p className="text-xs text-on-surface-variant mt-1">Next Follow-up</p>
        </div>
      </div>

      <PipelineStepper status={lead.status} />

      {/* Tabs */}
      <div className="border-b border-outline-variant/20">
        <div className="flex gap-1">
          {(['info', 'calls', 'followups', 'emails', 'attachments', 'hist'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
              {t === 'info' ? 'Info'
                : t === 'calls' ? `Calls (${mergeCallEntries(callLogs, statusHistory).length})`
                : t === 'followups' ? `Follow-ups (${mergeFollowUpEntries(followUps, statusHistory).length})`
                : t === 'emails' ? `Emails (${emails.length})`
                : t === 'attachments' ? `Attachments (${attachments.length})`
                : `Status History (${statusHistory.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Info */}
      {tab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 space-y-4">
            <h3 className="font-semibold text-on-surface text-sm uppercase tracking-wide text-on-surface-variant">Contact Details</h3>
            <InfoRow icon={<Building2 className="w-4 h-4" />} label="Company" value={lead.companyName} />
            <InfoRow icon={<User className="w-4 h-4" />} label="Contact Person" value={lead.contactPersonName} />
            {lead.email && <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={lead.email} />}
            {lead.website && <InfoRow icon={<Globe className="w-4 h-4" />} label="Website" value={lead.website} />}
            {lead.phonePrimary && <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone (Primary)" value={<PhoneLink number={lead.phonePrimary} showIcon={false} leadId={lead._id} onLogged={handleCallLogged} />} />}
            {lead.phoneSecondary && <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone (Secondary)" value={<PhoneLink number={lead.phoneSecondary} showIcon={false} leadId={lead._id} onLogged={handleCallLogged} />} />}
            {lead.phoneOther && (
              <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone (Other)" value={
                <span className="flex flex-wrap gap-x-2 gap-y-0.5">
                  {lead.phoneOther.split(/[,/]/).map((n) => n.trim()).filter(Boolean).map((n, i) => (
                    <PhoneLink key={`${n}-${i}`} number={n} showIcon={false} leadId={lead._id} onLogged={handleCallLogged} />
                  ))}
                </span>
              } />
            )}
            {lead.jobTitle && <InfoRow icon={<Briefcase className="w-4 h-4" />} label="Job Title" value={lead.jobTitle} />}
            {lead.industry && <InfoRow icon={<Building2 className="w-4 h-4" />} label="Industry" value={lead.industry} />}
          </div>
          <div className="space-y-5">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 space-y-4">
              <h3 className="font-semibold text-on-surface text-sm uppercase tracking-wide text-on-surface-variant">Lead Details</h3>
              <InfoRow icon={<Tag className="w-4 h-4" />} label="Sales Type" value={lead.salesType || 'Lead'} />
              {lead.leadSource && <InfoRow icon={<Tag className="w-4 h-4" />} label="Source" value={lead.leadSource} />}
              {lead.leadSource && lead.leadSourceDetail && sourceDetailSpec && (
                <InfoRow
                  icon={<Tag className="w-4 h-4" />}
                  label={sourceDetailSpec.label}
                  value={sourceDetailSpec.type === 'url'
                    ? <a href={lead.leadSourceDetail.startsWith('http') ? lead.leadSourceDetail : `https://${lead.leadSourceDetail}`}
                         target="_blank" rel="noreferrer noopener"
                         className="text-primary hover:underline break-all">{lead.leadSourceDetail}</a>
                    : lead.leadSourceDetail}
                />
              )}
              <InfoRow icon={<User className="w-4 h-4" />} label="Assigned To" value={assignedName} />
              {lead.potentialValue != null && <InfoRow icon={<Tag className="w-4 h-4" />} label="Potential Value" value={`$${lead.potentialValue.toLocaleString()}`} />}
              {lead.isDecisionMaker != null && <InfoRow icon={<CheckCircle2 className="w-4 h-4" />} label="Decision Maker" value={lead.isDecisionMaker ? 'Yes' : 'No'} />}
              {lead.dataSource && <InfoRow icon={<FileText className="w-4 h-4" />} label="Data Source" value={lead.dataSource} />}
            </div>
            {(lead.entityType || lead.industrySector || lead.businessClassification ||
              lead.country || lead.fullAddress) && (
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 space-y-4">
                <h3 className="font-semibold text-on-surface text-sm uppercase tracking-wide text-on-surface-variant">Classification &amp; Location</h3>
                {lead.entityType && <InfoRow icon={<Building2 className="w-4 h-4" />} label="Entity Type" value={lead.entityType} />}
                {lead.industrySector && <InfoRow icon={<Briefcase className="w-4 h-4" />} label="Industry Sector" value={lead.industrySector} />}
                {lead.businessClassification && <InfoRow icon={<Tag className="w-4 h-4" />} label="Business Classification" value={lead.businessClassification} />}
                {lead.country && <InfoRow icon={<Globe className="w-4 h-4" />} label="Country" value={lead.country} />}
                {lead.fullAddress && <InfoRow icon={<MapPin className="w-4 h-4" />} label="Full Address" value={lead.fullAddress} />}
              </div>
            )}
            {(lead.painPoints || lead.customerNeeds || lead.budget) && (
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 space-y-4">
                <h3 className="font-semibold text-on-surface text-sm uppercase tracking-wide text-on-surface-variant">Notes & Insights</h3>
                {lead.painPoints && <InfoRow icon={<Tag className="w-4 h-4" />} label="Pain Points" value={lead.painPoints} />}
                {lead.customerNeeds && <InfoRow icon={<Tag className="w-4 h-4" />} label="Customer Needs" value={lead.customerNeeds} />}
                {lead.budget && <InfoRow icon={<Tag className="w-4 h-4" />} label="Budget" value={lead.budget} />}
              </div>
            )}
            {lead.tags.length > 0 && (
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
                <h3 className="font-semibold text-on-surface text-sm uppercase tracking-wide text-on-surface-variant mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {lead.tags.map((t) => (
                    <span key={t} className="bg-brand-100 text-brand-700 text-xs font-medium px-2.5 py-1 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Calls */}
      {tab === 'calls' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCallForm(!showCallForm)} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" /> Log Call
            </Button>
          </div>

          {showCallForm && (
            <form onSubmit={handleAddCall} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 space-y-4">
              <h3 className="font-semibold text-on-surface">Log New Call</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-on-surface mb-1 block">Call Date & Time</label>
                  <input type="datetime-local" value={callForm.callDate || ''} onChange={(e) => setCallForm(p => ({ ...p, callDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-sm font-medium text-on-surface mb-1 block">Duration (minutes)</label>
                  <Input type="number" value={callForm.duration || ''} onChange={(e) => setCallForm(p => ({ ...p, duration: e.target.value ? Number(e.target.value) : undefined }))} placeholder="e.g. 5" min={0} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-on-surface mb-1 block">Notes</label>
                <textarea value={callForm.notes || ''} onChange={(e) => setCallForm(p => ({ ...p, notes: e.target.value }))}
                  rows={3} className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Summary of the call..." />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCallForm(false)}>Cancel</Button>
                <Button type="submit" size="sm">Save Call</Button>
              </div>
            </form>
          )}

          {mergeCallEntries(callLogs, statusHistory).length === 0 ? (
            <div className="flex flex-col items-center py-12 text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
              <PhoneCall className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No call logs yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mergeCallEntries(callLogs, statusHistory).map((row) => row.kind === 'manual' && row.manual ? (
                <div key={row.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-on-surface">{formatDateTime(row.manual.callDate)}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        by {row.manual.calledBy?.firstName} {row.manual.calledBy?.lastName}
                        {row.manual.duration ? ` · ${row.manual.duration} min` : ''}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteCall(row.manual!._id)} className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {row.manual.notes && <p className="mt-3 text-sm text-on-surface bg-surface-container rounded-xl p-3">{row.manual.notes}</p>}
                </div>
              ) : row.statusEntry ? (
                <div key={row.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: LEAD_STATUS_WORKFLOW[row.statusEntry.newStatus]?.bg, color: LEAD_STATUS_WORKFLOW[row.statusEntry.newStatus]?.color }}
                        >
                          {row.statusEntry.newStatus}
                        </span>
                        <span className="text-xs text-on-surface-variant">{formatDateTime(row.statusEntry.changedAt)}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1 truncate">{summarizeFieldValues(row.statusEntry)}</p>
                    </div>
                  </div>
                </div>
              ) : null)}
            </div>
          )}
        </div>
      )}

      {/* Tab: Follow-ups */}
      {tab === 'followups' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowFuForm(!showFuForm)} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" /> Add Follow-up
            </Button>
          </div>

          {showFuForm && (
            <form onSubmit={handleAddFollowUp} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 space-y-4">
              <h3 className="font-semibold text-on-surface">New Follow-up</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-on-surface mb-1 block">Reminder Date *</label>
                  <input type="datetime-local" value={fuForm.reminderDate} onChange={(e) => setFuForm(p => ({ ...p, reminderDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-sm font-medium text-on-surface mb-1 block">Type *</label>
                  <select value={fuForm.followUpType} onChange={(e) => setFuForm(p => ({ ...p, followUpType: e.target.value as FollowUpType }))}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {(['Call', 'WhatsApp', 'Email', 'Meeting'] as FollowUpType[]).map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-on-surface mb-1 block">Notes</label>
                <textarea value={fuForm.notes || ''} onChange={(e) => setFuForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="What to discuss..." />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowFuForm(false)}>Cancel</Button>
                <Button type="submit" size="sm">Save Follow-up</Button>
              </div>
            </form>
          )}

          {mergeFollowUpEntries(followUps, statusHistory).length === 0 ? (
            <div className="flex flex-col items-center py-12 text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
              <Calendar className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No follow-ups yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mergeFollowUpEntries(followUps, statusHistory).map((row) => row.kind === 'manual' && row.manual ? (
                <div key={row.id} className={`rounded-2xl border p-5 ${row.manual.status === 'Done' ? 'bg-surface-container/50 border-outline-variant/10 opacity-60' : 'bg-surface-container-lowest border-outline-variant/20'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-on-surface">{formatDateTime(row.manual.reminderDate)}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${row.manual.status === 'Done' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {row.manual.status}
                        </span>
                        <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">{row.manual.followUpType}</span>
                      </div>
                      {row.manual.notes && <p className="text-sm text-on-surface-variant mt-2">{row.manual.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      {row.manual.status === 'Pending' && (
                        <button onClick={() => handleMarkFollowUpDone(row.manual!._id)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-on-surface-variant hover:text-emerald-600" title="Mark Done">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDeleteFollowUp(row.manual!._id)} className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : row.statusEntry ? (
                <div key={row.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: LEAD_STATUS_WORKFLOW[row.statusEntry.newStatus]?.bg, color: LEAD_STATUS_WORKFLOW[row.statusEntry.newStatus]?.color }}
                    >
                      {row.statusEntry.newStatus}
                    </span>
                    <span className="text-xs text-on-surface-variant">{formatDateTime(row.statusEntry.changedAt)}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1.5">{summarizeFieldValues(row.statusEntry)}</p>
                </div>
              ) : null)}
            </div>
          )}
        </div>
      )}

      {/* Tab: Emails */}
      {tab === 'emails' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-on-surface-variant">
              Messages sent to this lead. Replies go to your own inbox.
            </p>
            <Button onClick={() => setComposeOpen(true)} className="gap-2">
              <Send className="w-4 h-4" /> Compose
            </Button>
          </div>

          {emails.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
              <Mail className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm font-medium">No emails sent yet</p>
              <p className="text-xs mt-1">Click “Compose” to write the first message</p>
            </div>
          ) : (
            <div className="space-y-3">
              {emails.map((email) => {
                const expanded = expandedEmail === email._id;
                return (
                  <div key={email._id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
                    <div className="flex items-start gap-3 p-4">
                      <button
                        onClick={() => setExpandedEmail(expanded ? null : email._id)}
                        className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant mt-0.5 shrink-0"
                        aria-label={expanded ? 'Collapse message' : 'Expand message'}
                      >
                        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => setExpandedEmail(expanded ? null : email._id)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-on-surface truncate">{email.subject}</span>
                          {email.status === 'failed' && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-error/10 text-error">
                              <AlertCircle className="w-3 h-3" /> Failed
                            </span>
                          )}
                          {email.attachments.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-on-surface-variant">
                              <Paperclip className="w-3 h-3" /> {email.attachments.length}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant mt-1 truncate">
                          To {email.to.join(', ')}
                          {email.cc.length > 0 && ` · Cc ${email.cc.join(', ')}`}
                          {email.bcc.length > 0 && ` · Bcc ${email.bcc.join(', ')}`}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {email.sentByName || '—'} · {formatDateTime(email.sentAt || email.createdAt)}
                        </p>
                      </button>

                      <button
                        onClick={() => handleDeleteEmail(email._id)}
                        className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error shrink-0"
                        title="Remove from history"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {expanded && (
                      <div className="border-t border-outline-variant/20 px-4 py-4 space-y-3">
                        {email.status === 'failed' && email.errorMessage && (
                          <p className="text-xs text-error bg-error/5 rounded-xl px-3 py-2">{email.errorMessage}</p>
                        )}
                        {/* Body is sanitised server-side before it is stored. */}
                        <div
                          className="email-body-content text-sm text-on-surface"
                          dangerouslySetInnerHTML={{ __html: email.body || '<p><em>(no message body)</em></p>' }}
                        />
                        {email.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-outline-variant/20">
                            {email.attachments.map((att) => (
                              <button
                                key={att.fileId}
                                onClick={() => handleDownloadEmailAttachment(att)}
                                className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/40 px-3 py-2 text-xs text-on-surface hover:bg-surface-container transition-colors"
                              >
                                {att.fileType?.startsWith('image/')
                                  ? <ImageIcon className="w-3.5 h-3.5 text-brand-500" />
                                  : <FileIcon className="w-3.5 h-3.5 text-on-surface-variant" />}
                                <span className="truncate max-w-[200px]">{att.fileName}</span>
                                <span className="text-on-surface-variant">{formatFileSize(att.fileSize)}</span>
                                <Download className="w-3.5 h-3.5 text-on-surface-variant" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Attachments */}
      {tab === 'attachments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-on-surface-variant">Images, PDF, Word, Excel, PowerPoint, TXT, Video, ZIP · Max 15MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,video/*,application/zip,application/x-zip-compressed,application/x-zip,.zip"
              onChange={handleFileSelected}
              disabled={uploading}
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
              {uploading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Upload File
                </>
              )}
            </Button>
          </div>

          {attachments.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
              <Paperclip className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm font-medium">No attachments yet</p>
              <p className="text-xs mt-1">Click “Upload File” to attach a file to this lead</p>
            </div>
          ) : (
            <div className="space-y-2">
              {attachments.map((att) => (
                <div key={att._id} className="group flex items-center gap-3 p-3 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 hover:bg-surface-container transition-colors">
                  <div className="w-11 h-11 rounded-xl bg-surface-container-high flex items-center justify-center flex-shrink-0">
                    {att.fileType?.startsWith('image/')
                      ? <ImageIcon className="w-5 h-5 text-brand-500" />
                      : <FileIcon className="w-5 h-5 text-on-surface-variant" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-on-surface truncate">{att.fileName}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {formatFileSize(att.fileSize)}
                      {att.uploadedBy?.firstName && ` · ${att.uploadedBy.firstName} ${att.uploadedBy.lastName}`}
                      {att.createdAt && ` · ${formatDate(att.createdAt)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleDownloadAttachment(att)} className="p-1.5 rounded-lg hover:bg-brand-50 text-on-surface-variant hover:text-brand-600" title="Download">
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteAttachment(att._id)} className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Status History */}
      {tab === 'hist' && id && <StatusHistoryTab leadId={id} />}

      <StatusChangeModal
        lead={lead}
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        onChanged={handleStatusChanged}
      />

      {/* Gmail-style compose window */}
      <GmailCompose
        leadId={lead._id}
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        defaultTo={lead.email ? [lead.email] : []}
        contextLabel={lead.contactPersonName || lead.companyName}
        fromLabel={user?.email}
        onSent={() => { loadEmails(); setTab('emails'); }}
      />
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-on-surface-variant mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-on-surface-variant">{label}</p>
        <div className="text-sm text-on-surface font-medium break-words">{value}</div>
      </div>
    </div>
  );
}
