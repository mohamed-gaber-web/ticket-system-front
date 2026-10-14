import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { setSearch } from '@/redux/slices/myHomeSlice';
import { scrollToSection } from '@/lib/myHome';

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

  useEffect(() => {
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        const best = items.map((i) => i.id).find((id) => (visible.get(id) ?? 0) > 0);
        if (best) setActive(best);
      },
      { rootMargin: '-64px 0px -55% 0px', threshold: [0, 0.01, 0.25] }
    );
    for (const i of items) {
      const el = document.getElementById(i.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className="mh-nav" aria-label="My Home sections">
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
