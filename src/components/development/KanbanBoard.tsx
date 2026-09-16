import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Plus, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  cardMovedLocally,
  createCard,
  createList,
  deleteList,
  listsReorderedLocally,
  moveCard,
  renameList,
  reorderLists,
  restoreSnapshot,
  type BoardSnapshot,
} from '@/redux/slices/developmentSlice';
import type { DevCard, DevList } from '@/types/development.types';
import { BoardColumn } from './BoardColumn';
import { listDndId } from '@/lib/development';
import { CardBody } from './BoardCard';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

type DragItem = { type: 'card'; id: string } | { type: 'list'; id: string } | null;

const parse = (dndId: string | number): { type: 'card' | 'list' | 'list-body'; id: string } | null => {
  const [type, id] = String(dndId).split(':');
  if (type === 'card' || type === 'list' || type === 'list-body') return { type, id };
  return null;
};

/** Inline composer at the end of the row for a new column. */
function AddColumn({ onAdd }: { onAdd: (name: string) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  const submit = async () => {
    const n = name.trim();
    if (!n) return;
    await onAdd(n);
    setName('');
    ref.current?.focus();
  };

  return (
    <div className="w-72 shrink-0">
      {open ? (
        <div className="space-y-2 rounded-[1rem] bg-surface-container-low p-2">
          <input
            ref={ref}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') setOpen(false);
            }}
            maxLength={80}
            placeholder="Column name"
            className="w-full rounded-[0.75rem] bg-surface-container-lowest px-3 py-2 text-sm font-semibold text-on-surface outline-none ring-2 ring-primary/30"
          />
          <div className="flex items-center gap-2">
            <button type="button" onClick={submit} disabled={!name.trim()} className="rounded-[0.5rem] bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
              Add column
            </button>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cancel" className="rounded-[0.5rem] p-1.5 text-on-surface-variant hover:bg-surface-container-high">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 rounded-[1rem] bg-surface-container-low/60 px-3 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
        >
          <Plus className="h-4 w-4" /> Add column
        </button>
      )}
    </div>
  );
}

interface Props {
  boardId: string;
  canAdmin: boolean;
  onOpenCard: (card: DevCard) => void;
  filter?: (card: DevCard) => boolean;
}

