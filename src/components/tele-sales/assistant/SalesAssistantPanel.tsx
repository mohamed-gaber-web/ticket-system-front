import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Mail, MessageCircle, Send, Search, Package, FileText, Loader2, AlertTriangle, Zap,
  History, Eye, RefreshCw, CheckCircle2, XCircle, Clock, Building2, Tag, DollarSign, BookOpen, X,
} from 'lucide-react';
import * as salesAssistantApi from '@/api/salesAssistantApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchSelect } from '@/components/ui/search-select';
import GmailCompose from '@/components/tele-sales/GmailCompose';
import { ProductDetailDialog } from './ProductDetailDialog';
import { WhatsAppPreviewDialog } from './WhatsAppPreviewDialog';
import { apiErrorMessage, formatPrice } from '@/lib/salesAssistant';
import { cn } from '@/lib/utils';
import type { Lead, LeadEmail, SendLeadEmailData } from '@/types/teleSales.types';
import type {
  AssistantOverview, CommunicationLog, CommunicationMeta, PreparedMessage, Product,
  QuickAction, QuickActionKey, SalesDocument, TemplateChannel,
} from '@/types/salesAssistant.types';
import { SALES_DOCUMENT_TYPE_LABELS, TEMPLATE_PURPOSE_LABELS } from '@/types/salesAssistant.types';

interface SalesAssistantPanelProps {
  lead: Lead;
  agentEmail?: string;
  /** Let the lead page refresh its Emails tab after an assistant email goes out. */
  onEmailSent?: (email: LeadEmail) => void;
}

