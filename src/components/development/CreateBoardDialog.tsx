import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConsultantSelect } from '@/components/ui/consultant-select';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { useDevelopers } from '@/redux/hooks/useDevelopers';
import { createBoard, createList } from '@/redux/slices/developmentSlice';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_LISTS = ['To Do', 'In Progress', 'Review', 'Done'];

export function CreateBoardDialog({ open, onOpenChange }: Props) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const me = useAppSelector((s) => s.auth.user?._id);
  const { developers, loading } = useDevelopers();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [withDefaults, setWithDefaults] = useState(true);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setDescription('');
    setMembers([]);
    setWithDefaults(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const board = await dispatch(createBoard({ name: name.trim(), description: description.trim(), members })).unwrap();
      if (withDefaults) {
        for (const listName of DEFAULT_LISTS) await dispatch(createList({ boardId: board._id, name: listName }));
      }
      reset();
      onOpenChange(false);
      navigate(`/development/boards/${board._id}`);
    } catch {
      /* toast shown by slice */
    } finally {
      setSaving(false);
    }
  };

  const others = developers.filter((d) => d._id !== me);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass sm:max-w-lg">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>New board</DialogTitle>
            <DialogDescription>A board holds columns of cards. You are added as a member automatically.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="board-name">Name</Label>
            <Input id="board-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sprint 12, Mobile app, Bugs" autoFocus maxLength={120} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="board-desc">Description</Label>
            <Textarea id="board-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional" maxLength={2000} />
          </div>

          <div className="space-y-2">
            <Label>Members</Label>
            <ConsultantSelect multiple consultants={others} loading={loading} value={members} onChange={setMembers} placeholder="Add teammates…" />
          </div>

          <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
            <input type="checkbox" checked={withDefaults} onChange={(e) => setWithDefaults(e.target.checked)} className="h-4 w-4 rounded accent-brand-500" />
            Start with To Do / In Progress / Review / Done columns
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Creating…' : 'Create board'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
