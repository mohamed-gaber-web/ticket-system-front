import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Archive, ArrowLeft, Filter, Settings2, Tag, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomSelect } from '@/components/ui/custom-select';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { useAccess } from '@/redux/hooks/useAccess';
import { clearBoard, fetchBoardFull } from '@/redux/slices/developmentSlice';
import { CARD_PRIORITIES, PRIORITY_LABELS, type CardPriority, type DevCard } from '@/types/development.types';
import { KanbanBoard } from '@/components/development/KanbanBoard';
import { CardDetailDialog } from '@/components/development/CardDetailDialog';
import { BoardSettingsDialog } from '@/components/development/BoardSettingsDialog';
import { AvatarStack } from '@/components/development/PersonAvatar';
import { personName } from '@/lib/development';
import { LabelChip } from '@/components/development/LabelChip';
import { cn } from '@/lib/utils';

type SettingsTab = 'general' | 'members' | 'labels';

export default function DevelopmentBoard() {
  const { id = '' } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const access = useAccess();
  const me = useAppSelector((s) => s.auth.user?._id);
  const { board, boardLoading, error, cardsById } = useAppSelector((s) => s.development);

  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsTab | null>(null);
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState('');
  const [labelFilter, setLabelFilter] = useState<string[]>([]);
  const [hideDone, setHideDone] = useState(false);

  useEffect(() => {
    dispatch(fetchBoardFull(id));
    return () => {
      dispatch(clearBoard());
    };
  }, [dispatch, id]);

  // A 404 (not found or not ours) sends the caller back to the list
  useEffect(() => {
    if (!boardLoading && !board && error) navigate('/development', { replace: true });
  }, [boardLoading, board, error, navigate]);

  const canAdmin = Boolean(board) && (access.seesAllBoards || board?.createdBy._id === me);

  const filtering = Boolean(assignee || priority || labelFilter.length || hideDone);
  const filter = useCallback(
    (card: DevCard) => {
      if (assignee === 'me' ? card.assignedTo?._id !== me : assignee && card.assignedTo?._id !== assignee) return false;
      if (priority && card.priority !== priority) return false;
      if (labelFilter.length && !labelFilter.some((l) => card.labels.includes(l))) return false;
      if (hideDone && card.completedAt) return false;
      return true;
    },
    [assignee, priority, labelFilter, hideDone, me],
  );

  const assigneeOptions = useMemo(
    () => [
      { value: '', label: 'Anyone' },
      { value: 'me', label: 'Assigned to me' },
      ...(board?.members ?? []).map((m) => ({ value: m._id, label: personName(m) })),
    ],
    [board?.members],
  );

  const total = Object.keys(cardsById).length;
  const done = Object.values(cardsById).filter((c) => c.completedAt).length;

  if (boardLoading && !board) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-9 w-64 rounded-[0.75rem] bg-surface-container-low animate-pulse" />
        <div className="flex gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-72 w-72 rounded-[1rem] bg-surface-container-low animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!board) return null;

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/development" className="rounded-[0.75rem] p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface" aria-label="Back to boards">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 truncate text-2xl font-bold tracking-tight text-on-surface">
            {board.name}
            {board.archived && (
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-container-high px-1.5 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                <Archive className="h-3 w-3" /> Archived
              </span>
            )}
          </h1>
          <p className="truncate text-sm text-on-surface-variant">
            {board.description || `${total} cards · ${done} done`}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => canAdmin && setSettings('members')} className={cn('rounded-full', canAdmin && 'cursor-pointer')} title="Members">
            <AvatarStack people={board.members} max={5} />
          </button>
          {canAdmin && (
            <>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSettings('members')}>
                <Users className="h-4 w-4" /> Members
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSettings('labels')}>
                <Tag className="h-4 w-4" /> Labels
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => setSettings('general')} aria-label="Board settings">
                <Settings2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-[1rem] bg-surface-container-lowest px-3 py-2">
        <Filter className="h-4 w-4 text-on-surface-variant" />
        <div className="w-44">
          <CustomSelect variant="filter" value={assignee} onChange={setAssignee} options={assigneeOptions} placeholder="Anyone" />
        </div>
        <div className="w-36">
          <CustomSelect
            variant="filter"
            value={priority}
            onChange={setPriority}
            options={[{ value: '', label: 'Any priority' }, ...CARD_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p as CardPriority] }))]}
            placeholder="Any priority"
          />
        </div>
        {board.labels.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {board.labels.map((l) => (
              <LabelChip
                key={l._id}
                label={l}
                active={labelFilter.length === 0 || labelFilter.includes(l._id)}
                onClick={() => setLabelFilter((cur) => (cur.includes(l._id) ? cur.filter((x) => x !== l._id) : [...cur, l._id]))}
              />
            ))}
          </div>
        )}
        <label className="flex items-center gap-1.5 text-sm text-on-surface-variant cursor-pointer">
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="h-4 w-4 rounded accent-brand-500" />
          Hide done
        </label>
        {filtering && (
          <button
            type="button"
            onClick={() => {
              setAssignee('');
              setPriority('');
              setLabelFilter([]);
              setHideDone(false);
            }}
            className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <X className="h-3 w-3" /> Clear filters
          </button>
        )}
      </div>

      {/* Board */}
      <div className="min-h-0 flex-1">
        <KanbanBoard boardId={board._id} canAdmin={canAdmin} onOpenCard={(c) => setOpenCardId(c._id)} filter={filtering ? filter : undefined} />
      </div>

      <CardDetailDialog cardId={openCardId} board={board} canAdmin={canAdmin} onClose={() => setOpenCardId(null)} />
      <BoardSettingsDialog board={board} open={settings !== null} initialTab={settings ?? 'general'} onOpenChange={(o) => !o && setSettings(null)} />
    </div>
  );
}
