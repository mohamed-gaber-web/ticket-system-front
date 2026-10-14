import { X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  openTicket,
  resetTicketFilters,
  setTicketFilter,
  setTicketTab,
  setTicketView,
  toggleDay,
  type TicketFilter,
} from '@/redux/slices/myHomeSlice';
import { BOARD_LABEL, PRIORITY_LABEL, STATUS_LABEL, keyToDate, shortDate, type TicketView } from '@/lib/myHome';
import type { BoardStatus } from '@/types/myHome.types';
import { selectTicketPanel } from '../selectors';
import { Bar, Card, CardHead, Empty, PriorityDot, Segmented } from './ui';

const BOARD_COLORS: Record<BoardStatus, string> = {
  todo: 'var(--prio-medium)',
  in_progress: 'var(--info-text)',
  waiting: 'var(--purple-text)',
  done: 'var(--primary)',
};

function DueText({ t }: { t: TicketView }) {
  if (!t.dueDate) return <span className="mh-meta">—</span>;
  if (t.isOverdue) return <span style={{ color: 'var(--danger-text)', fontWeight: 700 }}>Overdue · {shortDate(t.dueDate)}</span>;
  if (t.isDueToday) return <strong>Today</strong>;
  return <span>{shortDate(t.dueDate)}</span>;
}

function Hours({ t }: { t: TicketView }) {
  const over = t.estimateHours > 0 && t.loggedHours > t.estimateHours;
  return (
    <div style={{ minWidth: 90 }}>
      <span className="mono" style={{ fontSize: 12.5, color: over ? 'var(--over)' : undefined }}>
        {t.loggedHours} / {t.estimateHours || '—'} h
      </span>
      <Bar value={t.loggedHours} max={t.estimateHours || t.loggedHours || 1} over={over} style={{ marginTop: 4 }} />
    </div>
  );
}

export function StatusPill({ t }: { t: { status: string; board: BoardStatus } }) {
  return <span className={`mh-pill st-${t.board}`}>{STATUS_LABEL[t.status] ?? t.status}</span>;
}

export default function TicketsPanel() {
  const dispatch = useAppDispatch();
  const ui = useAppSelector((s) => s.myHome.ui.tickets);
  const { rows, counts, tabCounts } = useAppSelector(selectTicketPanel);

  const chips: { value: TicketFilter; label: string }[] = [
    { value: 'open', label: 'Open' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'waiting', label: 'Waiting' },
    { value: 'all', label: 'All' },
  ];

  return (
    <Card id="work" labelledBy="mh-work-title">
      <CardHead id="mh-work-title" title="Tickets">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Segmented
            label="Ticket type"
            value={ui.tab}
            onChange={(v) => dispatch(setTicketTab(v))}
            options={[
              { value: 'client', label: 'Client', count: tabCounts.client },
              { value: 'internal', label: 'Internal', count: tabCounts.internal },
            ]}
          />
          <Segmented
            label="View"
            value={ui.view}
            onChange={(v) => dispatch(setTicketView(v))}
            options={[
              { value: 'list', label: 'List' },
              { value: 'board', label: 'Board' },
            ]}
          />
        </div>
      </CardHead>

      <div className="mh-chips" role="group" aria-label="Ticket filter">
        {chips.map((c) => (
          <button key={c.value} type="button" className="mh-chip" aria-pressed={ui.filter === c.value} onClick={() => dispatch(setTicketFilter(c.value))}>
            {c.label} <span className="mh-count">{counts[c.value]}</span>
          </button>
        ))}
        {ui.day && (
          <button type="button" className="mh-chip day" onClick={() => dispatch(toggleDay(null))} aria-label="Clear the day filter">
            Due {keyToDate(ui.day).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })}
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <Empty
          action={
            <button type="button" className="mh-btn outline" onClick={() => dispatch(resetTicketFilters())}>
              Reset filters
            </button>
          }
        >
          No tickets match these filters.
        </Empty>
      ) : ui.view === 'list' ? (
        <div className="mh-scroll">
          <table className="mh-table">
            <caption className="sr-only">Your tickets</caption>
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Subject</th>
                <th scope="col">Module</th>
                <th scope="col">Priority</th>
                <th scope="col">Due</th>
                <th scope="col">Hours</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className={t.isOverdue ? 'late' : undefined}>
                  <td className="mh-code">{t.code}</td>
                  <td style={{ maxWidth: 320 }}>
                    <button type="button" className="mh-link" onClick={() => dispatch(openTicket(t.id))}>
                      {t.title}
                    </button>
                    <div className="mh-meta">{t.clientName || t.category || 'Internal'}</div>
                  </td>
                  <td>{t.module || '—'}</td>
                  <td>
                    <PriorityDot priority={t.priority} withLabel />
                  </td>
                  <td>
                    <DueText t={t} />
                  </td>
                  <td>
                    <Hours t={t} />
                  </td>
                  <td>
                    <StatusPill t={t} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mh-board">
          {(['todo', 'in_progress', 'waiting', 'done'] as BoardStatus[]).map((col) => {
            const cards = rows.filter((t) => t.board === col);
            return (
              <section key={col} className="mh-col" aria-label={`${BOARD_LABEL[col]}, ${cards.length} tickets`}>
                <div className="mh-col-head">
                  <span className="mh-dot" style={{ background: BOARD_COLORS[col] }} aria-hidden="true" />
                  {BOARD_LABEL[col]}
                  <span className="mh-count">{cards.length}</span>
                </div>
                {cards.map((t) => (
                  <button key={t.id} type="button" className={t.isOverdue ? 'mh-tcard late' : 'mh-tcard'} onClick={() => dispatch(openTicket(t.id))}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span className="mh-code">{t.code}</span>
                      <span className="mh-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <PriorityDot priority={t.priority} />
                        {PRIORITY_LABEL[t.priority]}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, margin: '6px 0 2px' }}>{t.title}</div>
                    <div className="mh-meta">{t.clientName || t.category || 'Internal'}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8, fontSize: 12.5 }}>
                      <DueText t={t} />
                      <span className="mono">
                        {t.loggedHours}/{t.estimateHours || '—'}h
                      </span>
                    </div>
                  </button>
                ))}
                {cards.length === 0 && <div className="mh-meta" style={{ padding: 8 }}>Nothing here</div>}
              </section>
            );
          })}
        </div>
      )}
    </Card>
  );
}
