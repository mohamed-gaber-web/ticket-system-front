// Grow Path Collect — amounts in Arabic words (tafqeet) for the contract's
// value clause: 4,200,000 → «أربعة ملايين ومائتا ألف». Pure; tested in
// collectTafqeet.test.ts.

const A1 = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const A10 = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const A100 = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
// [one, two, plural (3–10), accusative (11–99)]
const SCALES: [string, string, string, string][] = [
  ['', '', '', ''],
  ['ألف', 'ألفان', 'آلاف', 'ألفًا'],
  ['مليون', 'مليونان', 'ملايين', 'مليونًا'],
  ['مليار', 'ملياران', 'مليارات', 'مليارًا'],
];

const CURRENCY_NAMES: Record<string, string> = { EGP: 'جنيه مصري', SAR: 'ريال سعودي', USD: 'دولار أمريكي' };

/** 0–999 in words. */
const under1000 = (n: number) => {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(A100[h]);
  if (r) parts.push(r < 20 ? A1[r] : (r % 10 ? `${A1[r % 10]} و` : '') + A10[Math.floor(r / 10)]);
  return parts.join(' و');
};

/** A whole number in Arabic words (up to the billions). */
export const toArabicWords = (value: number): string => {
  let n = Math.round(Math.abs(Number(value) || 0));
  if (!n) return 'صفر';
  const groups: [number, number][] = [];
  for (let k = 0; n > 0 && k < 4; k++) {
    groups.push([n % 1000, k]);
    n = Math.floor(n / 1000);
  }
  return groups
    .reverse()
    .filter(([v]) => v)
    .map(([v, k]) => {
      if (!k) return under1000(v);
      const [one, two, plural, acc] = SCALES[k];
      const r = v % 100;
      if (v === 1) return one;
      if (v === 2) return two;
      if (r === 0) {
        const h = v / 100;
        return `${h === 2 ? 'مائتا' : A100[h]} ${one}`;
      }
      const pre = under1000(v);
      if (r >= 3 && r <= 10) return `${pre} ${plural}`;
      if (r <= 2) return `${pre} ${one}`;
      return `${pre} ${acc}`;
    })
    .join(' و');
};

/** «فقط أربعة ملايين ومائتا ألف جنيه مصري لا غير» */
export const tafqeet = (value: number, currency: string) =>
  `فقط ${toArabicWords(value)} ${CURRENCY_NAMES[currency] ?? currency} لا غير`;
