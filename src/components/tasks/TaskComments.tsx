import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTaskComments, createTaskComment, updateTaskComment, deleteTaskComment, clearTaskComments } from '@/redux/slices/taskCommentSlice';
import { Button } from '@/components/ui/button';
import { MessageSquare, RefreshCw, Send, Pencil, Trash2, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import type { TaskComment } from '@/api/taskCommentApi';

const MySwal = withReactContent(Swal);

interface Props { taskId: string; }

export default function TaskComments({ taskId }: Props) {
  const dispatch = useAppDispatch();
  const { comments, loading, total } = useAppSelector((s) => s.taskComments);
  const { user, userType } = useAppSelector((s) => s.auth);

  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const isConsultant = userType === 'consultant' || userType === 'team_member';

  useEffect(() => {
    dispatch(fetchTaskComments(taskId));
    return () => { dispatch(clearTaskComments()); };
  }, [taskId, dispatch]);

  const load = () => dispatch(fetchTaskComments(taskId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user || !isConsultant) return;
    setSubmitting(true);
    try {
      await dispatch(createTaskComment({
        task: taskId,
        commentText: text.trim(),
        images: [],
      })).unwrap();
      setText('');
    } catch { /* toast shown by slice */ }
    finally { setSubmitting(false); }
  };

  const startEdit = (c: TaskComment) => { setEditingId(c._id); setEditText(c.commentText); };
  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  const saveEdit = async (id: string) => {
    if (!editText.trim()) return;
    try {
      await dispatch(updateTaskComment({ id, commentText: editText.trim() })).unwrap();
      setEditingId(null);
    } catch { /* handled */ }
  };

  const handleDelete = async (id: string) => {
    const r = await MySwal.fire({
      title: 'Delete comment?',
      html: `<p style="color:#BA1A1A">This action cannot be undone.</p>`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#BA1A1A', cancelButtonColor: '#434653',
      confirmButtonText: 'Delete', cancelButtonText: 'Cancel', reverseButtons: true,
    });
    if (r.isConfirmed) dispatch(deleteTaskComment(id));
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-on-surface-variant" />
          <span className="text-sm font-bold text-on-surface">Comments</span>
          <span className="px-1.5 py-0.5 rounded-full bg-surface-container-high text-xs font-semibold text-on-surface-variant">{total}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => load()} disabled={loading} className="gap-1.5 text-on-surface-variant h-7">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Add comment form */}
      {isConsultant && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment…"
            rows={3}
            className="w-full px-3 py-2 rounded-[0.75rem] border border-outline-variant bg-surface text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={submitting || !text.trim()} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              {submitting ? 'Posting…' : 'Post Comment'}
            </Button>
          </div>
        </form>
      )}

      {/* Comment list */}
      <div className="space-y-3">
        {loading && comments.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 bg-surface-container-high rounded-[1rem]">
            <MessageSquare className="mx-auto h-10 w-10 text-on-surface-variant/30 mb-3" />
            <p className="text-on-surface font-medium text-sm">No comments yet</p>
            <p className="text-xs text-on-surface-variant mt-1">Be the first to comment on this task</p>
          </div>
        ) : (
          comments.map((c) => {
            const authorName = c.commentBy
              ? `${c.commentBy.firstName} ${c.commentBy.lastName}`
              : 'Unknown';
            const initials = c.commentBy
              ? `${c.commentBy.firstName?.[0] ?? ''}${c.commentBy.lastName?.[0] ?? ''}`.toUpperCase()
              : '?';
            const isOwn = c.commentByUserId === user?._id;

            return (
              <div key={c._id} className="flex gap-3 group">
                <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-xs font-bold text-brand-700 flex-shrink-0 mt-0.5">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-on-surface">{authorName}</span>
                    <span className="text-xs text-on-surface-variant">{fmtDate(c.createdAt)}</span>
                  </div>

                  {editingId === c._id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 rounded-[0.75rem] border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(c._id)} disabled={!editText.trim()} className="gap-1 h-7 text-xs">
                          <Check className="h-3 w-3" />Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit} className="gap-1 h-7 text-xs">
                          <X className="h-3 w-3" />Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{c.commentText}</p>
                  )}
                </div>

                {isOwn && editingId !== c._id && (
                  <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                    <Button size="icon-sm" variant="ghost" className="h-7 w-7 text-on-surface-variant hover:text-on-surface" onClick={() => startEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon-sm" variant="ghost" className="h-7 w-7 text-on-surface-variant hover:text-error" onClick={() => handleDelete(c._id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
