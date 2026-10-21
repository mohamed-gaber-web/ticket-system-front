import { useMemo, useState } from 'react';
import { TicketChatContext, type TicketChatContextValue } from './ticketChatContext';
import { TicketChatLauncher } from './TicketChatLauncher';

/**
 * Owns the shared open-state for the Quick Ticket assistant and mounts the
 * floating launcher once. Wrap the authenticated content so any page can call
 * `useTicketChat().openTicketChat()` (e.g. a dashboard "New Ticket" button).
 */
export function TicketChatProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const value = useMemo<TicketChatContextValue>(
    () => ({
      open,
      openTicketChat: () => setOpen(true),
      closeTicketChat: () => setOpen(false),
      onOpenChange: setOpen,
    }),
    [open],
  );

  return (
    <TicketChatContext.Provider value={value}>
      {children}
      <TicketChatLauncher />
    </TicketChatContext.Provider>
  );
}
