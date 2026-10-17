// Proposal PDF pages (PROPOSAL_BUILDER_SPEC.md §4.3–4.8). Every page is an HTML
// string (not JSX) so the same output feeds the live preview and the PDF export.
// All user text goes through `esc`. Styles: src/pages/proposals/proposalDoc.css,
// scoped to `.pp-doc`.
import type { LayoutItem, LayoutKey, Proposal, ProposalCatalog, SowAttachment, SowSection } from '@/types/proposal.types';
import { effectiveLayout } from './proposalLayout';
import { discountOverLimit, needsApproval, proposalTotals, licenseUnitPrice, type GroupTotals, type ProposalTotals } from './proposalMath';

export const PAGE_W = 816;
export const PAGE_H = 1056;
export const CONTENT_W = 712;
const CAP = 640; // content box height of the variable pages
const TABLE_CHUNK = 18; // body rows per table piece
const BG = (key: string) => `/proposal-assets/pages/${key}.jpg`;

export const FINANCE_GROUP = 'Microsoft Dynamic 365 F&O for Finance';
export const SCM_GROUP = 'Microsoft Dynamics F&O 365 for Supply Chain Management';
export const COMMERCE_GROUP = 'Microsoft Dynamic 365 F&O for Retail (Commerce)';
export const BC_GROUP = 'Dynamics 365 Business Central';
export const SOLUTIONS_GROUP = 'Grow Path Solutions';

export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

const r2 = (n: number) => Math.round(n * 100) / 100;
/** Table money: `$12,345.00`. */
export const money = (n: number) =>
  `$${r2(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** 2026-10-14 → 14-10-2026. */
export const niceDate = (d: string | Date | undefined) => {
  if (!d) return '';
  const iso = typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10);
  const [y, m, dd] = iso.split('-');
  return `${dd}-${m}-${y}`;
};

// ── Modules + placeholders ──────────────────────────────────────────────────

/** Selected modules of a group, in the catalog's order. */
export const selectedModules = (p: Pick<Proposal, 'modules'>, modules: Record<string, string[]>, group: string) => {
  const chosen = new Set(p.modules.filter((m) => m.group === group).map((m) => m.module));
  return (modules[group] ?? []).filter((m) => chosen.has(m));
};

const modeOf = (p: Pick<Proposal, 'modules'>, group: string, module: string) =>
  p.modules.find((m) => m.group === group && m.module === module)?.mode ?? '';

export interface SowVars {
  client: string;
  entities: string;
  modules: string[];
  finance: string;
  scm: string;
  product: string;
  duration: string;
}

export const sowVars = (p: Proposal, modules: Record<string, string[]>): SowVars => {
  const ents = p.legalEntities.map((e) => e.name).filter((n) => n?.trim());
  let entities: string;
  if (ents.length > 2) entities = `${ents.slice(0, -1).map((n) => `**${n}**`).join(', ')} and **${ents[ents.length - 1]}** entities`;
  else if (ents.length === 2) entities = `both **${ents[0]}** and **${ents[1]}** entities`;
  else entities = `**${ents[0] || p.client}**`;
  const fin = selectedModules(p, modules, FINANCE_GROUP);
  const scm = selectedModules(p, modules, SCM_GROUP);
  const com = selectedModules(p, modules, COMMERCE_GROUP);
  const bc = selectedModules(p, modules, BC_GROUP);
  const product =
    bc.length && !fin.length && !scm.length
      ? 'Microsoft Dynamics 365 Business Central'
      : 'Microsoft Dynamics 365 Finance & Operations (D365 F&O)';
  return {
    client: p.client || 'Client',
    entities,
    modules: [...fin, ...scm, ...com, ...bc],
    finance: fin.join(', ') || '—',
    scm: scm.join(', ') || '—',
    product,
    duration: p.sow.duration || '[X] Months',
  };
};

/** `**bold**` → <b>, after escaping. */
const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

/**
 * SOW body markup (§4.3) → HTML: plain line = ➢ paragraph, `* ` bullet (2 columns
 * above 5 items, 3 above 8), `# ` numbered (3 columns), `## ` bold heading.
 */
