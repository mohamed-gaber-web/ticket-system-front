import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { buildPages, createMeasurer, PAGE_W } from '@/lib/proposalPages';
import type { Proposal, ProposalCatalog } from '@/types/proposal.types';
import '@/pages/proposals/proposalDoc.css';

interface Props {
  proposal: Proposal;
  catalog: ProposalCatalog;
  images: Record<string, string>;
  /** Receives the built pages so the PDF export uses exactly what is shown. */
  onPages?: (pages: string[]) => void;
}

/**
 * Live preview of every PDF page, scaled to the column width. Pages are rebuilt
 * 150 ms after the last edit (measuring blocks off-screen is the slow part).
 * The page HTML comes from lib/proposalPages, where every user string is escaped.
 */
export default function ProposalPreview({ proposal, catalog, images, onPages }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [scale, setScale] = useState(0.5);
  const [height, setHeight] = useState(0);
  const onPagesRef = useRef(onPages);
  onPagesRef.current = onPages;

  // Blocks are measured to fill pages, so wait for the document fonts (Exo 2 /
  // Open Sans) — measuring with a fallback font packs pages that later overflow.
  // status 'loaded' says nothing about fonts no element has used yet, so always ask for them.
  const [fontsReady, setFontsReady] = useState(() => !document.fonts);
  useEffect(() => {
    if (fontsReady || !document.fonts) return;
    let alive = true;
    Promise.all([document.fonts.load('600 13px "Open Sans"'), document.fonts.load('700 13px "Exo 2"')])
      .catch(() => undefined)
      .then(() => document.fonts.ready)
      .finally(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, [fontsReady]);

  useEffect(() => {
    if (!fontsReady) return;
    const t = window.setTimeout(() => {
      const m = createMeasurer();
      try {
        const built = buildPages(proposal, { catalog, imageSrc: (id) => images[id], measure: m.measure });
        setPages(built);
        onPagesRef.current?.(built);
      } finally {
        m.dispose();
      }
    }, 150);
    return () => window.clearTimeout(t);
  }, [proposal, catalog, images, fontsReady]);

  // Fit the 816 px pages into the column.
  useLayoutEffect(() => {
    const vp = viewport.current;
    if (!vp) return;
    const fit = () => {
      const s = Math.min(1, vp.clientWidth / PAGE_W);
      setScale(s);
      setHeight((pagesRef.current?.scrollHeight ?? 0) * s);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(vp);
    return () => ro.disconnect();
  }, [pages]);

  return (
    <div ref={viewport} className="pp-doc overflow-hidden" style={{ height: height || undefined }}>
      <div
        ref={pagesRef}
        className="pages"
        style={{ transform: `scale(${scale})` }}
        // Built by lib/proposalPages from escaped strings only.
        dangerouslySetInnerHTML={{ __html: pages.join('') }}
      />
    </div>
  );
}
