import { useEffect, useMemo, useState } from 'react';
import { MultiSelect, type MultiSelectItem } from '@/components/ui/multi-select';
import * as salesAssistantApi from '@/api/salesAssistantApi';
import type { Product } from '@/types/salesAssistant.types';
import type { NeedProductRef } from '@/types/teleSales.types';

const PAGE_SIZE = 100; // the products API caps a page at 100

/** Every active catalog product, page by page. */
async function loadActiveProducts(): Promise<Product[]> {
  const all: Product[] = [];
  for (let page = 1; ; page++) {
    const r = await salesAssistantApi.getProducts({ status: 'active', page, limit: PAGE_SIZE });
    all.push(...r.data);
    if (r.data.length < PAGE_SIZE || page >= (r.pages ?? 1)) return all;
  }
}

const label = (p: { name: string; sku?: string; category?: string }) =>
  [p.name, p.sku, p.category].filter(Boolean).join(' · ');

interface ProductNeedSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  /**
   * The products the lead already carries, as the API returned them — lets an
   * archived product the lead still holds show by name (and be removed) even
   * though the catalog list only offers active ones.
   */
  current?: NeedProductRef[];
}

/** Customer Need: a multi-select lookup over the Product Catalog. */
export function ProductNeedSelect({ value, onChange, current = [] }: ProductNeedSelectProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadActiveProducts()
      .then((list) => { if (alive) setProducts(list); })
      .catch(() => { if (alive) setFailed(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const items: MultiSelectItem[] = useMemo(() => {
    const active = products.map((p) => ({ _id: p._id, name: label(p) }));
    const known = new Set(active.map((i) => i._id));
    // Selected products missing from the active list (archived since) stay visible.
    const extra = current
      .filter((p) => !known.has(p._id))
      .map((p) => ({ _id: p._id, name: `${label(p)} (archived)` }));
    return [...active, ...extra];
  }, [products, current]);

  return (
    <MultiSelect
      items={items}
      value={value}
      onChange={onChange}
      loading={loading}
      placeholder="Select products from the catalog…"
      searchPlaceholder="Search products…"
      emptyMessage={failed ? 'Could not load the product catalog' : 'No products in the catalog'}
    />
  );
}
