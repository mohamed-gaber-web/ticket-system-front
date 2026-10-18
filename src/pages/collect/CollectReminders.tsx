import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { collectChanged, openDrawer } from '@/redux/slices/collectSlice';
import { getOutbox, getReminderLog, markRemindersSent } from '@/api/collectApi';
import { RECIPIENT_LABELS, TRIGGER_LABELS, apiError, fmtDate, days } from '@/lib/collect';
import { COLLECT_BASE, CollectLayout } from '@/components/collect/CollectLayout';
import { Chip, ConfirmButton, EmptyState, ErrorState, Loading, Panel, Warning } from '@/components/collect/CollectUi';
import type { Mail, Outbox, SentLog } from '@/types/collect.types';

// Grow Path Collect — reminders (§6, §9.8): today's outbox as mail cards, the
// mails scheduled within 30 days, and the send log.

function MailCard({ m, onSent, onOpen }: { m: Mail; onSent: (m: Mail) => void; onOpen: (id: string) => void }) {
  const copy = async () => {
    const text = `To: ${m.toText}\nSubject: ${m.subject}\n\n${m.body}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Text copied');
    } catch {
      toast.error('Could not copy — copy the text from the card by hand');
    }
  };
  return (
    <article className="flex min-w-0 flex-col gap-2 rounded-[0.75rem] bg-surface-container-low p-3">
      <div className="flex flex-wrap gap-1">
        <Chip tone={m.trigger === 'overdue' ? 'crit' : m.trigger === 'renewal' ? 'info' : 'warn'}>
          {TRIGGER_LABELS[m.trigger]} · {days(m.days)}
        </Chip>
        <Chip>{RECIPIENT_LABELS[m.recipient]}</Chip>
        <Chip>{fmtDate(m.triggerDate)}</Chip>
      </div>
      <p className="text-xs text-on-surface-variant">
        To: <span className={m.missingEmail ? 'font-semibold text-error' : 'text-on-surface'}>{m.toText}</span>
      </p>
      <p className="font-semibold text-on-surface">{m.subject}</p>
      <p className="pre max-h-44 overflow-y-auto rounded-md bg-surface-container-lowest p-2 text-[13px] leading-relaxed text-on-surface">{m.body}</p>
      <div className="mt-auto flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onSent(m)}>
          <Check /> Mark as sent
        </Button>
        <Button size="sm" variant="outline" onClick={() => void copy()}>
          <Copy /> Copy text
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onOpen(m.contractId)}>
          <ExternalLink /> Open contract
        </Button>
      </div>
    </article>
  );
}

export default function CollectReminders() {
  const dispatch = useAppDispatch();
  const { dataVersion, meta } = useAppSelector((s) => s.collect);
  const [box, setBox] = useState<Outbox | null>(null);
  const [log, setLog] = useState<SentLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [o, l] = await Promise.all([getOutbox(), getReminderLog()]);
      setBox(o);
      setLog(l);
    } catch (e) {
      setError(apiError(e, 'Could not load the reminders'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  const mark = async (keys: string[]) => {
    try {
      const res = await markRemindersSent(keys);
      toast.success(res.message ?? 'Done');
      void dispatch(collectChanged());
    } catch (e) {
      toast.error(apiError(e, 'Could not mark as sent'));
    }
  };

  return (
    <CollectLayout>
      {error && !box ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : !box ? (
        <Loading rows={6} />
      ) : (
        <>
          {box.mode === 'auto' && !box.smtpConfigured && <Warning>Auto mode is on, but e-mail isn’t configured on the server — reminders work manually from the outbox.</Warning>}
          {!box.internalEmailSet && (
            <Warning>
              The internal e-mail address isn’t set — internal reminders will show without an address.{' '}
              {meta?.canAdmin && (
                <Link className="font-semibold underline" to={`${COLLECT_BASE}/settings/general`}>
                  Open settings
                </Link>
              )}
            </Warning>
          )}
          <Panel
            title={
              <>
                Outbox — {fmtDate(box.today)} <span className="text-on-surface-variant">({box.outbox.length})</span>
              </>
            }
            hint={
              box.mode === 'auto'
                ? 'Auto-send runs daily at 08:00 Cairo time; mails without an address stay here to send by hand.'
                : 'Send each mail from your mailbox (copy the text), then press “Mark as sent” so it doesn’t come back.'
            }
            action={
              box.outbox.length > 1 ? (
                <ConfirmButton
                  onConfirm={() => mark(box.outbox.map((m) => m.dedupeKey))}
                  label="Mark all as sent"
                  icon={false}
                  variant="outline"
                />
              ) : undefined
            }
          >
            {box.outbox.length === 0 ? (
              <EmptyState title="No mails due today" />
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-3">
                {box.outbox.map((m) => (
                  <MailCard key={m.dedupeKey} m={m} onSent={(x) => void mark([x.dedupeKey])} onOpen={(id) => dispatch(openDrawer(id))} />
                ))}
              </div>
            )}
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title={`Scheduled in the next 30 days (${box.upcoming.length})`}>
              {box.upcoming.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No scheduled mails.</p>
              ) : (
                <ul className="divide-y divide-outline-variant/30">
                  {box.upcoming.map((m) => (
                    <li key={m.dedupeKey} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                      <span className="w-24 shrink-0 tabular-nums text-on-surface-variant">{fmtDate(m.triggerDate)}</span>
                      <button type="button" className="min-w-0 flex-1 text-start hover:underline" onClick={() => dispatch(openDrawer(m.contractId))}>
                        <span className="text-on-surface">{m.subject}</span>
                        <span className="block text-xs text-on-surface-variant">
                          {TRIGGER_LABELS[m.trigger]} · {RECIPIENT_LABELS[m.recipient]}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Send log">
              {log.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Nothing has been sent yet.</p>
              ) : (
                <ul className="divide-y divide-outline-variant/30">
                  {log.map((l) => (
                    <li key={l.id} className="py-2 text-sm">
                      <p className="text-on-surface">{l.subject}</p>
                      <p className="text-xs text-on-surface-variant">
                        {fmtDate(l.sentAt.slice(0, 10))} · To: {l.to} · {l.channel === 'smtp' ? 'Sent automatically' : `Manual — ${l.by}`}
                        {l.error && <span className="text-error"> · {l.error}</span>}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </CollectLayout>
  );
}
