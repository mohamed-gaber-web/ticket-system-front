import type jsPDF from 'jspdf';

/**
 * Arabic font for PDF export.
 *
 * jsPDF's built-in fonts (Helvetica & co.) are WinAnsi-encoded and hold no
 * Arabic glyphs, so Arabic has to be drawn with an embedded TrueType font.
 * Amiri is served from `public/fonts/` and fetched only when a report actually
 * contains Arabic — an English-only export never downloads the ~420KB file.
 * The bytes are cached for the lifetime of the tab, so exporting twice costs
 * one request.
 */

export const ARABIC_FONT = 'Amiri';
const FONT_URL = '/fonts/Amiri-Regular.ttf';
const FONT_FILE = 'Amiri-Regular.ttf';

let fontPromise: Promise<string> | null = null;

/** Base64 without blowing the call stack on a 400KB buffer. */
const toBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
};

const loadFontData = (): Promise<string> => {
  if (!fontPromise) {
    fontPromise = fetch(FONT_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Font request failed: ${res.status}`);
        return res.arrayBuffer();
      })
      .then(toBase64)
      .catch((error) => {
        // Let the next export try again rather than caching the failure.
        fontPromise = null;
        throw error;
      });
  }
  return fontPromise;
};

/**
 * Register the Arabic font on a jsPDF document.
 *
 * @returns the font name to use for Arabic text, or null when the font could
 *          not be loaded — the caller should then export without it rather
 *          than fail outright (the Latin columns are still useful).
 */
// The characters above Latin-1 that jsPDF's built-in fonts can still encode
// (the WinAnsi extras): dashes, curly quotes, the bullet, the ellipsis…
const WIN_ANSI_EXTRAS = new Set(
  ['€', '‚', 'ƒ', '„', '…', '†', '‡', 'ˆ', '‰', 'Š',
   '‹', 'Œ', 'Ž', '‘', '’', '“', '”', '•', '–', '—',
   '˜', '™', 'š', '›', 'œ', 'ž', 'Ÿ']
);

// Anything else has no glyph and — worse — knocks the whole string out of
// alignment, which is how "Task / ↳ Subtask" printed as "T a s k / !ᵇ ...".
const LATIN_FALLBACK: Record<string, string> = {
  '↳': '>', '→': '->', '←': '<-', '⇒': '=>', '✓': 'v', '✗': 'x', '№': 'No.',
};

/**
 * Swap the decorative symbols this app uses for plain equivalents.
 *
 * Safe for any script, and needed for both: neither the built-in fonts nor the
 * embedded Arabic one has a glyph for "↳", so the subtask marker would garble
 * a Latin row and silently vanish from an Arabic one.
 */
export const replaceUnsupportedSymbols = (text: string): string =>
  text.replace(/[↳→←⇒✓✗№]/gu, (ch) => LATIN_FALLBACK[ch] ?? ch);

/**
 * Make a Latin string safe for jsPDF's built-in (WinAnsi) fonts.
 *
 * Only for text drawn in Helvetica & co.; Arabic goes through the embedded
 * TrueType font, which handles Unicode directly and takes
 * `replaceUnsupportedSymbols` on its own.
 */
export const pdfSafeLatin = (text: string): string =>
  replaceUnsupportedSymbols(text).replace(/[Ā-\u{10FFFF}]/gu, (ch) => (WIN_ANSI_EXTRAS.has(ch) ? ch : '?'));

export const registerArabicFont = async (doc: jsPDF): Promise<string | null> => {
  try {
    const base64 = await loadFontData();
    doc.addFileToVFS(FONT_FILE, base64);
    doc.addFont(FONT_FILE, ARABIC_FONT, 'normal');
    // Bold cells (e.g. main-task names) must resolve too: without a 'bold'
    // entry jsPDF silently falls back to Helvetica, which has no Arabic glyphs,
    // and the cell prints as garbage. Amiri Regular stands in for bold rather
    // than shipping a second ~420KB font.
    doc.addFont(FONT_FILE, ARABIC_FONT, 'bold');
    return ARABIC_FONT;
  } catch (error) {
    console.error('Arabic PDF font could not be loaded:', error);
    return null;
  }
};
