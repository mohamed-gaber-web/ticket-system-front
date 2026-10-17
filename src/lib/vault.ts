import { toast } from 'sonner';
import type { VaultAttachment, VaultDueKind, VaultEntry, VaultRef } from '@/types/vault.types';

// Small pure helpers shared by the Credentials Vault screens.

export const STALE_DAYS = 90;
export const VERY_STALE_DAYS = 180;
export const DUE_SOON_DAYS = 30;
/** A revealed password is hidden again after this long. */
export const REVEAL_MS = 30_000;

export type ChipTone = 'neutral' | 'accent' | 'ok' | 'warn' | 'bad';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isEmail = (v: string) => EMAIL_RE.test(v.trim());

export const isHttpUrl = (v?: string | null) => !!v && /^https?:\/\//i.test(v.trim());

export const apiError = (e: unknown, fallback: string): string =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/** Server `missing` keys on a 400, when present. */
export const apiMissing = (e: unknown): string[] => {
  const m = (e as { response?: { data?: { missing?: unknown } } })?.response?.data?.missing;
  return Array.isArray(m) ? m.filter((x): x is string => typeof x === 'string') : [];
};

export const refName = (r: VaultRef | string | null | undefined): string =>
  !r ? '' : typeof r === 'string' ? r : r.name;

/** Card subtitle: "Client · project" or "Grow Path · department". */
export const entrySubtitle = (e: VaultEntry) =>
  e.ownerType === 'client'
    ? [e.client?.name ?? e.ownerLabel, e.project].filter(Boolean).join(' · ')
    : ['Grow Path', e.department?.name].filter(Boolean).join(' · ');

export const fmtDate =(d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (d?: string | null) =>
  d
    ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

/** ISO date → yyyy-mm-dd for <input type="date">. */
export const toDateInput = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export const passwordAgeTone = (days: number): ChipTone =>
  days > VERY_STALE_DAYS ? 'bad' : days > STALE_DAYS ? 'warn' : 'ok';

/** Chip for an access-validity / renewal date, or null when it is not close. */
export const dueChip = (kind: VaultDueKind | null, dueInDays: number | null): { tone: ChipTone; text: string } | null => {
  if (!kind || dueInDays === null || dueInDays === undefined) return null;
  const what = kind === 'renewal' ? 'Renewal' : 'Access';
  if (dueInDays < 0) {
    const n = Math.abs(dueInDays);
    return { tone: 'bad', text: kind === 'renewal' ? `Renewal overdue by ${n} day${n === 1 ? '' : 's'}` : `Access expired ${n} day${n === 1 ? '' : 's'} ago` };
  }
  if (dueInDays <= DUE_SOON_DAYS) {
    return { tone: 'warn', text: dueInDays === 0 ? `${what} ends today` : `${what} ends in ${dueInDays} day${dueInDays === 1 ? '' : 's'}` };
  }
  return null;
};

// ── Attachments ─────────────────────────────────────────────────────────────
// Mirrors the backend's upload rules (the server re-checks everything).

export const ATTACHMENT_MAX_FILES = 10;
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_BLOCKED_EXT = ['exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'ps1', 'vbs', 'js', 'jar'];

export const ATTACHMENTS_HELP =
  'Files kept with this account (e.g. RDP or VPN file, certificate). Stored encrypted; only people with vault access can download them. Max 10 files, 10 MB each.';

/** One row of the form's attachment list: a stored file, an upload in flight, or a failed one. */
export interface AttachmentDraft {
  key: string;
  /** Set once the upload finished (or for a file already on the entry). */
  fileId?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt?: string;
  uploadedBy?: VaultRef | null;
  /** 0–100 while uploading. */
  progress?: number;
  error?: string;
}

export const draftsFrom = (list: VaultAttachment[]): AttachmentDraft[] =>
  list.map((a) => ({
    key: a.fileId,
    fileId: a.fileId,
    fileName: a.fileName,
    fileType: a.fileType,
    fileSize: a.fileSize,
    uploadedAt: a.uploadedAt,
    uploadedBy: a.uploadedBy,
  }));

export const isUploading = (d: AttachmentDraft) => !d.fileId && !d.error;

/** Why a file can't be uploaded, or null when it is fine. */
export const attachmentProblem = (file: File): string | null => {
  const ext = /\.([^.]+)$/.exec(file.name)?.[1]?.toLowerCase() ?? '';
  if (ATTACHMENT_BLOCKED_EXT.includes(ext)) return `${file.name}: program and script files (.${ext}) can't be attached.`;
  if (file.size > ATTACHMENT_MAX_BYTES) return `${file.name} is larger than 10 MB.`;
  if (file.size === 0) return `${file.name} is empty.`;
  return null;
};

/** Error message of a request made with responseType 'blob' (the JSON body arrives as a Blob). */
export const blobApiError = async (e: unknown, fallback: string): Promise<string> => {
  const data = (e as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed: unknown = JSON.parse(await data.text());
      const message = (parsed as { message?: unknown })?.message;
      if (typeof message === 'string' && message) return message;
    } catch {
      /* not JSON */
    }
    return fallback;
  }
  return apiError(e, fallback);
};

/** Hands a downloaded Blob to the browser as a file save. */
export const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

// ── Password generator ──────────────────────────────────────────────────────

const LOWER = 'abcdefghijkmnopqrstuvwxyz'; // no l
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I, O
const DIGITS = '23456789'; // no 0, 1
const SYMBOLS = '!@#$%&*';
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

const randomIndex = (n: number) => {
  // Rejection sampling keeps the distribution uniform.
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / n) * n;
  let x = 0;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % n;
};

/** 16 characters, no ambiguous 0 O I l 1, at least one of each class. */
export const generatePassword = (length = 16): string => {
  const chars = [LOWER, UPPER, DIGITS, SYMBOLS].map((set) => set[randomIndex(set.length)]);
  while (chars.length < length) chars.push(ALL[randomIndex(ALL.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};

// ── Clipboard ───────────────────────────────────────────────────────────────

/** Copies text; when the browser refuses, says so instead of failing silently. */
export const copyText = async (text: string, what = 'Copied'): Promise<boolean> => {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('no clipboard');
    await navigator.clipboard.writeText(text);
    toast.success(what);
    return true;
  } catch {
    toast.error("Copying isn't available here — select the text and copy it manually.");
    return false;
  }
};
