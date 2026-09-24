import type jsPDF from 'jspdf';
import type { CellHookData } from 'jspdf-autotable';
import { anyArabic, hasArabic, shapeArabic } from '@/utils/arabicText';
import { pdfSafeLatin, registerArabicFont, replaceUnsupportedSymbols } from '@/utils/pdfFont';

/**
 * Everything a jsPDF export needs to print Arabic next to Latin text.
 *
 * jsPDF's built-in fonts hold no Arabic glyphs and it applies no shaping or
 * bidi, so a report that contains Arabic gets the embedded Amiri font and every
 * string goes through `forPdf` (Arabic → shaped for Amiri; Latin → limited to
 * what the built-in WinAnsi fonts can encode). Latin cells keep Helvetica, so
 * an English-only export looks exactly as before and never downloads the font.
 */
export interface PdfText {
  /** Font name to use for Arabic, or null (no Arabic, or the font failed to load). */
  arabicFont: string | null;
  /** The report has Arabic but the font could not be loaded — warn the user. */
  fontMissing: boolean;
  /** Prepare one value for printing. */
  forPdf: (value: unknown) => string;
  /** Prepare every cell of a head/body. */
  rows: (rows: unknown[][]) => string[][];
  /** doc.text() with the right font for the string. */
  write: (text: unknown, x: number, y: number) => void;
  /** autoTable `didParseCell` hook: Arabic cells get the Arabic font, right-aligned. */
  styleArabicCells: (data: CellHookData) => void;
}

/**
 * @param content every string the report will print (nested arrays are fine) —
 *                used only to decide whether the Arabic font is needed.
 */
export const preparePdfText = async (doc: jsPDF, content: unknown): Promise<PdfText> => {
  const needsArabic = anyArabic(content);
  const arabicFont = needsArabic ? await registerArabicFont(doc) : null;

  const forPdf = (value: unknown) => {
    const text = replaceUnsupportedSymbols(String(value ?? ''));
    return hasArabic(text) ? shapeArabic(text) : pdfSafeLatin(text);
  };

  return {
    arabicFont,
    fontMissing: needsArabic && !arabicFont,
    forPdf,
    rows: (rows) => rows.map((row) => row.map(forPdf)),
    write: (text, x, y) => {
      const out = forPdf(text);
      doc.setFont(arabicFont && hasArabic(out) ? arabicFont : 'helvetica', 'normal');
      doc.text(out, x, y);
    },
    styleArabicCells: (data) => {
      if (!arabicFont) return;
      if (data.cell.text.some((line) => hasArabic(line))) {
        data.cell.styles.font = arabicFont;
        data.cell.styles.halign = 'right';
      }
    },
  };
};
