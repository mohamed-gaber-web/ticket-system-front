import { Phone } from 'lucide-react';
import { toast } from 'sonner';
import { telHref } from '@/types/teleSales.types';
import * as teleSalesApi from '@/api/teleSalesApi';

interface PhoneLinkProps {
  number?: string | null;
  className?: string;
  showIcon?: boolean;
  /** When provided, clicking auto-logs a call attempt on this lead. */
  leadId?: string;
  /** Called after a call is successfully logged (e.g. to refresh a list). */
  onLogged?: () => void;
}

/**
 * A click-to-call phone number. Renders a `tel:` link so clicking it on a
 * PC/laptop opens the registered telephony app / linked device to place the
 * call. Falls back to a muted dash when there is no number.
 *
 * When `leadId` is provided, clicking also auto-logs a call attempt (date/time =
 * now, no duration) so the call shows up in the lead's Calls tab and the global
 * Recent Calls view. This is best-effort: it never blocks the dialer, and it
 * silently skips if the user isn't allowed to log on this lead.
 */
export function PhoneLink({ number, className = '', showIcon = true, leadId, onLogged }: PhoneLinkProps) {
  if (!number) return <span className={`text-on-surface-variant ${className}`}>—</span>;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!leadId) return;
    // Fire-and-forget: the `tel:` default action still runs and opens the dialer.
    teleSalesApi
      .addCall(leadId, { callDate: new Date().toISOString() })
      .then(() => {
        toast.success('Call logged');
        onLogged?.();
      })
      .catch(() => {
        // Not assigned to this lead, or request failed — skip logging silently.
      });
  };

  return (
    <a
      href={telHref(number)}
      onClick={handleClick}
      title={`Call ${number}`}
      className={`inline-flex items-center gap-1 text-primary hover:underline underline-offset-2 ${className}`}
    >
      {showIcon && <Phone className="w-3.5 h-3.5 shrink-0" />}
      <span>{number}</span>
    </a>
  );
}
