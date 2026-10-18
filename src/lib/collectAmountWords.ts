// Grow Path Collect — amounts in English words for the contract's value
// clause: 4,200,000 → "four million two hundred thousand". Pure; tested in
// collectAmountWords.test.ts.

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES = ['', 'thousand', 'million', 'billion'];

const CURRENCY_NAMES: Record<string, string> = { EGP: 'Egyptian Pounds', SAR: 'Saudi Riyals', USD: 'US Dollars' };

/** 0–999 in words ("one hundred fifteen", "twenty-one"). */
const under1000 = (n: number) => {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${ONES[h]} hundred`);
  if (r) parts.push(r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? `-${ONES[r % 10]}` : ''));
  return parts.join(' ');
};

/** A whole number in English words (up to the billions). */
export const toWords = (value: number): string => {
  let n = Math.round(Math.abs(Number(value) || 0));
  if (!n) return 'zero';
  const groups: string[] = [];
  for (let k = 0; n > 0 && k < SCALES.length; k++) {
    const v = n % 1000;
    if (v) groups.unshift(`${under1000(v)}${SCALES[k] ? ` ${SCALES[k]}` : ''}`);
    n = Math.floor(n / 1000);
  }
  return groups.join(' ');
};

const titleCase = (s: string) => s.replace(/(^|[\s-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());

/** "Four Million Two Hundred Thousand Egyptian Pounds only" */
export const amountInWords = (value: number, currency: string) =>
  `${titleCase(toWords(value))} ${CURRENCY_NAMES[currency] ?? currency} only`;
