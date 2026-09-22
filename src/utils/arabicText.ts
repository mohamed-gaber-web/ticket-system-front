/**
 * Arabic support for PDF export.
 *
 * jsPDF draws glyphs strictly left-to-right and looks each character up in the
 * font's `cmap` by its code point — it applies no OpenType shaping (GSUB) and
 * no bidirectional reordering. Arabic written straight into a PDF therefore
 * comes out as disconnected letters in reverse order, or as mojibake when the
 * built-in Helvetica (WinAnsi) is used and has no Arabic glyphs at all.
 *
 * `shapeArabic` does the two steps the PDF writer skips:
 *   1. contextual shaping — each letter is replaced by its isolated / initial /
 *      medial / final presentation form (Unicode block FE70–FEFF), which any
 *      Arabic font ships as plain code points, plus the lam-alef ligatures;
 *   2. visual reordering — the RTL runs are reversed so that drawing them
 *      left-to-right reproduces right-to-left reading order, while embedded
 *      Latin words, numbers, dates and punctuation keep their own direction.
 *
 * This is deliberately dependency-free (like `countryPhone.ts`): it covers the
 * Arabic script this system actually stores, not the whole Unicode bidi
 * algorithm. It is only for PDF output — HTML, Excel and CSV render Arabic
 * correctly on their own and must never be passed through here.
 */

// ── Letter table ──────────────────────────────────────────────────────────────
// [isolated, final, initial, medial]; 0 means the form does not exist, which is
// also how a right-joining letter (one that never connects to the letter after
// it, such as ا د ر و) is recognised.
const FORMS: Record<number, [number, number, number, number]> = {
  0x0621: [0xfe80, 0, 0, 0], // ء hamza — joins on neither side
  0x0622: [0xfe81, 0xfe82, 0, 0], // آ
  0x0623: [0xfe83, 0xfe84, 0, 0], // أ
  0x0624: [0xfe85, 0xfe86, 0, 0], // ؤ
  0x0625: [0xfe87, 0xfe88, 0, 0], // إ
  0x0626: [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c], // ئ
  0x0627: [0xfe8d, 0xfe8e, 0, 0], // ا
  0x0628: [0xfe8f, 0xfe90, 0xfe91, 0xfe92], // ب
  0x0629: [0xfe93, 0xfe94, 0, 0], // ة
  0x062a: [0xfe95, 0xfe96, 0xfe97, 0xfe98], // ت
  0x062b: [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c], // ث
  0x062c: [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0], // ج
  0x062d: [0xfea1, 0xfea2, 0xfea3, 0xfea4], // ح
  0x062e: [0xfea5, 0xfea6, 0xfea7, 0xfea8], // خ
  0x062f: [0xfea9, 0xfeaa, 0, 0], // د
  0x0630: [0xfeab, 0xfeac, 0, 0], // ذ
  0x0631: [0xfead, 0xfeae, 0, 0], // ر
  0x0632: [0xfeaf, 0xfeb0, 0, 0], // ز
  0x0633: [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4], // س
  0x0634: [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8], // ش
  0x0635: [0xfeb9, 0xfeba, 0xfebb, 0xfebc], // ص
  0x0636: [0xfebd, 0xfebe, 0xfebf, 0xfec0], // ض
  0x0637: [0xfec1, 0xfec2, 0xfec3, 0xfec4], // ط
  0x0638: [0xfec5, 0xfec6, 0xfec7, 0xfec8], // ظ
  0x0639: [0xfec9, 0xfeca, 0xfecb, 0xfecc], // ع
  0x063a: [0xfecd, 0xfece, 0xfecf, 0xfed0], // غ
  0x0641: [0xfed1, 0xfed2, 0xfed3, 0xfed4], // ف
  0x0642: [0xfed5, 0xfed6, 0xfed7, 0xfed8], // ق
  0x0643: [0xfed9, 0xfeda, 0xfedb, 0xfedc], // ك
  0x0644: [0xfedd, 0xfede, 0xfedf, 0xfee0], // ل
  0x0645: [0xfee1, 0xfee2, 0xfee3, 0xfee4], // م
  0x0646: [0xfee5, 0xfee6, 0xfee7, 0xfee8], // ن
  0x0647: [0xfee9, 0xfeea, 0xfeeb, 0xfeec], // ه
  0x0648: [0xfeed, 0xfeee, 0, 0], // و
  0x0649: [0xfeef, 0xfef0, 0, 0], // ى
  0x064a: [0xfef1, 0xfef2, 0xfef3, 0xfef4], // ي
  0x0671: [0xfb50, 0xfb51, 0, 0], // ٱ
  // Persian / Urdu letters that turn up in pasted text.
  0x067e: [0xfb56, 0xfb57, 0xfb58, 0xfb59], // پ
  0x0686: [0xfb7a, 0xfb7b, 0xfb7c, 0xfb7d], // چ
  0x0698: [0xfb8a, 0xfb8b, 0, 0], // ژ
  0x06a9: [0xfb8e, 0xfb8f, 0xfb90, 0xfb91], // ک
  0x06af: [0xfb92, 0xfb93, 0xfb94, 0xfb95], // گ
  0x06cc: [0xfbfc, 0xfbfd, 0xfbfe, 0xfbff], // ی
};

