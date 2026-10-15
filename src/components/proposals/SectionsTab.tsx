import Swal from 'sweetalert2';
import { ArrowDown, ArrowUp, Eye, EyeOff, FilePlus2, Lock, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch } from '@/redux/hooks/hooks';
import {
  addCustomSection,
  moveLayoutItem,
  removeCustomSection,
  toggleLayoutItem,
  updateCustomSection,
} from '@/redux/slices/proposalBuilderSlice';
import { MAX_CUSTOM_SECTIONS, SECTION_LABELS, SECTION_SOURCE, effectiveLayout } from '@/lib/proposalLayout';
import type { Proposal } from '@/types/proposal.types';
import { cn } from '@/lib/utils';
import { fieldCls, textareaCls } from './builderUi';

const iconBtn =
  'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:pointer-events-none disabled:opacity-30';

/**
 * Every section of the PDF in print order: show / hide, move up / down, and add
 * the rep's own section (title + description) above or below any of them.
 */
export default function SectionsTab({ proposal, canEdit }: { proposal: Proposal; canEdit: boolean }) {
  const dispatch = useAppDispatch();
  const layout = proposal.layout?.length ? proposal.layout : effectiveLayout(proposal);
  const customCount = layout.filter((x) => x.key === 'custom').length;
  const canAdd = canEdit && customCount < MAX_CUSTOM_SECTIONS;
  let customNo = 0;

  const remove = async (i: number, title: string) => {
    const r = await Swal.fire({
      title: `Remove "${title}"?`,
      text: 'The section and its text are removed from this proposal.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Remove',
    });
    if (r.isConfirmed) dispatch(removeCustomSection(i));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-on-surface-variant">
        The PDF prints these sections in this order, after the cover. Hide what this client doesn't need, move sections, and add your own section above or below any
        of them. Descriptions use the same formatting as the scope of work: <b>* item</b> bullet, <b># item</b> numbered, <b>## text</b> heading, <b>**bold**</b>,{' '}
        <b>{'{client}'}</b>.
      </p>

      <div className="flex items-center gap-2 rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface-variant">
        <Lock className="h-4 w-4 shrink-0" /> Cover page — always first
      </div>

      {layout.map((item, i) => {
        const custom = item.key === 'custom';
        if (custom) customNo++;
        const title = custom ? item.title : SECTION_LABELS[item.key];
        return (
          <div
            key={custom ? item.id : item.key}
            className={cn(
              'space-y-2 rounded-xl border p-3 transition-colors',
              custom ? 'border-accent-orange-500/40 bg-surface-container-lowest' : 'border-outline-variant/40 bg-surface-container-lowest',
              !item.visible && 'opacity-60',
            )}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'grid h-6 min-w-6 shrink-0 place-items-center rounded-full px-1.5 text-[11px] font-bold',
                  custom ? 'bg-accent-orange-500 text-white' : 'bg-surface-container-high text-on-surface-variant',
                )}
                title={custom ? 'Your section' : 'Template section'}
              >
                {custom ? customNo : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                {custom ? (
                  <input
                    className={cn(fieldCls, 'h-8 font-semibold')}
                    value={item.title}
                    maxLength={120}
                    aria-label="Section title"
                    placeholder="Section title"
                    disabled={!canEdit}
                    onChange={(e) => dispatch(updateCustomSection({ i, patch: { title: e.target.value } }))}
                  />
                ) : (
                  <>
                    <p className={cn('truncate text-sm font-semibold', item.visible ? 'text-on-surface' : 'text-on-surface-variant line-through')}>{title}</p>
                    <p className="text-[11px] text-on-surface-variant">{SECTION_SOURCE[item.key]}</p>
                  </>
                )}
              </div>
              <button
                type="button"
                className={iconBtn}
                disabled={!canEdit}
                onClick={() => dispatch(toggleLayoutItem(i))}
                aria-label={item.visible ? `Hide ${title}` : `Show ${title}`}
                title={item.visible ? 'Shown in the PDF — click to hide' : 'Hidden — click to show'}
              >
                {item.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button type="button" className={iconBtn} disabled={!canEdit || i === 0} onClick={() => dispatch(moveLayoutItem({ i, dir: -1 }))} aria-label={`Move ${title} up`}>
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={iconBtn}
                disabled={!canEdit || i === layout.length - 1}
                onClick={() => dispatch(moveLayoutItem({ i, dir: 1 }))}
                aria-label={`Move ${title} down`}
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              {custom && (
                <button
                  type="button"
                  className={cn(iconBtn, 'hover:bg-error/10 hover:text-error')}
                  disabled={!canEdit}
                  onClick={() => remove(i, item.title)}
                  aria-label={`Remove ${item.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {custom && (
              <textarea
                className={cn(textareaCls, 'min-h-28')}
                rows={5}
                value={item.body}
                aria-label={`${item.title} description`}
                placeholder="Description — one paragraph per line, * for bullets, # for numbered items"
                disabled={!canEdit}
                onChange={(e) => dispatch(updateCustomSection({ i, patch: { body: e.target.value } }))}
              />
            )}

            {canAdd && (
              <div className="flex flex-wrap gap-1.5">
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => dispatch(addCustomSection({ at: i }))}>
                  <Plus /> Add section above
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => dispatch(addCustomSection({ at: i + 1 }))}>
                  <Plus /> Add section below
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {canEdit && (
        <Button type="button" variant="outline" size="sm" disabled={!canAdd} onClick={() => dispatch(addCustomSection({ at: layout.length }))}>
          <FilePlus2 /> Add section at the end
        </Button>
      )}
      {customCount >= MAX_CUSTOM_SECTIONS && <p className="text-xs text-on-surface-variant">Up to {MAX_CUSTOM_SECTIONS} of your own sections per proposal.</p>}
    </div>
  );
}
