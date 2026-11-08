import { useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import type { WhatsAppMessage, WhatsAppMessageStatus, WhatsAppSession } from '@/types/whatsapp.types';

interface WhatsAppSocketHandlers {
  onStatus?: (session: WhatsAppSession) => void;
  onMessage?: (message: WhatsAppMessage) => void;
  onAck?: (ack: { _id: string; phone: string; status: WhatsAppMessageStatus }) => void;
}

/**
 * Live WhatsApp events for the signed-in employee (QR codes, new messages,
 * delivery ticks). The socket is opened by useNotificationSocket in the layout,
 * whose effect runs after the page's, so wait for it to exist before listening.
 */
export function useWhatsAppSocket(handlers: WhatsAppSocketHandlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const onStatus = (s: WhatsAppSession) => ref.current.onStatus?.(s);
    const onMessage = (m: WhatsAppMessage) => ref.current.onMessage?.(m);
    const onAck = (a: { _id: string; phone: string; status: WhatsAppMessageStatus }) => ref.current.onAck?.(a);

    let socket = getSocket();
    let timer: ReturnType<typeof setInterval> | undefined;
    const attach = () => {
      socket?.on('whatsapp:status', onStatus);
      socket?.on('whatsapp:message', onMessage);
      socket?.on('whatsapp:ack', onAck);
    };
    if (socket) {
      attach();
    } else {
      timer = setInterval(() => {
        socket = getSocket();
        if (socket) {
          clearInterval(timer);
          attach();
        }
      }, 300);
    }

    return () => {
      if (timer) clearInterval(timer);
      socket?.off('whatsapp:status', onStatus);
      socket?.off('whatsapp:message', onMessage);
      socket?.off('whatsapp:ack', onAck);
    };
  }, []);
}
