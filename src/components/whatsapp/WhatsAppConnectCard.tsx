import { Loader2, MessageCircle, QrCode, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WhatsAppSession } from '@/types/whatsapp.types';

interface WhatsAppConnectCardProps {
  session: WhatsAppSession | null;
  busy: boolean;
  onConnect: () => void;
}

/** Link the employee's own WhatsApp number by scanning a QR, like WhatsApp Web. */
export function WhatsAppConnectCard({ session, busy, onConnect }: WhatsAppConnectCardProps) {
  const status = session?.status ?? 'disconnected';
  const waiting = status === 'connecting' || (busy && status !== 'qr');

  return (
    <div className="max-w-3xl mx-auto bg-surface-container-lowest ghost-border rounded-2xl p-6 md:p-8">
      <div className="grid md:grid-cols-[1fr_auto] gap-8 items-center">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-on-surface">Connect your WhatsApp</h2>
          </div>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-on-surface-variant">
            <li>Open WhatsApp on your phone.</li>
            <li>Tap <b>Settings</b> (iPhone) or <b>⋮ Menu</b> (Android) → <b>Linked devices</b>.</li>
            <li>Tap <b>Link a device</b> and scan the QR code here.</li>
          </ol>
          <p className="text-xs text-on-surface-variant/80">
            Messages you send and receive with customers will appear here and on your phone.
          </p>
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-500/10 rounded-xl px-3 py-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Use it for one-to-one conversations only. Sending bulk or unsolicited messages can get your number blocked by WhatsApp.</span>
          </div>
          {status === 'disconnected' && session?.error && (
            <p className="text-xs text-error bg-error/5 rounded-xl px-3 py-2">{session.error}</p>
          )}
          {status !== 'qr' && (
            <Button onClick={onConnect} disabled={waiting} className="gap-2">
              {waiting ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
              {waiting ? 'Starting…' : 'Connect WhatsApp'}
            </Button>
          )}
        </div>

        <div className="w-[280px] h-[280px] rounded-2xl bg-white ghost-border flex items-center justify-center mx-auto">
          {status === 'qr' && session?.qr ? (
            <img src={session.qr} alt="WhatsApp QR code" className="w-[264px] h-[264px]" />
          ) : waiting ? (
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          ) : (
            <QrCode className="w-16 h-16 text-gray-300" />
          )}
        </div>
      </div>
    </div>
  );
}
