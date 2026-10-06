import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, ArchiveRestore, Check, Pencil, Plus, Tag, Ticket, Trash2, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConsultantSelect } from '@/components/ui/consultant-select';
import { CustomSelect } from '@/components/ui/custom-select';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { useAccess } from '@/redux/hooks/useAccess';
import { fetchDepartments } from '@/redux/slices/departmentSlice';
import { useDevelopers } from '@/redux/hooks/useDevelopers';
import { addLabel, deleteBoard, deleteLabel, fetchBoardFull, setBoardMembers, setTicketRule, updateBoard, updateLabel } from '@/redux/slices/developmentSlice';
import type { DevBoard, DevLabel } from '@/types/development.types';
import { cn } from '@/lib/utils';
import { contrastText } from '@/lib/development';

const MySwal = withReactContent(Swal);

const PALETTE = ['#2563eb', '#0891b2', '#059669', '#65a30d', '#ca8a04', '#ea580c', '#dc2626', '#db2777', '#7c3aed', '#64748b'];

type Tab = 'general' | 'members' | 'labels' | 'tickets';

const refId = (v: { _id: string } | string | null | undefined) => (v && typeof v === 'object' ? v._id : v ?? '');

interface Props {
  board: DevBoard;
  open: boolean;
  initialTab?: Tab;
  onOpenChange: (open: boolean) => void;
}

function LabelRow({ label, onSave, onDelete }: { label: DevLabel; onSave: (d: { name?: string; color?: string }) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(label.name);
  const [color, setColor] = useState(label.color);

  useEffect(() => {
    setName(label.name);
    setColor(label.color);
  }, [label.name, label.color]);

  const commit = () => {
    const n = name.trim();
    if (!n) return;
    if (n !== label.name || color !== label.color) onSave({ name: n, color });
    setEditing(false);
  };

  return (
    <li className="flex items-center gap-2 rounded-[0.75rem] bg-surface-container-lowest px-2 py-1.5">
      {editing ? (
        <>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0" aria-label="Label colour" />
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') setEditing(false);
            }}
            maxLength={40}
            className="min-w-0 flex-1 rounded-[0.5rem] bg-surface-container-low px-2 py-1 text-sm text-on-surface outline-none ring-2 ring-primary/30"
          />
          <button type="button" onClick={commit} aria-label="Save" className="rounded p-1 text-primary hover:bg-surface-container-high">
            <Check className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setEditing(false)} aria-label="Cancel" className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high">
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <span className="inline-flex min-w-0 max-w-[60%] truncate rounded-md px-2 py-1 text-[11px] font-semibold" style={{ backgroundColor: label.color, color: contrastText(label.color) }}>
            {label.name}
          </span>
          <span className="flex-1" />
          <button type="button" onClick={() => setEditing(true)} aria-label="Edit label" className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onDelete} aria-label="Delete label" className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-error">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </li>
  );
}

