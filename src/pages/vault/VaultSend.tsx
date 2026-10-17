import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Mail, Search, Send, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  clearSendPreview,
  fetchSendOptions,
  fetchSendPreview,
  resetSendDraft,
  sendCredentials,
  toSendBody,
  toggleSendEntry,
  updateSendApproval,
  updateSendDraft,
} from '@/redux/slices/vaultSendSlice';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useVaultSetup } from '@/hooks/useVaultSetup';
import { isEmail } from '@/lib/vault';
import { VaultLayout } from '@/components/vault/VaultLayout';
import { LookupSelect } from '@/components/vault/LookupSelect';
import { Chip, EmptyState, ErrorState, FieldWithHelp, LoadingRows, MonoText, Panel, VaultSelect } from '@/components/vault/VaultUi';

/** Send Credentials: compose an email of selected accounts, preview it masked, send and log it. */
export default function VaultSend() {
  const dispatch = useAppDispatch();
  const { clients, users } = useVaultSetup();
  const { draft, options, optionsStatus, optionsError, preview, previewStatus, previewError, sendStatus } = useAppSelector(
    (s) => s.vaultSend,
  );
  const [filter, setFilter] = useState('');

  useEffect(() => {
    void dispatch(fetchSendOptions());
  }, [dispatch]);

  const contacts = useMemo(() => clients.filter((c) => c.contactEmail), [clients]);

  const pickRecipient = (value: string) => {
    const [kind, id] = value.split(':');
    if (kind === 'c') {
      const c = clients.find((x) => x._id === id);
      if (c) dispatch(updateSendDraft({ recipientName: c.contactName || c.name, recipientEmail: c.contactEmail ?? '' }));
    } else if (kind === 'u') {
      const u = users.find((x) => x._id === id);
      if (u) dispatch(updateSendDraft({ recipientName: u.name, recipientEmail: u.email }));
    }
  };

  const selected = useMemo(() => new Set(draft.entryIds), [draft.entryIds]);
  const needsApproval = options.some((e) => selected.has(e._id) && e.requiresApproval);
  const visibleOptions = useMemo(() => {
    const t = filter.trim().toLowerCase();
    if (!t) return options;
    return options.filter((e) =>
      [e.platform, e.ownerLabel, e.username, e.environment?.name, e.project].some((v) => v?.toLowerCase().includes(t)),
    );
  }, [options, filter]);

  const nameOk = !!draft.recipientName.trim();
  const emailOk = isEmail(draft.recipientEmail);
  const approvalOk = !needsApproval || (draft.approval.confirmed && !!draft.approval.approverName.trim());
  const canSend = nameOk && emailOk && draft.entryIds.length > 0 && approvalOk && sendStatus !== 'loading';
  const blockers = [
    !nameOk && 'recipient name',
    !emailOk && 'a valid email',
    !draft.entryIds.length && 'at least one account',
    !approvalOk && 'approval confirmation and approver name',
  ].filter(Boolean) as string[];

  // Live, masked preview — 400 ms after the last change.
  const bodyKey = JSON.stringify(toSendBody(draft));
  const debouncedKey = useDebouncedValue(bodyKey, 400);
  useEffect(() => {
    const body = JSON.parse(debouncedKey) as ReturnType<typeof toSendBody>;
    if (!body.entryIds.length) {
      dispatch(clearSendPreview());
      return;
    }
    void dispatch(fetchSendPreview(body));
  }, [debouncedKey, dispatch]);

  const submit = async () => {
    if (!canSend) return;
    const name = draft.recipientName.trim();
    const res = await dispatch(sendCredentials(toSendBody(draft)));
    if (sendCredentials.fulfilled.match(res)) {
      toast.success(`Sent to ${name} and recorded in the log`);
      dispatch(resetSendDraft());
      setFilter('');
    } else {
      toast.error(res.payload ?? 'Could not send the email');
    }
  };

  return (
    <VaultLayout title="Send credentials" description="Email selected sign-ins to a person. Every send is recorded in the Send Log, without the passwords.">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Email">
          <div className="space-y-4">
            <FieldWithHelp
              id="vault-send-quick"
              label="Quick recipient"
              help="Pick a client contact or an employee and the name and email fill in automatically — or type them below."
            >
              <VaultSelect id="vault-send-quick" aria-describedby="vault-send-quick-help" value="" onChange={(e) => pickRecipient(e.target.value)}>
                <option value="">— Choose a recipient —</option>
                {contacts.length > 0 && (
                  <optgroup label="Client contacts">
                    {contacts.map((c) => (
                      <option key={c._id} value={`c:${c._id}`}>
                        {(c.contactName || c.contactEmail) + ' — ' + c.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {users.length > 0 && (
                  <optgroup label="Employees">
                    {users.map((u) => (
                      <option key={u._id} value={`u:${u._id}`}>
                        {u.jobTitle ? `${u.name} — ${u.jobTitle}` : u.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </VaultSelect>
            </FieldWithHelp>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldWithHelp id="vault-send-name" label="Recipient name" required help="The name used to greet them at the top of the email.">
                <Input
                  id="vault-send-name"
                  aria-describedby="vault-send-name-help"
                  aria-required
                  autoComplete="off"
                  value={draft.recipientName}
                  onChange={(e) => dispatch(updateSendDraft({ recipientName: e.target.value }))}
                />
              </FieldWithHelp>
              <FieldWithHelp id="vault-send-email" label="Email" required help="The address the credentials are sent to.">
                <Input
                  id="vault-send-email"
                  type="email"
                  dir="ltr"
                  className="font-mono"
                  aria-describedby="vault-send-email-help"
                  aria-required
                  aria-invalid={!!draft.recipientEmail && !emailOk}
                  autoComplete="off"
                  spellCheck={false}
                  value={draft.recipientEmail}
                  onChange={(e) => dispatch(updateSendDraft({ recipientEmail: e.target.value }))}
                />
              </FieldWithHelp>
            </div>

            <FieldWithHelp
              id="vault-send-purpose"
              label="Reason"
              help="Recorded in the log so you know later why this person got the credentials. The list is edited in Settings."
            >
              <LookupSelect
                id="vault-send-purpose"
                aria-describedby="vault-send-purpose-help"
                source="sendPurpose"
                value={draft.purposeId}
                onChange={(v) => dispatch(updateSendDraft({ purposeId: v }))}
              />
            </FieldWithHelp>

            <FieldWithHelp id="vault-send-filter" label="Accounts to send" required help="You can include several accounts in the same email.">
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
                  <Input
                    id="vault-send-filter"
                    type="search"
                    aria-describedby="vault-send-filter-help"
                    placeholder="Filter accounts"
                    className="pl-9"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </div>
                <div className="max-h-72 overflow-y-auto rounded-xl border border-outline-variant/30" role="group" aria-label="Accounts">
                  {optionsStatus === 'failed' ? (
                    <div className="p-3">
                      <ErrorState message={optionsError ?? 'Could not load the accounts'} onRetry={() => dispatch(fetchSendOptions())} />
                    </div>
                  ) : optionsStatus !== 'succeeded' && !options.length ? (
                    <LoadingRows className="p-3" />
                  ) : !visibleOptions.length ? (
                    <p className="p-4 text-center text-sm text-on-surface-variant">
                      {options.length ? 'No account matches this filter.' : 'There are no accounts yet.'}
                    </p>
                  ) : (
                    <ul className="divide-y divide-outline-variant/20">
                      {visibleOptions.map((e) => {
                        const id = `vault-send-entry-${e._id}`;
                        return (
                          <li key={e._id} className="flex items-start gap-3 px-3 py-2 hover:bg-surface-container-low">
                            <Checkbox id={id} className="mt-0.5" checked={selected.has(e._id)} onCheckedChange={() => dispatch(toggleSendEntry(e._id))} />
                            <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
                              <span className="flex flex-wrap items-center gap-1.5">
                                <span className="font-semibold text-on-surface">{e.platform}</span>
                                {e.requiresApproval && <Chip tone="bad">Needs approval</Chip>}
                              </span>
                              <span className="block truncate text-xs text-on-surface-variant">
                                {[e.ownerLabel, e.environment?.name].filter(Boolean).join(' · ')}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant" aria-live="polite">
                  {draft.entryIds.length} selected
                </p>
              </div>
            </FieldWithHelp>

            <div className="flex items-start gap-3">
              <Checkbox
                id="vault-send-include"
                className="mt-0.5"
                checked={draft.includePasswords}
                onCheckedChange={(c) => dispatch(updateSendDraft({ includePasswords: c === true }))}
                aria-describedby="vault-send-include-help"
              />
              <div>
                <label htmlFor="vault-send-include" className="cursor-pointer text-sm font-semibold text-on-surface">
                  Include passwords in the same email
                </label>
                <p id="vault-send-include-help" className="text-[11px] text-on-surface-variant">
                  When unticked, the passwords go in a second, separate email.
                </p>
              </div>
            </div>

            {needsApproval && (
              <div role="region" aria-label="Approval required" className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-50 p-3 dark:bg-amber-500/10">
                <p className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
                  <ShieldAlert className="h-4 w-4" aria-hidden="true" /> An account's sensitivity level requires approval
                </p>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="vault-send-approved"
                    className="mt-0.5"
                    checked={draft.approval.confirmed}
                    onCheckedChange={(c) => dispatch(updateSendApproval({ confirmed: c === true }))}
                  />
                  <label htmlFor="vault-send-approved" className="cursor-pointer text-sm text-on-surface">
                    I confirm this send has been approved
                  </label>
                </div>
                <FieldWithHelp id="vault-send-approver" label="Approver name" required help="Recorded in the log with this send.">
                  <Input
                    id="vault-send-approver"
                    aria-describedby="vault-send-approver-help"
                    aria-required
                    value={draft.approval.approverName}
                    onChange={(e) => dispatch(updateSendApproval({ approverName: e.target.value }))}
                  />
                </FieldWithHelp>
              </div>
            )}

            <div className="space-y-1.5 border-t border-outline-variant/20 pt-3">
              <Button onClick={submit} disabled={!canSend} className="w-full sm:w-auto" aria-describedby={blockers.length ? 'vault-send-blockers' : undefined}>
                {sendStatus === 'loading' ? <Loader2 className="animate-spin" /> : <Send />} Send and log
              </Button>
              {blockers.length > 0 && (
                <p id="vault-send-blockers" className="text-xs text-on-surface-variant">
                  Still needed: {blockers.join(', ')}.
                </p>
              )}
            </div>
          </div>
        </Panel>

        <Panel
          title="Preview"
          action={previewStatus === 'loading' ? <Loader2 className="h-4 w-4 animate-spin text-on-surface-variant" aria-label="Updating preview" /> : null}
          className="lg:sticky lg:top-4 lg:self-start"
        >
          {!draft.entryIds.length ? (
            <EmptyState icon={<Mail className="h-6 w-6" />} title="Nothing to preview yet" hint="Select at least one account to see the preview." />
          ) : previewStatus === 'failed' && !preview ? (
            <ErrorState message={previewError ?? 'Could not build the preview'} />
          ) : !preview ? (
            <LoadingRows rows={5} />
          ) : (
            <div className={`space-y-3 ${previewStatus === 'loading' ? 'opacity-60' : ''}`} aria-live="polite">
              {previewStatus === 'failed' && previewError && (
                <p role="alert" className="rounded-lg bg-error/10 px-3 py-2 text-xs text-error">
                  {previewError}
                </p>
              )}
              <PreviewMail from={preview.from} to={preview.to} subject={preview.subject} body={preview.body} />
              {preview.passwordsEmail && (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary">Second email — passwords</p>
                  <PreviewMail from={preview.from} to={preview.to} subject={preview.passwordsEmail.subject} body={preview.passwordsEmail.body} />
                </>
              )}
              <p className="text-[11px] text-on-surface-variant">
                Passwords are masked in the preview. Sent emails appear in the <Link to="/vault/log" className="text-primary hover:underline">Send Log</Link>.
              </p>
            </div>
          )}
        </Panel>
      </div>
    </VaultLayout>
  );
}

function PreviewMail({ from, to, subject, body }: { from: string; to: string; subject: string; body: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant/30">
      <dl className="space-y-1 bg-surface-container-low px-3 py-2 text-xs">
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 font-semibold text-on-surface-variant">From</dt>
          <dd className="min-w-0">
            <MonoText className="text-xs">{from || '—'}</MonoText>
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 font-semibold text-on-surface-variant">To</dt>
          <dd className="min-w-0">
            <MonoText className="text-xs">{to || '—'}</MonoText>
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 font-semibold text-on-surface-variant">Subject</dt>
          <dd className="min-w-0 font-semibold text-on-surface">{subject}</dd>
        </div>
      </dl>
      <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words bg-surface-container-lowest px-3 py-3 font-sans text-sm leading-relaxed text-on-surface">
        {body}
      </pre>
    </div>
  );
}