export const sowBodyHtml = (body: string, V: SowVars) => {
  const sub = (s: string) =>
    s.replace(/\{(client|entities|finance|scm|product|duration)\}/g, (_, k: keyof SowVars) => String(V[k]))
      .replace(/\{modules\}/g, V.modules.join(', '));
  let out = '';
  let ul: string[] = [];
  let ol: string[] = [];
  const flush = () => {
    if (ul.length) out += `<ul class="${ul.length > 8 ? 'c3' : ul.length > 5 ? 'c2' : ''}">${ul.map((x) => `<li>${x}</li>`).join('')}</ul>`;
    if (ol.length) out += `<ol>${ol.map((x) => `<li>${x}</li>`).join('')}</ol>`;
    ul = [];
    ol = [];
  };
  for (const raw of String(body ?? '').split('\n')) {
    const l = raw.trim();
    if (!l) continue;
    if (/^\*\s*\{modules\}\s*$/.test(l)) {
      if (ol.length) flush();
      if (V.modules.length) V.modules.forEach((m) => ul.push(esc(m)));
      else ul.push('Modules to be confirmed');
      continue;
    }
    if (l.startsWith('* ')) {
      if (ol.length) flush();
      ul.push(inline(sub(l.slice(2))));
      continue;
    }
    if (l.startsWith('# ')) {
      if (ul.length) flush();
      ol.push(inline(sub(l.slice(2))));
      continue;
    }
    flush();
    if (l.startsWith('## ')) out += `<p class="h">${inline(sub(l.slice(3)))}</p>`;
    else out += `<p>${inline(sub(l))}</p>`;
  }
  flush();
  return out;
};

// ── SOW attachments ─────────────────────────────────────────────────────────

/** Image size on the page: 660 px × width%, height capped at 520 px. */
export const imageBox = (a: { width: number; height: number; widthPct: number }) => {
  const w0 = a.width || 1;
  const h0 = a.height || 1;
  let W = (660 * (Number(a.widthPct) || 100)) / 100;
  let H = (W * h0) / w0;
  if (H > 520) {
    H = 520;
    W = (H * w0) / h0;
  }
  return { W: Math.round(W), H: Math.round(H) };
};

export type ImageSrc = (fileId: string) => string | undefined;

/** One attachment → page pieces; tables are cut into 18-row chunks with the header repeated. */
export const attachmentPieces = (a: SowAttachment, imageSrc: ImageSrc): string[] => {
  const cap = a.caption ? `<div class="scap">${esc(a.caption)}</div>` : '';
  if (a.type === 'image') {
    const { W, H } = imageBox(a);
    const src = imageSrc(a.fileId);
    const img = src
      ? `<img src="${esc(src)}" alt="" style="width:${W}px;height:${H}px">`
      : `<div class="simg-missing" style="width:${W}px;height:${H}px">Image</div>`;
    return [`<div class="satt">${img}${cap ? `<div style="text-align:center">${cap}</div>` : ''}</div>`];
  }
  const rows = a.rows ?? [];
  if (!rows.length) return [];
  const cols = Math.max(...rows.map((r) => r.length));
  const pad = (r: string[]) => [...r, ...Array(cols - r.length).fill('')];
  const head = a.headerRow !== false ? pad(rows[0]) : null;
  const body = (head ? rows.slice(1) : rows).map(pad);
  const th = head ? `<thead><tr>${head.map((c, k) => `<th class="${k === 0 ? 'o' : ''}">${esc(c)}</th>`).join('')}</tr></thead>` : '';
  const out: string[] = [];
  for (let k = 0; k < Math.max(body.length, 1); k += TABLE_CHUNK) {
    const chunk = body.slice(k, k + TABLE_CHUNK);
    out.push(
      `<div class="satt">${k === 0 ? cap : ''}<table class="pt st">${th}<tbody>${chunk
        .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
        .join('')}</tbody></table></div>`,
    );
  }
  return out;
};

