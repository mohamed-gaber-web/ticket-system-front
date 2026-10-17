import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Building2, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import GmailCompose from '@/components/tele-sales/GmailCompose';
import { getMessageTemplates, prepareMessage } from '@/api/salesAssistantApi';
import { getLeadAccountContacts, getLeadAccounts, getLeadById, uploadFile } from '@/api/teleSalesApi';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchSelect } from '@/components/ui/search-select';
import type { PdfQuality } from '@/utils/proposalPdf';
import type { MessageTemplate } from '@/types/salesAssistant.types';
import type { AccountContact, AccountRef, EmailAttachment } from '@/types/teleSales.types';
import { Field, NativeSelect } from './builderUi';

// The email attachment cap (MAX_TOTAL_ATTACHMENT_BYTES on the server), with room for the message.
const MAX_PDF_BYTES = 9.5 * 1024 * 1024;

const apiError = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

interface Prepared {
  subject: string;
  body: string;
  attachment: EmailAttachment;
  to: string[];
}

interface Recipient {
  email: string;
  name: string;
}

const norm = (email?: string) => String(email ?? '').trim().toLowerCase();

/** One tickable recipient row. */
function RecipientRow({ r, checked, onToggle }: { r: Recipient; checked: boolean; onToggle: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface-container-high">
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      <span className="min-w-0">
        <span className="block truncate text-sm text-on-surface">{r.name || r.email}</span>
        {r.name && <span className="block truncate font-mono text-xs text-on-surface-variant">{r.email}</span>}
      </span>
    </label>
  );
}

/**
 * "Send by email": pick the recipients (the opportunity's contact and/or the
 * people of a customer company — the opportunity's linked account by default)
 * and an email template for the body; the proposal PDF is then built, stored and
 * attached in the usual compose window. The mail always goes through the
 * opportunity's lead email endpoint, so it is saved in the opportunity's Emails
 * tab whoever it is addressed to.
 */