export function KanbanBoard({ boardId, canAdmin, onOpenCard, filter }: Props) {
  const dispatch = useAppDispatch();
  const { board, lists, cardIdsByList, cardsById } = useAppSelector((s) => s.development);

  const [active, setActive] = useState<DragItem>(null);
  // What the board looked like when the drag started — restored if the save fails
  const dragSnapshot = useRef<BoardSnapshot | null>(null);
  // Latest position applied during onDragOver, so onDragEnd knows where it landed
  const lastOver = useRef<{ listId: string; index: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const labels = board?.labels ?? [];
  const listIds = useMemo(() => lists.map((l) => listDndId(l._id)), [lists]);

  const cardsOf = useCallback(
    (listId: string) =>
      (cardIdsByList[listId] ?? [])
        .map((id) => cardsById[id])
        .filter((c): c is DevCard => Boolean(c) && (!filter || filter(c))),
    [cardIdsByList, cardsById, filter],
  );

  /**
   * Columns collide by centre so horizontal reorder feels right; cards prefer
   * whatever the pointer is inside (so an empty column's body wins), falling
   * back to rectangle overlap.
   */
  const collision: CollisionDetection = useCallback(
    (args) => {
      if (active?.type === 'list') {
        return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => parse(c.id)?.type === 'list') });
      }
      const containers = args.droppableContainers.filter((c) => parse(c.id)?.type !== 'list');
      const within = pointerWithin({ ...args, droppableContainers: containers });
      return within.length ? within : rectIntersection({ ...args, droppableContainers: containers });
    },
    [active],
  );

  const onDragStart = ({ active: a }: DragStartEvent) => {
    const p = parse(a.id);
    if (!p || p.type === 'list-body') return;
    dragSnapshot.current = { lists, cardIdsByList, cardsById };
    lastOver.current = null;
    setActive({ type: p.type, id: p.id });
  };

  const onDragOver = ({ active: a, over }: DragOverEvent) => {
    if (!over || active?.type !== 'card') return;
    const src = parse(a.id);
    const dst = parse(over.id);
    if (!src || !dst) return;

    const card = cardsById[src.id];
    if (!card) return;

    let toListId: string;
    let toIndex: number;
    if (dst.type === 'card') {
      const overCard = cardsById[dst.id];
      if (!overCard || overCard._id === card._id) return;
      toListId = overCard.list;
      const ids = cardIdsByList[toListId] ?? [];
      const overIndex = ids.indexOf(overCard._id);
      // Below the hovered card when the pointer is past its middle
      const rect = over.rect;
      const pointerY = (a.rect.current.translated?.top ?? 0) + (a.rect.current.translated?.height ?? 0) / 2;
      const after = pointerY > rect.top + rect.height / 2;
      toIndex = overIndex + (after ? 1 : 0);
      if (card.list === toListId) {
        const fromIndex = ids.indexOf(card._id);
        if (fromIndex < toIndex) toIndex -= 1;
        if (fromIndex === toIndex) return;
      }
    } else {
      // Hovering a column (its header/body) — drop at the end
      toListId = dst.id;
      const ids = cardIdsByList[toListId] ?? [];
      toIndex = card.list === toListId ? ids.length - 1 : ids.length;
      if (card.list === toListId && ids[ids.length - 1] === card._id) return;
    }

    if (lastOver.current?.listId === toListId && lastOver.current.index === toIndex) return;
    lastOver.current = { listId: toListId, index: toIndex };
    dispatch(cardMovedLocally({ cardId: card._id, toListId, toIndex }));
  };

  const onDragEnd = ({ over }: DragEndEvent) => {
    const item = active;
    setActive(null);
    const snap = dragSnapshot.current;
    dragSnapshot.current = null;
    if (!item || !snap) return;

    if (item.type === 'list') {
      const dst = over ? parse(over.id) : null;
      if (!dst || dst.type !== 'list' || dst.id === item.id) return;
      const from = lists.findIndex((l) => l._id === item.id);
      const to = lists.findIndex((l) => l._id === dst.id);
      if (from < 0 || to < 0) return;
      const order = arrayMove(lists, from, to).map((l) => l._id);
      dispatch(listsReorderedLocally(order));
      dispatch(reorderLists({ boardId, listIds: order, snapshot: snap }));
      return;
    }

    // Card: where onDragOver last put it is the truth
    const card = cardsById[item.id];
    if (!card) return;
    const listId = card.list;
    const index = (cardIdsByList[listId] ?? []).indexOf(card._id);
    const before = snap.cardIdsByList[snap.cardsById[card._id]?.list ?? ''] ?? [];
    const unchanged = snap.cardsById[card._id]?.list === listId && before.indexOf(card._id) === index;
    if (index < 0 || unchanged) return;
    dispatch(moveCard({ cardId: card._id, listId, position: index, snapshot: snap }));
  };

  const onDragCancel = () => {
    if (dragSnapshot.current) dispatch(restoreSnapshot(dragSnapshot.current));
    dragSnapshot.current = null;
    setActive(null);
  };

  const handleDeleteList = async (list: DevList) => {
    const n = (cardIdsByList[list._id] ?? []).length;
    const r = await MySwal.fire({
      title: `Delete "${list.name}"?`,
      html: `<p style="color:#BA1A1A">${n ? `${n} card${n === 1 ? '' : 's'} on it will be deleted too.` : 'This cannot be undone.'}</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#BA1A1A',
      cancelButtonColor: '#434653',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });
    if (r.isConfirmed) dispatch(deleteList(list._id));
  };

  const activeCard = active?.type === 'card' ? cardsById[active.id] : null;
  const activeList = active?.type === 'list' ? lists.find((l) => l._id === active.id) : null;

  return (
    <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
      <div className="flex h-full items-start gap-4 overflow-x-auto pb-4">
        <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
          {lists.map((list) => (
            <BoardColumn
              key={list._id}
              list={list}
              cards={cardsOf(list._id)}
              labels={labels}
              canAdmin={canAdmin}
              onOpenCard={onOpenCard}
              onAddCard={(listId, title) => dispatch(createCard({ boardId, data: { listId, title } })).unwrap()}
              onRename={(id, name) => dispatch(renameList({ id, name }))}
              onDelete={handleDeleteList}
            />
          ))}
        </SortableContext>
        <AddColumn onAdd={(name) => dispatch(createList({ boardId, name })).unwrap()} />
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
        {activeCard ? (
          <div className="w-[17rem]">
            <CardBody card={activeCard} labels={labels} overlay />
          </div>
        ) : activeList ? (
          <div className="w-72 rounded-[1rem] bg-surface-container-low p-3 shadow-ambient ring-2 ring-primary/30">
            <p className="text-sm font-bold text-on-surface">{activeList.name}</p>
            <p className="text-xs text-on-surface-variant">{(cardIdsByList[activeList._id] ?? []).length} cards</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
