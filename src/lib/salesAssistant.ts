import type { Product, ProductPrice } from '@/types/salesAssistant.types';

/** "1,500 EGP (per user / month)" — same rule as the backend renderer. */
export const formatPrice = (price?: ProductPrice): string => {
  if (!price || price.amount == null) return price?.note ?? '';
  const amount = Number(price.amount).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const base = `${amount} ${price.currency || ''}`.trim();
  return price.note ? `${base} (${price.note})` : base;
};

export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${Math.round((bytes / Math.pow(k, i)) * 10) / 10} ${sizes[i]}`;
};

/** Pull the API's message off an axios error, falling back to a readable default. */
export const apiErrorMessage = (error: unknown, fallback: string): string =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/** Login-free image URL is not available; images are fetched through the authed /files route. */
export const productThumbnail = (product: Pick<Product, 'images'>) => product.images?.[0] ?? null;

/** One line of text → list of lines (features / benefits editors). */
export const linesToList = (text: string): string[] =>
  text.split('\n').map((l) => l.trim()).filter(Boolean);

export const listToLines = (list?: string[]): string => (list ?? []).join('\n');

/** Plain-text preview of an HTML email body, for list rows. */
export const htmlToText = (html: string): string =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