export function BoardSettingsDialog({ board, open, initialTab = 'general', onOpenChange }: Props) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { developers, loading } = useDevelopers();

  const [tab, setTab] = useState<Tab>(initialTab);
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description ?? '');
  const [members, setMembers] = useState<string[]>(board.members.map((m) => m._id));
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState(PALETTE[0]);
  const [saving, setSaving] = useState(false);
  // Linked tickets — only admins and the development manager set them
  const { seesAllBoards } = useAccess();
  const lists = useAppSelector((s) => s.development.lists);
  const departments = useAppSelector((s) => s.departments.departments);
  const [ruleDepartment, setRuleDepartment] = useState('');
  const [ruleEmployee, setRuleEmployee] = useState('');
  const [ruleList, setRuleList] = useState('');

  // Reset the form only when the dialog opens — not on every board update, or
  // saving one tab (which refreshes the board) would jump back to General and
  // wipe unsaved edits on the others.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setTab(initialTab);
      setName(board.name);
      setDescription(board.description ?? '');
      setMembers(board.members.map((m) => m._id));
      setRuleDepartment(refId(board.ticketRule?.department));
      setRuleEmployee(refId(board.ticketRule?.employee));
      setRuleList(board.ticketRule?.list ?? '');
    }
    wasOpen.current = open;
  }, [open, initialTab, board]);

  // Always load the full list: another page may have left a filtered one in the store
  const ticketsTabOpen = open && seesAllBoards && tab === 'tickets';
  useEffect(() => {
    if (ticketsTabOpen) dispatch(fetchDepartments({ limit: 1000 } as never));
  }, [ticketsTabOpen, dispatch]);

  const creatorId = board.createdBy._id;
  const roster = useMemo(() => developers.filter((d) => d._id !== creatorId), [developers, creatorId]);

  const saveGeneral = async () => {
    setSaving(true);
    try {
      await dispatch(updateBoard({ id: board._id, data: { name: name.trim(), description: description.trim() } })).unwrap();
      onOpenChange(false);
    } catch {
      /* toast shown by slice */
    } finally {
      setSaving(false);
    }
  };

  const saveMembers = async () => {
    setSaving(true);
    try {
      await dispatch(setBoardMembers({ id: board._id, members })).unwrap();
      onOpenChange(false);
    } catch {
      /* toast shown by slice */
    } finally {
      setSaving(false);
    }
  };

  const saveTicketRule = async (remove = false) => {
    setSaving(true);
    try {
      const result = await dispatch(
        setTicketRule({
          id: board._id,
          rule: remove ? null : { department: ruleDepartment, employee: ruleEmployee, list: ruleList || null },
        }),
      ).unwrap();
      toast.success(result.message ?? (remove ? 'Ticket link removed' : 'Ticket link saved'));
      // Imported tickets arrived as new cards — reload the board to show them
      if (result.imported > 0) dispatch(fetchBoardFull(board._id));
      if (remove) {
        setRuleDepartment('');
        setRuleEmployee('');
        setRuleList('');
      }
    } catch {
      /* toast shown by slice */
    } finally {
      setSaving(false);
    }
  };

  const submitLabel = async () => {
    const n = newLabel.trim();
    if (!n) return;
    await dispatch(addLabel({ boardId: board._id, name: n, color: newColor }));
    setNewLabel('');
  };

  const confirmDeleteLabel = async (label: DevLabel) => {
    const r = await MySwal.fire({
      title: `Remove label "${label.name}"?`,
      text: 'It will be taken off every card on this board.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#BA1A1A',
      cancelButtonColor: '#434653',
      confirmButtonText: 'Remove',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });
    if (r.isConfirmed) dispatch(deleteLabel({ boardId: board._id, labelId: label._id }));
  };

  const toggleArchive = async () => {
    await dispatch(updateBoard({ id: board._id, data: { archived: !board.archived } }));
  };

  const confirmDeleteBoard = async () => {
    const r = await MySwal.fire({
      title: `Delete "${board.name}"?`,
      html: `<p style="color:#BA1A1A">Every column, card and comment on it will be deleted. This cannot be undone.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#BA1A1A',
      cancelButtonColor: '#434653',
      confirmButtonText: 'Delete board',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });
    if (r.isConfirmed) {
      await dispatch(deleteBoard(board._id));
      onOpenChange(false);
      navigate('/development');
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'general', label: 'General', icon: Pencil },
    { key: 'members', label: 'Members', icon: Users },
    { key: 'labels', label: 'Labels', icon: Tag },
    ...(seesAllBoards ? [{ key: 'tickets' as Tab, label: 'Tickets', icon: Ticket }] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Board settings</DialogTitle>
          <DialogDescription className="sr-only">Edit the board name, members and labels</DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 rounded-[0.75rem] bg-surface-container-low p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-[0.5rem] px-3 py-1.5 text-sm font-semibold transition-colors',
                tab === t.key ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'general' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bs-name">Name</Label>
              <Input id="bs-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bs-desc">Description</Label>
              <Textarea id="bs-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={toggleArchive}>
                  {board.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                  {board.archived ? 'Restore' : 'Archive'}
                </Button>
                <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-error hover:text-error" onClick={confirmDeleteBoard}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
              <Button type="button" onClick={saveGeneral} disabled={saving || !name.trim()}>
                Save
              </Button>
            </div>
          </div>
        )}

        {tab === 'members' && (
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">
              Members can see the board and work its cards. <span className="font-semibold text-on-surface">{board.createdBy.firstName} {board.createdBy.lastName}</span> created it and always stays a member.
            </p>
            <ConsultantSelect
              multiple
              consultants={roster}
              loading={loading}
              value={members.filter((id) => id !== creatorId)}
              onChange={(ids) => setMembers([creatorId, ...ids])}
              placeholder="Add teammates…"
            />
            <div className="flex justify-end">
              <Button type="button" onClick={saveMembers} disabled={saving}>
                Save members
              </Button>
            </div>
          </div>
        )}

        {tab === 'tickets' && seesAllBoards && (
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">
              Tickets of this department assigned to this employee get a card on the board automatically. Saving also
              adds the matching tickets that are still open. Cards link to their ticket; moving a card does not change the ticket.
            </p>
            <div className="space-y-2">
              <Label>Department</Label>
              <CustomSelect
                value={ruleDepartment}
                onChange={setRuleDepartment}
                options={departments.map((d) => ({ value: d._id, label: d.name }))}
                placeholder="Choose a department"
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned to</Label>
              <ConsultantSelect consultants={developers} loading={loading} value={ruleEmployee} onChange={setRuleEmployee} placeholder="Choose an employee…" />
              <p className="text-xs text-on-surface-variant">Only people who can open the Development module are listed.</p>
            </div>
            <div className="space-y-2">
              <Label>Add cards to column</Label>
              <CustomSelect
                value={ruleList}
                onChange={setRuleList}
                options={[{ value: '', label: 'First column' }, ...lists.map((l) => ({ value: l._id, label: l.name }))]}
                placeholder="First column"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              {board.ticketRule ? (
                <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-error hover:text-error" onClick={() => saveTicketRule(true)} disabled={saving}>
                  <X className="h-4 w-4" /> Remove link
                </Button>
              ) : (
                <span />
              )}
              <Button type="button" onClick={() => saveTicketRule()} disabled={saving || !ruleDepartment || !ruleEmployee}>
                Save link
              </Button>
            </div>
          </div>
        )}

        {tab === 'labels' && (
          <div className="space-y-4">
            <ul className="space-y-1.5">
              {board.labels.length === 0 && <li className="text-sm text-on-surface-variant">No labels yet — add one below.</li>}
              {board.labels.map((l) => (
                <LabelRow
                  key={l._id}
                  label={l}
                  onSave={(d) => dispatch(updateLabel({ boardId: board._id, labelId: l._id, ...d }))}
                  onDelete={() => confirmDeleteLabel(l)}
                />
              ))}
            </ul>
            <div className="space-y-2 rounded-[0.75rem] bg-surface-container-low p-3">
              <div className="flex flex-wrap gap-1.5">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    aria-label={`Colour ${c}`}
                    style={{ backgroundColor: c }}
                    className={cn('h-6 w-6 rounded-md transition-transform', newColor === c && 'ring-2 ring-offset-2 ring-on-surface scale-110')}
                  />
                ))}
                <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0" aria-label="Custom colour" />
              </div>
              <div className="flex gap-2">
                <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitLabel()} maxLength={40} placeholder="Label name (bug, feature, refactor…)" />
                <Button type="button" onClick={submitLabel} disabled={!newLabel.trim()} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
