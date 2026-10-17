import { useEffect, useState } from 'react';
import { useAppSelector } from '@/redux/hooks/hooks';
import { getLeadEmailSender } from '@/api/teleSalesApi';
import { getTicketEmailSender } from '@/api/ticketEmailApi';
import type { EmailSenderInfo } from '@/types/teleSales.types';

/** Which shared mailbox the composer sends from: sales (leads) or support (tickets). */
export type EmailSenderKind = 'sales' | 'support';

const fetchers: Record<EmailSenderKind, () => Promise<{ data: EmailSenderInfo }>> = {
  sales: getLeadEmailSender,
  support: getTicketEmailSender,
};

// Fetched once per signed-in user and kind, and shared by every composer (the
// personal choice is the user's own address, so the key carries the user).
const cached: Record<string, EmailSenderInfo> = {};
const pending: Record<string, Promise<EmailSenderInfo | null>> = {};

/**
 * Who email can be sent from, for the composer's "From" row — the shared
 * mailbox and, when the employee's address is a company mailbox, their own.
 * Null until it has loaded, or if the API cannot say.
 */
export function useEmailSender(kind: EmailSenderKind): EmailSenderInfo | null {
  const userId = useAppSelector((s) => (s.auth.user as { _id?: string } | null)?._id ?? '');
  const key = `${kind}:${userId}`;
  const [sender, setSender] = useState<EmailSenderInfo | null>(cached[key] ?? null);

  useEffect(() => {
    if (cached[key]) { setSender(cached[key]); return; }
    pending[key] ??= fetchers[kind]()
      .then((r) => {
        cached[key] = r.data;
        return r.data;
      })
      .catch(() => {
        delete pending[key]; // let a later composer try again
        return null;
      });
    let alive = true;
    pending[key].then((s) => { if (alive) setSender(s); });
    return () => { alive = false; };
  }, [kind, key]);

  return sender;
}

/** "Name <mailbox>", or just the mailbox. */
export const senderLabel = (mailbox?: string | null, name?: string | null) =>
  mailbox ? (name ? `${name} <${mailbox}>` : mailbox) : '';