export default function SendProposalEmail({
  open,
  onClose,
  leadId,
  leadEmail,
  contactName,
  proposalNumber,
  fileName,
  buildPdf,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  leadId: string;
  leadEmail?: string;
  contactName?: string;
  proposalNumber: string;
  fileName: string;
  /** Saves pending edits, runs the export gate and returns the PDF. Throws a message on failure. */
  buildPdf: (onProgress: (text: string) => void, quality?: PdfQuality) => Promise<Blob>;
  onSent: () => void;
}) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<AccountRef[]>([]);
  const [accountId, setAccountId] = useState('');
  const [contacts, setContacts] = useState<Recipient[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const opportunityContact: Recipient | null = leadEmail ? { email: norm(leadEmail), name: contactName ?? '' } : null;
  const toggle = (email: string) =>
    setSelected((cur) => (cur.includes(email) ? cur.filter((e) => e !== email) : [...cur, email]));

  // Opening: the opportunity's contact is ticked; the customer list starts on the
  // opportunity's linked account (existing customer), if it has one.
  useEffect(() => {
    if (!open) return;
    setSelected(leadEmail ? [norm(leadEmail)] : []);
    setAccountId('');
    getLeadAccounts().then((r) => setAccounts(r.data ?? [])).catch(() => setAccounts([]));
    getLeadById(leadId)
      .then((r) => {
        const account = r.data?.account;
        const id = typeof account === 'string' ? account : account?._id;
        if (id) setAccountId(id);
      })
      .catch(() => undefined);
  }, [open, leadId, leadEmail]);

  useEffect(() => {
    if (!accountId) {
      setContacts([]);
      return;
    }
    let alive = true;
    setLoadingContacts(true);
    getLeadAccountContacts(accountId)
      .then((r) => {
        if (!alive) return;
        const seen = new Set<string>();
        setContacts(
          (r.data ?? [])
            .filter((c: AccountContact) => norm(c.email) && !seen.has(norm(c.email)) && seen.add(norm(c.email)))
            .map((c) => ({ email: norm(c.email), name: c.contactPerson })),
        );
      })
      .catch(() => alive && setContacts([]))
      .finally(() => alive && setLoadingContacts(false));
    return () => {
      alive = false;
    };
  }, [accountId]);

  useEffect(() => {
    if (!open) return;
    setPrepared(null);
    setLoadingTemplates(true);
    getMessageTemplates({ channel: 'email', status: 'active' })
      .then((res) => {
        const list = res.data ?? [];
        setTemplates(list);
        // Start from the default pricing template when there is one.
        setTemplateId((list.find((t) => t.purpose === 'pricing' && t.isDefault) ?? list.find((t) => t.purpose === 'pricing'))?._id ?? '');
      })
      .catch((e) => toast.error(apiError(e, 'Could not load the email templates')))
      .finally(() => setLoadingTemplates(false));
  }, [open]);

  const prepare = async () => {
    try {
      setProgress('Preparing…');
      let blob = await buildPdf(setProgress);
      // Long proposals with many images can pass the email cap: redraw them lighter.
      if (blob.size > MAX_PDF_BYTES) blob = await buildPdf((t) => setProgress(`Compressing · ${t}`), 'compact');
      if (blob.size > MAX_PDF_BYTES) {
        throw `The PDF is ${(blob.size / 1024 / 1024).toFixed(1)} MB, above the 10 MB email limit. Download it and share it another way, or hide some sections.`;
      }
      setProgress('Attaching the PDF…');
      const uploaded = await uploadFile(new File([blob], fileName, { type: 'application/pdf' }));
      let subject = `Proposal ${proposalNumber}`;
      let body = '';
      if (templateId) {
        setProgress('Filling in the template…');
        const res = await prepareMessage({ leadId, channel: 'email', templateId });
        subject = res.data.subject || subject;
        body = res.data.body || '';
        if (res.data.missing?.length) toast.warning(`Template values missing for this opportunity: ${res.data.missing.join(', ')}`);
      }
      setPrepared({
        to: selected,
        subject,
        body,
        attachment: { fileId: uploaded.data.fileId, fileName, fileType: 'application/pdf', fileSize: uploaded.data.fileSize },
      });
    } catch (e) {
      toast.error(typeof e === 'string' ? e : apiError(e, 'The email could not be prepared. Try again.'));
    } finally {
      setProgress(null);
    }
  };

  const close = () => {
    setPrepared(null);
    onClose();
  };

  return (
    <>
      <Dialog open={open && !prepared} onOpenChange={(o) => !o && !progress && close()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send proposal by email</DialogTitle>
            <DialogDescription>
              The PDF of {proposalNumber} is attached. Pick a template for the message; you can still edit everything before sending.
            </DialogDescription>
          </DialogHeader>
          <Field label="Email template">
            <NativeSelect value={templateId} onChange={setTemplateId} ariaLabel="Email template" disabled={loadingTemplates || Boolean(progress)}>
              <option value="">No template (blank message)</option>
              {templates.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                  {t.isDefault ? ' (default)' : ''}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="space-y-2">
            <p className="text-xs font-medium text-on-surface-variant">Recipients</p>
            <div className="max-h-64 space-y-3 overflow-y-auto rounded-xl border border-outline-variant/40 p-2">
              <div>
                <p className="px-2 text-[11px] font-bold uppercase tracking-[0.08em] text-primary">Opportunity</p>
                {opportunityContact ? (
                  <RecipientRow r={opportunityContact} checked={selected.includes(opportunityContact.email)} onToggle={() => toggle(opportunityContact.email)} />
                ) : (
                  <p className="px-2 py-1 text-xs text-on-surface-variant">This opportunity has no email address.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <p className="px-2 text-[11px] font-bold uppercase tracking-[0.08em] text-primary">Customer</p>
                <SearchSelect
                  icon={<Building2 className="h-4 w-4" />}
                  placeholder={accounts.length ? 'Pick a customer company' : 'Loading companies…'}
                  value={accountId}
                  options={accounts.map((a) => ({ value: a._id, label: a.name }))}
                  onChange={setAccountId}
                />
                {accountId &&
                  (loadingContacts ? (
                    <p className="flex items-center gap-2 px-2 py-1 text-xs text-on-surface-variant">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading contacts…
                    </p>
                  ) : contacts.length ? (
                    contacts.map((c) => <RecipientRow key={c.email} r={c} checked={selected.includes(c.email)} onToggle={() => toggle(c.email)} />)
                  ) : (
                    <p className="px-2 py-1 text-xs text-on-surface-variant">No contacts with an email for this company.</p>
                  ))}
              </div>
            </div>
            <p className="text-xs text-on-surface-variant">
              {selected.length ? `${selected.length} selected.` : 'Nobody selected — type the address in the next step.'} The email is saved in the
              opportunity's Emails tab.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={Boolean(progress)}>
              Cancel
            </Button>
            <Button type="button" onClick={prepare} disabled={Boolean(progress) || loadingTemplates}>
              {progress ? <Loader2 className="animate-spin" /> : <Mail />} {progress ?? 'Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {prepared && (
        <GmailCompose
          leadId={leadId}
          open
          onClose={close}
          defaultTo={prepared.to}
          defaultSubject={prepared.subject}
          defaultBody={prepared.body}
          defaultAttachments={[prepared.attachment]}
          contextLabel={[contactName, proposalNumber].filter(Boolean).join(' · ')}
          onSent={() => {
            setPrepared(null);
            onSent();
          }}
        />
      )}
    </>
  );
}
