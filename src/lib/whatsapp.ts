import type { WhatsAppChat } from '@/types/whatsapp.types';

// Same dial codes the API uses (src/utils/whatsapp.js) for national numbers.
const DIAL_CODES: Record<string, string> = {
  egypt: '20',
  'saudi arabia': '966',
  ksa: '966',
  saudi: '966',
  'united arab emirates': '971',
  uae: '971',
  kuwait: '965',
  qatar: '974',
  bahrain: '973',
  oman: '968',
  jordan: '962',
  lebanon: '961',
  iraq: '964',
};

/** Digits-only international number ("0100…" + Egypt → "20100…"), or "" when there is none. */
export const toWhatsAppNumber = (phone?: string | null, country?: string | null): string => {
  const raw = String(phone ?? '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (raw.startsWith('+')) return digits;
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return `${DIAL_CODES[String(country ?? 'egypt').trim().toLowerCase()] ?? '20'}${digits.slice(1)}`;
  return digits;
};

export const isValidWhatsAppNumber = (n: string) => /^\d{8,15}$/.test(n);

/** Best name for a chat row: linked lead / customer, then the WhatsApp name, then the number. */
export const chatTitle = (chat: Pick<WhatsAppChat, 'phone' | 'pushName' | 'lead' | 'customer'>) =>
  chat.lead?.contactPersonName ||
  chat.lead?.companyName ||
  chat.customer?.contactPerson ||
  chat.customer?.companyName ||
  chat.pushName ||
  `+${chat.phone}`;
