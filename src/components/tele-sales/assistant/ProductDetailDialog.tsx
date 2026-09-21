import { useEffect, useState } from 'react';
import { CheckCircle2, Dot, ExternalLink, FileText, Loader2, Mail, MessageCircle, Package, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import * as salesAssistantApi from '@/api/salesAssistantApi';
import { formatPrice, apiErrorMessage } from '@/lib/salesAssistant';
import { StoredImage } from './StoredImage';
import type { Product, SalesDocument, TemplateChannel } from '@/types/salesAssistant.types';
import { SALES_DOCUMENT_TYPE_LABELS } from '@/types/salesAssistant.types';

export interface ProductDetailDialogProps {
  productId: string | null;
  open: boolean;
  onClose: () => void;
  /** Provided when opened from a lead: enables the send buttons. */
  onSend?: (product: Product, channel: TemplateChannel) => void;
  /** Provided when opened from a lead: send one of the product's documents. */
  onSendDocument?: (document: SalesDocument, channel: TemplateChannel) => void;
  onOpenRelated?: (productId: string) => void;
  sending?: boolean;
}

/**
 * The sales-oriented product view: what it is, why it matters, what it costs,
 * what can be sent — in that order, so an agent can read it top-down on a call.
 */
export function ProductDetailDialog({
  productId, open, onClose, onSend, onSendDocument, onOpenRelated, sending = false,
}: ProductDetailDialogProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !productId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProduct(null);
    salesAssistantApi.getProductById(productId)
      .then((r) => { if (!cancelled) setProduct(r.data); })
      .catch((e) => { if (!cancelled) setError(apiErrorMessage(e, 'This product is no longer available.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, productId]);

  const documents = (product?.documents ?? []).filter((d): d is SalesDocument => typeof d === 'object');
  const related = (product?.relatedProducts ?? []).filter((p): p is Exclude<Product['relatedProducts'][number], string> => typeof p === 'object');
  const price = formatPrice(product?.price);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto p-0">
        {loading && (
          <div className="flex items-center justify-center py-20 text-on-surface-variant">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading product…
          </div>
        )}
        {!loading && error && (
          <div className="py-16 text-center">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm text-on-surface-variant">{error}</p>
          </div>
        )}
        {!loading && product && (
          <>
            <DialogHeader className="p-6 pb-4 border-b border-outline-variant/20">
              <div className="flex items-start gap-4 pr-8">
                {product.images?.[0] ? (
                  <StoredImage fileId={product.images[0].fileId} alt={product.name} className="w-20 h-20 rounded-xl flex-shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-surface-container-high flex items-center justify-center flex-shrink-0">
                    <Package className="w-8 h-8 text-on-surface-variant" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="text-xl">{product.name}</DialogTitle>
                    {product.status === 'archived' && <Badge variant="destructive">Archived</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-on-surface-variant flex-wrap">
                    {product.sku && <span className="font-mono px-1.5 py-0.5 rounded bg-surface-container-high">{product.sku}</span>}
                    {product.category && <span className="inline-flex items-center gap-1"><Tag className="w-3 h-3" />{product.category}</span>}
                  </div>
                  {product.shortDescription && (
                    <DialogDescription className="mt-2 text-sm text-on-surface">{product.shortDescription}</DialogDescription>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="md:col-span-3 space-y-6">
                {product.benefits.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">Key benefits</h3>
                    <ul className="space-y-1.5">
                      {product.benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-on-surface">
                          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {product.features.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">Key features</h3>
                    <ul className="space-y-1">
                      {product.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-1 text-sm text-on-surface">
                          <Dot className="w-5 h-5 -ml-1 flex-shrink-0 text-on-surface-variant" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {product.description && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">About</h3>
                    <p className="text-sm text-on-surface whitespace-pre-line leading-relaxed">{product.description}</p>
                  </section>
                )}
                {product.specifications.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">Specifications</h3>
                    <dl className="divide-y divide-outline-variant/20 rounded-xl border border-outline-variant/20 overflow-hidden">
                      {product.specifications.map((s, i) => (
                        <div key={i} className="grid grid-cols-5 gap-3 px-3 py-2 text-sm">
                          <dt className="col-span-2 text-on-surface-variant">{s.label}</dt>
                          <dd className="col-span-3 text-on-surface font-medium">{s.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )}
              </div>

              <aside className="md:col-span-2 space-y-4">
                <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-4">
                  <p className="text-xs text-on-surface-variant">Price</p>
                  <p className="text-lg font-bold text-on-surface mt-0.5">{price || 'On request'}</p>
                  {product.link && (
                    <a href={product.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2">
                      <ExternalLink className="w-3 h-3" /> Product page
                    </a>
                  )}
                </div>

                {onSend && (
                  <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Send product details</p>
                    <Button className="w-full gap-2" onClick={() => onSend(product, 'email')} disabled={sending || product.status !== 'active'}>
                      <Mail className="w-4 h-4" /> Send by Email
                    </Button>
                    <Button variant="outline" className="w-full gap-2" onClick={() => onSend(product, 'whatsapp')} disabled={sending || product.status !== 'active'}>
                      <MessageCircle className="w-4 h-4" /> Send by WhatsApp
                    </Button>
                  </div>
                )}

                <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">Available documents</p>
                  {documents.length === 0 ? (
                    <p className="text-xs text-on-surface-variant">No documents attached.</p>
                  ) : (
                    <ul className="space-y-2">
                      {documents.map((d) => (
                        <li key={d._id} className="flex items-center gap-2 text-sm">
                          <FileText className="w-4 h-4 text-on-surface-variant flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-on-surface">{d.name}</p>
                            <p className="text-[11px] text-on-surface-variant">{SALES_DOCUMENT_TYPE_LABELS[d.type]}{d.version ? ` · v${d.version}` : ''}</p>
                          </div>
                          {onSendDocument && (
                            <div className="flex gap-1">
                              <button onClick={() => onSendDocument(d, 'email')} title="Send by email" className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-primary"><Mail className="w-3.5 h-3.5" /></button>
                              <button onClick={() => onSendDocument(d, 'whatsapp')} title="Send by WhatsApp" className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-primary"><MessageCircle className="w-3.5 h-3.5" /></button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {related.length > 0 && (
                  <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">Related products</p>
                    <ul className="space-y-1.5">
                      {related.map((p) => (
                        <li key={p._id}>
                          <button
                            onClick={() => onOpenRelated?.(p._id)}
                            className="w-full text-left text-sm text-on-surface hover:text-primary rounded-lg px-2 py-1 hover:bg-surface-container-high transition-colors"
                          >
                            <span className="font-medium">{p.name}</span>
                            {p.shortDescription && <span className="block text-xs text-on-surface-variant truncate">{p.shortDescription}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </aside>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
