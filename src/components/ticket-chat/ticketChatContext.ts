import { createContext, useContext } from 'react';

export interface TicketChatContextValue {
  open: boolean;
  openTicketChat: () => void;
  closeTicketChat: () => void;
  onOpenChange: (open: boolean) => void;
}

export const TicketChatContext = createContext<TicketChatContextValue | null>(null);

/** Open/close the global Quick Ticket assistant from anywhere under the Layout. */
export function useTicketChat(): TicketChatContextValue {
  const ctx = useContext(TicketChatContext);
  if (!ctx) throw new Error('useTicketChat must be used within a TicketChatProvider');
  return ctx;
}
