import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, CheckSquare, Circle, Flag, MessageSquare, Plus, Send, Tag, Trash2, User, X } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CustomSelect } from '@/components/ui/custom-select';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  addChecklistItem,
  addComment,
  deleteCard,
  deleteChecklistItem,
  deleteComment,
  fetchComments,
  updateCard,
  updateChecklistItem,
} from '@/redux/slices/developmentSlice';
import { CARD_PRIORITIES, PRIORITY_LABELS, type CardPriority, type DevBoard } from '@/types/development.types';
import { cn } from '@/lib/utils';
import { LabelChip } from './LabelChip';
import { PersonAvatar } from './PersonAvatar';
import { personName } from '@/lib/development';

const MySwal = withReactContent(Swal);

interface Props {
  cardId: string | null;
  board: DevBoard;
  canAdmin: boolean;
  onClose: () => void;
}

const toInputDate = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function Section({ icon: Icon, title, children, aside }: { icon: React.ElementType; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-bold text-on-surface">
          <Icon className="h-4 w-4 text-on-surface-variant" /> {title}
        </h4>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function CardDetailDialog({ cardId, board, canAdmin, onClose }: Props) {
  const dispatch = useAppDispatch();
  const card = useAppSelector((s) => (cardId ? s.development.cardsById[cardId] : undefined));
  const { comments, commentsLoading } = useAppSelector((s) => s.development);
  const me = useAppSelector((s) => s.auth.user?._id);
  const lists = useAppSelector((s) => s.development.lists);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [newItem, setNewItem] = useState('');
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!card) return;
    setTitle(card.title);
    setDescription(card.description ?? '');
  }, [card?._id, card?.title, card?.description]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cardId) dispatch(fetchComments(cardId));
  }, [cardId, dispatch]);

  const memberOptions = useMemo(
    () => [{ value: '', label: 'Unassigned' }, ...board.members.map((m) => ({ value: m._id, label: personName(m) }))],
    [board.members],
  );

  if (!card) return null;

  const save = (data: Parameters<typeof updateCard>[0]['data']) => dispatch(updateCard({ id: card._id, data }));
  const listName = lists.find((l) => l._id === card.list)?.name ?? '';
  const done = Boolean(card.completedAt);
  const checked = card.checklist.filter((c) => c.done).length;
  const progress = card.checklist.length ? Math.round((checked / card.checklist.length) * 100) : 0;

  const commitTitle = () => {
    const t = title.trim();
    if (!t) return setTitle(card.title);
    if (t !== card.title) save({ title: t });
  };

  const commitDescription = () => {
    if (description !== (card.description ?? '')) save({ description });
  };

  const toggleLabel = (labelId: string) => {
    const has = card.labels.includes(labelId);
    save({ labels: has ? card.labels.filter((l) => l !== labelId) : [...card.labels, labelId] });
  };

  const submitItem = async () => {
    const t = newItem.trim();
    if (!t) return;
    await dispatch(addChecklistItem({ cardId: card._id, text: t }));
    setNewItem('');
  };

  const submitComment = async () => {
    const t = newComment.trim();
    if (!t) return;
    setSending(true);
    try {
      await dispatch(addComment({ cardId: card._id, text: t })).unwrap();
      setNewComment('');
    } catch {
      /* toast shown by slice */
    } finally {
      setSending(false);
    }
  };

  const confirmDeleteCard = async () => {
    const r = await MySwal.fire({
      title: 'Delete this card?',
      html: `<p style="color:#BA1A1A">"${card.title}" and its comments will be removed.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#BA1A1A',
      cancelButtonColor: '#434653',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });
    if (r.isConfirmed) {
      await dispatch(deleteCard(card._id));
      onClose();
    }
  };

  return (
    <Dialog open={Boolean(cardId)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass max-h-[90vh] overflow-y-auto sm:max-w-3xl p-0">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_15rem]">
          {/* Main column */}
          <div className="space-y-6 p-6">
            <div className="space-y-1 pr-8">
              <p className="label-technical">
                in <span className="text-on-surface">{listName}</span>
              </p>
              <DialogTitle asChild>
                <textarea
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      (e.target as HTMLTextAreaElement).blur();
                    }
                  }}
                  rows={1}
                  maxLength={200}
                  className={cn(
                    'w-full resize-none bg-transparent text-xl font-bold leading-snug text-on-surface outline-none rounded-[0.5rem] px-1 -mx-1 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30',
                    done && 'line-through opacity-70',
                  )}
                />
              </DialogTitle>
              <DialogDescription className="sr-only">Card details</DialogDescription>
            </div>

            {/* Labels on the card */}
            {board.labels.length > 0 && (
              <Section icon={Tag} title="Labels">
                <div className="flex flex-wrap gap-1.5">
                  {board.labels.map((l) => (
                    <LabelChip key={l._id} label={l} active={card.labels.includes(l._id)} onClick={() => toggleLabel(l._id)} />
                  ))}
                </div>
              </Section>
            )}

            <Section icon={MessageSquare} title="Description">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={commitDescription}
                rows={4}
                maxLength={10000}
                placeholder="Add more detail — acceptance criteria, links, notes…"
                className="bg-surface-container-lowest"
              />
            </Section>

            <Section
              icon={CheckSquare}
              title="Checklist"
              aside={card.checklist.length > 0 ? <span className="text-xs font-semibold text-on-surface-variant">{progress}%</span> : null}
            >
              {card.checklist.length > 0 && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                  <div className={cn('h-full rounded-full transition-all', progress === 100 ? 'bg-emerald-500' : 'bg-primary')} style={{ width: `${progress}%` }} />
                </div>
              )}
              <ul className="space-y-1">
                {card.checklist.map((item) => (
                  <li key={item._id} className="group flex items-start gap-2 rounded-[0.5rem] px-1 py-1 hover:bg-surface-container-lowest">
                    <button
                      type="button"
                      onClick={() => dispatch(updateChecklistItem({ cardId: card._id, itemId: item._id, done: !item.done }))}
                      aria-label={item.done ? 'Mark not done' : 'Mark done'}
                      className="mt-0.5 text-on-surface-variant hover:text-primary"
                    >
                      {item.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4" />}
                    </button>
                    <span className={cn('flex-1 text-sm text-on-surface', item.done && 'line-through text-on-surface-variant')}>{item.text}</span>
                    <button
                      type="button"
                      onClick={() => dispatch(deleteChecklistItem({ cardId: card._id, itemId: item._id }))}
                      aria-label="Remove item"
                      className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitItem()}
                  maxLength={300}
                  placeholder="Add an item…"
                  className="flex-1 rounded-[0.75rem] bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none ghost-border focus:ring-2 focus:ring-primary/30"
                />
                <Button type="button" size="sm" variant="outline" onClick={submitItem} disabled={!newItem.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </Section>

            <Section icon={MessageSquare} title="Comments" aside={<span className="text-xs font-semibold text-on-surface-variant">{comments.length}</span>}>
              <div className="space-y-3">
                {commentsLoading && comments.length === 0 && <p className="text-sm text-on-surface-variant">Loading…</p>}
                {comments.map((c) => {
                  const mine = c.author?._id === me;
                  return (
                    <div key={c._id} className="flex gap-2">
                      <PersonAvatar person={c.author} />
                      <div className="min-w-0 flex-1 rounded-[0.75rem] bg-surface-container-lowest px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-on-surface">{personName(c.author)}</span>
                          <span className="flex items-center gap-2 text-[11px] text-on-surface-variant">
                            {fmtDateTime(c.createdAt)}
                            {(mine || canAdmin) && (
                              <button type="button" onClick={() => dispatch(deleteComment(c._id))} aria-label="Delete comment" className="hover:text-error">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-on-surface">{c.text}</p>
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitComment();
                    }}
                    rows={2}
                    maxLength={5000}
                    placeholder="Write a comment… (Ctrl+Enter to send)"
                    className="bg-surface-container-lowest"
                  />
                  <Button type="button" onClick={submitComment} disabled={sending || !newComment.trim()} size="icon" aria-label="Send comment">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Section>
          </div>

          {/* Side column */}
          <aside className="space-y-5 border-t md:border-t-0 md:border-l border-outline-variant/20 bg-surface-container-low/60 p-5">
            <div className="space-y-1.5">
              <p className="label-technical flex items-center gap-1">
                <User className="h-3 w-3" /> Assignee
              </p>
              <CustomSelect value={card.assignedTo?._id ?? ''} onChange={(v) => save({ assignedTo: v || null })} options={memberOptions} placeholder="Unassigned" />
              {card.assignedTo && (
                <div className="flex items-center gap-2 pt-1 text-sm text-on-surface">
                  <PersonAvatar person={card.assignedTo} /> {personName(card.assignedTo)}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="label-technical flex items-center gap-1">
                <Flag className="h-3 w-3" /> Priority
              </p>
              <CustomSelect
                value={card.priority}
                onChange={(v) => save({ priority: v as CardPriority })}
                options={CARD_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
              />
            </div>

            <div className="space-y-1.5">
              <p className="label-technical flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> Due date
              </p>
              <input
                type="date"
                value={toInputDate(card.dueDate)}
                onChange={(e) => save({ dueDate: e.target.value || null })}
                className="w-full rounded-[0.5rem] bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none ghost-border focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-2 pt-2">
              <Button
                type="button"
                variant={done ? 'outline' : 'default'}
                className="w-full gap-2"
                onClick={() => save({ completed: !done })}
              >
                <CheckCircle2 className="h-4 w-4" /> {done ? 'Mark as not done' : 'Mark as done'}
              </Button>
              <Button type="button" variant="ghost" className="w-full gap-2 text-error hover:text-error" onClick={confirmDeleteCard}>
                <Trash2 className="h-4 w-4" /> Delete card
              </Button>
            </div>

            <div className="space-y-1 pt-2 text-[11px] text-on-surface-variant">
              <p>Created by {personName(card.createdBy)}</p>
              <p>{fmtDateTime(card.createdAt)}</p>
              {card.completedAt && <p className="text-emerald-600 dark:text-emerald-300">Done {fmtDateTime(card.completedAt)}</p>}
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
