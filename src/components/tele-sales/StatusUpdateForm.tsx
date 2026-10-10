import { useEffect, useState } from 'react';
import { X, Upload, Loader2, Send, Pencil, History } from 'lucide-react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchAgents } from '@/redux/slices/teleSalesAgentsSlice';
import { changeLeadStatus } from '@/redux/slices/teleSalesLeadsSlice';
import * as teleSalesApi from '@/api/teleSalesApi';
import { useTeamAgents } from '@/hooks/useTeamAgents';
import { teamId } from '@/types/teleSales.types';
import { StatusEntryDetails } from '@/components/tele-sales/StatusHistoryTab';
import { Button } from '@/components/ui/button';
import {
  LEAD_STATUS_WORKFLOW, NEXT, validateStatusFields,
  type LeadStatus, type StatusFieldDef,
} from '@/config/leadStatusWorkflow';
import type { Lead, ChangeLeadStatusError, LeadStatusHistoryEntry } from '@/types/teleSales.types';
import { VALUE_CURRENCIES } from '@/types/teleSales.types';

interface StatusUpdateFormProps {
  lead: Lead;
  /**
   * 'dialog' — the Change Status dialog: nothing picked until the user chooses.
   * 'inline' — the lead page's Quick Update card: opens on the current status
   * (when it can be re-logged) so its inputs are ready to fill straight away.
   */
  variant: 'dialog' | 'inline';
  onChanged?: (lead: Lead) => void;
  /**
   * Inline only — the lead's status history (newest first). A status logged
   * before opens on its last update, read-only until the agent presses Edit.
   */
  history?: LeadStatusHistoryEntry[];
  /** Dialog only — the Cancel button. */
  onCancel?: () => void;
  /**
   * Bulk mode (the Bulk Edit dialog): offer these statuses instead of the lead's
   * transitions, fill the inputs once, and hand them to `onSubmit` instead of
   * saving one lead. `lead` is then only a blank stand-in.
   */
  bulk?: {
    targets: LeadStatus[];
    count: number;
    onSubmit: (newStatus: LeadStatus, values: Record<string, unknown>) => Promise<void>;
  };
}

const MONEY_CURRENCIES = VALUE_CURRENCIES;

/** Statuses that bump a lead counter when logged (mirrors `increments` on the backend). */
const COUNTED_STATUSES: Partial<Record<LeadStatus, 'callAttempts' | 'meetingsCount'>> = {
  'No Answer': 'callAttempts',
  'Meeting Scheduled': 'meetingsCount',
};

