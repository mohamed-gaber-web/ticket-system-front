import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarDays, CheckSquare, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DevCard, DevLabel } from '@/types/development.types';
import { PriorityBadge } from './PriorityBadge';
import { LabelChip } from './LabelChip';
import { PersonAvatar } from './PersonAvatar';
import { cardDndId } from '@/lib/development';

const dueTone = (dueDate: string | null, done: boolean) => {
  if (!dueDate || done) return 'text-on-surface-variant';
  const days = (new Date(dueDate).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return 'text-error font-semibold';
  if (days < 2) return 'text-accent-orange-700 dark:text-accent-orange-200 font-semibold';
  return 'text-on-surface-variant';
};

const fmtDue = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

interface CardBodyProps {
  card: DevCard;
  labels: DevLabel[];
  dragging?: boolean;
  overlay?: boolean;
  onClick?: () => void;
}

/** The visual card, shared by the sortable item and the drag overlay ghost. */
export function CardBody({ card, labels, dragging, overlay, onClick }: CardBodyProps) {
  const done = Boolean(card.completedAt);
  const cardLabels = card.labels.map((id) => labels.find((l) => l._id === id)).filter((l): l is DevLabel => Boolean(l));
  const checked = card.checklist.filter((c) => c.done).length;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group/card flex flex-col gap-2 rounded-[0.75rem] border border-outline-variant/20 bg-surface-container-lowest p-3 text-left transition-shadow',
        onClick && 'cursor-pointer hover:shadow-md hover:border-outline-variant/40',
        dragging && 'opacity-40',
        overlay && 'shadow-ambient rotate-[1.5deg] cursor-grabbing ring-2 ring-primary/30',
        done && 'opacity-75',
      )}
    >
      {cardLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {cardLabels.map((l) => (
            <LabelChip key={l._id} label={l} />
          ))}
        </div>
      )}

      <p className={cn('text-sm font-semibold leading-snug text-on-surface break-words', done && 'line-through')}>{card.title}</p>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-on-surface-variant">
        {card.priority !== 'medium' && <PriorityBadge priority={card.priority} />}
        {card.dueDate && (
          <span className={cn('inline-flex items-center gap-1', dueTone(card.dueDate, done))}>
            <CalendarDays className="h-3 w-3" /> {fmtDue(card.dueDate)}
          </span>
        )}
        {card.checklist.length > 0 && (
          <span className={cn('inline-flex items-center gap-1', checked === card.checklist.length && 'text-emerald-600 dark:text-emerald-300')}>
            <CheckSquare className="h-3 w-3" /> {checked}/{card.checklist.length}
          </span>
        )}
        {card.description && <MessageSquare className="h-3 w-3" aria-label="Has description" />}
        {card.assignedTo && (
          <span className="ml-auto">
            <PersonAvatar person={card.assignedTo} size="xs" />
          </span>
        )}
      </div>
    </div>
  );
}

interface Props {
  card: DevCard;
  labels: DevLabel[];
  onOpen: (card: DevCard) => void;
}

export function BoardCard({ card, labels, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cardDndId(card._id),
    data: { type: 'card', card },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className="touch-none outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-[0.75rem]"
    >
      <CardBody card={card} labels={labels} dragging={isDragging} onClick={() => onOpen(card)} />
    </div>
  );
}
