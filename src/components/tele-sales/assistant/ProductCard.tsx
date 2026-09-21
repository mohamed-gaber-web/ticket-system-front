import { Package, Pencil, Archive, ArchiveRestore, Trash2, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/salesAssistant';
import { StoredImage } from './StoredImage';
import type { Product } from '@/types/salesAssistant.types';

interface ProductCardProps {
  product: Product;
  onOpen: (product: Product) => void;
  /** Lead context: one-click "Send details". */
  onSend?: (product: Product) => void;
  /** Admin controls. */
  onEdit?: (product: Product) => void;
  onToggleStatus?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  compact?: boolean;
}

export function ProductCard({ product, onOpen, onSend, onEdit, onToggleStatus, onDelete, compact = false }: ProductCardProps) {
  const price = formatPrice(product.price);
  const image = product.images?.[0];
  const isAdmin = Boolean(onEdit || onToggleStatus || onDelete);

  return (
    <div
      className="group relative flex gap-3 p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/40 hover:shadow-ambient transition-all cursor-pointer"
      onClick={() => onOpen(product)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(product); } }}
    >
      {image ? (
        <StoredImage fileId={image.fileId} alt={product.name} className={compact ? 'w-12 h-12 rounded-xl flex-shrink-0' : 'w-16 h-16 rounded-xl flex-shrink-0'} />
      ) : (
        <div className={`${compact ? 'w-12 h-12' : 'w-16 h-16'} rounded-xl bg-surface-container-high flex items-center justify-center flex-shrink-0`}>
          <Package className="w-6 h-6 text-on-surface-variant" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-on-surface truncate">{product.name}</p>
            <p className="text-[11px] text-on-surface-variant truncate">
              {[product.sku, product.category].filter(Boolean).join(' · ')}
            </p>
          </div>
          {product.status === 'archived' && <Badge variant="destructive" className="flex-shrink-0">Archived</Badge>}
        </div>
        {!compact && product.shortDescription && (
          <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{product.shortDescription}</p>
        )}
        <div className="flex items-center justify-between gap-2 mt-2">
          <span className="text-xs font-semibold text-on-surface">{price || 'Price on request'}</span>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {onSend && product.status === 'active' && (
              <button
                onClick={() => onSend(product)}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                title="Send product details to this lead"
              >
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            )}
            {isAdmin && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                {onEdit && (
                  <button onClick={() => onEdit(product)} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface" title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {onToggleStatus && (
                  <button onClick={() => onToggleStatus(product)} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface" title={product.status === 'active' ? 'Archive' : 'Restore'}>
                    {product.status === 'active' ? <Archive className="w-3.5 h-3.5" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
                  </button>
                )}
                {onDelete && (
                  <button onClick={() => onDelete(product)} className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
