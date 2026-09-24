import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, LayoutGrid, Plus, Search, SquareKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchBoards } from '@/redux/slices/developmentSlice';
import { AvatarStack } from '@/components/development/PersonAvatar';
import { personName } from '@/lib/development';
import { CreateBoardDialog } from '@/components/development/CreateBoardDialog';
import type { DevBoard } from '@/types/development.types';
import { cn } from '@/lib/utils';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function BoardTile({ board }: { board: DevBoard }) {
  return (
    <Link
      to={`/development/boards/${board._id}`}
      className={cn(
        'group flex flex-col gap-3 rounded-[1rem] bg-surface-container-lowest p-5 ghost-border transition-all hover:shadow-ambient hover:-translate-y-0.5',
        board.archived && 'opacity-70',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-on-surface group-hover:text-primary">{board.name}</h3>
          {board.description && <p className="mt-0.5 line-clamp-2 text-sm text-on-surface-variant">{board.description}</p>}
        </div>
        {board.archived && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-surface-container-high px-1.5 py-0.5 text-[11px] font-semibold text-on-surface-variant">
            <Archive className="h-3 w-3" /> Archived
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 text-xs text-on-surface-variant">
        <span>
          <span className="font-semibold text-on-surface">{board.listCount ?? 0}</span> columns ·{' '}
          <span className="font-semibold text-on-surface">{board.cardCount ?? 0}</span> cards
        </span>
        <span title={`Created by ${personName(board.createdBy)}`}>updated {fmtDate(board.updatedAt)}</span>
      </div>

      <AvatarStack people={board.members} max={5} />
    </Link>
  );
}

export default function DevelopmentBoards() {
  const dispatch = useAppDispatch();
  const { boards, boardsLoading } = useAppSelector((s) => s.development);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    dispatch(fetchBoards({ archived: showArchived ? 'all' : 'false' }));
  }, [dispatch, showArchived]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? boards.filter((b) => b.name.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q)) : boards;
  }, [boards, search]);

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Development</h1>
          <p className="text-on-surface-variant mt-1">Boards for organising the team's work — drag cards between columns.</p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New board
        </Button>
      </div>

      <div className="bg-surface-container-lowest rounded-[1rem] p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
          <Input type="search" placeholder="Search boards…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="h-4 w-4 rounded accent-brand-500" />
          Show archived
        </label>
      </div>

      {boardsLoading && boards.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 rounded-[1rem] bg-surface-container-low animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[1rem] bg-surface-container-lowest py-16 text-center">
          <span className="rounded-full bg-surface-container-high p-4 text-on-surface-variant">
            {search ? <LayoutGrid className="h-6 w-6" /> : <SquareKanban className="h-6 w-6" />}
          </span>
          <p className="font-semibold text-on-surface">{search ? 'No boards match your search' : 'No boards yet'}</p>
          {!search && <p className="text-sm text-on-surface-variant">Create the first board to start organising work.</p>}
          {!search && (
            <Button onClick={() => setCreating(true)} className="gap-2 mt-2" variant="outline">
              <Plus className="h-4 w-4" /> New board
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((b) => (
            <BoardTile key={b._id} board={b} />
          ))}
        </div>
      )}

      <CreateBoardDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
