import { saveAs } from 'file-saver';

/**
 * Save a CSV with a UTF-8 byte-order mark.
 *
 * Excel on Windows opens a .csv in the system ANSI code page unless the file
 * starts with a BOM, which turns every Arabic (or accented) character into
 * mojibake — "متابعة" arrives as "Ù…ØªØ§Ø¨Ø¹Ø©". The BOM costs three bytes and
 * is ignored by every other reader we care about.
 *
 * .xlsx needs no equivalent: the format is UTF-8 throughout and Arabic cell
 * values survive it unchanged.
 */
export const saveCsv = (csv: string, filename: string) => {
  saveAs(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }), filename);
};
