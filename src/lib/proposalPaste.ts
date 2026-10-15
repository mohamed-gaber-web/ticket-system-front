// SOW paste zone parsing (PROPOSAL_BUILDER_SPEC.md §4.4): Excel / Word tables
// arrive as HTML or TSV, screenshots as image files.

/** Tab-separated text → rows (cells trimmed, empty rows dropped). */
export const parseTsv = (text: string): string[][] =>
  text
    .replace(/\r/g, '')
    .split('\n')
    .map((r) => r.split('\t').map((c) => c.trim()))
    .filter((r) => r.some((c) => c));

/** First <table> of an HTML fragment → rows; `colspan` expands to empty cells. */
export const parseHtmlTable = (html: string): string[][] | null => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.querySelector('table');
  if (!table) return null;
  const rows = [...table.querySelectorAll('tr')]
    .map((tr) => {
      const out: string[] = [];
      [...tr.children].forEach((td) => {
        if (!/^T[DH]$/.test(td.tagName)) return;
        out.push((td.textContent ?? '').replace(/\s+/g, ' ').trim());
        const span = Number(td.getAttribute('colspan')) || 1;
        for (let k = 1; k < span; k++) out.push('');
      });
      return out;
    })
    .filter((r) => r.some((c) => c));
  return rows.length ? rows : null;
};

export type PasteResult =
  | { kind: 'table'; rows: string[][] }
  | { kind: 'image'; file: File }
  | { kind: 'text'; text: string }
  | { kind: 'none' };

/** Order: HTML table → TSV → image file → plain text. */
export const readClipboard = (cd: DataTransfer | null): PasteResult => {
  if (!cd) return { kind: 'none' };
  const html = cd.getData('text/html');
  const txt = cd.getData('text/plain');
  let rows = html && /<table/i.test(html) ? parseHtmlTable(html) : null;
  if (!rows && txt && txt.includes('\t')) rows = parseTsv(txt);
  if (rows?.length) return { kind: 'table', rows };
  const item = [...(cd.items ?? [])].find((it) => it.kind === 'file' && it.type.startsWith('image/'));
  const file = item?.getAsFile();
  if (file) return { kind: 'image', file };
  if (txt?.trim()) return { kind: 'text', text: txt.trim() };
  return { kind: 'none' };
};

/** Downscale to ≤1400 px wide on a white background; PNG, or JPEG when large. */
export const downscaleImage = async (file: File, max = 1400): Promise<{ blob: Blob; width: number; height: number }> => {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((ok, bad) => {
      img.onload = () => ok();
      img.onerror = () => bad(new Error('Could not read that image. Try a PNG or JPG.'));
      img.src = url;
    });
    const sc = Math.min(1, max / img.naturalWidth);
    const width = Math.round(img.naturalWidth * sc);
    const height = Math.round(img.naturalHeight * sc);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not read that image.');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const toBlob = (type: string, q?: number) =>
      new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));
    let blob = await toBlob('image/png');
    if (!blob || blob.size > 350_000) blob = (await toBlob('image/jpeg', 0.85)) ?? blob;
    if (!blob) throw new Error('Could not read that image.');
    return { blob, width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
};
