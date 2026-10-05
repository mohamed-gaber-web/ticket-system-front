import { useEffect, useState } from 'react';
import { getLeadEmailSender } from '@/api/teleSalesApi';

// Fetched once per page load and shared by every lead composer.
let cached: string | null = null;
let pending: Promise<string | null> | null = null;

/**
 * The mailbox lead email is sent from (sales@growpath.net), for the composer's
 * "From" row. Null until it has loaded, or if the API cannot say.
 */
export function useLeadEmailSender(): string | null {
  const [mailbox, setMailbox] = useState<string | null>(cached);

  useEffect(() => {
    if (cached) return;
    pending ??= getLeadEmailSender()
      .then((r) => (cached = r.data?.mailbox ?? null))
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