export type Measure = (html: string) => number;

const sowBox = (label: string, inner: string) => `<div class="sbox"><span class="lb">${esc(label)}</span>${inner}</div>`;

/**
 * One SOW section → one block, or several when its attachments overflow the
 * page; continuation boxes are labelled "N. Title (continued)".
 */
export const sowBlocks = (sec: SowSection, i: number, V: SowVars, imageSrc: ImageSrc, measure: Measure): string[] => {
  const label = `${i + 1}. ${sec.title}`;
  const text = sowBodyHtml(sec.body, V);
  const pieces = (sec.attachments ?? []).flatMap((a) => attachmentPieces(a, imageSrc));
  if (!pieces.length) return [sowBox(label, text)];
  const blocks: string[] = [];
  let curLabel = label;
  let cur = text;
  let parts = 0;
  for (const piece of pieces) {
    if ((parts || cur) && measure(sowBox(curLabel, cur + piece)) > CAP - 30) {
      blocks.push(sowBox(curLabel, cur));
      curLabel = `${label} (continued)`;
      cur = '';
      parts = 0;
    }
    cur += piece;
    parts++;
  }
  blocks.push(sowBox(curLabel, cur));
  return blocks;
};

/** Greedy packer: a new page whenever the next block would not fit (block + 16 px gap). */
export const pack = (blocks: string[], measure: Measure): string[][] => {
  const pages: string[][] = [[]];
  let h = 0;
  for (const b of blocks) {
    const bh = measure(b) + 16;
    if (h && h + bh > CAP) {
      pages.push([]);
      h = 0;
    }
    pages[pages.length - 1].push(b);
    h += bh;
  }
  return pages;
};

// ── Tables ──────────────────────────────────────────────────────────────────

const tagPill = (n: string, t: string) => `<div class="tagpill"><span class="n">${esc(n)}</span><span class="t">${esc(t)}</span></div>`;

const sumRow = (span: number, label: string, value: string, cls = '') =>
  `<tr class="sum ${cls}"><td colspan="${span}">${label}</td><td class="r">${value}</td></tr>`;

const implTable = (p: Proposal, g: Proposal['implementation']['groups'][number], gt: GroupTotals) => {
  const disc = Number(p.implementation.discountPct) || 0;
  const lines = g.lines.length ? g.lines : [{ name: '—', qty: 0, unitPrice: 0 }];
  return `<div><span class="badge">${esc(g.title)}</span>
  <table class="pt"><thead><tr><th class="o" style="width:52px">Item#</th><th class="l">Product</th><th style="width:48px">QTY</th><th style="width:96px">Unit Price</th><th style="width:108px">Total Selling</th></tr></thead><tbody>
  ${lines
    .map(
      (l, i) =>
        `<tr><td class="c"><u>${i + 1}</u></td><td>${esc(l.name)}</td><td class="c"><u>${esc(l.qty)}</u></td><td class="r">${money(l.unitPrice)}</td><td class="r">${money((Number(l.qty) || 0) * (Number(l.unitPrice) || 0))}</td></tr>`,
    )
    .join('')}
  ${sumRow(4, 'TOTAL', money(gt.sum))}
  ${disc ? sumRow(4, `Discount (${esc(disc)}%)`, money(gt.disc), 'disc') + sumRow(4, 'TOTAL After Discount', money(gt.net)) : ''}
  ${sumRow(4, `VAT ${esc(p.vat)}%`, money(gt.vat))}
  ${sumRow(4, 'Total After VAT', money(gt.total))}</tbody></table></div>`;
};

