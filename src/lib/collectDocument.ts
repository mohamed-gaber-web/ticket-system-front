import { arDate, CURRENCY_LABELS, money, n0, weekdayOf } from '@/lib/collect';
import { tafqeet } from '@/lib/collectTafqeet';
import type { Clause, CollectSettings, ContractDetail } from '@/types/collect.types';

// Grow Path Collect — the printable Arabic contract (GROW_PATH_COLLECT_SPEC.md
// §7). Built as one self-contained HTML document that the browser prints
// (Chrome → "Save as PDF"); Chrome does the page breaks. Pure: no DOM access;
// `assetBase` (the app origin) makes the bundled letterhead images absolute,
// because the document is shown in a srcdoc iframe.
//
// Letterhead on every page ("designed" paper): `position: fixed` elements
// (Chrome repeats them on every printed page) for the logo, watermark, the
// initials row and the navy band; a table whose <thead>/<tfoot> spacer rows
// repeat on every page reserves their room so the text never runs under them.
// "عقد رقم … · صفحة X من Y" lives in an @page margin box, the only place
// where counter(page) / counter(pages) work.

const DOTS = '..............................';

const BN = [
  'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
  'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون',
  'الحادي والعشرون', 'الثاني والعشرون', 'الثالث والعشرون', 'الرابع والعشرون', 'الخامس والعشرون', 'السادس والعشرون', 'السابع والعشرون', 'الثامن والعشرون', 'التاسع والعشرون', 'الثلاثون',
];

/** HTML-escape user text. */
export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string);

/** Escaped text with percentages and e-mails isolated LTR. */
const bd = (s: unknown) =>
  esc(s)
    .replace(/(\d[\d.,]*\s?%)/g, '<span class="ltr">$1</span>')
    .replace(/([\w.+-]+@[\w-]+\.[\w.-]+)/g, '<span class="ltr">$1</span>');

const lines = (s: unknown) =>
  String(s ?? '')
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);

/** Replace {{name}} tokens; unknown ones stay as they are. */
const fill = (text: string, vars: Record<string, string | number | undefined>) =>
  text.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (all, name: string) => {
    const v = vars[name];
    return v == null || v === '' ? all : String(v);
  });

/** A string safe inside a CSS `content: "…"` (and inside <style>). */
const cssStr = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/</g, '\\3c ').replace(/[\r\n]+/g, ' ');

export const isSaudi = (c: ContractDetail) => c.currency === 'SAR' || /سعود/.test(c.customerDetail?.country ?? '');

export const contractPdfFileName = (c: Pick<ContractDetail, 'no' | 'customer'>) => `${c.no} - ${c.customer.name}`;

const payDesc = (c: ContractDetail) => {
  const t = c.type;
  const n = c.installments.length;
  if (t?.billingMode === 'recurring') {
    return `${n} دفعات متساوية كل ${t.periodMonths} شهور، ${t.payInAdvance === false ? 'في نهاية كل فترة' : 'مقدمًا في بداية كل فترة'}`;
  }
  if (t?.billingMode === 'renewal') return 'دفعة واحدة مقدمًا عن كامل الفترة';
  return `${n} دفعات مرتبطة بمراحل التنفيذ وفق جدول الدفعات`;
};

const ICON = {
  phone:
    '<svg viewBox="0 0 24 24" width="12" height="12" fill="#EF5A24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z"/></svg>',
  mail:
    '<svg viewBox="0 0 24 24" width="12" height="12" fill="#EF5A24" aria-hidden="true"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 7.2L4 7.3V17h16V7.3z"/></svg>',
  web:
    '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#EF5A24" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18"/></svg>',
  pin:
    '<svg viewBox="0 0 24 24" width="12" height="12" fill="#EF5A24" aria-hidden="true"><path d="M12 2a7 7 0 0 1 7 7c0 5.2-7 13-7 13S5 14.2 5 9a7 7 0 0 1 7-7zm0 4.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/></svg>',
};

