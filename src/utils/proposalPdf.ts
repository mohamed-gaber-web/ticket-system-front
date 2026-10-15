// Proposal PDF, built in the browser (PROPOSAL_BUILDER_SPEC.md §4.7 fallback):
// every page HTML string is rasterised with html2canvas and placed on a US
// Letter page (816×1056 px) by jsPDF. Backgrounds are same-origin
// (/proposal-assets) and SOW images are blob: URLs, so the canvas is never tainted.
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { PAGE_H, PAGE_W } from '@/lib/proposalPages';

export const buildProposalPdf = async (
  pages: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> => {
  const holder = document.createElement('div');
  holder.className = 'pp-doc printing';
  holder.style.cssText = `position:fixed;left:-10000px;top:0;width:${PAGE_W}px`;
  holder.innerHTML = pages.join('');
  document.body.appendChild(holder);
  try {
    await document.fonts?.ready.catch(() => undefined);
    // Wait for every background and image to decode so no page is captured blank.
    const urls = new Set<string>();
    holder.querySelectorAll<HTMLElement>('.page').forEach((el) => {
      const m = /url\(["']?([^"')]+)["']?\)/.exec(el.style.backgroundImage);
      if (m) urls.add(m[1]);
    });
    holder.querySelectorAll('img').forEach((img) => urls.add(img.src));
    await Promise.all(
      [...urls].map(
        (src) =>
          new Promise<void>((done) => {
            const img = new Image();
            img.onload = () => done();
            img.onerror = () => done();
            img.src = src;
          }),
      ),
    );

    const pdf = new jsPDF({ unit: 'px', format: [PAGE_W, PAGE_H], hotfixes: ['px_scaling'], compress: true });
    const els = [...holder.querySelectorAll<HTMLElement>('.page')];
    for (let i = 0; i < els.length; i++) {
      onProgress?.(i, els.length);
      const canvas = await html2canvas(els[i], { scale: 1.6, backgroundColor: '#ffffff', useCORS: true, logging: false });
      if (i) pdf.addPage([PAGE_W, PAGE_H]);
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, PAGE_W, PAGE_H);
    }
    onProgress?.(els.length, els.length);
    return pdf.output('blob');
  } finally {
    holder.remove();
  }
};
