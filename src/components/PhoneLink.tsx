import { Phone } from 'lucide-react';
import { telHref } from '@/types/teleSales.types';

interface PhoneLinkProps {
  number?: string | null;
  className?: string;
  showIcon?: boolean;
}

/**
 * A click-to-call phone number. Renders a `tel:` link so clicking it on a
 * PC/laptop opens the registered telephony app / linked device to place the
 * call. Falls back to a muted dash when there is no number.
 */
export function PhoneLink({ number, className = '', showIcon = true }: PhoneLinkProps) {
  if (!number) return <span className={`text-on-surface-variant ${className}`}>—</span>;
  return (
    <a
      href={telHref(number)}
      onClick={(e) => e.stopPropagation()}
      title={`Call ${number}`}
      className={`inline-flex items-center gap-1 text-primary hover:underline underline-offset-2 ${className}`}
    >
      {showIcon && <Phone className="w-3.5 h-3.5 shrink-0" />}
      <span>{number}</span>
    </a>
  );
}
