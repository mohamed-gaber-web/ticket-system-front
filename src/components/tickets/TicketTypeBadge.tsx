import type { TicketType } from '@/types/ticket';
import { TICKET_TYPE_BADGE, TICKET_TYPE_LABELS } from '@/lib/ticketTypes';
import { cn } from '@/lib/utils';

/** Small pill naming the ticket's kind (Customer / Internal / R&D). */
export function TicketTypeBadge({ type, className }: { type: TicketType; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[0.5rem] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] whitespace-nowrap',
        TICKET_TYPE_BADGE[type],
        className,
      )}
    >
      {TICKET_TYPE_LABELS[type]}
    </span>
  );
}