const ACTION_ICONS: Record<QuickActionKey, React.ReactNode> = {
  company_profile: <Building2 className="w-4 h-4" />,
  catalog: <BookOpen className="w-4 h-4" />,
  pricing: <DollarSign className="w-4 h-4" />,
  brochure: <FileText className="w-4 h-4" />,
  product_details: <Package className="w-4 h-4" />,
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

/** The message the audit log should attribute this send to. */
const metaFor = (prepared: PreparedMessage | null, productId?: string): CommunicationMeta => ({
  action: prepared?.action ?? 'custom',
  templateId: prepared?.template?._id,
  productId: prepared?.product?._id ?? productId,
  documentId: prepared?.document?._id,
});

/**
 * The Tele Sales Command Center for one lead: quick actions, product lookup,
 * template send and the communication history — everything an agent reaches
 * for while the customer is on the line. All sends go through the server's
 * `prepare` step so the message the agent previews is exactly what is sent.
 */
export function SalesAssistantPanel({ lead, agentEmail, onEmailSent }: SalesAssistantPanelProps) {
  const [overview, setOverview] = useState<AssistantOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<TemplateChannel>(lead.email ? 'email' : 'whatsapp');

  // Products
  const [productQuery, setProductQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);

  // Manual template send
  const [templateId, setTemplateId] = useState('');
  const [documentId, setDocumentId] = useState('');

  // Prepared message → compose / WhatsApp dialog
  const [preparing, setPreparing] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedMessage | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);

  // History
  const [history, setHistory] = useState<CommunicationLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await salesAssistantApi.getAssistantOverview(lead._id);
      setOverview(r.data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load the sales assistant'));
    } finally {
      setLoading(false);
    }
  }, [lead._id]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const r = await salesAssistantApi.getLeadCommunications(lead._id, 30);
      setHistory(r.data);
    } catch {
      // history is auxiliary; the panel stays usable without it
    } finally {
      setHistoryLoading(false);
    }
  }, [lead._id]);

  useEffect(() => { loadOverview(); loadHistory(); }, [loadOverview, loadHistory]);

  // Product search — debounced so the list follows what the agent types mid-call.
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setProductsLoading(true);
      try {
        const r = await salesAssistantApi.getProducts({ search: productQuery.trim() || undefined, limit: 8 });
        if (!cancelled) setProducts(r.data);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    }, productQuery ? 250 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [productQuery]);

  const templatesForChannel = useMemo(
    () => (overview?.templates ?? []).filter((t) => t.channel === channel),
    [overview, channel],
  );
  const templateOptions = useMemo(
    () => templatesForChannel.map((t) => ({ value: t._id, label: t.name, sub: `${TEMPLATE_PURPOSE_LABELS[t.purpose]}${t.isDefault ? ' · default' : ''}` })),
    [templatesForChannel],
  );
  const documentOptions = useMemo(
    () => (overview?.documents ?? []).map((d) => ({ value: d._id, label: d.name, sub: `${SALES_DOCUMENT_TYPE_LABELS[d.type]}${d.version ? ` · v${d.version}` : ''}` })),
    [overview],
  );
  const selectedTemplate = templatesForChannel.find((t) => t._id === templateId);
  const recipientMissing = channel === 'email' ? !lead.email : !(lead.phonePrimary || lead.phoneSecondary);
  const canMessage = overview?.lead?.canMessage ?? true;

  // ── Prepare + hand off to the right channel UI ─────────────────────────────

  const openPrepared = (message: PreparedMessage) => {
    setPrepared(message);
    if (message.channel === 'email') setComposeOpen(true);
    else setWhatsAppOpen(true);
  };

  const prepare = async (key: string, request: Omit<Parameters<typeof salesAssistantApi.prepareMessage>[0], 'leadId'>) => {
    setPreparing(key);
    try {
      const r = await salesAssistantApi.prepareMessage({ leadId: lead._id, ...request });
      openPrepared(r.data);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not prepare the message'));
    } finally {
      setPreparing(null);
    }
  };

  const runQuickAction = (action: QuickAction, forChannel: TemplateChannel = channel) => {
    if (action.requiresProduct && !selectedProduct) {
      toast.info('Pick a product first — search the catalog below and click "Use".');
      return;
    }
    prepare(`${action.key}:${forChannel}`, {
      channel: forChannel,
      action: action.key,
      productId: selectedProduct?._id,
    });
  };

  const sendProduct = (product: Product, forChannel: TemplateChannel = channel) => {
    setSelectedProduct(product);
    setDetailProductId(null);
    prepare(`product:${product._id}`, { channel: forChannel, action: 'product_details', productId: product._id });
  };

  const sendDocument = (document: SalesDocument | { _id: string }, forChannel: TemplateChannel = channel) => {
    // A document without a purpose-specific template goes out with the brochure template.
    setDetailProductId(null);
    prepare(`document:${document._id}`, { channel: forChannel, action: 'brochure', documentId: document._id, productId: selectedProduct?._id });
  };

  const sendWithTemplate = () => {
    if (!templateId) { toast.info('Choose a template'); return; }
    prepare('template', {
      channel,
      templateId,
      productId: selectedProduct?._id,
      documentId: documentId || undefined,
    });
  };

  const submitEmail = async (payload: SendLeadEmailData) => {
    const response = await salesAssistantApi.sendAssistantEmail(lead._id, payload, metaFor(prepared, selectedProduct?._id));
    loadHistory();
    onEmailSent?.(response.data);
    return response;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center py-16 text-on-surface-variant">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading the sales assistant…
      </div>
    );
  }
  if (error || !overview) {
    return (
      <div className="flex flex-col items-center py-16 text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
        <AlertTriangle className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">{error ?? 'Sales assistant unavailable'}</p>
        <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={loadOverview}><RefreshCw className="w-3.5 h-3.5" /> Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Context strip + channel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 px-4 py-3">
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="font-semibold text-on-surface">{lead.contactPersonName}</span>
          <span className={cn('inline-flex items-center gap-1.5', lead.email ? 'text-on-surface-variant' : 'text-accent-orange-700')}>
            <Mail className="w-3.5 h-3.5" /> {lead.email || 'no email'}
          </span>
          <span className={cn('inline-flex items-center gap-1.5', lead.phonePrimary || lead.phoneSecondary ? 'text-on-surface-variant' : 'text-accent-orange-700')}>
            <MessageCircle className="w-3.5 h-3.5" /> {lead.phonePrimary || lead.phoneSecondary || 'no phone'}
          </span>
          {!canMessage && (
            <span className="inline-flex items-center gap-1.5 text-xs text-accent-orange-700"><AlertTriangle className="w-3.5 h-3.5" /> Assigned to another agent — preview only</span>
          )}
        </div>
        <div className="flex rounded-xl bg-surface-container p-1 self-start md:self-auto" role="radiogroup" aria-label="Channel">
          {(['email', 'whatsapp'] as TemplateChannel[]).map((c) => (
            <button
              key={c}
              role="radio"
              aria-checked={channel === c}
              onClick={() => setChannel(c)}
              className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors', channel === c ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface')}
            >
              {c === 'email' ? <Mail className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
              {c === 'email' ? 'Email' : 'WhatsApp'}
            </button>
          ))}
        </div>
      </div>

      {recipientMissing && (
        <p className="text-xs text-accent-orange-700 inline-flex items-center gap-1.5 -mt-2">
          <AlertTriangle className="w-3.5 h-3.5" />
          This lead has no {channel === 'email' ? 'email address' : 'phone number'} — add one with “Edit Lead” or switch channel.
        </p>
      )}

      {/* Quick actions */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2 inline-flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Quick actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
          {overview.quickActions.map((action) => {
            const state = action.channels[channel];
            const needsProduct = action.requiresProduct && !selectedProduct;
            const disabled = !state.ready || preparing !== null;
            const reason = !state.ready ? state.reason : needsProduct ? 'Pick a product below first' : state.documentName ? `Sends ${state.documentName}` : state.templateName ?? '';
            const busy = preparing === `${action.key}:${channel}`;
            return (
              <button
                key={action.key}
                onClick={() => runQuickAction(action)}
                disabled={disabled}
                title={reason ?? undefined}
                className={cn(
                  'flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all',
                  disabled
                    ? 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant cursor-not-allowed opacity-70'
                    : needsProduct
                      ? 'border-dashed border-outline-variant/50 bg-surface-container-lowest text-on-surface-variant hover:border-primary/50'
                      : 'border-outline-variant/20 bg-surface-container-lowest text-on-surface hover:border-primary/50 hover:shadow-ambient',
                )}
              >
                <span className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', disabled ? 'bg-surface-container' : 'bg-primary/10 text-primary')}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : ACTION_ICONS[action.key]}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">{action.label}</span>
                  <span className="block text-[11px] text-on-surface-variant truncate">
                    {action.requiresProduct && selectedProduct ? selectedProduct.name : reason}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Products */}
        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant inline-flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Product catalog</h3>
            {selectedProduct && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 rounded-full pl-2 pr-1 py-0.5">
                <Tag className="w-3 h-3" /> {selectedProduct.name}
                <button onClick={() => setSelectedProduct(null)} className="p-0.5 rounded-full hover:bg-primary/20" aria-label="Clear product"><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <Input type="search" value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Search products…" className="pl-10" />
          </div>
          {productsLoading && products.length === 0 ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 rounded-xl bg-surface-container animate-pulse" />)}</div>
          ) : products.length === 0 ? (
            <p className="text-xs text-on-surface-variant py-6 text-center">No products match.</p>
          ) : (
            <ul className="divide-y divide-outline-variant/15 -mx-1">
              {products.map((p) => (
                <li key={p._id} className={cn('flex items-center gap-3 px-1 py-2', selectedProduct?._id === p._id && 'bg-primary/5 rounded-lg')}>
                  <button onClick={() => setDetailProductId(p._id)} className="min-w-0 flex-1 text-left" title="View details">
                    <span className="block text-sm font-medium text-on-surface truncate">{p.name}</span>
                    <span className="block text-[11px] text-on-surface-variant truncate">{[p.category, formatPrice(p.price)].filter(Boolean).join(' · ') || p.shortDescription}</span>
                  </button>
                  <button onClick={() => setDetailProductId(p._id)} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface" title="View details"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => setSelectedProduct(p)} className={cn('text-xs font-medium px-2 py-1 rounded-lg transition-colors', selectedProduct?._id === p._id ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high')} title="Use this product for the quick actions">
                    {selectedProduct?._id === p._id ? 'In use' : 'Use'}
                  </button>
                  <button onClick={() => sendProduct(p)} disabled={preparing !== null} className="inline-flex items-center gap-1 text-xs font-medium text-primary px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50" title={`Send product details by ${channel}`}>
                    {preparing === `product:${p._id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Template send + history */}
        <div className="space-y-5">
          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant inline-flex items-center gap-1.5">
              {channel === 'email' ? <Mail className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />} {channel === 'email' ? 'Email' : 'WhatsApp'} from a template
            </h3>
            <SearchSelect
              value={templateId}
              onChange={setTemplateId}
              options={templateOptions}
              placeholder={templateOptions.length ? 'Choose a template…' : `No active ${channel} templates`}
              disabled={templateOptions.length === 0}
            />
            <SearchSelect
              value={documentId}
              onChange={setDocumentId}
              options={documentOptions}
              placeholder="Attach a document (optional)…"
              allLabel="Template default / none"
              disabled={documentOptions.length === 0}
            />
            {selectedTemplate?.purpose === 'product_details' && !selectedProduct && (
              <p className="text-xs text-accent-orange-700 inline-flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> This template needs a product — click “Use” on one.</p>
            )}
            <Button onClick={sendWithTemplate} disabled={!templateId || preparing !== null} className="w-full gap-2">
              {preparing === 'template' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Preview &amp; {channel === 'email' ? 'Send Email' : 'Open WhatsApp'}
            </Button>
          </section>

          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant inline-flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Communication history</h3>
              <button onClick={loadHistory} className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high" title="Refresh" aria-label="Refresh history">
                <RefreshCw className={cn('w-3.5 h-3.5', historyLoading && 'animate-spin')} />
              </button>
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-on-surface-variant py-4 text-center">Nothing sent from the assistant yet.</p>
            ) : (
              <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {history.map((h) => {
                  // Product details are about the product even when a brochure rode along.
                  const what = (h.action === 'product_details' && h.productName)
                    || h.documentName || h.productName || h.templateName || h.subject
                    || (h.action ? h.action.replace('_', ' ') : 'Message');
                  return (
                    <li key={h._id} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-0.5 flex-shrink-0">
                        {h.status === 'sent' ? <CheckCircle2 className="w-4 h-4 text-primary" />
                          : h.status === 'failed' ? <XCircle className="w-4 h-4 text-error" />
                            : <Clock className="w-4 h-4 text-on-surface-variant" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-on-surface truncate">
                          <span className="font-medium">{h.channel === 'email' ? 'Email' : 'WhatsApp'}</span>
                          {' '}{h.status === 'sent' ? 'sent' : h.status === 'failed' ? 'failed' : 'prepared'} — {what}
                        </span>
                        <span className="block text-[11px] text-on-surface-variant truncate">
                          {formatTime(h.sentAt)} · {h.agentName}{h.recipient ? ` · ${h.recipient}` : ''}{h.errorMessage ? ` · ${h.errorMessage}` : ''}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Product details (lead context: send buttons enabled) */}
      <ProductDetailDialog
        productId={detailProductId}
        open={Boolean(detailProductId)}
        onClose={() => setDetailProductId(null)}
        onSend={(product, forChannel) => sendProduct(product, forChannel)}
        onSendDocument={(document, forChannel) => sendDocument(document, forChannel)}
        onOpenRelated={(id) => setDetailProductId(id)}
        sending={preparing !== null}
      />

      {/* Email: the regular compose window, prefilled with the rendered template + attachment */}
      <GmailCompose
        leadId={lead._id}
        open={composeOpen}
        onClose={() => { setComposeOpen(false); setPrepared(null); }}
        defaultTo={prepared?.to ? [prepared.to] : lead.email ? [lead.email] : []}
        defaultSubject={prepared?.subject ?? ''}
        defaultBody={prepared?.body ?? ''}
        defaultAttachments={prepared?.attachments ?? []}
        contextLabel={prepared?.template?.name ? `${lead.contactPersonName} · ${prepared.template.name}` : lead.contactPersonName}
        fromLabel={agentEmail}
        submit={submitEmail}
        onSent={() => { setComposeOpen(false); setPrepared(null); }}
      />

      <WhatsAppPreviewDialog
        open={whatsAppOpen}
        onClose={() => { setWhatsAppOpen(false); setPrepared(null); }}
        leadId={lead._id}
        prepared={prepared}
        meta={metaFor(prepared, selectedProduct?._id)}
        onLogged={loadHistory}
      />
    </div>
  );
}
