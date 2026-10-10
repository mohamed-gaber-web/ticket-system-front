import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Ban, CheckCircle2, Eye, FileSpreadsheet, MailCheck, PauseCircle, Play, RotateCcw, Search, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAccess } from '@/redux/hooks/useAccess';
import {
  deleteCampaignContact,
  getCampaignContacts,
  getCampaignPreview,
  getCampaignSettings,
  getCampaignTemplates,
  importCampaignContacts,
  markCampaignContactsSent,
  setCampaignContactStatus,
  updateCampaignSettings,
} from '@/api/marketingApi';
import { parseCampaignFile } from '@/utils/campaignImport';
import type {
  CampaignContact,
  CampaignContactInput,
  CampaignContactStatus,
  CampaignImportResult,
  CampaignPreview,
  CampaignSettings,
  CampaignTemplate,
} from '@/types/marketing.types';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;

const STATUS_STYLE: Record<CampaignContactStatus, string> = {
  pending: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  sending: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  sent: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  failed: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  excluded: 'bg-surface-container-high text-on-surface-variant',
};
const STATUS_LABEL: Record<CampaignContactStatus, string> = {
  pending: 'Waiting',
  sending: 'Sending',
  sent: 'Sent',
  failed: 'Failed',
  excluded: 'Excluded',
};

const apiError = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
/** 0–23 → "10 AM", "1 PM"… */
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;
// The working day offered as send hours (8 AM – 8 PM).
const HOUR_CHOICES = Array.from({ length: 13 }, (_, i) => i + 8);

function ImportDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [contacts, setContacts] = useState<CampaignContactInput[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CampaignImportResult | null>(null);

  useEffect(() => {
    if (!open) { setFile(null); setContacts([]); setSkipped(0); setError(''); setResult(null); }
  }, [open]);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setFile(f); setError(''); setResult(null);
    try {
      const parsed = await parseCampaignFile(f);
      setContacts(parsed.contacts);
      setSkipped(parsed.skipped);
      if (parsed.contacts.length === 0) setError('No rows with an email address were found.');
    } catch (e) {
      setContacts([]);
      setError((e as Error).message || 'Could not read the file');
    }
  };

  const upload = async () => {
    setBusy(true);
    try {
      const res = await importCampaignContacts(contacts, file?.name);
      setResult(res.data);
      toast.success(res.message || `${res.data.imported} contact(s) imported`);
      onDone();
    } catch (e) {
      toast.error(apiError(e, 'Import failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import campaign contacts</DialogTitle>
          <DialogDescription>
            Excel or CSV. The first row must be the header; an <b>Email</b> column is required. Name, Company, Phone, Job Title and
            Country are read when present. Emails already on the list are skipped.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-[1rem] border-2 border-dashed border-outline-variant p-6 text-sm text-on-surface-variant hover:bg-surface-container-low"
        >
          <FileSpreadsheet className="h-6 w-6" />
          {file ? <span className="font-semibold text-on-surface">{file.name}</span> : 'Choose a file…'}
        </button>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {contacts.length > 0 && !result && (
          <div className="space-y-2">
            <p className="text-sm text-on-surface">
              <b>{contacts.length}</b> contact(s) ready{skipped ? ` · ${skipped} row(s) without email skipped` : ''}.
            </p>
            <div className="max-h-56 overflow-auto rounded-[0.75rem] ghost-border">
              <table className="w-full text-xs">
                <thead className="bg-surface-container-low text-left text-on-surface-variant">
                  <tr><th className="p-2">Email</th><th className="p-2">Name</th><th className="p-2">Company</th><th className="p-2">Phone</th></tr>
                </thead>
                <tbody>
                  {contacts.slice(0, 20).map((c, i) => (
                    <tr key={i} className="border-t border-outline-variant/40">
                      <td className="p-2">{c.email}</td><td className="p-2">{c.name}</td><td className="p-2">{c.companyName}</td><td className="p-2">{c.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {contacts.length > 20 && <p className="text-xs text-on-surface-variant">Showing the first 20.</p>}
          </div>
        )}

        {result && (
          <div className="space-y-2 rounded-[0.75rem] bg-surface-container-low p-3 text-sm">
            <p><b>{result.imported}</b> imported · <b>{result.duplicates}</b> already on the list · <b>{result.invalid}</b> invalid</p>
            {result.errors.length > 0 && (
              <ul className="max-h-32 overflow-auto text-xs text-on-surface-variant">
                {result.errors.map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{result ? 'Close' : 'Cancel'}</Button>
          {!result && (
            <Button onClick={upload} disabled={busy || contacts.length === 0} className="gap-2">
              <Upload className="h-4 w-4" /> {busy ? 'Importing…' : `Import ${contacts.length || ''}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewDialog({ preview, onOpenChange }: { preview: CampaignPreview | null; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={!!preview} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Email preview</DialogTitle>
          <DialogDescription>What the next contact would receive. Nothing is sent.</DialogDescription>
        </DialogHeader>
        {preview && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
              <span className="text-on-surface-variant">Template</span><span className="font-semibold">{preview.template.name}</span>
              <span className="text-on-surface-variant">To</span><span>{preview.to}</span>
              <span className="text-on-surface-variant">Subject</span><span className="font-semibold">{preview.subject || '—'}</span>
              <span className="text-on-surface-variant">Attachment</span><span>{preview.attachment?.fileName ?? 'None'}</span>
            </div>
            {preview.missing.length > 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-300">Empty placeholders: {preview.missing.join(', ')}</p>
            )}
            {/* The body is the template rendered server-side (sanitised on save, values HTML-escaped). */}
            <iframe title="Email body" sandbox="" srcDoc={preview.body} className="h-96 w-full rounded-[0.75rem] bg-white ghost-border" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SettingsPanel({ canManage }: { canManage: boolean }) {
  const [settings, setSettings] = useState<CampaignSettings | null>(null);
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [sendHours, setSendHours] = useState<number[]>([]);
  const [template, setTemplate] = useState('');
  const [attachCatalog, setAttachCatalog] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<CampaignPreview | null>(null);

  const apply = (s: CampaignSettings) => {
    setSettings(s);
    setSendHours(s.sendHours);
    setTemplate(s.template ?? '');
    setAttachCatalog(s.attachCatalog);
  };

  useEffect(() => {
    getCampaignSettings().then((r) => apply(r.data)).catch((e) => toast.error(apiError(e, 'Failed to load campaign settings')));
    getCampaignTemplates().then((r) => setTemplates(r.data)).catch(() => undefined);
  }, []);

  const [confirmActivate, setConfirmActivate] = useState(false);

  // Activate saves the form as it is on screen, then starts the hourly send.
  const setRunning = async (enabled: boolean) => {
    if (enabled && sendHours.length === 0) {
      toast.error('Pick at least one sending hour');
      return;
    }
    setSaving(true);
    try {
      const res = await updateCampaignSettings(
        enabled ? { sendHours, attachCatalog, template: template || null, enabled } : { enabled },
      );
      apply(res.data);
      setConfirmActivate(false);
      toast.success(enabled ? 'Campaign activated — emails go out at the selected hours' : 'Campaign paused — no more emails will be sent');
    } catch (e) {
      toast.error(apiError(e, enabled ? 'Failed to activate the campaign' : 'Failed to pause the campaign'));
    } finally {
      setSaving(false);
    }
  };

  const toggleHour = (h: number) =>
    setSendHours((hs) => (hs.includes(h) ? hs.filter((x) => x !== h) : [...hs, h].sort((a, b) => a - b)));

  const save = async () => {
    if (sendHours.length === 0) {
      toast.error('Pick at least one sending hour');
      return;
    }
    setSaving(true);
    try {
      const res = await updateCampaignSettings({ sendHours, attachCatalog, template: template || null });
      apply(res.data);
      toast.success('Campaign settings saved');
    } catch (e) {
      toast.error(apiError(e, 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  const showPreview = async () => {
    try {
      setPreview((await getCampaignPreview()).data);
    } catch (e) {
      toast.error(apiError(e, 'Failed to build the preview'));
    }
  };

  if (!settings) return <div className="h-48 rounded-[1rem] bg-surface-container-low animate-pulse" />;

  return (
    <div className="rounded-[1rem] bg-surface-container-lowest p-5 ghost-border space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-on-surface">Daily automatic send</h2>
          <p className="text-sm text-on-surface-variant">
            Every sending hour the system picks <b>one random contact</b> that was never emailed and sends them the template below —{' '}
            <b>{settings.sendHours.length} email{settings.sendHours.length === 1 ? '' : 's'} a day</b> ({settings.timeZone.replace('_', ' ')} time).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {settings.enabled ? (
            <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold', STATUS_STYLE.sent)}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Active since {fmtDateTime(settings.activatedAt)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <PauseCircle className="h-3.5 w-3.5" /> {settings.activatedAt ? 'Paused' : 'Not active yet'}
            </span>
          )}
          {canManage && (settings.enabled ? (
            <Button variant="outline" size="sm" onClick={() => setRunning(false)} disabled={saving} className="gap-1.5">
              <PauseCircle className="h-4 w-4" /> Pause
            </Button>
          ) : (
            <Button size="sm" onClick={() => setConfirmActivate(true)} disabled={saving} className="gap-1.5">
              <Play className="h-4 w-4" /> Activate
            </Button>
          ))}
        </div>
      </div>

      <fieldset disabled={!canManage || saving} className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold text-on-surface-variant">
            Sending hours — one email each ({sendHours.length} a day)
          </span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sending hours">
            {HOUR_CHOICES.map((h) => {
              const on = sendHours.includes(h);
              return (
                <button
                  key={h}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleHour(h)}
                  className={cn(
                    'rounded-[0.75rem] px-3 py-1.5 text-sm font-semibold ghost-border disabled:opacity-60',
                    on ? 'bg-primary text-primary-foreground' : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high',
                  )}
                >
                  {hourLabel(h)}
                </button>
              );
            })}
          </div>
        </div>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-on-surface-variant">Email template (Product Catalog › Templates)</span>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="h-10 w-full rounded-[0.75rem] bg-surface-container-lowest px-3 text-sm ghost-border"
          >
            <option value="">Template Email Catalog (default)</option>
            {templates.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-on-surface md:col-span-2">
          <input type="checkbox" checked={attachCatalog} onChange={(e) => setAttachCatalog(e.target.checked)} className="h-4 w-4 rounded accent-brand-500" />
          Attach the product catalog document
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-on-surface-variant">
        <span>
          Using: <b className="text-on-surface">{settings.effectiveTemplate?.name ?? 'no active email template found'}</b>
          {` · today ${settings.todaySent} sent${settings.todayFailed ? `, ${settings.todayFailed} failed` : ''}`}
          {settings.lastSentAt && ` · last email ${fmtDateTime(settings.lastSentAt)}`}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={showPreview} className="gap-2"><Eye className="h-4 w-4" /> Preview email</Button>
          {canManage && <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Button>}
        </div>
      </div>
      {!canManage && <p className="text-xs text-on-surface-variant">Only a marketing manager or an administrator can change these settings.</p>}

      <PreviewDialog preview={preview} onOpenChange={(o) => !o && setPreview(null)} />

      <Dialog open={confirmActivate} onOpenChange={setConfirmActivate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Activate the email campaign?</DialogTitle>
            <DialogDescription>
              From now on, at {sendHours.map(hourLabel).join(', ')} ({settings.timeZone.replace('_', ' ')} time), one random contact that was
              never emailed receives "{settings.effectiveTemplate?.name ?? 'the campaign template'}"
              {attachCatalog ? ' with the product catalog attached' : ''}. That is {sendHours.length} email
              {sendHours.length === 1 ? '' : 's'} a day. You can pause it at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmActivate(false)} disabled={saving}>Cancel</Button>
            <Button onClick={() => setRunning(true)} disabled={saving} className="gap-1.5">
              <Play className="h-4 w-4" /> {saving ? 'Activating…' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function EmailCampaign() {
  const access = useAccess();
  const [contacts, setContacts] = useState<CampaignContact[]>([]);
  const [byStatus, setByStatus] = useState<Record<CampaignContactStatus, number> | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<CampaignContactStatus | ''>('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCampaignContacts({ status: status || undefined, search: query || undefined, page, limit: PAGE_SIZE });
      setContacts(res.data);
      setTotal(res.total);
      setByStatus(res.byStatus);
    } catch (e) {
      toast.error(apiError(e, 'Failed to load contacts'));
    } finally {
      setLoading(false);
    }
  }, [status, query, page]);

  useEffect(() => { load(); setSelected(new Set()); }, [load]);

  const setContactStatus = async (c: CampaignContact, next: 'pending' | 'excluded') => {
    try {
      await setCampaignContactStatus(c._id, next);
      toast.success(next === 'excluded' ? 'Contact excluded from the campaign' : 'Contact back in the queue');
      load();
    } catch (e) {
      toast.error(apiError(e, 'Failed to update the contact'));
    }
  };

  // Only contacts that were not emailed yet can be marked.
  const selectable = contacts.filter((c) => c.status !== 'sent' && c.status !== 'sending');
  const allSelected = selectable.length > 0 && selectable.every((c) => selected.has(c._id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((s) => {
      const next = new Set(s);
      selectable.forEach((c) => (allSelected ? next.delete(c._id) : next.add(c._id)));
      return next;
    });

  const markSent = async () => {
    setMarking(true);
    try {
      const res = await markCampaignContactsSent([...selected]);
      toast.success(res.message || `${res.data.marked} contact(s) marked as already emailed`);
      setSelected(new Set());
      load();
    } catch (e) {
      toast.error(apiError(e, 'Failed to mark the contacts'));
    } finally {
      setMarking(false);
    }
  };

  const remove = async (c: CampaignContact) => {
    try {
      await deleteCampaignContact(c._id);
      toast.success('Contact deleted');
      load();
    } catch (e) {
      toast.error(apiError(e, 'Failed to delete the contact'));
    }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const tabs: { key: CampaignContactStatus | ''; label: string; count?: number }[] = [
    { key: '', label: 'All', count: byStatus ? Object.values(byStatus).reduce((a, b) => a + b, 0) : undefined },
    ...(['pending', 'sent', 'failed', 'excluded'] as CampaignContactStatus[]).map((k) => ({ key: k, label: STATUS_LABEL[k], count: byStatus?.[k] })),
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Email Campaign</h1>
          <p className="text-on-surface-variant mt-1">Import the contact list; once activated, one new contact is emailed each sending hour. Nobody is emailed twice.</p>
        </div>
        <Button onClick={() => setImporting(true)} className="gap-2">
          <Upload className="h-4 w-4" /> Import
        </Button>
      </div>

      <SettingsPanel canManage={access.canManageMarketing} />

      <div className="bg-surface-container-lowest rounded-[1rem] p-4 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.key || 'all'}
                role="tab"
                aria-selected={status === t.key}
                onClick={() => { setStatus(t.key); setPage(1); }}
                className={cn(
                  'rounded-[0.75rem] px-3 py-1.5 text-sm font-semibold',
                  status === t.key ? 'bg-primary text-primary-foreground' : 'text-on-surface-variant hover:bg-surface-container-high',
                )}
              >
                {t.label}{t.count !== undefined && <span className="ml-1 opacity-75">{t.count}</span>}
              </button>
            ))}
          </div>
          <div className="relative lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <Input type="search" placeholder="Search name, company, email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-[0.75rem] bg-primary/10 px-3 py-2 text-sm">
            <span className="font-semibold text-on-surface">{selected.size} selected</span>
            <Button size="sm" onClick={markSent} disabled={marking} className="gap-1.5">
              <MailCheck className="h-4 w-4" /> {marking ? 'Marking…' : 'Mark as already emailed'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} disabled={marking}>Clear</Button>
            <span className="text-xs text-on-surface-variant">Marked contacts move to Sent and the campaign never emails them.</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-on-surface-variant">
              <tr className="border-b border-outline-variant/40">
                <th className="w-8 p-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={selectable.length === 0}
                    aria-label="Select all on this page"
                    className="h-4 w-4 rounded accent-brand-500"
                  />
                </th>
                <th className="p-2">Name</th>
                <th className="p-2">Company</th>
                <th className="p-2">Email</th>
                <th className="p-2">Phone</th>
                <th className="p-2">Status</th>
                <th className="p-2">Sent</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && contacts.length === 0 ? (
                <tr><td colSpan={8} className="p-6 text-center text-on-surface-variant">Loading…</td></tr>
              ) : contacts.length === 0 ? (
                <tr><td colSpan={8} className="p-6 text-center text-on-surface-variant">No contacts yet — use Import to add the list.</td></tr>
              ) : contacts.map((c) => (
                <tr
                  key={c._id}
                  className={cn(
                    'border-b border-outline-variant/30 hover:bg-surface-container-low',
                    c.status === 'sent' && 'bg-emerald-50/50 dark:bg-emerald-500/5',
                    selected.has(c._id) && 'bg-primary/5',
                  )}
                >
                  <td className="p-2">
                    {c.status === 'sent' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-label="Already emailed" />
                    ) : c.status !== 'sending' ? (
                      <input
                        type="checkbox"
                        checked={selected.has(c._id)}
                        onChange={() => toggle(c._id)}
                        aria-label={`Select ${c.email}`}
                        className="h-4 w-4 rounded accent-brand-500"
                      />
                    ) : null}
                  </td>
                  <td className="p-2 font-semibold text-on-surface">{c.name || '—'}{c.jobTitle && <span className="block text-xs font-normal text-on-surface-variant">{c.jobTitle}</span>}</td>
                  <td className="p-2">{c.companyName || '—'}</td>
                  <td className="p-2">{c.email}</td>
                  <td className="p-2">{c.phone || '—'}</td>
                  <td className="p-2">
                    <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold', STATUS_STYLE[c.status])} title={c.lastError}>
                      {c.status === 'sent' && c.sentManually ? 'Already emailed' : STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td className="p-2 text-xs text-on-surface-variant">{fmtDateTime(c.sentAt)}</td>
                  <td className="p-2">
                    <div className="flex justify-end gap-1">
                      {c.status === 'pending' && (
                        <Button variant="ghost" size="icon-sm" onClick={() => setContactStatus(c, 'excluded')} title="Exclude from campaign" aria-label="Exclude">
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                      {(c.status === 'excluded' || c.status === 'failed') && (
                        <Button variant="ghost" size="icon-sm" onClick={() => setContactStatus(c, 'pending')} title="Put back in the queue" aria-label="Requeue">
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      {access.canManageMarketing && c.status !== 'sent' && c.status !== 'sending' && (
                        <Button variant="ghost" size="icon-sm" onClick={() => remove(c)} title="Delete" aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 text-sm">
            <span className="text-on-surface-variant">Page {page} of {pages}</span>
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      <ImportDialog open={importing} onOpenChange={setImporting} onDone={load} />
    </div>
  );
}
