import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Bot, Send, X, Paperclip, CheckCircle2, ArrowRight, Loader2, File as FileIcon,
  RotateCcw, Pencil, Sparkles, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { useAccess } from '@/redux/hooks/useAccess';
import { fetchTicketChat, clearTicketChat } from '@/redux/slices/aiSlice';
import { createTicket } from '@/redux/slices/ticketSlice';
import { uploadAttachment } from '@/redux/slices/attachmentSlice';
import { fetchCategories } from '@/redux/slices/categorySlice';
import { fetchServiceTypes } from '@/redux/slices/serviceTypeSlice';
import { fetchCustomers } from '@/redux/slices/customerSlice';
import { validateFile, formatFileSize } from '@/api/attachmentApi';
import type { TicketChatResponse } from '@/api/aiApi';
import type { CreateTicketData, TicketType } from '@/types/ticket';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SearchSelect } from '@/components/ui/search-select';
import { cn } from '@/lib/utils';
import { ChatBubble } from './ChatBubble';
import { OptionChips, type ChipOption } from './OptionChips';
import { ReviewCard, type ReviewRow } from './ReviewCard';
import { TypingDots } from './TypingDots';

interface TicketChatBotProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Phase = 'intro' | 'extracting' | 'confirm' | 'review' | 'creating' | 'success' | 'fallback';

type Priority = 'low' | 'medium' | 'high' | 'critical';

interface ChatMessage {
  id: number;
  role: 'bot' | 'user';
  text: string;
}

interface Draft {
  subject: string;
  description: string;
  category: string; // id
  serviceType: string; // id
  department: string; // id
  priority: Priority;
  customer: string; // id (consultant customer tickets)
  ticketType: TicketType;
}

const PRIORITY_OPTIONS: ChipOption[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];
const PRIORITY_LABEL: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

const TICKET_TYPE_OPTIONS: ChipOption[] = [
  { value: 'customer', label: 'Customer' },
  { value: 'internal', label: 'Internal' },
  { value: 'rnd', label: 'R&D' },
];

const EMPTY_DRAFT: Draft = {
  subject: '', description: '', category: '', serviceType: '', department: '',
  priority: 'medium', customer: '', ticketType: 'customer',
};

