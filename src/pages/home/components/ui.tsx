import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRIORITY_LABEL } from '@/lib/myHome';
import type { HomePriority } from '@/types/myHome.types';

export function Card({ id, className, children, labelledBy }: { id?: string; className?: string; children: ReactNode; labelledBy?: string }) {
  return (
    <section id={id} className={cn('mh-card', className)} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}

export function CardHead({ id, title, sub, children }: { id?: string; title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mh-card-head">
      <div style={{ minWidth: 0 }}>
        <h2 className="mh-h2" id={id}>
          {title}
        </h2>
        {sub && <p className="mh-sub">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

/** role="tablist" segmented control. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode; count?: number }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="mh-seg" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count !== undefined && <span className="mh-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Pill({ tone, className, children }: { tone?: string; className?: string; children: ReactNode }) {
  return <span className={cn('mh-pill', tone, className)}>{children}</span>;
}

export function PriorityDot({ priority, withLabel }: { priority: HomePriority; withLabel?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span className={cn('mh-dot', priority)} aria-hidden="true" />
      {withLabel ? PRIORITY_LABEL[priority] : <span className="sr-only">{PRIORITY_LABEL[priority]} priority</span>}
    </span>
  );
}

export function Bar({ value, max = 100, over, label, style }: { value: number; max?: number; over?: boolean; label?: string; style?: CSSProperties }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={cn('mh-bar', over && 'over')} role={label ? 'img' : undefined} aria-label={label} style={style}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mh-empty">
      <p style={{ margin: 0 }}>{children}</p>
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Right drawer or centred modal: role="dialog" + aria-modal, focus trapped,
 * Esc and backdrop close it, and focus returns to whatever opened it.
 */
export function Overlay({
  open,
  onClose,
  title,
  kind = 'drawer',
  width,
  children,
  footer,
  headerExtra,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  kind?: 'drawer' | 'modal';
  width?: number;
  children: ReactNode;
  footer?: ReactNode;
  headerExtra?: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const node = panel.current;
    const first = node?.querySelector<HTMLElement>('[data-autofocus]') ?? node?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab' || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [open]);

  if (!open) return null;
  const titleId = 'mh-dialog-title';
  return createPortal(
    <div className="mh mh-portal">
      <div className="mh-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={kind === 'drawer' ? 'mh-drawer' : 'mh-modal'}
        style={width ? ({ '--w': `${width}px` } as CSSProperties) : undefined}
      >
        {kind === 'drawer' ? (
          <>
            <div className="mh-drawer-head">
              <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 id={titleId} className="mh-h2" style={{ fontSize: 15 }}>
                  {title}
                </h2>
                {headerExtra}
              </div>
              <button type="button" className="mh-icon-btn" onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="mh-drawer-body">{children}</div>
            {footer && <div className="mh-drawer-foot">{footer}</div>}
          </>
        ) : (
          <>
            <div className="mh-card-head">
              <h2 id={titleId} className="mh-h2">
                {title}
              </h2>
              <button type="button" className="mh-icon-btn" onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            {children}
            {footer && <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20, flexWrap: 'wrap' }}>{footer}</div>}
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
