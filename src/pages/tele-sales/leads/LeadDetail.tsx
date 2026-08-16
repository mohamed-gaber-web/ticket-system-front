import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchLeadById, updateLead } from '@/redux/slices/teleSalesLeadsSlice';
import * as teleSalesApi from '@/api/teleSalesApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneLink } from '@/components/PhoneLink';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import {
  ArrowLeft, Phone, Mail, Building2, User, Briefcase, Tag, Edit2, X,
  PhoneCall, Calendar, Paperclip, Plus, CheckCircle2, Trash2, MapPin,
  Globe, Landmark, FileText, Upload, Download, File as FileIcon, Image as ImageIcon,
  Send, AlertCircle, ChevronDown, ChevronRight,
} from 'lucide-react';
import GmailCompose from '@/components/tele-sales/GmailCompose';
import type { CallLog, FollowUp, LeadStatus, FollowUpType, CreateCallLogData, CreateFollowUpData, LeadAttachment, LeadEmail } from '@/types/teleSales.types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
};

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

const ALL_STATUSES: LeadStatus[] = [
  'New Lead', 'No Answer', 'Not Available', 'Call Back Later', 'Interested',
  'Not Interested', 'Wrong Number', 'Invalid Lead', 'Follow-up',
  'Meeting Scheduled', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost',
];

type Tab = 'info' | 'calls' | 'followups' | 'emails' | 'attachments';

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

  // Status quick-change
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<LeadStatus>('New Lead');

  // isAdmin reserved for future use (e.g. reassign controls)
  // const isAdmin = (user as any)?.role === 'admin';

  useEffect(() => {
    if (id) dispatch(fetchLeadById(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (currentLead?._id) {
      setNewStatus(currentLead.status);
      loadCalls();
      loadFollowUps();
      loadAttachments();
      loadEmails();
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
    if (file.size > MAX_FILE_SIZE) { toast.error('File too large. Maximum size is 10MB.'); return; }
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

  const handleStatusUpdate = async () => {
    if (!id) return;
    await dispatch(updateLead({ id, data: { status: newStatus } }));
    setEditingStatus(false);
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

  if (loading && !currentLead) {
    return <div className="flex justify-center items-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" /></div>;
  }

  if (!currentLead) return <div className="p-6 text-on-surface-variant">Lead not found.</div>;

  const lead = currentLead;
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
          {editingStatus ? (
            <>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as LeadStatus)}
                className="px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <Button size="sm" onClick={handleStatusUpdate}>Save</Button>
              <button onClick={() => setEditingStatus(false)} className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant">
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditingStatus(true)} className="gap-2">
              <Edit2 className="w-4 h-4" /> Change Status
            </Button>
          )}
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

      {/* Tabs */}
      <div className="border-b border-outline-variant/20">
        <div className="flex gap-1">
          {(['info', 'calls', 'followups', 'emails', 'attachments'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
              {t === 'info' ? 'Info'
                : t === 'calls' ? `Calls (${callLogs.length})`
                : t === 'followups' ? `Follow-ups (${followUps.length})`
                : t === 'emails' ? `Emails (${emails.length})`
                : `Attachments (${attachments.length})`}
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
            {lead.companySize && <InfoRow icon={<User className="w-4 h-4" />} label="Company Size" value={lead.companySize} />}
          </div>
          <div className="space-y-5">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 space-y-4">
              <h3 className="font-semibold text-on-surface text-sm uppercase tracking-wide text-on-surface-variant">Lead Details</h3>
              {lead.leadSource && <InfoRow icon={<Tag className="w-4 h-4" />} label="Source" value={lead.leadSource} />}
              <InfoRow icon={<User className="w-4 h-4" />} label="Assigned To" value={assignedName} />
              {lead.potentialValue != null && <InfoRow icon={<Tag className="w-4 h-4" />} label="Potential Value" value={`$${lead.potentialValue.toLocaleString()}`} />}
              {lead.isDecisionMaker != null && <InfoRow icon={<CheckCircle2 className="w-4 h-4" />} label="Decision Maker" value={lead.isDecisionMaker ? 'Yes' : 'No'} />}
              {lead.dataSource && <InfoRow icon={<FileText className="w-4 h-4" />} label="Data Source" value={lead.dataSource} />}
            </div>
            {(lead.entityType || lead.industrySector || lead.businessClassification ||
              lead.country || lead.governorate || lead.cityArea || lead.fullAddress) && (
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 space-y-4">
                <h3 className="font-semibold text-on-surface text-sm uppercase tracking-wide text-on-surface-variant">Classification &amp; Location</h3>
                {lead.entityType && <InfoRow icon={<Building2 className="w-4 h-4" />} label="Entity Type" value={lead.entityType} />}
                {lead.industrySector && <InfoRow icon={<Briefcase className="w-4 h-4" />} label="Industry Sector" value={lead.industrySector} />}
                {lead.businessClassification && <InfoRow icon={<Tag className="w-4 h-4" />} label="Business Classification" value={lead.businessClassification} />}
                {lead.country && <InfoRow icon={<Globe className="w-4 h-4" />} label="Country" value={lead.country} />}
                {lead.governorate && <InfoRow icon={<Landmark className="w-4 h-4" />} label="Governorate" value={lead.governorate} />}
                {lead.cityArea && <InfoRow icon={<MapPin className="w-4 h-4" />} label="City / Area" value={lead.cityArea} />}
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

          {callLogs.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
              <PhoneCall className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No call logs yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {callLogs.map((call) => (
                <div key={call._id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-on-surface">{formatDateTime(call.callDate)}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        by {call.calledBy?.firstName} {call.calledBy?.lastName}
                        {call.duration ? ` · ${call.duration} min` : ''}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteCall(call._id)} className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {call.notes && <p className="mt-3 text-sm text-on-surface bg-surface-container rounded-xl p-3">{call.notes}</p>}
                </div>
              ))}
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

          {followUps.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
              <Calendar className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No follow-ups yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {followUps.map((fu) => (
                <div key={fu._id} className={`rounded-2xl border p-5 ${fu.status === 'Done' ? 'bg-surface-container/50 border-outline-variant/10 opacity-60' : 'bg-surface-container-lowest border-outline-variant/20'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-on-surface">{formatDateTime(fu.reminderDate)}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${fu.status === 'Done' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {fu.status}
                        </span>
                        <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">{fu.followUpType}</span>
                      </div>
                      {fu.notes && <p className="text-sm text-on-surface-variant mt-2">{fu.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      {fu.status === 'Pending' && (
                        <button onClick={() => handleMarkFollowUpDone(fu._id)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-on-surface-variant hover:text-emerald-600" title="Mark Done">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDeleteFollowUp(fu._id)} className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
            <p className="text-xs text-on-surface-variant">Images, PDF, Word, Excel, PowerPoint, TXT, Video, ZIP · Max 10MB</p>
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