// lam + alef collapse into one glyph: [isolated, final].
const LAM_ALEF: Record<number, [number, number]> = {
  0x0622: [0xfef5, 0xfef6], // لآ
  0x0623: [0xfef7, 0xfef8], // لأ
  0x0625: [0xfef9, 0xfefa], // لإ
  0x0627: [0xfefb, 0xfefc], // لا
};

const LAM = 0x0644;
const TATWEEL = 0x0640; // ـ  joins on both sides and takes no other form

/** Combining marks (harakat, superscript alef…) — invisible to the joining rules. */
const isTransparent = (cp: number) =>
  (cp >= 0x064b && cp <= 0x065f) ||
  (cp >= 0x0610 && cp <= 0x061a) ||
  (cp >= 0x06d6 && cp <= 0x06ed) ||
  cp === 0x0670 ||
  cp === 0x200c ||
  cp === 0x200d;

/** True for any character that belongs to the Arabic script (incl. presentation forms). */
export const isArabicChar = (cp: number) =>
  (cp >= 0x0600 && cp <= 0x06ff) ||
  (cp >= 0x0750 && cp <= 0x077f) ||
  (cp >= 0x08a0 && cp <= 0x08ff) ||
  (cp >= 0xfb50 && cp <= 0xfdff) ||
  (cp >= 0xfe70 && cp <= 0xfeff);

/** Does this text contain Arabic? Used to decide whether a PDF needs an Arabic font. */
export const hasArabic = (value: unknown): boolean => {
  const text = String(value ?? '');
  for (let i = 0; i < text.length; i++) {
    if (isArabicChar(text.charCodeAt(i))) return true;
  }
  return false;
};

/** Any of the values contains Arabic (rows of a report, for instance). */
export const anyArabic = (values: unknown): boolean => {
  if (Array.isArray(values)) return values.some(anyArabic);
  return hasArabic(values);
};

/** A letter connects to the one after it only when it has an initial form. */
const joinsForward = (cp: number) => cp === TATWEEL || (FORMS[cp]?.[2] ?? 0) !== 0;
/** A letter accepts a connection from the one before it when it has a final form. */
const joinsBackward = (cp: number) => cp === TATWEEL || (FORMS[cp]?.[1] ?? 0) !== 0;

// ── Shaping ───────────────────────────────────────────────────────────────────

/** Replace Arabic letters with their contextual presentation forms (no reordering). */
const toPresentationForms = (text: string): string => {
  const out: number[] = [];
  const cps = [...text].map((c) => c.codePointAt(0)!);

  const prevJoining = (i: number) => {
    for (let j = i - 1; j >= 0; j--) {
      if (!isTransparent(cps[j])) return joinsForward(cps[j]);
    }
    return false;
  };
  const nextIndex = (i: number) => {
    for (let j = i + 1; j < cps.length; j++) {
      if (!isTransparent(cps[j])) return j;
    }
    return -1;
  };

  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i];
    const forms = FORMS[cp];
    if (!forms) {
      out.push(cp);
      continue;
    }

    const after = nextIndex(i);
    const nextCp = after === -1 ? -1 : cps[after];

    // لا and friends become a single ligature glyph.
    if (cp === LAM && nextCp !== -1 && LAM_ALEF[nextCp]) {
      const [isolated, final] = LAM_ALEF[nextCp];
      out.push(prevJoining(i) ? final : isolated);
      // Skip the alef (and any marks between the two letters).
      for (let j = i + 1; j <= after; j++) {
        if (isTransparent(cps[j])) out.push(cps[j]);
      }
      i = after;
      continue;
    }

    const linkBefore = prevJoining(i);
    const linkAfter = joinsForward(cp) && nextCp !== -1 && joinsBackward(nextCp);
    const [isolated, final, initial, medial] = forms;
    if (linkBefore && linkAfter) out.push(medial || final || isolated);
    else if (linkBefore) out.push(final || isolated);
    else if (linkAfter) out.push(initial || isolated);
    else out.push(isolated);
  }

  return String.fromCodePoint(...out);
};

