import { useEffect, type ReactNode } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { clearSelectedEntry, fetchVaultEntry } from '@/redux/slices/vaultEntriesSlice';
import { entrySubtitle, fmtDate, fmtDateTime, isHttpUrl } from '@/lib/vault';
import { VAULT_SECTIONS, fieldsFor, type VaultFieldDef } from '@/lib/vaultFields';
import type { VaultEntryDetail } from '@/types/vault.types';
import { EntryChips, EntryStatusChips } from './VaultEntryCard';
import { PasswordValue } from './PasswordValue';
import { ErrorState, MonoText } from './VaultUi';

function fieldValue(f: VaultFieldDef, e: VaultEntryDetail): ReactNode {
  if (f.key === 'password') return <PasswordValue entryId={e._id} platform={e.platform} />;
  const raw = e[f.key as keyof VaultEntryDetail];
  if (raw === null || raw === undefined || raw === '') return <span className="text-on-surface-variant">—</span>;
  if (f.type === 'date') return fmtDate(String(raw));
  if (typeof raw === 'object' && 'name' in raw) {
    const ref = raw as { name: string; email?: string };
    return ref.email ? (
      <>
        {ref.name} <MonoText className="text-on-surface-variant">{ref.email}</MonoText>
      </>
    ) : (
      ref.name
    );
  }
  const text = String(raw);
  if (f.key === 'url' && isHttpUrl(text)) {
    return (
      <a href={text} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
        <MonoText className="text-primary">{text}</MonoText>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  if (f.mono) return <MonoText>{text}</MonoText>;
  return <span className="whitespace-pre-wrap break-words">{text}</span>;
}

interface Props {
  entryId: string | null;
  canManage: boolean;
  onClose: () => void;
  onEdit: (entry: VaultEntryDetail) => void;
}

/** Everything about one account, by section, plus who it was sent to. */
export function VaultEntryDetailsDialog({ entryId, canManage, onClose, onEdit }: Props) {
  const dispatch = useAppDispatch();
  const { selected, selectedStatus, selectedError } = useAppSelector((s) => s.vaultEntries);

  useEffect(() => {
    if (!entryId) return;
    void dispatch(fetchVaultEntry(entryId));
    return () => {
      dispatch(clearSelectedEntry());
    };
  }, [dispatch, entryId]);

  const entry = selected && selected._id === entryId ? selected : null;
  const history = entry?.sendHistory ?? [];

  return (
    <Dialog open={!!entryId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] overflow-y-auto sm:max-w-2xl">
        {!entry ? (
          <>
            <DialogHeader>
              <DialogTitle>Account details</DialogTitle>
              <DialogDescription className="sr-only">Loading the account</DialogDescription>
            </DialogHeader>
            {selectedStatus === 'failed' ? (
              <ErrorState message={selectedError ?? 'Could not load the account'} onRetry={() => entryId && dispatch(fetchVaultEntry(entryId))} />
            ) : (
              <p className="flex items-center gap-2 py-8 text-sm text-on-surface-variant">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </p>
            )}
          </>
        ) : (
          <>
            <DialogHeader className="space-y-2 pr-6 text-left">
              <DialogTitle className="break-words leading-snug">{entry.platform}</DialogTitle>
              <DialogDescription>{entrySubtitle(entry)}</DialogDescription>
              <EntryChips entry={entry} />
            </DialogHeader>

            {VAULT_SECTIONS.map((s) => {
              const fields = fieldsFor(entry.ownerType).filter((f) => f.section === s.key);
              return (
                <section key={s.key} className="space-y-1.5">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary">{s.label}</h3>
                  <dl className="divide-y divide-outline-variant/20 rounded-xl bg-surface-container-low px-3">
                    {fields.map((f) => (
                      <div key={f.key} className="grid gap-1 py-2 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-3">
                        <dt className="text-xs font-semibold text-on-surface-variant">{f.label}</dt>
                        <dd className="min-w-0 text-sm text-on-surface">{fieldValue(f, entry)}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              );
            })}

            <section className="space-y-1.5">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary">Status</h3>
              <p className="text-sm text-on-surface">
                Password last changed: <b>{fmtDate(entry.passwordChangedAt)}</b>
              </p>
              <EntryStatusChips entry={entry} />
            </section>

            <section className="space-y-1.5">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary">Sent to ({history.length})</h3>
              {history.length ? (
                <ul className="divide-y divide-outline-variant/20 rounded-xl bg-surface-container-low px-3">
                  {history.map((h) => (
                    <li key={h._id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2 text-sm">
                      <span className="min-w-0">
                        <b className="text-on-surface">{h.recipientName}</b> <MonoText className="text-on-surface-variant">{h.recipientEmail}</MonoText>
                      </span>
                      <span className="text-xs text-on-surface-variant">{fmtDateTime(h.sentAt)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-on-surface-variant">Not sent to anyone yet.</p>
              )}
            </section>

            <DialogFooter className="gap-2">
              {canManage && (
                <Button variant="outline" onClick={() => onEdit(entry)}>
                  <Pencil /> Edit
                </Button>
              )}
              <Button onClick={onClose}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
