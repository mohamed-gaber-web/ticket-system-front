import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWhatsAppSession } from '@/hooks/useWhatsAppSession';
import { WhatsAppThread } from '@/components/whatsapp/WhatsAppThread';
import { isValidWhatsAppNumber, toWhatsAppNumber } from '@/lib/whatsapp';

interface WhatsAppPanelProps {
  /** The record's numbers as stored ("0100…", "+966 5…"); invalid ones are skipped. */
  numbers: { label: string; phone?: string | null }[];
  /** Dial code for national numbers. */
  country?: string | null;
  leadId?: string;
  ticketId?: string;
  readOnly?: boolean;
}

/**
 * WhatsApp tab of a lead or ticket: pick one of its numbers (or type another)
 * and chat from the employee's own linked WhatsApp.
 */
export function WhatsAppPanel({ numbers, country, leadId, ticketId, readOnly = false }: WhatsAppPanelProps) {
  const { session, loading } = useWhatsAppSession();
  const options = useMemo(() => {
    const seen = new Set<string>();
    return numbers
      .map((n) => ({ label: n.label, number: toWhatsAppNumber(n.phone, country) }))
      .filter((n) => isValidWhatsAppNumber(n.number) && !seen.has(n.number) && seen.add(n.number));
  }, [numbers, country]);
  const [picked, setPicked] = useState<string>('');
  const [custom, setCustom] = useState('');
  const phone = picked || options[0]?.number || '';

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-600/20 border-t-green-600" />
      </div>
    );
  }

  const connected = session?.status === 'connected';

  const applyCustom = () => {
    const n = toWhatsAppNumber(custom, country);
    if (isValidWhatsAppNumber(n)) {
      setPicked(n);
      setCustom('');
    }
  };

  return (
    <div className="space-y-3">
      {!connected && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-green-500/10 rounded-xl px-4 py-3">
          <p className="text-sm text-on-surface flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-green-600" />
            Connect your WhatsApp to send messages from here. You can still read past messages.
          </p>
          <Link to="/whatsapp">
            <Button size="sm" className="bg-green-600 hover:bg-green-700 bg-none text-white">Connect WhatsApp</Button>
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {options.map((o) => (
          <button
            key={o.number}
            type="button"
            onClick={() => setPicked(o.number)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ghost-border transition-colors ${
              phone === o.number ? 'bg-green-600 text-white' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <Phone className="w-3.5 h-3.5" /> {o.label}: +{o.number}
          </button>
        ))}
        {picked && !options.some((o) => o.number === picked) && (
          <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-green-600 text-white">
            <Phone className="w-3.5 h-3.5" /> +{picked}
          </span>
        )}
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); applyCustom(); }}>
          <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Other number" className="h-8 w-44 text-xs" />
          <Button type="submit" variant="outline" size="sm" disabled={!custom.trim()}>Use</Button>
        </form>
      </div>

      {phone ? (
        <WhatsAppThread key={phone} phone={phone} leadId={leadId} ticketId={ticketId} readOnly={readOnly || !connected} className="h-[560px] ghost-border" />
      ) : (
        <p className="text-sm text-on-surface-variant py-8 text-center">No valid mobile number on this record. Type one above to start a chat.</p>
      )}
    </div>
  );
}