/** The full printable contract document. */
export function buildContractHtml(c: ContractDetail, s: CollectSettings, today: string, assetBase = ''): string {
  const p = s.document;
  const k = c.customerDetail;
  const t = c.type;
  const doc = c.document;
  const sa = isSaudi(c);
  const paper = p.paper || 'designed';

  const vars: Record<string, string | number | undefined> = {
    'الطرف_الأول': p.legalName,
    'القانون_الحاكم': sa ? p.lawSA : p.lawEG,
    'جهة_النزاع': sa ? p.courtSA : p.courtEG,
    'كل_شهور': t?.periodMonths,
    'نسبة_الزيادة': t?.renewalUpliftPct,
    'رقم_العقد': c.no,
    'العقد': c.name,
    'العميل': c.customer.name,
    'قيمة_العقد': money(c.value, c.currency),
    'تاريخ_البداية': arDate(c.startDate),
    'تاريخ_الانتهاء': arDate(c.endDate),
    'الشركة': s.company,
    'جهة_الاتصال': k?.contactName,
    'مدير_الحساب': k?.accountManager,
  };
  const F = (x: string) => fill(x, vars);

  const blocks: string[] = [];
  let n = 0;
  const head = (title: string) => `<h2>البند ${BN[n] ?? n + 1}: ${esc(title)}</h2>`;

  /** A numbered clause: multi-line → n.1, n.2 … sub-items; one line → a paragraph. */
  const clause = (title: string, items: string[], extra = '') => {
    const L = items.map(F).filter((x) => x.trim());
    const h = head(title);
    const num = n + 1;
    n++;
    if (!L.length) {
      blocks.push(`<section class="cl">${h}${extra}</section>`);
      return;
    }
    if (L.length === 1 && !extra) {
      blocks.push(`<section class="cl">${h}<p>${bd(L[0])}</p></section>`);
      return;
    }
    blocks.push(
      `<section class="cl">${h}${extra}${L.map((x, j) => `<div class="term"><span class="num">${num}.${j + 1}</span><span>${bd(x)}</span></div>`).join('')}</section>`,
    );
  };

  // Plain paper: a simple text letterhead on the first page.
  if (paper === 'plain') {
    blocks.push(
      `<div class="lh"><b>${esc(s.company)}</b><div>${esc(p.legalName)}<br>${esc(p.address)}${p.cr ? `<br>سجل تجاري: ${esc(p.cr)}` : ''}${
        p.taxNo ? `<br>رقم ضريبي: <span class="ltr">${esc(p.taxNo)}</span>` : ''
      }</div></div>`,
    );
  }

  // 1. Title block
  blocks.push(
    `<header class="tb"><h1>${esc(doc?.title || p.title)}</h1><div class="st">${bd(c.name)}</div><div class="meta"><span>رقم العقد: <b>${esc(c.no)}</b></span><span>تاريخ التحرير: <b>${arDate(today)}</b></span><span>نوع العقد: <b>${esc(t?.name ?? '')}</b></span>${
      doc ? `<span>الإصدار: <b>${doc.version ?? 1}</b></span>` : ''
    }</div></header>`,
  );

  // 2. Parties
  const party = (
    ord: string,
    o: { name?: string; legalForm?: string; cr?: string; crOffice?: string; taxNo?: string; address?: string; email?: string; signer?: string; signerTitle?: string },
    role: string,
    alias: string,
  ) =>
    `<p><b>${ord}: ${esc(o.name || DOTS)}</b>، ويُشار إليها في هذا العقد بـ«${role}» أو «${alias}»، وهي ${esc(o.legalForm || `شركة ${DOTS}`)}، بموجب سجل تجاري رقم (${esc(
      o.cr || DOTS,
    )}) صادر من ${esc(o.crOffice || DOTS)}، وبطاقة ضريبية رقم ${o.taxNo ? `<span class="ltr">${esc(o.taxNo)}</span>` : DOTS}، ومقرها ${esc(o.address || DOTS)}${
      o.email ? `، وبريدها الإلكتروني المعتمد <span class="ltr">${esc(o.email)}</span>` : ''
    }، ويمثلها في هذا العقد الأستاذ/ ${esc(o.signer || DOTS)} بصفته ${esc(o.signerTitle || DOTS)}.</p>`;
  blocks.push(
    `<section class="parties"><p>إنه في يوم ${weekdayOf(today)} الموافق ${arDate(today)} تحرر هذا العقد بين كل من:</p>${party(
      'أولًا',
      { name: p.legalName, legalForm: p.legalForm, cr: p.cr, crOffice: p.crOffice, taxNo: p.taxNo, address: p.address, signer: p.signer, signerTitle: p.signerTitle },
      'الطرف الأول',
      'مقدم الخدمة',
    )}${party(
      'ثانيًا',
      {
        name: k?.name ?? c.customer.name,
        legalForm: k?.legalForm,
        cr: k?.cr,
        crOffice: k?.crOffice,
        taxNo: k?.taxNo,
        address: k?.address,
        email: k?.email,
        signer: k?.signer || k?.contactName,
        signerTitle: k?.signerTitle,
      },
      'الطرف الثاني',
      'متلقي الخدمة',
    )}</section>`,
  );

  // 3. Preamble
  const pre = lines(F(doc ? doc.preamble : p.preamble));
  if (pre.length) blocks.push(`<section class="cl"><h2>تمهيد</h2>${pre.map((x) => `<p>${bd(x)}</p>`).join('')}</section>`);

  // 4. Preamble & annexes
  clause('التمهيد والملاحق', [
    'يُعتبر التمهيد السابق وجدول الدفعات الوارد في هذا العقد وأي ملاحق أو عروض فنية ومالية موقعة من الطرفين جزءًا لا يتجزأ من هذا العقد ومكملًا له.',
  ]);

  // 5. Subject & scope
  const scope = lines(c.scope || t?.defaultScope);
  clause('موضوع العقد ونطاق العمل', [
    `يلتزم الطرف الأول بتنفيذ: ${c.name}${scope.length ? '، ويشمل نطاق العمل ما يلي:' : '.'}`,
    ...scope,
    'أي أعمال أو متطلبات لم ترد صراحة في نطاق العمل تُعتبر خارجه، وتتم بموجب طلب تعديل (Change Request) مستقل يُتفق على تكلفته ومدته كتابيًا.',
  ]);

  // 6. Duration
  clause('مدة العقد', [
    `مدة هذا العقد من ${arDate(c.startDate)} حتى ${arDate(c.endDate)}.`,
    ...(c.deliveryDate && t?.billingMode === 'phases'
      ? [`التاريخ المتوقع للتسليم ${arDate(c.deliveryDate)}، ويرتبط هذا التاريخ بالتزام الطرف الثاني بمسؤولياته الواردة في هذا العقد.`]
      : []),
    ...(t?.renewable ? ['يجوز تجديد العقد لمدة مماثلة باتفاق الطرفين وفقًا لما ورد في بند السداد.'] : []),
  ]);

  // 7. Value (+ tafqeet, + optional VAT table)
  const vr = Number(sa ? p.vatSA : p.vatEG) || 0;
  const vat = Math.round(c.value * vr) / 100;
  clause(
    'قيمة العقد',
    [],
    `<p>القيمة الإجمالية للعقد: <b>${money(c.value, c.currency)}</b> (${esc(tafqeet(c.value, c.currency))})، غير شاملة ضريبة القيمة المضافة.</p>${
      p.showVat && vr
        ? `<table class="kv"><tbody><tr><td>القيمة قبل الضريبة</td><td class="nv">${money(c.value, c.currency)}</td></tr><tr><td>ضريبة القيمة المضافة (<span class="ltr">${vr}%</span>)</td><td class="nv">${money(
            vat,
            c.currency,
          )}</td></tr><tr><td><b>الإجمالي شامل الضريبة</b></td><td class="nv"><b>${money(c.value + vat, c.currency)}</b></td></tr></tbody></table>`
        : ''
    }`,
  );

  // 8. Payment schedule & terms
  const rows = [...c.installments].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const sum = rows.reduce((a, i) => a + i.amount, 0);
  const payNo = n + 1;
  const payHead = head('جدول الدفعات وشروط السداد');
  n++;
  const share = (amount: number) => (c.value ? `${Math.round((amount / c.value) * 1000) / 10}%` : '—');
  const table = `<table class="sch"><colgroup><col style="width:7%"><col style="width:41%"><col style="width:20%"><col style="width:10%"><col style="width:22%"></colgroup><thead><tr><th>#</th><th>البيان</th><th>تاريخ الاستحقاق</th><th>النسبة</th><th>المبلغ (${esc(
    CURRENCY_LABELS[c.currency] ?? c.currency,
  )})</th></tr></thead><tbody>${rows
    .map((i, m) => `<tr><td class="n">${m + 1}</td><td>${bd(i.name)}</td><td>${arDate(i.dueDate)}</td><td class="n"><span class="ltr">${share(i.amount)}</span></td><td class="n">${n0(i.amount)}</td></tr>`)
    .join('')}<tr class="tot"><td colspan="3">الإجمالي</td><td class="n"><span class="ltr">${c.value ? `${Math.round((sum / c.value) * 100)}%` : ''}</span></td><td class="n">${n0(sum)}</td></tr></tbody></table>`;
  const payTerms = [
    ...lines(F((doc ? doc.typeTerms : t?.paymentTerms) || '')),
    ...lines(F(doc ? doc.payTerms : p.payTerms)),
    ...(c.currency === 'USD' ? lines(F(p.usdTerm)) : []),
  ];
  const bank = lines(p.bank);
  const payItems = payTerms.map((x, j) => `<div class="term"><span class="num">${payNo}.${j + 1}</span><span>${bd(x)}</span></div>`);
  if (bank.length) {
    payItems.push(
      `<div class="term"><span class="num">${payNo}.${payTerms.length + 1}</span><span>بيانات الحساب البنكي للطرف الأول:<br>${bank.map(bd).join('<br>')}</span></div>`,
    );
  }
  blocks.push(
    `<section class="cl">${payHead}<p>تُسدد قيمة العقد (${esc(payDesc(c))}) وفقًا للجدول التالي:</p>${table}${payItems.length ? `<div class="after-table">${payItems.join('')}</div>` : ''}</section>`,
  );

  // 9. Special terms
  const notes = lines(c.notes);
  if (notes.length) clause('شروط خاصة بهذا العقد', notes);

  // 10. General clauses — the contract's own copy, else the library for its type
  const general: Clause[] = doc
    ? doc.clauses
    : (s.clauses ?? []).filter((cl) => !cl.appliesTo?.length || cl.appliesTo.includes('ALL') || (t && cl.appliesTo.includes(t.key)));
  for (const cl of general) {
    const L = lines(cl.body);
    if (cl.title.trim() && L.length) clause(cl.title, L);
  }

  // 11. Closing + signatures (kept together)
  const sig = (who: string, org: string | undefined, name: string | undefined, title: string | undefined) =>
    `<div><b>${who}</b><p>${esc(org || DOTS)}</p><p>الاسم: ${esc(name || DOTS)}</p><p>الصفة: ${esc(title || DOTS)}</p><p>التوقيع: ${DOTS}</p><p>الختم:</p></div>`;
  blocks.push(
    `<section class="end"><p class="closing">وبعد اطلاع الطرفين على كافة بنود هذا العقد وقبولها، وقّعا عليه.</p><div class="sig">${sig(
      'الطرف الأول',
      p.legalName,
      p.signer,
      p.signerTitle,
    )}${sig('الطرف الثاني', k?.name ?? c.customer.name, k?.signer || k?.contactName, k?.signerTitle)}</div></section>`,
  );

  // ── Page frame per paper mode ──────────────────────────────────────────────
  const logo = p.logo || `${assetBase}/collect/gp-logo.png`;
  const mark = p.mark || `${assetBase}/collect/gp-mark.png`;
  const pageText = cssStr(`عقد رقم ${c.no} — ${c.customer.name} · صفحة `);
  const designed = paper === 'designed';
  const topMm = paper === 'preprinted' ? Number(p.topMm) || 0 : paper === 'plain' ? 16 : 0;
  const botMm = paper === 'preprinted' ? Math.max(Number(p.bottomMm) || 0, 8) : paper === 'plain' ? 14 : 9;

  const band = designed
    ? `<div class="band fx"><div class="gl"></div><div class="bi"><div class="contact">${
        p.phone ? `<div class="row">${ICON.phone}<span>${esc(p.phone)}</span></div>` : ''
      }${p.email ? `<div class="row">${ICON.mail}<span>${esc(p.email)}</span></div>` : ''}${
        p.web ? `<div class="row">${ICON.web}<span>${esc(p.web)}</span></div>` : ''
      }</div>${lines(p.footAddr).length ? `<div class="addr">${ICON.pin}<span>${lines(p.footAddr).map(esc).join('<br>')}</span></div>` : ''}</div></div>`
    : '';
  const initials = `<div class="ini fx"><span>توقيع الطرفين بالأحرف الأولى</span><i></i><i></i></div>`;

  const css = `
@page {
  size: A4;
  margin: ${topMm}mm 0 ${botMm}mm 0;
  @bottom-center {
    content: "${pageText}" counter(page) " من " counter(pages);
    font-family: "IBM Plex Sans Arabic", Tahoma, sans-serif;
    font-size: 8.5pt;
    color: #8A97A8;
    direction: rtl;
    ${designed ? 'background: #0F1B2D;' : ''}
  }
}
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; }
body { direction: rtl; font-family: "IBM Plex Sans Arabic", Tahoma, sans-serif; font-size: 12.5px; line-height: 1.75; color: #1B2430; background: #fff; }
h1, h2 { font-family: "Readex Pro", "IBM Plex Sans Arabic", Tahoma, sans-serif; font-weight: 600; color: #0F1B2D; }
h1 { text-align: center; font-size: 21px; margin: 0 0 2px; }
h2 { font-size: 13.5px; margin: 14px 0 6px; padding-bottom: 3px; border-bottom: 1.5px solid #EF5A24; display: inline-block; break-after: avoid; page-break-after: avoid; }
p { margin: 0 0 6px; orphans: 2; widows: 2; text-align: justify; }
b { font-weight: 600; }
.ltr { direction: ltr; unicode-bidi: isolate; display: inline-block; }
.tb { margin-bottom: 10px; }
.st { text-align: center; font-size: 14px; margin: 2px 0 4px; }
.meta { display: flex; justify-content: center; flex-wrap: wrap; gap: 6px 28px; font-size: 11.5px; color: #4A524E; margin-bottom: 14px; }
.lh { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0F1B2D; padding-bottom: 10px; margin-bottom: 16px; }
.lh b { font-family: "Readex Pro", Tahoma, sans-serif; font-size: 20px; color: #0F1B2D; }
.lh div { font-size: 10.5px; color: #4A524E; text-align: left; }
.term { display: grid; grid-template-columns: 36px 1fr; gap: 4px; margin-bottom: 4px; orphans: 2; widows: 2; }
.term .num { direction: ltr; text-align: right; color: #4A524E; font-variant-numeric: tabular-nums; }
table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; font-size: 12px; }
thead { display: table-header-group; }
tr { break-inside: avoid; page-break-inside: avoid; }
th, td { border: 1px solid #C9CFCB; padding: 5px 8px; text-align: right; vertical-align: top; }
th { background: #EEF2F7; color: #0F1B2D; font-weight: 600; }
td.n, td.nv { font-variant-numeric: tabular-nums; white-space: nowrap; }
.kv td:first-child { width: 40%; background: #F6F8FB; color: #4A524E; }
.tot td { font-weight: 600; background: #EEF2F7; }
.after-table { margin-top: 8px; }
.end { break-inside: avoid; page-break-inside: avoid; margin-top: 10px; }
.closing { break-after: avoid; page-break-after: avoid; }
.sig { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 10px; break-inside: avoid; page-break-inside: avoid; }
.sig div { border: 1px solid #C9CFCB; border-radius: 4px; padding: 8px 12px; }
.sig b { display: block; color: #0F1B2D; margin-bottom: 6px; }
.sig p { margin: 0 0 6px; }
/* page frame */
.frame { width: 100%; border-collapse: collapse; margin: 0; font-size: inherit; }
.frame > thead > tr > td, .frame > tfoot > tr > td, .frame > tbody > tr > td { border: 0; padding: 0; }
.frame > tbody > tr > td { padding: 0 17mm; }
.frame > tbody > tr { break-inside: auto; page-break-inside: auto; }
.sp-top { height: ${designed ? 32 : 0}mm; }
.sp-bot { height: ${designed ? 38 : 0}mm; }
.lgo { position: fixed; top: 9mm; left: 0; right: 0; text-align: center; }
.lgo img { height: 14mm; width: auto; }
.wm { position: fixed; left: -30mm; bottom: 42mm; width: 125mm; opacity: .045; pointer-events: none; z-index: 0; }
.ini { position: fixed; left: 17mm; bottom: ${designed ? 29 : 2}mm; display: flex; align-items: center; gap: 8px; font-size: 9.5px; color: #4A524E; direction: rtl; }
.ini i { display: inline-block; width: 18mm; height: 6mm; border: 1px solid #B9BFBB; border-radius: 3px; }
.band { position: fixed; left: 0; right: 0; bottom: 0; height: 26mm; background: #0F1B2D; direction: ltr; }
.band .gl { height: 4px; background: linear-gradient(90deg, #2B8FD6 0%, #2B8FD6 35%, #EF5A24 100%); }
.band .bi { display: flex; justify-content: space-between; align-items: flex-start; padding: 4mm 19mm 0; color: #E3E9F0; font-size: 10.5px; line-height: 1.55; }
.band .row { display: flex; align-items: center; gap: 9px; margin-bottom: 3px; }
.band .addr { display: flex; gap: 9px; align-items: flex-start; max-width: 70mm; }
.band .addr svg { margin-top: 3px; flex: none; }
.band svg { flex: none; }
@media screen {
  body { background: #E6E9EE; }
  .sheet { position: relative; width: 210mm; max-width: 100%; margin: 12px auto; background: #fff; box-shadow: 0 2px 12px rgba(15, 27, 45, .15); overflow: hidden; }
  .fx { position: static; }
  .lgo { padding-top: 9mm; }
  .wm { position: absolute; bottom: 60mm; }
  .ini { justify-content: flex-start; padding: 6mm 17mm 3mm; }
  .sp-top, .sp-bot { height: 6mm; }
  .frame > tbody > tr > td { padding-top: ${paper === 'designed' ? 0 : 12}mm; }
}`;

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>${esc(contractPdfFileName(c))}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600&family=Readex+Pro:wght@600&display=swap">
<style>${css}</style>
</head>
<body>
<div class="sheet">
${designed ? `<div class="lgo fx"><img src="${esc(logo)}" alt="Grow Path"></div>` : ''}
${designed && p.watermark ? `<img class="wm fx" src="${esc(mark)}" alt="">` : ''}
<table class="frame">
<thead><tr><td><div class="sp-top"></div></td></tr></thead>
<tfoot><tr><td><div class="sp-bot"></div></td></tr></tfoot>
<tbody><tr><td>
${blocks.join('\n')}
</td></tr></tbody>
</table>
${designed ? initials : ''}
${band}
</div>
</body>
</html>`;
}