const newTicketNumber = () => `TKT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Quick Ticket assistant — a bottom-right slide-in panel that walks the user
 * through raising a ticket in plain language. One AI extraction call
 * (fetchTicketChat) is wrapped by a deterministic chip-confirmation flow, then
 * the ticket is created through the existing createTicket / uploadAttachment
 * thunks. Degrades to a manual mini-flow if the AI call fails.
 */
export default function TicketChatBot({ open, onOpenChange }: TicketChatBotProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { isEmployee } = useAccess();
  const { user, userType } = useAppSelector((s) => s.auth);
  const { categories } = useAppSelector((s) => s.categories);
  const { serviceTypes } = useAppSelector((s) => s.serviceTypes);
  const { customers, loading: customersLoading } = useAppSelector((s) => s.customers);

  const [phase, setPhase] = useState<Phase>('intro');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [original, setOriginal] = useState('');
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [suggest, setSuggest] = useState<{ category?: string; serviceType?: string }>({});
  const [need, setNeed] = useState<{ category: boolean; service: boolean }>({ category: false, service: false });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; number: string } | null>(null);
  const [started, setStarted] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const msgId = useRef(0);

  const isConsultant = isEmployee;

  const addMessage = useCallback((role: 'bot' | 'user', text: string) => {
    msgId.current += 1;
    setMessages((prev) => [...prev, { id: msgId.current, role, text }]);
  }, []);

  // Lookups + greeting on first open.
  useEffect(() => {
    if (!open) return;
    dispatch(fetchCategories({ limit: 1000 }));
    dispatch(fetchServiceTypes({ isActive: true, limit: 1000 }));
    if (isConsultant) dispatch(fetchCustomers({ limit: 1000 }));
    if (!started) {
      addMessage(
        'bot',
        isConsultant
          ? "Hi! Tell me what the customer needs in your own words and I'll draft a ticket — you'll confirm the details before it's created."
          : "Hi! Describe what's going on in a sentence or two and I'll turn it into a ticket for you.",
      );
      setStarted(true);
    }
  }, [open, isConsultant, started, dispatch, addMessage]);

  // Keep the transcript scrolled to the latest line.
  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [messages, phase, open, reduce]);

  // Focus into the panel when it opens.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
      else panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, [open, phase]);

  useEffect(() => () => { dispatch(clearTicketChat()); }, [dispatch]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  // Focus trap + Esc.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null,
    );
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const categoryOptions = useMemo<ChipOption[]>(
    () => categories.map((c) => ({ value: c._id, label: c.name })),
    [categories],
  );
  const serviceTypeOptions = useMemo<ChipOption[]>(
    () => serviceTypes.filter((s) => s.isActive).map((s) => ({ value: s._id, label: s.name })),
    [serviceTypes],
  );
  const customerOptions = useMemo(
    () => customers.map((c) => ({ value: c._id, label: c.companyName, sub: c.email })),
    [customers],
  );

  const nameOf = (list: ChipOption[], id: string) => list.find((o) => o.value === id)?.label ?? '';

  // ── Step 2: extract ────────────────────────────────────────────────────────
  const send = () => {
    const text = input.trim();
    if (text.length < 8) {
      toast.info('Please add a little more detail — at least a short sentence.');
      return;
    }
    addMessage('user', text);
    setOriginal(text);
    setInput('');
    setPhase('extracting');
    dispatch(fetchTicketChat({ message: text }))
      .unwrap()
      .then((res: TicketChatResponse) => {
        const needCategory = !res.categoryId || res.confidence < 0.6;
        const needService = !res.serviceTypeId || res.confidence < 0.6;
        setDraft((d) => ({
          ...d,
          subject: res.subject,
          description: res.description,
          category: res.categoryId ?? '',
          serviceType: res.serviceTypeId ?? '',
          department: res.departmentId ?? '',
          priority: res.priority,
        }));
        setSuggest({ category: res.categoryId, serviceType: res.serviceTypeId });
        setNeed({ category: needCategory, service: needService });
        addMessage('bot', res.followUpQuestion?.trim() || "Here's what I understood — confirm the details below and we're set.");
        setPhase('confirm');
      })
      .catch(() => {
        setDraft({ ...EMPTY_DRAFT, description: text, priority: 'medium' });
        setNeed({ category: true, service: false });
        addMessage(
          'bot',
          "Sorry — I couldn't read that automatically. No problem: pick a category and priority below and I'll still create your ticket.",
        );
        setPhase('fallback');
      });
  };

  // ── Step 4 → 5: validate then review / create ───────────────────────────────
  const requireServiceType = phase === 'confirm' && need.service;

  const goToReview = () => {
    if (!draft.category) {
      toast.info('Please choose a category.');
      return;
    }
    if (requireServiceType && !draft.serviceType) {
      toast.info('Please choose a service type.');
      return;
    }
    if (isConsultant && draft.ticketType === 'customer' && !draft.customer) {
      toast.info('Please choose which customer this is for.');
      return;
    }
    setPhase('review');
  };

  const createFromFallback = () => {
    if (!draft.subject.trim()) {
      toast.info('Please add a short subject.');
      return;
    }
    if (!draft.category) {
      toast.info('Please choose a category.');
      return;
    }
    if (isConsultant && draft.ticketType === 'customer' && !draft.customer) {
      toast.info('Please choose which customer this is for.');
      return;
    }
    submit();
  };

  const submit = () => {
    setPhase('creating');
    const data: CreateTicketData = {
      ticketNumber: newTicketNumber(),
      subject: draft.subject.trim() || original.slice(0, 120),
      description: draft.description.trim() || original,
      category: draft.category,
      priority: draft.priority,
    };
    if (draft.serviceType) data.serviceType = draft.serviceType;
    if (draft.department) data.department = draft.department;
    if (isConsultant) {
      data.ticketType = draft.ticketType;
      if (draft.ticketType === 'customer') {
        data.customer = draft.customer;
      } else if (user?._id) {
        data.requestedBy = user._id;
      }
    }
    // Customer users: the backend auto-sets `customer` from the authenticated account.

    dispatch(createTicket(data))
      .unwrap()
      .then(async (result) => {
        if (attachments.length > 0 && user) {
          await Promise.all(
            attachments.map((file) =>
              dispatch(
                uploadAttachment({
                  ticketId: result._id,
                  file,
                  uploadedByUserId: user._id,
                  uploadedByUserType: userType as 'customer' | 'consultant' | 'team_member',
                }),
              ),
            ),
          );
        }
        setCreated({ id: result._id, number: result.ticketNumber });
        setPhase('success');
      })
      .catch(() => {
        // createTicket already toasts the error; return to the editable step.
        setPhase(started && draft.subject ? 'review' : 'fallback');
      });
  };

  const reset = () => {
    dispatch(clearTicketChat());
    setPhase('intro');
    setMessages([]);
    setInput('');
    setOriginal('');
    setDraft(EMPTY_DRAFT);
    setSuggest({});
    setNeed({ category: false, service: false });
    setAttachments([]);
    setAttachmentError(null);
    setCreated(null);
    setStarted(false);
  };

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setAttachmentError(null);
    const ok: File[] = [];
    const errors: string[] = [];
    Array.from(files).forEach((f) => {
      const v = validateFile(f);
      if (v.valid) ok.push(f);
      else errors.push(`${f.name}: ${v.error}`);
    });
    if (errors.length) setAttachmentError(errors.join('; '));
    if (ok.length) setAttachments((prev) => [...prev, ...ok]);
    e.target.value = '';
  };

  const reviewRows = useMemo<ReviewRow[]>(() => {
    const rows: ReviewRow[] = [
      { icon: 'category', label: 'Category', value: nameOf(categoryOptions, draft.category) },
      { icon: 'serviceType', label: 'Service type', value: nameOf(serviceTypeOptions, draft.serviceType) },
      { icon: 'priority', label: 'Priority', value: PRIORITY_LABEL[draft.priority] },
    ];
    if (isConsultant) {
      rows.push({
        icon: 'customer',
        label: draft.ticketType === 'customer' ? 'Customer' : 'Type',
        value: draft.ticketType === 'customer' ? nameOf(customerOptions, draft.customer) : TICKET_TYPE_OPTIONS.find((t) => t.value === draft.ticketType)?.label ?? '',
      });
    }
    return rows;
  }, [draft, categoryOptions, serviceTypeOptions, customerOptions, isConsultant]);

  const spring = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 280, damping: 28 };

  // ── Interactive controls shared by the confirm + fallback steps ─────────────
  const confirmControls = (
    <div className="space-y-4">
      {(phase === 'fallback' || need.category) && (
        <OptionChips
          label="Category"
          options={categoryOptions}
          value={draft.category}
          suggested={suggest.category}
          onChange={(v) => setDraft((d) => ({ ...d, category: v }))}
        />
      )}
      {((phase === 'confirm' && need.service) || (phase === 'fallback' && serviceTypeOptions.length > 0)) && (
        <OptionChips
          label={phase === 'fallback' ? 'Service type (optional)' : 'Service type'}
          options={serviceTypeOptions}
          value={draft.serviceType}
          suggested={suggest.serviceType}
          onChange={(v) => setDraft((d) => ({ ...d, serviceType: v }))}
        />
      )}
      <OptionChips
        label="Priority"
        options={PRIORITY_OPTIONS}
        value={draft.priority}
        onChange={(v) => setDraft((d) => ({ ...d, priority: v as Priority }))}
      />
      {isConsultant && (
        <>
          <OptionChips
            label="Ticket type"
            options={TICKET_TYPE_OPTIONS}
            value={draft.ticketType}
            onChange={(v) => setDraft((d) => ({ ...d, ticketType: v as TicketType }))}
          />
          {draft.ticketType === 'customer' && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-on-surface-variant">Customer</p>
              <SearchSelect
                value={draft.customer}
                onChange={(v) => setDraft((d) => ({ ...d, customer: v }))}
                options={customerOptions}
                placeholder={customersLoading ? 'Loading customers…' : 'Choose a customer…'}
                disabled={customersLoading}
              />
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Mobile backdrop (kept below the panel). */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-30 bg-on-surface/20 backdrop-blur-[1px] sm:hidden"
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Quick Ticket assistant"
            onKeyDown={onKeyDown}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            transition={spring}
            className={cn(
              'fixed z-40 flex flex-col overflow-hidden',
              'bottom-4 right-4 left-4 sm:left-auto',
              'w-auto sm:w-[400px] h-[min(80vh,600px)]',
              'rounded-3xl border border-outline-variant/30 shadow-2xl',
              'bg-surface-container-lowest/90 backdrop-blur-xl',
            )}
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 border-b border-outline-variant/20 px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-gradient text-primary-foreground">
                <Bot className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-on-surface">Quick Ticket</p>
                <p className="text-[11px] text-on-surface-variant">Describe it — I'll handle the form</p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close assistant"
                className="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Transcript + interactive area */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m) => (
                <ChatBubble key={m.id} role={m.role}>
                  {m.text}
                </ChatBubble>
              ))}

              {phase === 'extracting' && (
                <ChatBubble role="bot">
                  <TypingDots />
                </ChatBubble>
              )}

              {(phase === 'confirm' || phase === 'fallback') && (
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={spring}
                  className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-3.5"
                >
                  {phase === 'fallback' && (
                    <div className="mb-3 space-y-1.5">
                      <label htmlFor="qt-subject" className="text-xs font-semibold text-on-surface-variant">
                        Subject
                      </label>
                      <input
                        id="qt-subject"
                        value={draft.subject}
                        onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
                        placeholder="A short summary of the issue"
                        className="h-9 w-full rounded-[0.5rem] bg-surface-container-high px-3 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50 focus-visible:ring-2 focus-visible:ring-primary/40"
                      />
                    </div>
                  )}
                  {confirmControls}
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => { setPhase('intro'); }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-on-surface-variant transition-colors hover:text-on-surface"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Rewrite
                    </button>
                    <Button
                      size="sm"
                      onClick={phase === 'fallback' ? createFromFallback : goToReview}
                      className="gap-1.5"
                    >
                      {phase === 'fallback' ? 'Create ticket' : 'Review'}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {phase === 'review' && (
                <div className="space-y-3">
                  <ReviewCard subject={draft.subject} description={draft.description} rows={reviewRows} />

                  {/* Attachments */}
                  <div className="space-y-2">
                    <input id="qt-files" type="file" multiple onChange={onFiles} className="hidden" />
                    <label htmlFor="qt-files">
                      <Button variant="outline" size="sm" className="w-full cursor-pointer gap-1.5" asChild>
                        <span>
                          <Paperclip className="h-3.5 w-3.5" /> Attach files (optional)
                        </span>
                      </Button>
                    </label>
                    {attachmentError && <p className="text-xs text-error">{attachmentError}</p>}
                    {attachments.map((f, i) => (
                      <div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg bg-surface-container-low px-2.5 py-1.5">
                        <FileIcon className="h-3.5 w-3.5 shrink-0 text-on-surface-variant" />
                        <span className="min-w-0 flex-1 truncate text-xs text-on-surface">{f.name}</span>
                        <span className="shrink-0 text-[10px] text-on-surface-variant">{formatFileSize(f.size)}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${f.name}`}
                          onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                          className="shrink-0 rounded p-0.5 text-on-surface-variant hover:text-error"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setPhase('confirm')}
                      className="inline-flex items-center gap-1 text-xs font-medium text-on-surface-variant transition-colors hover:text-on-surface"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <Button size="sm" onClick={submit} className="gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> Create ticket
                    </Button>
                  </div>
                </div>
              )}

              {phase === 'creating' && (
                <ChatBubble role="bot">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating your ticket…
                  </span>
                </ChatBubble>
              )}

              {phase === 'success' && created && (
                <motion.div
                  initial={reduce ? false : { opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={spring}
                  className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 text-center"
                >
                  <motion.span
                    initial={reduce ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 18, delay: 0.1 }}
                    className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"
                  >
                    <CheckCircle2 className="h-7 w-7" />
                  </motion.span>
                  <p className="text-sm font-semibold text-on-surface">Ticket created</p>
                  <p className="mt-0.5 font-mono text-xs text-on-surface-variant">{created.number}</p>
                  <div className="mt-4 flex flex-col gap-2">
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => { navigate(`/tickets/view/${created.id}`); close(); }}
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> View ticket
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1.5" onClick={reset}>
                      <RotateCcw className="h-3.5 w-3.5" /> Start another
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Composer — only on the intro step */}
            {phase === 'intro' && (
              <div className="border-t border-outline-variant/20 p-3">
                <div className="flex items-end gap-2">
                  <Textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    rows={2}
                    aria-label="Describe your issue"
                    placeholder="Tell me what's going on…"
                    className="max-h-28 min-h-[44px] flex-1 resize-none"
                  />
                  <Button
                    size="icon"
                    onClick={send}
                    disabled={input.trim().length < 8}
                    aria-label="Send"
                    className="shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-1.5 px-1 text-[10px] text-on-surface-variant">
                  Enter to send · Shift+Enter for a new line
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
