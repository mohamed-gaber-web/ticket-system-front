import { useEffect, useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchAgents } from '@/redux/slices/teleSalesAgentsSlice';
import { changeLeadStatus } from '@/redux/slices/teleSalesLeadsSlice';
import * as teleSalesApi from '@/api/teleSalesApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  LEAD_STATUS_WORKFLOW, NEXT, validateStatusFields,
  type LeadStatus, type StatusFieldDef,
} from '@/config/leadStatusWorkflow';
import type { Lead, ChangeLeadStatusError } from '@/types/teleSales.types';

interface StatusChangeModalProps {
  lead: Lead;
  open: boolean;
  onClose: () => void;
  onChanged?: (lead: Lead) => void;
}

const MONEY_CURRENCIES = ['EGP', 'SAR', 'USD'];

const pickerLabel = (status: LeadStatus, lead: Lead) => {
  if (status === 'Meeting Scheduled' && lead.meetingsCount > 0) return `Meeting Scheduled — Round #${lead.meetingsCount + 1}`;
  if (status === 'No Answer' && lead.status === 'No Answer') return 'No Answer — another attempt';
  return status;
};

const isFieldVisible = (field: StatusFieldDef, values: Record<string, any>, lead: Lead) => !field.showIf || field.showIf(values, lead);
const isFieldNeeded = (field: StatusFieldDef, values: Record<string, any>, lead: Lead) => !!field.req || (field.reqIf ? field.reqIf(values, lead) : false);

export function StatusChangeModal({ lead, open, onClose, onChanged }: StatusChangeModalProps) {
  const dispatch = useAppDispatch();
  const agents = useAppSelector((s) => s.teleSalesAgents.agents);

  const [target, setTarget] = useState<LeadStatus | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTarget(null);
      setValues({});
      setFieldErrors({});
      if (agents.length === 0) dispatch(fetchAgents());
    }
  }, [open, lead._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const allowed = NEXT[lead.status] || [];
  const config = target ? LEAD_STATUS_WORKFLOW[target] : null;
  const extraMeeting = target === 'Meeting Scheduled' && lead.meetingsCount > 0;

  const pickStatus = (status: LeadStatus) => {
    const cfg = LEAD_STATUS_WORKFLOW[status];
    const initial: Record<string, any> = {};
    cfg.fields.forEach((f) => {
      if (f.type === 'toggle') initial[f.k] = false;
      else if (f.type === 'chips') initial[f.k] = [];
      else if (f.type === 'money') initial[`${f.k}__c`] = 'EGP';
      if (f.def) initial[f.k] = f.def();
    });
    setTarget(status);
    setValues(initial);
    setFieldErrors({});
  };

  const setValue = (key: string, value: any) => {
    setValues((p) => ({ ...p, [key]: value }));
    setFieldErrors((p) => (p[key] ? { ...p, [key]: '' } : p));
  };

  const handleClose = () => {
    setTarget(null);
    setValues({});
    setFieldErrors({});
    onClose();
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
    const { valid, errors } = validateStatusFields(target, values, lead);
    if (!valid) {
      const map: Record<string, string> = {};
      errors.forEach((e) => { map[e.field] = e.message; });
      setFieldErrors(map);
      return;
    }

    setSubmitting(true);
    try {
      const updated = await dispatch(changeLeadStatus({ id: lead._id, data: { newStatus: target, values } })).unwrap();
      onChanged?.(updated);
      handleClose();
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
    const needed = isFieldNeeded(field, values, lead);
    const baseInputCls = `w-full rounded-xl border bg-surface px-3 py-2 text-sm text-on-surface outline-none transition-colors focus:ring-2 focus:ring-primary/30 ${error ? 'border-error bg-error/5' : 'border-outline-variant'}`;

    let control: React.ReactNode;
    switch (field.type) {
      case 'auto':
        control = <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">{field.val?.(lead)}</div>;
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
              {agents.map((a) => <option key={a._id} value={a._id}>{a.fullName}</option>)}
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
      <div key={field.k}>
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Change Status</DialogTitle>
          <DialogDescription>
            {lead.companyName} · {lead.customerId || lead._id} · current status: <span className="font-semibold">{lead.status}</span>
          </DialogDescription>
        </DialogHeader>

        {allowed.length === 0 ? (
          <p className="text-sm text-on-surface-variant py-6 text-center">This lead is closed as won and is read-only.</p>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-on-surface-variant tracking-wide mb-2">NEW STATUS</p>
              <div className="flex flex-wrap gap-2">
                {allowed.map((status) => {
                  const cfg = LEAD_STATUS_WORKFLOW[status];
                  const selected = target === status;
                  return (
                    <button
                      key={status} type="button" onClick={() => pickStatus(status)}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${selected ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-outline-variant text-on-surface hover:bg-surface-container'}`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                      {pickerLabel(status, lead)}
                    </button>
                  );
                })}
              </div>
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

                <div className="space-y-4">
                  {config.fields.filter((f) => isFieldVisible(f, values, lead)).map(renderField)}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <span className="mr-auto text-xs text-on-surface-variant self-center hidden sm:block">
            Fields marked <span className="text-error">*</span> are mandatory
          </span>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!target || submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
            {extraMeeting ? 'Book Additional Meeting' : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