const licTable = (p: Proposal, t: ProposalTotals) => {
  const term = Number(p.licenses.termMonths) || 12;
  const disc = Number(p.licenses.discountPct) || 0;
  return `<div><span class="badge">License</span>
  <table class="pt" style="font-size:11.5px"><thead><tr><th class="o" style="width:34px">#</th><th class="l">Product</th><th style="width:140px">SKU</th><th style="width:44px">QTY</th><th style="width:86px">Unit Price / ${term === 12 ? 'Year' : `${term} mo`}</th><th style="width:96px">Total Selling</th></tr></thead><tbody>
  ${p.licenses.lines
    .map((l, i) => {
      const u = licenseUnitPrice(l, term);
      return `<tr><td class="c"><u>${i + 1}</u></td><td>${esc(l.name)}</td><td style="font-size:10.5px">${esc(l.skuCode)}</td><td class="c"><u>${esc(l.qty)}</u></td><td class="r">${money(u)}</td><td class="r">${money(u * (Number(l.qty) || 0))}</td></tr>`;
    })
    .join('')}
  ${sumRow(5, 'TOTAL', money(t.licSum))}
  ${disc ? sumRow(5, `Discount (${esc(disc)}%)`, money(t.licDisc), 'disc') + sumRow(5, 'TOTAL After Discount', money(t.licNet)) : ''}
  ${sumRow(5, `VAT ${esc(p.vat)}%`, money(t.licVat))}
  ${sumRow(5, 'Total After VAT', money(t.licenses))}</tbody></table></div>`;
};

/** Modules of one group; the group name is rotated in the narrow left cell (no writing-mode — it breaks rasterizers). */
const modTable = (p: Proposal, modules: Record<string, string[]>, g: string) => {
  const list = selectedModules(p, modules, g);
  const mark = (v: string, w: string) => (v === w || v === 'B' ? 'Yes' : '-');
  const sideH = Math.max(list.length * 27, 140);
  return `<table class="pt"><thead><tr><th class="o" style="width:58px">SOW</th><th>${g === SOLUTIONS_GROUP ? 'Add on Services' : 'Module'}</th><th style="width:150px">IMPLEMENTATION</th><th style="width:100px">ROLLOUTS</th></tr></thead><tbody>
  ${list
    .map((m, i) => {
      const v = modeOf(p, g, m);
      const side =
        i === 0
          ? `<td class="side" rowspan="${list.length}" style="height:${sideH}px"><div class="rot" style="width:${sideH - 10}px">${esc(g)}</div></td>`
          : '';
      return `<tr style="height:${Math.round(sideH / list.length)}px">${side}<td>${esc(m)}</td><td class="c">${mark(v, 'I')}</td><td class="c">${mark(v, 'R')}</td></tr>`;
    })
    .join('')}</tbody></table>`;
};

// ── Pages ───────────────────────────────────────────────────────────────────

const page = (bg: string, inner: string) => `<div class="page" style="background-image:url(${BG(bg)})">${inner}</div>`;

export interface BuildContext {
  catalog: ProposalCatalog;
  imageSrc: ImageSrc;
  measure: Measure;
}

/** Lines of a description grouped so a list stays together: each group is packed as one block. */
const bodyGroups = (body: string) => {
  const groups: string[][] = [];
  let kind = '';
  for (const raw of String(body ?? '').split('\n')) {
    const l = raw.trim();
    if (!l) continue;
    const k = l.startsWith('* ') || /^\*\s*\{modules\}/.test(l) ? 'ul' : l.startsWith('# ') ? 'ol' : 'p';
    if (k !== 'p' && k === kind) groups[groups.length - 1].push(l);
    else groups.push([l]);
    kind = k;
  }
  return groups;
};

/** Two-line page title in the template's style (light line + bold line), sized to fit beside the photo. */
const titleHtml = (title: string) => {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const b = words.length > 1 ? words[words.length - 1] : (words[0] ?? '');
  const a = words.length > 1 ? words.slice(0, -1).join(' ') : '';
  // ~0.55em per light character and ~0.7em per bold one, within ~400 px left of the photo.
  const aSize = Math.max(20, Math.min(52, Math.floor(720 / Math.max(1, a.length))));
  const bSize = Math.max(20, Math.min(66, Math.floor(570 / Math.max(1, b.length))));
  return `<div class="ptitle2 ctitle">${a ? `<span class="a" style="font-size:${aSize}px">${esc(a)}</span>` : ''}<span class="b" style="font-size:${bSize}px">${esc(b)}</span></div>`;
};

