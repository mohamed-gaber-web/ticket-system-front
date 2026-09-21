import { useEffect, useState } from 'react';
import { Copy, ExternalLink, MessageCircle, AlertTriangle, Loader2, Check, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import * as salesAssistantApi from '@/api/salesAssistantApi';
import { apiErrorMessage } from '@/lib/salesAssistant';
import type { CommunicationMeta, PreparedMessage } from '@/types/salesAssistant.types';

interface WhatsAppPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
  prepared: PreparedMessage | null;
  meta: CommunicationMeta;
  /** Called after the message was logged (copied or opened). */
  onLogged?: () => void;
}

/**
 * WhatsApp has no provider integration, so the flow is: review the generated
 * message → Copy or Open WhatsApp (wa.me deep link, which WhatsApp Web /
 * desktop / mobile all handle). Either action records the message on the lead.
 */
export function WhatsAppPreviewDialog({ open, onClose, leadId, prepared, meta, onLogged }: WhatsAppPreviewDialogProps) {
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState<'copy' | 'open' | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !prepared) return;
    setMessage(prepared.body);
    setPhone(prepared.to);
    setBusy(null);
    setCopied(false);
  }, [open, prepared]);

  const canSend = Boolean(prepared?.canSend) && phone.trim().length > 0 && message.trim().length > 0;

  // Log first so the history is right even if the agent closes WhatsApp; the
  // server also returns the canonical wa.me link built from the cleaned number.
  const log = async () => {
    const r = await salesAssistantApi.prepareWhatsApp(leadId, message.trim(), meta, phone.trim());
    onLogged?.();
    return r.data;
  };

  const handleCopy = async () => {
    if (!canSend) return;
    setBusy('copy');
    try {
      await navigator.clipboard.writeText(message.trim());
      setCopied(true);
      await log();
      toast.success('Message copied — paste it in WhatsApp');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not copy the message'));
    } finally {
      setBusy(null);
    }
  };

  const handleOpen = async () => {
    if (!canSend) return;
    setBusy('open');
    // Open the tab synchronously (popup blockers), then point it at wa.me.
    const win = window.open('', '_blank', 'noopener');
    try {
      const data = await log();
      if (win) win.location.href = data.whatsappUrl;
      else window.open(data.whatsappUrl, '_blank', 'noopener');
      toast.success('Opening WhatsApp…');
      onClose();
    } catch (err) {
      win?.close();
      toast.error(apiErrorMessage(err, 'Could not open WhatsApp'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-primary" /> WhatsApp message</DialogTitle>
          <DialogDescription>
            {prepared?.template?.name ? `Template: ${prepared.template.name}` : 'Review the message before sending.'}
            {prepared?.product && ` · ${prepared.product.name}`}
          </DialogDescription>
        </DialogHeader>

        {prepared && (
          <div className="space-y-3">
            <div>
              <label htmlFor="wa-phone" className="form-label">To (phone)</label>
              <Input
                id="wa-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="No phone number on this lead"
                className="font-mono"
              />
            </div>

            {prepared.document && (
              <p className="text-xs text-on-surface-variant inline-flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Includes a download link for <span className="font-medium text-on-surface">{prepared.document.name}</span>
              </p>
            )}

            <div>
              <label htmlFor="wa-message" className="form-label">Message</label>
              <Textarea
                id="wa-message"
                rows={12}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="text-sm leading-relaxed whitespace-pre-wrap"
              />
            </div>

            {prepared.warnings.length > 0 && (
              <ul className="space-y-1">
                {prepared.warnings.map((w) => (
                  <li key={w} className="text-xs text-accent-orange-700 inline-flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {w}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline" onClick={handleCopy} disabled={!canSend || busy !== null} className="gap-2">
            {busy === 'copy' ? <Loader2 className="w-4 h-4 animate-spin" /> : copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            Copy Message
          </Button>
          <Button onClick={handleOpen} disabled={!canSend || busy !== null} className="gap-2">
            {busy === 'open' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            Open WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
