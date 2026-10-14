import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { setSearch } from '@/redux/slices/myHomeSlice';
import { scrollParentOf, scrollToSection } from '@/lib/myHome';

export interface NavItem {
  id: string;
  label: string;
  badge?: number;
  hot?: boolean;
}

/** Sticky in-page navigation: anchors with live badges, scroll-spy underline, and the page search. */
export default function SectionNav({ items }: { items: NavItem[] }) {
  const dispatch = useAppDispatch();
  const search = useAppSelector((s) => s.myHome.ui.search);
  const [active, setActive] = useState(items[0]?.id);

  const navRef = useRef<HTMLElement>(null);
  // While a click scrolls the page, the clicked tab stays selected.
  const lockUntil = useRef(0);

  useEffect(() => {
    // The page scrolls inside the layout's <main>, not the window.
    const scroller = scrollParentOf(navRef.current) ?? (document.scrollingElement as HTMLElement | null);
    if (!scroller) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (Date.now() < lockUntil.current) return;
      const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4;
      if (atBottom) {
        // The last sections can never reach the top of the screen — at the
        // bottom of the page the last one is the current one.
        setActive(items[items.length - 1]?.id);
        return;
      }
      const line = scroller.getBoundingClientRect().top + (navRef.current?.offsetHeight ?? 0) + 24;
      let current = items[0]?.id;
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= line) current = item.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [items]);

  return (
    <nav ref={navRef} className="mh-nav" aria-label="My Home sections">
      <div className="mh-nav-inner">
        <div className="mh-nav-links">
          {items.map((i) => (
            <a
              key={i.id}
              href={`#${i.id}`}
              className="mh-nav-link"
              aria-current={active === i.id ? 'true' : undefined}
              onClick={(e) => {
                e.preventDefault();
                setActive(i.id);
                lockUntil.current = Date.now() + 900;
                scrollToSection(i.id);
              }}
            >
              {i.label}
              {!!i.badge && (
                <span className={i.hot ? 'mh-badge hot' : 'mh-badge'}>
                  {i.badge}
                  <span className="sr-only"> items</span>
                </span>
              )}
            </a>
          ))}
        </div>
        <div className="mh-search" role="search">
          <Search size={16} aria-hidden="true" />
          <label htmlFor="mh-search" className="sr-only">
            Search tickets, emails, tasks and leads
          </label>
          <input
            id="mh-search"
            type="search"
            placeholder="Search tickets, emails, tasks, leads"
            value={search}
            onChange={(e) => dispatch(setSearch(e.target.value))}
          />
        </div>
      </div>
    </nav>
  );
}
