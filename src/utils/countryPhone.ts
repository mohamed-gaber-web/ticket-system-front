import { isValidPhone } from '@/types/teleSales.types';

// Per-country phone rules, keyed by Country lookup name (as stored on a lead /
// managed in the Country setup). `dial` is the international calling code (no +);
// `min`/`max` are the accepted national-number digit lengths (country code and
// trunk "0" excluded). Includes common aliases (KSA, UAE, USA, UK…), matched
// case/space-insensitively. Countries not listed fall back to a lenient
// international check, so nothing is blocked outright.
//
// Dependency-free on purpose: the project's toolchain can't reliably `npm install`
// native deps in this environment, so we ship a compact table instead of pulling
// in libphonenumber-js.
interface CountryPhoneInfo {
  iso: string;
  dial: string;
  min: number;
  max: number;
}

const COUNTRY_PHONE: Record<string, CountryPhoneInfo> = {
  // MENA / Gulf
  egypt: { iso: 'EG', dial: '20', min: 8, max: 10 },
  'saudi arabia': { iso: 'SA', dial: '966', min: 8, max: 9 },
  saudi: { iso: 'SA', dial: '966', min: 8, max: 9 },
  ksa: { iso: 'SA', dial: '966', min: 8, max: 9 },
  'kingdom of saudi arabia': { iso: 'SA', dial: '966', min: 8, max: 9 },
  'united arab emirates': { iso: 'AE', dial: '971', min: 8, max: 9 },
  uae: { iso: 'AE', dial: '971', min: 8, max: 9 },
  emirates: { iso: 'AE', dial: '971', min: 8, max: 9 },
  kuwait: { iso: 'KW', dial: '965', min: 8, max: 8 },
  qatar: { iso: 'QA', dial: '974', min: 8, max: 8 },
  bahrain: { iso: 'BH', dial: '973', min: 8, max: 8 },
  oman: { iso: 'OM', dial: '968', min: 8, max: 8 },
  jordan: { iso: 'JO', dial: '962', min: 8, max: 9 },
  lebanon: { iso: 'LB', dial: '961', min: 7, max: 8 },
  iraq: { iso: 'IQ', dial: '964', min: 9, max: 10 },
  syria: { iso: 'SY', dial: '963', min: 8, max: 10 },
  yemen: { iso: 'YE', dial: '967', min: 7, max: 9 },
  palestine: { iso: 'PS', dial: '970', min: 8, max: 9 },
  libya: { iso: 'LY', dial: '218', min: 9, max: 10 },
  sudan: { iso: 'SD', dial: '249', min: 9, max: 9 },
  morocco: { iso: 'MA', dial: '212', min: 9, max: 9 },
  tunisia: { iso: 'TN', dial: '216', min: 8, max: 8 },
  algeria: { iso: 'DZ', dial: '213', min: 8, max: 9 },
  // Rest of world (common)
  'united states': { iso: 'US', dial: '1', min: 10, max: 10 },
  'united states of america': { iso: 'US', dial: '1', min: 10, max: 10 },
  usa: { iso: 'US', dial: '1', min: 10, max: 10 },
  us: { iso: 'US', dial: '1', min: 10, max: 10 },
  america: { iso: 'US', dial: '1', min: 10, max: 10 },
  canada: { iso: 'CA', dial: '1', min: 10, max: 10 },
  'united kingdom': { iso: 'GB', dial: '44', min: 9, max: 10 },
  uk: { iso: 'GB', dial: '44', min: 9, max: 10 },
  britain: { iso: 'GB', dial: '44', min: 9, max: 10 },
  england: { iso: 'GB', dial: '44', min: 9, max: 10 },
  germany: { iso: 'DE', dial: '49', min: 6, max: 11 },
  france: { iso: 'FR', dial: '33', min: 9, max: 9 },
  italy: { iso: 'IT', dial: '39', min: 6, max: 11 },
  spain: { iso: 'ES', dial: '34', min: 9, max: 9 },
  netherlands: { iso: 'NL', dial: '31', min: 9, max: 9 },
  turkey: { iso: 'TR', dial: '90', min: 10, max: 10 },
  turkiye: { iso: 'TR', dial: '90', min: 10, max: 10 },
  'türkiye': { iso: 'TR', dial: '90', min: 10, max: 10 },
  india: { iso: 'IN', dial: '91', min: 10, max: 10 },
  pakistan: { iso: 'PK', dial: '92', min: 10, max: 10 },
  bangladesh: { iso: 'BD', dial: '880', min: 10, max: 10 },
  china: { iso: 'CN', dial: '86', min: 10, max: 11 },
  japan: { iso: 'JP', dial: '81', min: 9, max: 10 },
  'south korea': { iso: 'KR', dial: '82', min: 9, max: 10 },
  indonesia: { iso: 'ID', dial: '62', min: 9, max: 11 },
  malaysia: { iso: 'MY', dial: '60', min: 9, max: 10 },
  singapore: { iso: 'SG', dial: '65', min: 8, max: 8 },
  philippines: { iso: 'PH', dial: '63', min: 10, max: 10 },
  australia: { iso: 'AU', dial: '61', min: 9, max: 9 },
  'south africa': { iso: 'ZA', dial: '27', min: 9, max: 9 },
  nigeria: { iso: 'NG', dial: '234', min: 10, max: 10 },
  kenya: { iso: 'KE', dial: '254', min: 9, max: 9 },
  ethiopia: { iso: 'ET', dial: '251', min: 9, max: 9 },
  brazil: { iso: 'BR', dial: '55', min: 10, max: 11 },
  mexico: { iso: 'MX', dial: '52', min: 10, max: 10 },
  russia: { iso: 'RU', dial: '7', min: 10, max: 10 },
};

function infoForCountry(name?: string | null): CountryPhoneInfo | undefined {
  if (!name) return undefined;
  return COUNTRY_PHONE[name.trim().toLowerCase()];
}

/** The country's international dialing code, e.g. "+20" for Egypt (undefined if unknown). */
export function dialCodeForCountry(name?: string | null): string | undefined {
  const info = infoForCountry(name);
  return info ? `+${info.dial}` : undefined;
}

/**
 * Validate a phone number for the selected country. When the country is known,
 * the number is checked against that country's dialing code + national length —
 * accepting the local form ("0501234567"), the bare national number, or the full
 * international form ("+966501234567" / "00966…"). Unknown countries fall back to
 * a lenient international check so they aren't blocked.
 */
export function isValidPhoneForCountry(phone: string, name?: string | null): boolean {
  const raw = (phone ?? '').trim();
  if (!raw) return false;
  // Only +, digits and common separators are allowed.
  if (!/^\+?[0-9\s().-]+$/.test(raw)) return false;

  const info = infoForCountry(name);
  if (!info) return isValidPhone(raw);

  const hadPlus = raw.startsWith('+');
  let digits = raw.replace(/\D/g, '');
  if (!digits) return false;

  if (hadPlus || digits.startsWith('00')) {
    // International form — strip 00 and/or the country's dialing code.
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.startsWith(info.dial)) digits = digits.slice(info.dial.length);
  } else if (digits.startsWith('0')) {
    // Local form — strip the national trunk "0".
    digits = digits.slice(1);
  }

  return digits.length >= info.min && digits.length <= info.max && !digits.startsWith('0');
}
