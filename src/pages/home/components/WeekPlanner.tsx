import { CalendarDays } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { toggleDay } from '@/redux/slices/myHomeSlice';
import { keyToDate, scrollToSection, shortKey } from '@/lib/myHome';
import { selectWeek } from '../selectors';
import { Bar, Card, CardHead, Pill } from './ui';

export default function WeekPlanner() {
  const dispatch = useAppDispatch();
  const week = useAppSelector(selectWeek);
  const selected = useAppSelector((s) => s.myHome.ui.tickets.day);
  if (!week) return null;
  const first = week.days[0];
  const last = week.days[week.days.length - 1];
  return (
    <Card id="week" labelledBy="mh-week-title">
      <CardHead id="mh-week-title" icon={CalendarDays} title={`This week · ${shortKey(first.date)} – ${keyToDate(last.date).getUTCDate()}`}>
        <span className="mh-meta mono">
          {week.plannedTotal}h of {week.capacityTotal}h planned
        </span>
      </CardHead>
      <div className="mh-week">
        {week.days.map((d) => (
          <button
            key={d.date}
            type="button"
            className="mh-day"
            aria-pressed={selected === d.date}
            aria-label={`${d.label} ${shortKey(d.date)}: ${d.dueCount} due, ${d.plannedHours} hours planned${d.isOver ? ', over capacity' : ''}. ${selected === d.date ? 'Clear the filter' : 'Show these tickets'}`}
            onClick={() => {
              dispatch(toggleDay(d.date));
              if (selected !== d.date) scrollToSection('work');
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700 }}>{d.label}</span>
              {d.isOver ? <Pill tone="danger">Over</Pill> : d.isToday ? <Pill tone="ok">Today</Pill> : null}
            </div>
            <div className="num">{keyToDate(d.date).getUTCDate()}</div>
            <div className="mh-meta" style={{ margin: '4px 0 8px' }}>
              {d.dueCount} due · {d.plannedHours}h planned
            </div>
            <Bar value={d.plannedHours} max={d.capacity} over={d.isOver} />
          </button>
        ))}
      </div>
    </Card>
  );
}
