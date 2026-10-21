import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MessageCirclePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import TicketChatBot from './TicketChatBot';
import { useTicketChat } from './ticketChatContext';

/**
 * The floating "New Ticket" action button, pinned bottom-right on every
 * authenticated screen. It drives the shared panel open-state from
 * TicketChatProvider and renders the TicketChatBot panel. When the panel
 * closes, focus returns to this button.
 */
export function TicketChatLauncher() {
  const { open, onOpenChange } = useTicketChat();
  const reduce = useReducedMotion();
  const btnRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(open);

  useEffect(() => {
    if (wasOpen.current && !open) btnRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  return (
    <>
      <motion.button
        ref={btnRef}
        type="button"
        onClick={() => onOpenChange(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-hidden={open}
        tabIndex={open ? -1 : 0}
        aria-label="New ticket — open the Quick Ticket assistant"
        initial={reduce ? false : { opacity: 0, scale: 0.8, y: 16 }}
        animate={
          open
            ? { opacity: 0, scale: 0.6, pointerEvents: 'none' }
            : { opacity: 1, scale: 1, y: 0, pointerEvents: 'auto' }
        }
        whileHover={reduce ? undefined : { scale: 1.04 }}
        whileTap={reduce ? undefined : { scale: 0.96 }}
        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 24 }}
        className={cn(
          'fixed bottom-5 right-5 z-40 inline-flex h-12 items-center justify-center gap-2 rounded-full',
          'w-12 px-0 sm:w-auto sm:px-5',
          'bg-primary-gradient text-sm font-semibold text-primary-foreground shadow-ambient',
          'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40',
        )}
      >
        <MessageCirclePlus className="h-5 w-5 shrink-0" />
        <span className="hidden sm:inline">New Ticket</span>
      </motion.button>

      <TicketChatBot open={open} onOpenChange={onOpenChange} />
    </>
  );
}
