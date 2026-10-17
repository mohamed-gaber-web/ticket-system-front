import type { ReactNode } from 'react';
import { ExternalLink, Info, Pencil, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dueChip, entrySubtitle, isHttpUrl, passwordAgeTone } from '@/lib/vault';
import type { VaultEntry } from '@/types/vault.types';
import { Chip, ConfirmButton, MonoText } from './VaultUi';
import { CopyButton, PasswordValue } from './PasswordValue';
import { AttachmentCountChip } from './VaultAttachments';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2 border-t border-outline-variant/20 py-1.5 first:border-t-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

/** Chips shared by the card and the details modal. */
export function EntryChips({ entry }: { entry: VaultEntry }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Chip tone="accent">{entry.ownerType === 'client' ? 'Client account' : 'Company account'}</Chip>
      {entry.category && <Chip>{entry.category.name}</Chip>}
      {entry.environment && <Chip>{entry.environment.name}</Chip>}
      {entry.sensitivity && (
        <Chip tone={entry.requiresApproval ? 'bad' : 'neutral'} title={entry.requiresApproval ? 'Needs approval before sending' : undefined}>
          {entry.sensitivity.name}
        </Chip>
      )}
    </div>
  );
}

/** Password age + validity/renewal chips. */
export function EntryStatusChips({ entry }: { entry: VaultEntry }) {
  const due = dueChip(entry.dueKind, entry.dueInDays);
  const age = entry.passwordAgeDays ?? 0;
  return (
    <div className="flex flex-wrap gap-1">
      <Chip tone={passwordAgeTone(age)}>
        Password changed {age === 0 ? 'today' : `${age} day${age === 1 ? '' : 's'} ago`}
      </Chip>
      {due && <Chip tone={due.tone}>{due.text}</Chip>}
    </div>
  );
}

interface Props {
  entry: VaultEntry;
  canManage: boolean;
  onSend: () => void;
  onDetails: () => void;
  onEdit: () => void;
  onDelete: () => Promise<unknown>;
}

export function VaultEntryCard({ entry, canManage, onSend, onDetails, onEdit, onDelete }: Props) {
  const mfa = entry.mfaMethod && !entry.mfaMethod.isNone ? [entry.mfaMethod.name, entry.mfaHolder].filter(Boolean).join(' · ') : '';
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-[1rem] border border-outline-variant/30 bg-surface-container-lowest p-4">
      <header className="min-w-0 space-y-1.5">
        <h3 className="truncate text-base font-bold text-on-surface" title={entry.platform}>
          {entry.platform}
        </h3>
        <p className="truncate text-xs text-on-surface-variant">{entrySubtitle(entry)}</p>
        <EntryChips entry={entry} />
      </header>

      <dl className="text-sm">
        {entry.url && (
          <Row label="URL">
            <div className="flex min-w-0 items-center gap-1">
              {isHttpUrl(entry.url) ? (
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate rounded text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  title={entry.url}
                >
                  <MonoText className="text-primary">{entry.url}</MonoText>
                  <ExternalLink className="ml-1 inline h-3 w-3" aria-hidden="true" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <MonoText className="min-w-0 flex-1">{entry.url}</MonoText>
              )}
              <CopyButton value={entry.url} label="URL" />
            </div>
          </Row>
        )}
        <Row label="User">
          <div className="flex min-w-0 items-center gap-1">
            <MonoText className="min-w-0 flex-1">{entry.username}</MonoText>
            <CopyButton value={entry.username} label="Username" />
          </div>
        </Row>
        <Row label="Password">
          <PasswordValue entryId={entry._id} platform={entry.platform} />
        </Row>
        {mfa && (
          <Row label="MFA">
            <span className="text-on-surface">{mfa}</span>
          </Row>
        )}
      </dl>

      <div className="flex flex-wrap items-center gap-1">
        <EntryStatusChips entry={entry} />
        {(entry.attachmentCount ?? 0) > 0 && <AttachmentCountChip count={entry.attachmentCount ?? 0} />}
      </div>

      <footer className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-outline-variant/20 pt-3">
        <Button size="sm" onClick={onSend}>
          <Send /> Send
        </Button>
        <Button size="sm" variant="outline" onClick={onDetails}>
          <Info /> Details
        </Button>
        {canManage && (
          <>
            <Button size="sm" variant="ghost" onClick={onEdit} aria-label={`Edit ${entry.platform}`}>
              <Pencil /> Edit
            </Button>
            <ConfirmButton onConfirm={onDelete} ariaLabel={`Delete ${entry.platform}`} />
          </>
        )}
      </footer>
    </article>
  );
}