interface QuickEmail {
  to: string;
  subject: string;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const splitAddresses = (raw: string) => raw.split(/[,;\s]+/).map((a) => a.trim()).filter(Boolean);
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Plain text from the textarea → the HTML body the email endpoint expects. */
const textToHtml = (text: string) =>
  text.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
const formatWhen = (v?: string) =>
  v ? new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

/** A first draft from what was just typed into the status inputs; the agent edits it freely. */
const draftEmail = (lead: Lead, values: Record<string, unknown>): QuickEmail => {
  const greeting = lead.contactPersonName ? `Dear ${lead.contactPersonName},` : 'Hello,';
  const lines = [greeting, '', 'Thank you for your time today.'];
  if (values.summary) lines.push('', `As discussed: ${String(values.summary)}`);
  if (values.nextDate) lines.push('', `We will follow up with you on ${formatWhen(String(values.nextDate))}.`);
  lines.push('', 'Best regards,');
  return {
    to: lead.email ?? '',
    subject: values.topic ? `Follow-up: ${String(values.topic)}` : `Follow-up — ${lead.companyName}`,
    message: lines.join('\n'),
  };
};

const pickerLabel = (status: LeadStatus, lead: Lead) => {
  if (status === 'Meeting Scheduled' && lead.meetingsCount > 0) return `Meeting Scheduled — Round #${lead.meetingsCount + 1}`;
  if (status === 'No Answer' && lead.status === 'No Answer') return 'No Answer — another attempt';
  if (status === lead.status) return `${status} — update`;
  return status;
};

const isFieldVisible = (field: StatusFieldDef, values: Record<string, any>, lead: Lead) => !field.showIf || field.showIf(values, lead);
const isFieldNeeded = (field: StatusFieldDef, values: Record<string, any>, lead: Lead) => !!field.req || (field.reqIf ? field.reqIf(values, lead) : false);

/**
 * Fresh values for a status: defaults, empty chips, unchecked toggles, EGP money,
 * and the lead's current owner (only a manager may hand it to someone else).
 */
const initialValues = (status: LeadStatus, lead: Lead) => {
  const initial: Record<string, any> = {};
  LEAD_STATUS_WORKFLOW[status].fields.forEach((f) => {
    if (f.type === 'toggle') initial[f.k] = false;
    else if (f.type === 'chips') initial[f.k] = [];
    else if (f.type === 'money') initial[`${f.k}__c`] = 'EGP';
    else if (f.dynamic === 'agents') initial[f.k] = lead.assignedTo?._id ?? '';
    if (f.def) initial[f.k] = f.def();
  });
  return initial;
};

/**
 * The form values a history entry was saved with. History stores them for display
 * (see buildFieldValueMap on the backend): chips as "a, b", money as
 * "50,000 EGP", a pasted link as { link }. This turns them back into inputs.
 */
const valuesFromHistory = (status: LeadStatus, lead: Lead, entry: LeadStatusHistoryEntry) => {
  const out = initialValues(status, lead);
  const saved = entry.fieldValues || {};
  LEAD_STATUS_WORKFLOW[status].fields.forEach((f) => {
    const raw = saved[f.k];
    if (raw === undefined || raw === null || f.type === 'auto') return;
    if (f.type === 'chips') {
      out[f.k] = Array.isArray(raw) ? raw : String(raw).split(',').map((s) => s.trim()).filter(Boolean);
    } else if (f.type === 'money') {
      const m = String(raw).match(/^([\d,.]+)\s*([A-Z]{3})?$/);
      if (m) {
        out[f.k] = m[1].replace(/,/g, '');
        if (m[2] && (MONEY_CURRENCIES as readonly string[]).includes(m[2])) out[`${f.k}__c`] = m[2];
      }
    } else if (f.type === 'attach') {
      out[f.k] = raw.fileId ? raw : raw.link ?? undefined;
    } else if (f.type === 'datetime') {
      // datetime-local wants "YYYY-MM-DDTHH:mm" in local time
      const d = new Date(raw);
      out[f.k] = Number.isNaN(d.getTime()) ? '' : new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    } else {
      out[f.k] = raw;
    }
  });
  return out;
};

/**
 * Pick a status and fill the inputs it requires, then save it through the
 * validated workflow (POST /leads/:id/status). Shared by the Change Status
 * dialog and the lead page's Quick Update card so both behave the same.
 */
export function StatusUpdateForm({ lead, variant, onChanged, onCancel, bulk, history }: StatusUpdateFormProps) {
  const dispatch = useAppDispatch();
  const allAgents = useAppSelector((s) => s.teleSalesAgents.agents);
  // The owner picker ("New Lead") lists the employees of the lead's own team; in
  // bulk mode the records may span teams, so it falls back to the full roster.
  const { agents: leadTeamAgents } = useTeamAgents(bulk ? null : teamId(lead.team) || null);
  const agents = bulk ? allAgents : leadTeamAgents;

  const allowed = bulk ? bulk.targets : NEXT[lead.status] || [];
  // The inline card starts on the current status — a quick update of it.
  const defaultTarget = !bulk && variant === 'inline' && allowed.includes(lead.status) ? lead.status : null;
  // The picker leads with the current status, tagged "Current", so the agent can
  // always see where the lead stands — even when it can't be re-logged (No Action).
  const showCurrent = !bulk;
  const pickerStatuses: LeadStatus[] = showCurrent
    ? [lead.status, ...allowed.filter((s) => s !== lead.status)]
    : allowed;

  // The newest history entry of a status (history comes newest first). Only the
  // inline card shows it; the dialog and bulk edit always start blank.
  const lastUpdateOf = (status: LeadStatus | null) =>
    (status && !bulk && variant === 'inline' && history?.find((h) => h.newStatus === status)) || null;
  const startValues = (status: LeadStatus) => {
    const last = lastUpdateOf(status);
    return last ? valuesFromHistory(status, lead, last) : initialValues(status, lead);
  };

  const [target, setTarget] = useState<LeadStatus | null>(defaultTarget);
  const [values, setValues] = useState<Record<string, any>>(defaultTarget ? startValues(defaultTarget) : {});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  // Optional email sent together with the status (statuses marked quickEmail)
  const [sendEmail, setSendEmail] = useState(false);
  const [email, setEmail] = useState<QuickEmail>({ to: '', subject: '', message: '' });
  // A status with a last update opens read-only; Edit unlocks its inputs.
  const [editing, setEditing] = useState(false);
  const lastUpdate = lastUpdateOf(target);
  const locked = !!lastUpdate && !editing;
  // Editing the current status's newest update corrects it in place (the same
  // history entry) instead of adding another; moving to a new status always adds.
  const amending = !!lastUpdate && editing && target === lead.status && history?.[0]?._id === lastUpdate._id;

  // History arrives after the first render and reloads after each save: show the
  // newest update of the picked status unless the agent is mid-edit.
  useEffect(() => {
    if (target && !editing) setValues(startValues(target));
  }, [lastUpdate?._id, lastUpdate?.editedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start over whenever the lead or its status changes (e.g. after a save).
  useEffect(() => {
    setTarget(defaultTarget);
    setValues(defaultTarget ? startValues(defaultTarget) : {});
    setFieldErrors({});
    setSendEmail(false);
    setEditing(false);
    if (bulk && allAgents.length === 0) dispatch(fetchAgents({ limit: 200 }));
  }, [lead._id, lead.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const config = target ? LEAD_STATUS_WORKFLOW[target] : null;
  // An edit of the current status's last update describes that same attempt /
  // meeting round, so its numbering is read from the counters before it was logged.
  const counter = target === lead.status && lastUpdate ? COUNTED_STATUSES[target] : undefined;
  const fieldLead: Lead = counter ? { ...lead, [counter]: Math.max(0, (lead[counter] || 0) - 1) } : lead;
  const extraMeeting = target === 'Meeting Scheduled' && fieldLead.meetingsCount > 0;

  const pickStatus = (status: LeadStatus) => {
    setTarget(status);
    setValues(startValues(status));
    setFieldErrors({});
    setSendEmail(false);
    setEditing(false);
  };

  const toggleSendEmail = (on: boolean) => {
    setSendEmail(on);
    // Draft it from the inputs filled so far; the agent can still edit everything.
    if (on) setEmail(draftEmail(lead, values));
    setFieldErrors((p) => ({ ...p, email_to: '', email_subject: '', email_message: '' }));
  };

  const setEmailField = (key: keyof QuickEmail, value: string) => {
    setEmail((p) => ({ ...p, [key]: value }));
    setFieldErrors((p) => (p[`email_${key}`] ? { ...p, [`email_${key}`]: '' } : p));
  };

  const setValue = (key: string, value: any) => {
    setValues((p) => ({ ...p, [key]: value }));
    setFieldErrors((p) => (p[key] ? { ...p, [key]: '' } : p));
  };

  const reset = () => {
    setTarget(defaultTarget);
    setValues(defaultTarget ? startValues(defaultTarget) : {});
    setFieldErrors({});
    setSendEmail(false);
    setEditing(false);
  };

  const handleAttachUpload = async (fieldKey: string, file: File) => {
    setUploadingField(fieldKey);
    try {
      const uploaded = await teleSalesApi.uploadFile(file);
      setValue(fieldKey, {
        fileId: uploaded.data.fileId, fileName: uploaded.data.fileName,
        fileType: uploaded.data.fileType, fileSize: uploaded.data.fileSize,
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmit = async () => {
    if (!target) return;
    const { errors } = validateStatusFields(target, values, fieldLead);
    const map: Record<string, string> = {};
    errors.forEach((e) => { map[e.field] = e.message; });
    // The email is checked BEFORE the status saves, so a typo never leaves a
    // follow-up logged without the email the agent meant to send.
    const emailing = !bulk && sendEmail && !!config?.quickEmail;
    const recipients = splitAddresses(email.to);
    if (emailing) {
      if (recipients.length === 0) map.email_to = 'Add at least one recipient';
      else if (recipients.some((a) => !EMAIL_RE.test(a))) map.email_to = 'Check the email address';
      if (!email.subject.trim()) map.email_subject = 'Subject is required';
      if (!email.message.trim()) map.email_message = 'Message is required';
    }
    if (Object.keys(map).length > 0) {
      setFieldErrors(map);
      return;
    }

    if (bulk) {
      setSubmitting(true);
      try {
        await bulk.onSubmit(target, values);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      const updated = await dispatch(changeLeadStatus({ id: lead._id, data: { newStatus: target, values, ...(amending ? { amendLast: true } : {}) } })).unwrap();
      if (emailing) {
        try {
          await teleSalesApi.sendLeadEmail(lead._id, {
            to: recipients,
            subject: email.subject.trim(),
            message: textToHtml(email.message.trim()),
          });
          toast.success('Email sent to the customer');
        } catch (err) {
          const reason = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'unknown error';
          toast.error(`${target} saved, but the email was not sent: ${reason}`);
        }
      }
      // A same-status update leaves lead.status unchanged, so clear the inputs here.
      reset();
      onChanged?.(updated);
    } catch (err) {
      const payload = err as ChangeLeadStatusError;
      if (payload?.errors?.length) {
        const map: Record<string, string> = {};
        payload.errors.forEach((e) => { if (e.field) map[e.field] = e.message; });
        setFieldErrors(map);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: StatusFieldDef) => {
    const value = values[field.k];
    const error = fieldErrors[field.k];
    const needed = isFieldNeeded(field, values, fieldLead);
    const baseInputCls = `w-full rounded-xl border bg-surface px-3 py-2 text-sm text-on-surface outline-none transition-colors focus:ring-2 focus:ring-primary/30 ${error ? 'border-error bg-error/5' : 'border-outline-variant'}`;
    // Long inputs take the full row of the inline card's two-column grid
    const wide = field.type === 'textarea' || field.type === 'chips' || field.type === 'attach';

    let control: React.ReactNode;
    switch (field.type) {
      case 'auto':
        control = <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">{field.val?.(fieldLead)}</div>;
        break;
      case 'text':
        control = <input type="text" className={baseInputCls} value={value || ''} onChange={(e) => setValue(field.k, e.target.value)} />;
        break;
      case 'textarea':
        control = <textarea rows={3} className={`${baseInputCls} resize-none`} value={value || ''} onChange={(e) => setValue(field.k, e.target.value)} />;
        break;
      case 'datetime':
        control = <input type="datetime-local" className={baseInputCls} value={value || ''} onChange={(e) => setValue(field.k, e.target.value)} />;
        break;
      case 'select':
        if (field.dynamic === 'agents') {
          control = (
            <select className={baseInputCls} value={value || ''} onChange={(e) => setValue(field.k, e.target.value)}>
              <option value="">— Select —</option>
              {agents.map((a) => <option key={a._id} value={a._id}>{a.fullName || `${a.firstName} ${a.lastName}`}</option>)}
            </select>
          );
        } else {
          control = (
            <select className={baseInputCls} value={value || ''} onChange={(e) => setValue(field.k, e.target.value)}>
              <option value="">— Select —</option>
              {(field.opts || []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          );
        }
        break;
      case 'toggle':
        control = (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-primary" checked={!!value} onChange={(e) => setValue(field.k, e.target.checked)} />
            Yes, create the reminder
          </label>
        );
        break;
      case 'money':
        control = (
          <div className="flex gap-2">
            <input type="number" min={0} step={1000} placeholder="0" className={baseInputCls} value={value ?? ''} onChange={(e) => setValue(field.k, e.target.value)} />
            <select
              className="w-24 rounded-xl border border-outline-variant bg-surface px-2 py-2 text-sm text-on-surface outline-none"
              value={values[`${field.k}__c`] || 'EGP'}
              onChange={(e) => setValue(`${field.k}__c`, e.target.value)}
            >
              {MONEY_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        );
        break;
      case 'chips':
        control = (
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-outline-variant p-2">
            {(field.opts || []).map((o) => {
              const selected = Array.isArray(value) && value.includes(o);
              return (
                <button
                  key={o} type="button"
                  onClick={() => setValue(field.k, selected ? value.filter((x: string) => x !== o) : [...(value || []), o])}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${selected ? 'border-primary/40 bg-primary/10 text-primary font-semibold' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}
                >
                  {o}
                </button>
              );
            })}
          </div>
        );
        break;
      case 'attach': {
        const isFile = value && typeof value === 'object' && value.fileId;
        control = isFile ? (
          <div className="flex items-center justify-between rounded-xl bg-surface-container px-3 py-2 text-sm">
            <span className="truncate">{value.fileName}</span>
            <button type="button" onClick={() => setValue(field.k, undefined)} className="text-on-surface-variant hover:text-error shrink-0 ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className={`flex items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-sm cursor-pointer ${error ? 'border-error' : 'border-outline-variant'}`}>
              {uploadingField === field.k ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span className="text-on-surface-variant">{uploadingField === field.k ? 'Uploading…' : 'Upload a file'}</span>
              <input
                type="file" className="hidden" disabled={uploadingField === field.k}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAttachUpload(field.k, f); e.target.value = ''; }}
              />
            </label>
            <input
              type="text" placeholder="Or paste a link (SharePoint / Drive)" className={baseInputCls}
              value={typeof value === 'string' ? value : ''} onChange={(e) => setValue(field.k, e.target.value)}
            />
          </div>
        );
        break;
      }
      default:
        control = null;
    }

    return (
      <div key={field.k} className={variant === 'inline' && wide ? 'md:col-span-2' : undefined}>
        <label className="text-sm font-medium text-on-surface mb-1.5 flex items-center gap-1">
          {field.label}
          {needed && <span className="text-error">*</span>}
        </label>
        {control}
        {field.hint && <p className="text-xs text-on-surface-variant mt-1">{field.hint}</p>}
        <p dir="rtl" className="text-xs text-on-surface-variant mt-0.5">{field.ar}</p>
        {error && <p className="text-xs text-error mt-1">{error}</p>}
      </div>
    );
  };

  if (allowed.length === 0 && !bulk) {
    return <p className="text-sm text-on-surface-variant py-6 text-center">This lead is closed as won and is read-only.</p>;
  }

  const visibleFields = config ? config.fields.filter((f) => isFieldVisible(f, values, fieldLead)) : [];
  const baseLabel = bulk
    ? `Apply to ${bulk.count} record${bulk.count === 1 ? '' : 's'}`
    : extraMeeting
      ? 'Book Additional Meeting'
      : amending ? 'Save Changes'
        : target === lead.status ? 'Save Update' : 'Update Status';
  const submitLabel = sendEmail && config?.quickEmail ? `${baseLabel} & Send Email` : baseLabel;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-on-surface-variant tracking-wide mb-2">
          {variant === 'inline' ? 'STATUS' : 'NEW STATUS'}
        </p>
        <div className="flex flex-wrap gap-2">
          {pickerStatuses.map((status) => {
            const cfg = LEAD_STATUS_WORKFLOW[status];
            const isCurrent = showCurrent && status === lead.status;
            // A current status that can't be re-logged (No Action) is shown, not picked.
            const pickable = allowed.includes(status);
            const selected = target === status || (isCurrent && !pickable && !target);
            return (
              <button
                key={status} type="button" disabled={!pickable} onClick={() => pickStatus(status)}
                title={isCurrent ? (pickable ? 'Current status — log another update of it' : 'Current status — pick the next status to move on') : undefined}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors disabled:cursor-default ${selected ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-outline-variant text-on-surface hover:bg-surface-container'}`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                {isCurrent && !pickable ? status : pickerLabel(status, lead)}
                {isCurrent && (
                  <span className="rounded-full bg-primary text-on-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Current</span>
                )}
              </button>
            );
          })}
        </div>
        {showCurrent && !allowed.includes(lead.status) && !target && (
          <p className="text-xs text-on-surface-variant mt-2">
            This lead is <span className="font-medium text-on-surface">{lead.status}</span>. Pick the next status to update it.
          </p>
        )}
      </div>

      {config && (
        <div className="space-y-4 border-t border-outline-variant/30 pt-4">
          <div>
            <p className="text-xs font-semibold text-on-surface-variant tracking-wide">TRIGGER REQUIREMENTS</p>
            <p className="text-sm text-on-surface-variant mt-1">{config.desc}</p>
          </div>

          {extraMeeting && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800">
              The customer requested an additional session. This is round #{lead.meetingsCount + 1}, so the reason for the
              extra meeting and the outcome of the previous one must be documented before saving.
              <div dir="rtl" className="mt-1 text-amber-700">العميل طلب اجتماع إضافي — لازم توثيق سبب الاجتماع ومخرجات الاجتماع السابق.</div>
            </div>
          )}

          {lastUpdate && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-container px-3 py-2 text-xs text-on-surface-variant">
              <History className="w-4 h-4 shrink-0" />
              <span>
                Last update: <span className="font-medium text-on-surface">{formatWhen(lastUpdate.changedAt)}</span>
                {lastUpdate.changedBy && <> by <span className="font-medium text-on-surface">{lastUpdate.changedBy.firstName} {lastUpdate.changedBy.lastName}</span></>}
                {lastUpdate.editedAt && <> · edited {formatWhen(lastUpdate.editedAt)}{lastUpdate.editedBy && <> by {lastUpdate.editedBy.firstName} {lastUpdate.editedBy.lastName}</>}</>}
              </span>
              {locked ? (
                <Button size="sm" variant="outline" className="ml-auto gap-1.5" onClick={() => setEditing(true)}>
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
              ) : (
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => { setEditing(false); setValues(startValues(target!)); setFieldErrors({}); setSendEmail(false); }}>
                  Cancel edit
                </Button>
              )}
            </div>
          )}

          {/* What the last update of this status recorded */}
          {lastUpdate && <StatusEntryDetails entry={lastUpdate} />}
          {amending && (
            <p className="text-xs text-on-surface-variant">
              Saving changes this last <span className="font-medium text-on-surface">{target}</span> update. It won't add a new one.
              To log a new update, use Change Status.
            </p>
          )}

          {/* Locked on the last update until Edit is pressed */}
          <fieldset disabled={locked} className={`space-y-4 min-w-0 ${locked ? 'opacity-70' : ''}`}>
          {visibleFields.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No inputs needed for this status.</p>
          ) : (
            <div className={variant === 'inline' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
              {visibleFields.map(renderField)}
            </div>
          )}

          {bulk && (
            <p className="rounded-xl bg-surface-container px-3 py-2 text-xs text-on-surface-variant">
              These inputs are applied to every selected record. A record whose current status can't move to
              {' '}<span className="font-medium text-on-surface">{target}</span> is skipped and listed afterwards.
            </p>
          )}

          {config.quickEmail && !bulk && (
            <div className="rounded-xl border border-outline-variant/40 p-3 space-y-3">
              <label className={`flex items-center gap-2 text-sm font-medium ${lead.email ? 'text-on-surface cursor-pointer' : 'text-on-surface-variant'}`}>
                <input
                  type="checkbox" className="w-4 h-4 accent-primary"
                  checked={sendEmail} disabled={!lead.email}
                  onChange={(e) => toggleSendEmail(e.target.checked)}
                />
                <Send className="w-4 h-4" />
                Send an email to the customer
              </label>
              {!lead.email && (
                <p className="text-xs text-on-surface-variant">This lead has no email address — add one with Edit Lead to send emails.</p>
              )}
              {sendEmail && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-on-surface mb-1.5 block">To <span className="text-error">*</span></label>
                    <input
                      type="text" value={email.to} onChange={(e) => setEmailField('to', e.target.value)}
                      className={`w-full rounded-xl border bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 ${fieldErrors.email_to ? 'border-error bg-error/5' : 'border-outline-variant'}`}
                    />
                    <p className="text-xs text-on-surface-variant mt-1">Separate several addresses with commas.</p>
                    {fieldErrors.email_to && <p className="text-xs text-error mt-1">{fieldErrors.email_to}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-on-surface mb-1.5 block">Subject <span className="text-error">*</span></label>
                    <input
                      type="text" value={email.subject} onChange={(e) => setEmailField('subject', e.target.value)}
                      className={`w-full rounded-xl border bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 ${fieldErrors.email_subject ? 'border-error bg-error/5' : 'border-outline-variant'}`}
                    />
                    {fieldErrors.email_subject && <p className="text-xs text-error mt-1">{fieldErrors.email_subject}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-on-surface mb-1.5 block">Message <span className="text-error">*</span></label>
                    <textarea
                      rows={6} value={email.message} onChange={(e) => setEmailField('message', e.target.value)}
                      className={`w-full rounded-xl border bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 resize-y ${fieldErrors.email_message ? 'border-error bg-error/5' : 'border-outline-variant'}`}
                    />
                    {fieldErrors.email_message && <p className="text-xs text-error mt-1">{fieldErrors.email_message}</p>}
                    <p className="text-xs text-on-surface-variant mt-1">Sent from the sales mailbox when you save, and kept in the lead's Emails tab.</p>
                  </div>
                </div>
              )}
            </div>
          )}
          </fieldset>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <span className="mr-auto text-xs text-on-surface-variant hidden sm:block">
          Fields marked <span className="text-error">*</span> are mandatory
        </span>
        {variant === 'dialog' && onCancel && <Button variant="outline" onClick={onCancel}>Cancel</Button>}
        {variant === 'inline' && target && target !== defaultTarget && (
          <Button variant="outline" onClick={reset}>Reset</Button>
        )}
        <Button onClick={handleSubmit} disabled={!target || submitting || locked}
          title={locked ? 'Press Edit to change the last update' : undefined}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
