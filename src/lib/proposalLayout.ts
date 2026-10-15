// The proposal PDF's section order after the cover (mirrors LAYOUT_KEYS /
// normalizeLayout in the backend's utils/proposalRules.js — change both). Reps
// show/hide and move every section and add their own (title + description).
import type { LayoutItem, LayoutKey, PageKey, Proposal } from '@/types/proposal.types';

export const LAYOUT_KEYS: LayoutKey[] = [
  'toc', 'about', 'services', 'products', 'solutions', 'd365', 'd365app',
  'legal', 'modules', 'sow', 'financial', 'terms', 'portfolio', 'thanks',
];
export const MAX_CUSTOM_SECTIONS = 20;

export const SECTION_LABELS: Record<LayoutKey, string> = {
  toc: 'Table of Contents',
  about: 'About Us',
  services: 'Our Services',
  products: 'Our Products',
  solutions: 'Our Solutions',
  d365: '1.1 What Is Dynamics 365?',
  d365app: '1.2 Dynamics 365 Application',
  legal: '1.3 Legal Entities in Scope',
  modules: '1.4 Modules in Scope',
  sow: '1.5 Scope of Work',
  financial: '2.1 Financial Proposal',
  terms: '3. Payment & General Terms',
  portfolio: '4. Services & Products (portfolio)',
  thanks: 'Thank You page',
};

/** Fixed template pages (artwork only) vs. pages filled from the builder. */
export const SECTION_SOURCE: Record<LayoutKey, string> = {
  toc: 'Template page', about: 'Template page', services: 'Template page', products: 'Template page',
  solutions: 'Template page', d365: 'Template page', d365app: 'Template page',
  legal: 'From the Scope step', modules: 'From the Scope step', sow: 'From the SOW step',
  financial: 'From the Pricing step', terms: 'From the Terms step', portfolio: 'Price list portfolio', thanks: 'Template page',
};

let seq = 0;
export const newCustomId = () => `c${Date.now().toString(36)}${(++seq).toString(36)}`;

/** A layout for any proposal: older ones (no layout) follow their `pages` flags. */
export const effectiveLayout = (p: Pick<Proposal, 'layout' | 'pages'>): LayoutItem[] => {
  const pages = p.pages as Partial<Record<PageKey, boolean>> | undefined;
  const flag = (k: LayoutKey) => (pages as Record<string, boolean | undefined> | undefined)?.[k] !== false;
  const list = p.layout ?? [];
  if (!list.length) return LAYOUT_KEYS.map((key) => ({ key, visible: flag(key) }));
  const seen = new Set<string>();
  const out: LayoutItem[] = [];
  for (const item of list) {
    if (item.key === 'custom') out.push(item);
    else if (LAYOUT_KEYS.includes(item.key) && !seen.has(item.key)) {
      seen.add(item.key);
      out.push(item);
    }
  }
  LAYOUT_KEYS.forEach((key, i) => {
    if (seen.has(key)) return;
    const prev = [...LAYOUT_KEYS.slice(0, i)].reverse().find((k) => seen.has(k));
    let at = prev ? out.findIndex((x) => x.key === prev) + 1 : 0;
    while (prev && out[at]?.key === 'custom') at++;
    out.splice(at, 0, { key, visible: flag(key) });
    seen.add(key);
  });
  return out;
};