/** A rep's own section: title + description on the plain branded page; long text continues on more pages. */
const customPages = (item: Extract<LayoutItem, { key: 'custom' }>, n: number, V: SowVars, measure: Measure) => {
  const head = (cont: boolean) =>
    `${titleHtml(item.title)}<div class="ptag2 ctag"><span class="n">${n}</span><span class="t">${esc(item.title)}${cont ? ' (continued)' : ''}</span></div>`;
  const blocks = bodyGroups(item.body).map((g) => `<div class="cbody">${sowBodyHtml(g.join('\n'), V)}</div>`);
  if (!blocks.length) return [page('portfolio', head(false))];
  return pack(blocks, measure).map((b, i) => page('portfolio', `${head(i > 0)}<div class="pc" style="gap:4px">${b.join('')}</div>`));
};

/** Every page of the proposal: the cover, then the sections in the proposal's layout order. */
export const buildPages = (p: Proposal, { catalog, imageSrc, measure }: BuildContext): string[] => {
  const modules = catalog.config.modules;
  const V = sowVars(p, modules);
  const out: string[] = [];

  out.push(
    page(
      'cover',
      `<div class="cover-meta"><small>Presented Date:</small><b>${esc(niceDate(p.presentedDate))}</b><small>Presented To:</small><b>${esc(p.client)}</b><small>Presented By:</small><b>Grow Path</b></div>`,
    ),
  );

  const legal = () => {
    const ents = p.legalEntities.filter((e) => e.name?.trim());
    const entRows = (ents.length ? ents : [{ name: p.client, location: p.country, industry: '' }])
      .map((e, i) => `<tr><td>${String(i + 1).padStart(2, '0')}</td><td>${esc(e.name)}</td><td>${esc(e.location)}</td><td>${esc(e.industry)}</td></tr>`)
      .join('');
    return [
      page(
        'legal',
        `<div class="pc" style="top:370px"><div class="blk"><table class="pt lent"><thead><tr><th class="o" style="width:90px;text-align:left;padding-left:22px">NO</th><th>Legal Entity</th><th>Location</th><th>Industry</th></tr></thead><tbody>${entRows}</tbody></table></div></div>`,
      ),
    ];
  };

  const modulePages = () => {
    const groups = Object.keys(modules).filter((g) => selectedModules(p, modules, g).length);
    if (!groups.length) return [];
    return pack(groups.map((g) => modTable(p, modules, g)), measure).map((blocks) => page('modules', `<div class="pc">${blocks.join('')}</div>`));
  };

  const sowPages = () =>
    p.sow.sections.length
      ? pack(p.sow.sections.flatMap((s, i) => sowBlocks(s, i, V, imageSrc, measure)), measure).map((blocks) =>
          page('sow', `<div class="pc" style="gap:10px">${blocks.join('')}</div>`),
        )
      : [];

  const financialPages = () => {
    const t = proposalTotals(p);
    const flag = needsApproval(p) && discountOverLimit(p, catalog.settings.maxDiscount) ?'<span class="lbl-int">INTERNAL · DISCOUNT NEEDS APPROVAL</span>' : '';
    const fin: string[] = [];
    p.implementation.groups.forEach((g, i) => {
      if (g.lines.length) fin.push(implTable(p, g, t.groups[i]));
    });
    if (p.licenses.lines.length) fin.push(licTable(p, t));
    const notes = (p.notes ?? []).map((s) => s.trim()).filter(Boolean);
    if (notes.length) fin.push(`<div class="note"><h4>Note:</h4><ul>${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>`);
    return fin.length ? pack(fin, measure).map((blocks) => page('financial', `${flag}<div class="pc">${blocks.join('')}</div>`)) : [];
  };

  const termsPages = () => {
    const terms = (p.terms ?? []).map((s) => s.trim()).filter(Boolean);
    return [
      page(
        'terms',
        `<div class="pc" style="top:352px;gap:10px">
    <table class="pt pay"><thead><tr><th colspan="2" style="font-size:15px">Description</th><th class="o" style="width:120px;font-size:15px">Percentage</th></tr></thead><tbody>
    ${p.payment.milestones
      .map((r) => {
        const items = (r.items ?? []).filter((s) => s.trim());
        return `<tr><td class="ph">${esc(r.phase)}</td><td class="it">${items.length ? items.map((x) => `<div>${esc(x)}</div>`).join('') : '<div>&nbsp;</div>'}</td><td class="c" style="font-weight:700">${esc(r.pct)}%</td></tr>`;
      })
      .join('')}</tbody></table>
    ${p.licenses.payInAdvance && p.licenses.lines.length ? '<ul class="terms" style="margin-top:4px"><li><b>License Payment</b> 100% In Advance</li></ul>' : ''}
    <div style="height:14px"></div>${tagPill('3.2', 'General Terms')}
    <ul class="terms">${terms.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>`,
      ),
    ];
  };

  const portfolioPages = () => {
    const blocks = catalog.config.portfolio.map(
      (c) =>
        `<table class="pt"><thead><tr><th class="o" style="width:40px">#</th><th class="l" style="width:250px">${esc(c.cat)}</th><th class="l">Description</th></tr></thead><tbody>${c.items
          .map((it, i) => `<tr><td class="c">${i + 1}</td><td>${esc(it[0])}</td><td class="d">${esc(it[1])}</td></tr>`)
          .join('')}</tbody></table>`,
    );
    return pack(blocks, measure).map((b, i) =>
      page(
        'portfolio',
        `<div class="ptitle2"><span class="a">Services &amp;</span><span class="b">Products</span></div><div class="ptag2"><span class="n">4.${i + 1}</span><span class="t">Grow Path Portfolio</span></div><div class="pc">${b.join('')}</div>`,
      ),
    );
  };

  const builtIn: Partial<Record<LayoutKey, () => string[]>> = {
    legal,
    modules: modulePages,
    sow: sowPages,
    financial: financialPages,
    terms: termsPages,
    portfolio: portfolioPages,
  };

  let customNo = 0;
  for (const item of effectiveLayout(p)) {
    if (item.key === 'custom') {
      customNo++;
      if (item.visible) out.push(...customPages(item, customNo, V, measure));
      continue;
    }
    if (!item.visible) continue;
    const make = builtIn[item.key];
    out.push(...(make ? make() : [page(item.key, '')]));
  }
  return out;
};

/** Off-screen measurer at the content width; call `dispose` when done. */
export const createMeasurer = (): { measure: Measure; dispose: () => void } => {
  const host = document.createElement('div');
  host.className = 'pp-doc';
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = `position:absolute;left:-20000px;top:0;width:${CONTENT_W}px;visibility:hidden;pointer-events:none`;
  const box = document.createElement('div');
  box.className = 'pc';
  box.style.cssText = 'position:static;height:auto';
  host.appendChild(box);
  document.body.appendChild(host);
  return {
    measure: (html) => {
      box.innerHTML = `<div class="blk">${html}</div>`;
      return (box.firstElementChild as HTMLElement).offsetHeight;
    },
    dispose: () => host.remove(),
  };
};

/** `<Client>_Proposal_<number>.pdf`. */
export const pdfFileName = (p: Pick<Proposal, 'client' | 'number'>) =>
  `${(p.client || 'Client').replace(/[^\w -]/g, '').trim().replace(/\s+/g, '_') || 'Client'}_Proposal_${p.number}.pdf`;
