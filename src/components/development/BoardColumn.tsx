import { useEffect, useRef, useState } from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreHorizontal, Pencil, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DevCard, DevLabel, DevList } from '@/types/development.types';
import { BoardCard } from './BoardCard';
import { cardDndId, listDndId } from '@/lib/development';

interface Props {
  list: DevList;
  cards: DevCard[];
  labels: DevLabel[];
  canAdmin: boolean;
  onOpenCard: (card: DevCard) => void;
  onAddCard: (listId: string, title: string) => Promise<unknown>;
  onRename: (listId: string, name: string) => void;
  onDelete: (list: DevList) => void;
}

/** Inline "add card" composer at the foot of a column. */
function AddCardComposer({ onAdd }: { onAdd: (title: string) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  const submit = async () => {
    const t = title.trim();
    if (!t) return;
    setSaving(true);
    try {
      await onAdd(t);
      setTitle('');
      ref.current?.focus();
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-1.5 rounded-[0.75rem] px-2 py-1.5 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
      >
        <Plus className="h-4 w-4" /> Add card
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        ref={ref}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === 'Escape') setOpen(false);
        }}
        rows={2}
        maxLength={200}
        placeholder="What needs doing?"
        className="w-full resize-none rounded-[0.75rem] border border-outline-variant/30 bg-surface-container-lowest p-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={saving || !title.trim()}
          className="rounded-[0.5rem] bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          Add
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-[0.5rem] p-1.5 text-on-surface-variant hover:bg-surface-container-high" aria-label="Cancel">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function BoardColumn({ list, cards, labels, canAdmin, onOpenCard, onAddCard, onRename, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(list.name);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setName(list.name), [list.name]);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: listDndId(list._id),
    data: { type: 'list', list },
  });
  // A second droppable on the body so an empty column still accepts cards
  const { setNodeRef: setBodyRef, isOver } = useDroppable({ id: `list-body:${list._id}`, data: { type: 'list-body', listId: list._id } });

  const commitRename = () => {
    const n = name.trim();
    setEditing(false);
    if (n && n !== list.name) onRename(list._id, n);
    else setName(list.name);
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'flex h-full max-h-full w-72 shrink-0 flex-col rounded-[1rem] bg-surface-container-low',
        isDragging && 'opacity-40',
      )}
    >
      {/* Header — the drag handle for the column */}
      <div className="flex items-center gap-1 px-2 pt-2 pb-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag column ${list.name}`}
          className="cursor-grab touch-none rounded p-1 text-on-surface-variant/60 hover:bg-surface-container-high hover:text-on-surface active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setName(list.name);
                setEditing(false);
              }
            }}
            maxLength={80}
            className="min-w-0 flex-1 rounded-[0.5rem] bg-surface-container-lowest px-2 py-1 text-sm font-bold text-on-surface outline-none ring-2 ring-primary/30"
          />
        ) : (
          <button
            type="button"
            onDoubleClick={() => setEditing(true)}
            title="Double-click to rename"
            className="min-w-0 flex-1 truncate px-1 py-1 text-left text-sm font-bold text-on-surface"
          >
            {list.name}
          </button>
        )}

        <span className="rounded-full bg-surface-container-high px-1.5 py-0.5 text-[11px] font-semibold text-on-surface-variant">{cards.length}</span>

        <div className="relative" ref={menuRef}>
          <button type="button" onClick={() => setMenu((m) => !m)} aria-label="Column menu" className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface">
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menu && (
            <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-[0.75rem] bg-surface-container-lowest py-1 shadow-ambient ghost-border">
              <button
                type="button"
                onClick={() => {
                  setMenu(false);
                  setEditing(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-container-high"
              >
                <Pencil className="h-3.5 w-3.5" /> Rename
              </button>
              {canAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    onDelete(list);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-error hover:bg-surface-container-high"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete column
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cards */}
      <div
        ref={setBodyRef}
        className={cn('flex min-h-[2.5rem] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-1 transition-colors rounded-[0.75rem] mx-1', isOver && cards.length === 0 && 'bg-primary/5')}
      >
        <SortableContext items={cards.map((c) => cardDndId(c._id))} strategy={verticalListSortingStrategy}>
          {cards.map((c) => (
            <BoardCard key={c._id} card={c} labels={labels} onOpen={onOpenCard} />
          ))}
        </SortableContext>
      </div>

      <div className="p-2 pt-1">
        <AddCardComposer onAdd={(title) => onAddCard(list._id, title)} />
      </div>
    </div>
  );
}
