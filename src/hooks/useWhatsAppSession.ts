import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import * as whatsappApi from '@/api/whatsappApi';
import { apiErrorMessage } from '@/lib/emailInbox';
import { useWhatsAppSocket } from '@/hooks/useWhatsAppSocket';
import type { WhatsAppSession } from '@/types/whatsapp.types';

/** The signed-in employee's linked WhatsApp number, kept live over the socket. */
export function useWhatsAppSession() {
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await whatsappApi.getWhatsAppSession();
      setSession(r.data);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load your WhatsApp status'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // The socket pushes QR codes live; polling while linking covers a socket
  // that isn't connected (or connected to a different backend).
  const linking = session?.status === 'connecting' || session?.status === 'qr';
  useEffect(() => {
    if (!linking) return;
    const t = setInterval(() => {
      whatsappApi
        .getWhatsAppSession()
        .then((r) => {
          setSession(r.data);
          if (r.data.status === 'disconnected' && r.data.error) toast.error(r.data.error);
        })
        .catch(() => undefined);
    }, 2000);
    return () => clearInterval(t);
  }, [linking]);

  useWhatsAppSocket({
    onStatus: (s) => {
      setSession(s);
      if (s.error) toast.error(s.error);
      if (s.status === 'connected') setBusy(false);
    },
  });

  const connect = async () => {
    setBusy(true);
    try {
      const r = await whatsappApi.connectWhatsApp();
      setSession((prev) => (prev?.status === 'qr' && r.data.status === 'connecting' ? prev : r.data));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not start WhatsApp'));
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    try {
      await whatsappApi.logoutWhatsApp();
      setSession({ status: 'disconnected', qr: null, phone: null, name: null });
      toast.success('WhatsApp disconnected');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not disconnect WhatsApp'));
    } finally {
      setBusy(false);
    }
  };

  return { session, loading, busy, connect, logout, refresh };
}