// Characters that flip when an RTL run is mirrored for display. Angle brackets
// are deliberately left out: in this app "<" and ">" are not brackets but the
// subtask indent marker, and mirroring it turns an indent into an arrow that
// points the wrong way.
const MIRRORED: Record<string, string> = {
  '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '«': '»', '»': '«',
};

const isNeutral = (ch: string) => /[\s\p{P}\p{S}]/u.test(ch);
const isLtrStrong = (ch: string) => /[A-Za-zÀ-ɏ]/.test(ch);
const isDigit = (ch: string) => /[0-9]/.test(ch);

/**
 * Reorder a shaped string for a left-to-right drawing engine.
 *
 * The RTL text is reversed, while runs of Latin letters, digits and the
 * punctuation glued to them (dates, "W12 – W14", emails, %) stay readable.
 */
const toVisualOrder = (text: string): string => {
  const chars = [...text];
  // The paragraph takes the direction of its first strongly-typed character;
  // everything neutral before that one follows it.
  const firstStrong = chars.find((ch) => isArabicChar(ch.codePointAt(0)!) || isLtrStrong(ch));
  const rtlParagraph = Boolean(firstStrong && isArabicChar(firstStrong.codePointAt(0)!));

  type Run = { rtl: boolean; chars: string[] };
  const runs: Run[] = [];

  for (const ch of chars) {
    const strongRtl = isArabicChar(ch.codePointAt(0)!);
    const strongLtr = isLtrStrong(ch);
    const last = runs[runs.length - 1];
    if (!strongRtl && !strongLtr) {
      // Digits, spaces and punctuation have no direction of their own: they
      // continue the surrounding run, so "(المرحلة 2)" stays one RTL phrase
      // instead of flinging the number to the other end of the line.
      if (last) last.chars.push(ch);
      else runs.push({ rtl: rtlParagraph, chars: [ch] });
      continue;
    }
    if (last && last.rtl === strongRtl) last.chars.push(ch);
    else runs.push({ rtl: strongRtl, chars: [ch] });
  }

  for (const run of runs) {
    if (!run.rtl) continue;
    run.chars.reverse();
    for (let i = 0; i < run.chars.length; i++) {
      const mirrored = MIRRORED[run.chars[i]];
      if (mirrored) run.chars[i] = mirrored;
    }
    // A Latin/number sequence inside an RTL run was reversed with it; undo that
    // so "Task 12" reads forwards while the Arabic around it reads backwards.
    let start = -1;
    const flush = (end: number) => {
      if (start === -1) return;
      // Neutrals that merely trail the sequence are not part of it.
      let stop = end;
      while (stop > start && isNeutral(run.chars[stop - 1]) && !isDigit(run.chars[stop - 1])) stop -= 1;
      if (stop - start > 1) {
        const slice = run.chars.slice(start, stop).reverse();
        run.chars.splice(start, stop - start, ...slice);
      }
      start = -1;
    };
    for (let i = 0; i < run.chars.length; i++) {
      const ch = run.chars[i];
      if (isLtrStrong(ch) || isDigit(ch) || (start !== -1 && isNeutral(ch))) {
        if (start === -1) start = i;
      } else {
        flush(i);
      }
    }
    flush(run.chars.length);
  }

  // Right-to-left paragraph: the runs themselves also come out in reverse.
  if (rtlParagraph) runs.reverse();

  return runs.map((r) => r.chars.join('')).join('');
};

/**
 * Make a string printable by jsPDF: contextual forms, then visual order.
 * Text without Arabic is returned untouched, so it is safe to map over every
 * cell of a report.
 */
export const shapeArabic = (value: unknown): string => {
  const text = String(value ?? '');
  if (!hasArabic(text)) return text;
  return text
    .split('\n')
    .map((line) => toVisualOrder(toPresentationForms(line)))
    .join('\n');
};

/** Shape every cell of a table body / head row. */
export const shapeRows = <T>(rows: T[][]): string[][] =>
  rows.map((row) => row.map((cell) => shapeArabic(cell)));
