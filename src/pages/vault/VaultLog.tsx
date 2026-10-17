import { useCallback, useEffect, useState } from 'react';
import { Loader2, ScrollText, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { clearLogDetail, fetchVaultLog, fetchVaultLogs } from '@/redux/slices/vaultReportsSlice';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useVaultSetup } from '@/hooks/useVaultSetup';
import { fmtDateTime } from '@/lib/vault';
import { VaultLayout } from '@/components/vault/VaultLayout';
import { LookupSelect } from '@/components/vault/LookupSelect';
import { Chip, EmptyState, ErrorState, LoadingRows, MonoText } from '@/components/vault/VaultUi';

const PAGE_SIZE = 25;

/** Send Log: every credentials email, newest first, server-paginated. */
export default function VaultLog() {
  const dispatch = useAppDispatch();
  useVaultSetup();
  const { logs, logsTotal, logsPages, logsStatus, logsError } = useAppSelector((s) => s.vaultReports);

  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 300);
  const [sentBy, setSentBy] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  /** Any filter change starts again from page 1. */
  const reset =
    <T,>(fn: (v: T) => void) =>
    (v: T) => {
      fn(v);
      setPage(1);
    };
  const onSearch = reset(setSearch);
  const onSentBy = reset(setSentBy);
  const onFrom = reset(setFrom);
  const onTo = reset(setTo);

  const load = useCallback(() => {
    void dispatch(
      fetchVaultLogs({ q: q || undefined, sentBy: sentBy || undefined, from: from || undefined, to: to || undefined, page, limit: PAGE_SIZE }),
    );
  }, [dispatch, q, sentBy, from, to, page]);
  useEffect(load, [load]);

  const hasFilters = !!(q || sentBy || from || to);

  return (
    <VaultLayout title="Send log" description="Who sent which accounts, to whom, why and with whose approval. Passwords are never stored here.">
      <div className="grid grid-cols-1 gap-2 rounded-[1rem] bg-surface-container-lowest p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto_auto_auto]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
          <Input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by recipient, email or platform"
            aria-label="Search the send log"
            className="pl-9"
          />
        </div>
        <LookupSelect aria-label="Sent by" source="users" value={sentBy} emptyLabel="Everyone" onChange={onSentBy} />
        <label className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
          From
          <Input type="date" value={from} max={to || undefined} onChange={(e) => onFrom(e.target.value)} className="w-auto flex-1" />
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
          To
          <Input type="date" value={to} min={from || undefined} onChange={(e) => onTo(e.target.value)} className="w-auto flex-1" />
        </label>
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch('');
              setSentBy('');
              setFrom('');
              setTo('');
              setPage(1);
            }}
          >
            <X /> Clear
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-[1rem] bg-surface-container-lowest">
        {logsStatus === 'failed' ? (
          <div className="p-4">
            <ErrorState message={logsError ?? 'Could not load the send log'} onRetry={load} />
          </div>
        ) : logsStatus !== 'succeeded' && !logs.length ? (
          <LoadingRows rows={5} className="p-4" />
        ) : !logs.length ? (
          <EmptyState
            icon={<ScrollText className="h-6 w-6" />}
            title={hasFilters ? 'No send matches these filters' : 'Nothing sent yet'}
            hint={hasFilters ? 'Try another search or clear the filters.' : 'Sends from the Send Credentials screen appear here.'}
          />
        ) : (
          <div className={`overflow-x-auto ${logsStatus === 'loading' ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-outline-variant/30 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  <th scope="col" className="px-3 py-3">Date</th>
                  <th scope="col" className="px-3 py-3">Recipient</th>
                  <th scope="col" className="px-3 py-3">Email</th>
                  <th scope="col" className="px-3 py-3">Accounts</th>
                  <th scope="col" className="px-3 py-3">Reason</th>
                  <th scope="col" className="px-3 py-3">Sent by</th>
                  <th scope="col" className="px-3 py-3">Approval</th>
                  <th scope="col" className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {logs.map((l) => (
                  <tr key={l._id} onClick={() => setOpenId(l._id)} className="cursor-pointer align-top transition-colors hover:bg-surface-container-low">
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenId(l._id);
                        }}
                        className="rounded text-left font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        aria-label={`Open the email sent to ${l.recipientName} on ${fmtDateTime(l.sentAt)}`}
                      >
                        {fmtDateTime(l.sentAt)}
                      </button>
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-on-surface">{l.recipientName}</td>
                    <td className="px-3 py-2.5">
                      <MonoText className="text-xs">{l.recipientEmail}</MonoText>
                    </td>
                    <td className="px-3 py-2.5">
                      <ul className="space-y-0.5">
                        {l.entries.map((e, i) => (
                          <li key={`${e.entry}-${i}`} className="text-on-surface">
                            {e.platform}
                            <span className="text-xs text-on-surface-variant"> · {[e.ownerLabel, e.environment].filter(Boolean).join(' · ')}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-on-surface">{l.purpose?.name ?? '—'}</span>
                        {!l.includedPasswords && <Chip>Passwords sent separately</Chip>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-on-surface-variant">{l.sentBy?.name ?? '—'}</td>
                    <td className="px-3 py-2.5">{l.approverName ? <Chip tone="ok">{l.approverName}</Chip> : <span className="text-on-surface-variant">—</span>}</td>
                    <td className="px-3 py-2.5">
                      {l.deliveryStatus === 'failed' ? (
                        <Chip tone="bad" title={l.deliveryError}>
                          Failed
                        </Chip>
                      ) : (
                        <Chip tone="ok">Sent</Chip>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {logsPages > 1 && (
          <nav aria-label="Pages" className="flex items-center justify-between gap-2 border-t border-outline-variant/30 px-4 py-3 text-sm">
            <span className="text-on-surface-variant">
              {logsTotal} sends · page {page} of {logsPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= logsPages} onClick={() => setPage((n) => n + 1)}>
                Next
              </Button>
            </div>
          </nav>
        )}
      </div>

      <LogDialog id={openId} onClose={() => setOpenId(null)} />
    </VaultLayout>
  );
}

function LogDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const { logDetail, logDetailStatus, logDetailError } = useAppSelector((s) => s.vaultReports);

  useEffect(() => {
    if (!id) return;
    void dispatch(fetchVaultLog(id));
    return () => {
      dispatch(clearLogDetail());
    };
  }, [dispatch, id]);

  const log = logDetail && logDetail._id === id ? logDetail : null;

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle>{log ? log.subject || 'Logged email' : 'Logged email'}</DialogTitle>
          <DialogDescription>{log ? `To ${log.recipientName}` : 'Loading…'}</DialogDescription>
        </DialogHeader>
        {!log ? (
          logDetailStatus === 'failed' ? (
            <ErrorState message={logDetailError ?? 'Could not load this send'} onRetry={() => id && dispatch(fetchVaultLog(id))} />
          ) : (
            <p className="flex items-center gap-2 py-6 text-sm text-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          )
        ) : (
          <>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-2 rounded-xl bg-surface-container-low p-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold text-on-surface-variant">Date</dt>
                <dd className="text-on-surface">{fmtDateTime(log.sentAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-on-surface-variant">Sent by</dt>
                <dd className="text-on-surface">{log.sentBy?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-on-surface-variant">Recipient</dt>
                <dd className="min-w-0 text-on-surface">
                  {log.recipientName} <MonoText className="text-xs text-on-surface-variant">{log.recipientEmail}</MonoText>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-on-surface-variant">Approval</dt>
                <dd className="text-on-surface">{log.approvalRequired ? log.approverName || '—' : 'Not required'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-on-surface-variant">Reason</dt>
                <dd className="text-on-surface">{log.purpose?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-on-surface-variant">Delivery</dt>
                <dd>
                  {log.deliveryStatus === 'failed' ? (
                    <span className="text-error">Failed{log.deliveryError ? ` — ${log.deliveryError}` : ''}</span>
                  ) : (
                    <span className="text-on-surface">{log.includedPasswords ? 'Sent' : 'Sent (passwords in a separate email)'}</span>
                  )}
                </dd>
              </div>
            </dl>
            <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3 font-sans text-sm leading-relaxed text-on-surface">
              {log.bodyRedacted || '—'}
            </pre>
          </>
        )}
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
