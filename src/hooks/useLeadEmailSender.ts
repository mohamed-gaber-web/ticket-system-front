import { useEffect, useState } from 'react';
import { getLeadEmailSender } from '@/api/teleSalesApi';

// Fetched once per page load and shared by every lead composer.
let cached: string | null = null;
let pending: Promise<string | null> | null = null;

/**
 * Who lead email is sent from, for the composer's "From" row — the display name
 * and mailbox, e.g. "Grow Path For Business Development <sales@growpath.net>".
 * Null until it has loaded, or if the API cannot say.
 */
export function useLeadEmailSender(): string | null {
  const [mailbox, setMailbox] = useState<string | null>(cached);

  useEffect(() => {
    if (cached) return;
    pending ??= getLeadEmailSender()
      .then((r) => {
        const { mailbox, name } = r.data ?? {};
        cached = mailbox ? (name ? `${name} <${mailbox}>` : mailbox) : null;
        return cached;
      })
      .catch(() => {
        pending = null; // let a later composer try again
        return null;
      });
    let alive = true;
    pending.then((m) => { if (alive) setMailbox(m); });
    return () => { alive = false; };
  }, []);

  return mailbox;
}
