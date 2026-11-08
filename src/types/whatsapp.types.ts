// WhatsApp — each employee links their own number (QR) and chats by mobile number.

export type WhatsAppSessionStatus = 'disconnected' | 'connecting' | 'qr' | 'connected';

export interface WhatsAppSession {
  status: WhatsAppSessionStatus;
  /** data: URL of the QR image, while status is 'qr'. */
  qr: string | null;
  /** The linked number (digits only) and its WhatsApp name. */
  phone: string | null;
  name: string | null;
  error?: string | null;
}

export type WhatsAppMessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';
export type WhatsAppMediaKind = 'image' | 'video' | 'audio' | 'document' | 'sticker';

export interface WhatsAppMessage {
  _id: string;
  employee: string;
  phone: string;
  direction: 'inbound' | 'outbound';
  body: string;
  media?: {
    fileId: string | null;
    fileName: string | null;
    mimeType: string | null;
    kind: WhatsAppMediaKind | null;
  };
  status: WhatsAppMessageStatus;
  error?: string | null;
  pushName?: string | null;
  fromSystem: boolean;
  sentAt: string;
  lead?: string | { _id: string; companyName?: string; contactPersonName?: string; customerId?: string } | null;
  customer?: string | { _id: string; companyName?: string; contactPerson?: string } | null;
  ticket?: string | { _id: string; ticketNumber?: string; subject?: string } | null;
}

export interface WhatsAppChat {
  phone: string;
  unread: number;
  pushName: string | null;
  lead?: { _id: string; companyName?: string; contactPersonName?: string; customerId?: string } | null;
  customer?: { _id: string; companyName?: string; contactPerson?: string } | null;
  last: {
    _id: string;
    body: string;
    direction: 'inbound' | 'outbound';
    status: WhatsAppMessageStatus;
    sentAt: string;
    mediaKind: WhatsAppMediaKind | null;
  };
}

export interface SendWhatsAppData {
  phone: string;
  /** Used to add the dial code to a national number ("0100…"). */
  country?: string;
  text?: string;
  attachment?: { fileId: string; fileName?: string } | null;
  leadId?: string;
  ticketId?: string;
}
