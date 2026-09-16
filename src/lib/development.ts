import type { DevPerson } from '@/types/development.types';

/** "First Last" for any person-shaped object, empty when missing. */
export const personName = (p?: Pick<DevPerson, 'firstName' | 'lastName'> | null) =>
  p ? `${p.firstName} ${p.lastName}`.trim() : '';

/** Readable text colour for a hex background. */
export const contrastText = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#1b1d25' : '#fff';
};

/** dnd-kit ids are prefixed so a drag handler can tell columns from cards. */
export const cardDndId = (id: string) => `card:${id}`;
export const listDndId = (id: string) => `list:${id}`;
