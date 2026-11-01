/**
 * The conversation key of an email subject: no reply/forward prefixes ("Re:",
 * "Fwd:", "AW:", "رد:" …, repeated), no record tag ("[MIN-2026-00202]",
 * "[TASK-2026-00012]"), spaces collapsed, lower-cased. Messages of one record
 * that share it are one conversation. Mirrors the backend's
 * src/utils/emailSubject.js — change both.
 */
const PREFIX = /^\s*(?:re|fw|fwd|aw|wg|sv|vs|tr|رد|اعادة توجيه|إعادة توجيه)\s*(?:\[\d+\]|\(\d+\))?\s*[:：]\s*/i;
const RECORD_TAG = /^\s*\[(?:[A-Z]{3}-(?:\d{4}-\d{5}|SUB-\d{4})|TASK-\d{4}-\d{5})\]\s*/i;

const stripPrefixes = (subject: string | null | undefined) => {
  let s = String(subject ?? '');
  let prev: string;
  do {
    prev = s;
    s = s.replace(PREFIX, '').replace(RECORD_TAG, '');
  } while (s !== prev);
  return s.replace(/\s+/g, ' ').trim();
};

export const subjectKey = (subject: string | null | undefined) => stripPrefixes(subject).toLowerCase() || '(no subject)';

/** The subject as people read it: "Quote for licenses" (no Re:, no tag). */
export const displaySubject = (subject: string | null | undefined) => stripPrefixes(subject) || '(no subject)';
