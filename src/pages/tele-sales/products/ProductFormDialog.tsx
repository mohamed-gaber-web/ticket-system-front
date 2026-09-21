import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Plus, Trash2, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MultiSelect } from '@/components/ui/multi-select';
import { CustomSelect } from '@/components/ui/custom-select';
import * as teleSalesApi from '@/api/teleSalesApi';
import { StoredImage } from '@/components/tele-sales/assistant/StoredImage';
import { linesToList, listToLines, apiErrorMessage } from '@/lib/salesAssistant';
import type { FileRef, Product, ProductInput, ProductSpecification, SalesDocument } from '@/types/salesAssistant.types';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const CURRENCIES = ['EGP', 'SAR', 'AED', 'USD', 'EUR'];

interface ProductFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductInput) => Promise<void> | void;
  product?: Product | null;
  loading: boolean;
  /** Pick-lists for the documents / related-products fields. */
  documents: SalesDocument[];
  products: Product[];
  categories: string[];
}

interface FormState {
  name: string;
  sku: string;
  category: string;
  shortDescription: string;
  description: string;
  featuresText: string;
  benefitsText: string;
  specifications: ProductSpecification[];
  priceAmount: string;
  priceCurrency: string;
  priceNote: string;
  link: string;
  images: FileRef[];
  documents: string[];
  relatedProducts: string[];
  status: 'active' | 'archived';
}

const emptyForm = (): FormState => ({
  name: '', sku: '', category: '', shortDescription: '', description: '',
  featuresText: '', benefitsText: '', specifications: [],
  priceAmount: '', priceCurrency: 'EGP', priceNote: '', link: '',
  images: [], documents: [], relatedProducts: [], status: 'active',
});

const fromProduct = (p: Product): FormState => ({
  name: p.name,
  sku: p.sku ?? '',
  category: p.category ?? '',
  shortDescription: p.shortDescription ?? '',
  description: p.description ?? '',
  featuresText: listToLines(p.features),
  benefitsText: listToLines(p.benefits),
  specifications: p.specifications ?? [],
  priceAmount: p.price?.amount != null ? String(p.price.amount) : '',
  priceCurrency: p.price?.currency ?? 'EGP',
  priceNote: p.price?.note ?? '',
  link: p.link ?? '',
  images: p.images ?? [],
  documents: (p.documents ?? []).map((d) => (typeof d === 'string' ? d : d._id)),
  relatedProducts: (p.relatedProducts ?? []).map((r) => (typeof r === 'string' ? r : r._id)),
  status: p.status,
});

export default function ProductFormDialog({
  isOpen, onClose, onSubmit, product, loading, documents, products, categories,
}: ProductFormDialogProps) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<{ name?: string; price?: string }>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(product ? fromProduct(product) : emptyForm());
    setErrors({});
  }, [product, isOpen]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const documentItems = useMemo(() => documents.map((d) => ({ _id: d._id, name: `${d.name}${d.version ? ` (v${d.version})` : ''}` })), [documents]);
  const productItems = useMemo(
    () => products.filter((p) => p._id !== product?._id).map((p) => ({ _id: p._id, name: p.sku ? `${p.name} · ${p.sku}` : p.name })),
    [products, product?._id],
  );
  const categoryOptions = useMemo(() => {
    const all = new Set(categories);
    if (form.category) all.add(form.category);
    return [...all].sort().map((c) => ({ value: c, label: c }));
  }, [categories, form.category]);

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    for (const file of files) {
      if (!file.type.startsWith('image/')) { toast.error(`${file.name} is not an image`); continue; }
      if (file.size > MAX_IMAGE_BYTES) { toast.error(`${file.name} is larger than 5MB`); continue; }
      setUploading(true);
      try {
        const r = await teleSalesApi.uploadFile(file);
        setForm((f) => ({ ...f, images: [...f.images, { fileId: r.data.fileId, fileName: r.data.fileName, fileType: r.data.fileType, fileSize: r.data.fileSize }] }));
      } catch (err) {
        toast.error(apiErrorMessage(err, `Failed to upload ${file.name}`));
      } finally {
        setUploading(false);
      }
    }
  };

  const validate = () => {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = 'Name is required';
    if (form.priceAmount && (Number.isNaN(Number(form.priceAmount)) || Number(form.priceAmount) < 0)) next.price = 'Enter a valid amount';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const data: ProductInput = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      category: form.category.trim(),
      shortDescription: form.shortDescription.trim(),
      description: form.description.trim(),
      features: linesToList(form.featuresText),
      benefits: linesToList(form.benefitsText),
      specifications: form.specifications.filter((s) => s.label.trim() && s.value.trim()),
      price: { amount: form.priceAmount ? Number(form.priceAmount) : undefined, currency: form.priceCurrency, note: form.priceNote.trim() },
      link: form.link.trim(),
      images: form.images,
      documents: form.documents,
      relatedProducts: form.relatedProducts,
      status: form.status,
    };
    onSubmit(data);
  };

  if (!isOpen) return null;

  return (
    <div className="form-dialog-overlay">
      <div className="form-dialog-content max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-outline-variant/20">
          <div>
            <h2 className="text-xl font-semibold text-on-surface">{product ? 'Edit Product' : 'Add Product'}</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">What agents read during a call and what goes into product messages.</p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="p-name" className="form-label">Name <span className="text-error">*</span></label>
              <Input id="p-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Odoo ERP — Standard" className={errors.name ? 'ring-[2px] ring-error/30' : ''} />
              {errors.name && <p className="form-error">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="p-sku" className="form-label">SKU / Code</label>
              <Input id="p-sku" value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="ERP-STD" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Category</label>
              <div className="flex gap-2">
                <Input list="p-categories" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="ERP, POS, Services…" />
                <datalist id="p-categories">
                  {categoryOptions.map((c) => <option key={c.value} value={c.value} />)}
                </datalist>
              </div>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="p-short" className="form-label">Short description <span className="text-on-surface-variant font-normal">(one line the agent reads first)</span></label>
              <Input id="p-short" value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} maxLength={300} placeholder="All-in-one ERP for small and medium businesses" />
            </div>
          </div>

          <div>
            <label htmlFor="p-desc" className="form-label">Description</label>
            <Textarea id="p-desc" rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What it does, who it's for. Used in the product-details email." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-benefits" className="form-label">Benefits <span className="text-on-surface-variant font-normal">(one per line)</span></label>
              <Textarea id="p-benefits" rows={5} value={form.benefitsText} onChange={(e) => set('benefitsText', e.target.value)} className="font-normal" placeholder={'Cuts month-end closing from days to hours\nOne source of truth for sales, stock and finance'} />
            </div>
            <div>
              <label htmlFor="p-features" className="form-label">Features <span className="text-on-surface-variant font-normal">(one per line)</span></label>
              <Textarea id="p-features" rows={5} value={form.featuresText} onChange={(e) => set('featuresText', e.target.value)} placeholder={'Inventory management\nMulti-currency invoicing'} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="form-label mb-0">Specifications</label>
              <button type="button" onClick={() => set('specifications', [...form.specifications, { label: '', value: '' }])} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus className="w-3.5 h-3.5" /> Add row
              </button>
            </div>
            {form.specifications.length === 0 ? (
              <p className="text-xs text-on-surface-variant">No specifications yet.</p>
            ) : (
              <div className="space-y-2">
                {form.specifications.map((s, i) => (
                  <div key={i} className="grid grid-cols-[2fr_3fr_auto] gap-2">
                    <Input value={s.label} placeholder="Users" onChange={(e) => set('specifications', form.specifications.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                    <Input value={s.value} placeholder="Unlimited" onChange={(e) => set('specifications', form.specifications.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                    <button type="button" onClick={() => set('specifications', form.specifications.filter((_, j) => j !== i))} className="p-2 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10" aria-label="Remove specification">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="p-price" className="form-label">Price</label>
              <Input id="p-price" type="number" min={0} step="0.01" value={form.priceAmount} onChange={(e) => set('priceAmount', e.target.value)} placeholder="0.00" className={errors.price ? 'ring-[2px] ring-error/30' : ''} />
              {errors.price && <p className="form-error">{errors.price}</p>}
            </div>
            <div>
              <CustomSelect label="Currency" value={form.priceCurrency} onChange={(v) => set('priceCurrency', v)} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="p-note" className="form-label">Price note</label>
              <Input id="p-note" value={form.priceNote} onChange={(e) => set('priceNote', e.target.value)} placeholder="per user / month · starting from · on request" />
            </div>
          </div>

          <div>
            <label htmlFor="p-link" className="form-label">Product link</label>
            <Input id="p-link" value={form.link} onChange={(e) => set('link', e.target.value)} placeholder="https://…" />
          </div>

          <div>
            <label className="form-label">Images</label>
            <div className="flex flex-wrap gap-2">
              {form.images.map((img, i) => (
                <div key={img.fileId} className="relative group">
                  <StoredImage fileId={img.fileId} alt={img.fileName} className="w-20 h-20 rounded-xl" />
                  <button type="button" onClick={() => set('images', form.images.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-error text-white opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remove image">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={handleImageSelected} />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading || form.images.length >= 10} className="w-20 h-20 rounded-xl border-2 border-dashed border-outline-variant/50 flex flex-col items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary transition-colors disabled:opacity-50">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Upload className="w-4 h-4" /><span className="text-[10px] mt-1">Upload</span></>}
              </button>
              {form.images.length === 0 && !uploading && (
                <p className="self-center text-xs text-on-surface-variant inline-flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> JPEG, PNG, WebP · max 5MB</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Documents <span className="text-on-surface-variant font-normal">(brochure, spec sheet…)</span></label>
              <MultiSelect items={documentItems} value={form.documents} onChange={(v) => set('documents', v)} placeholder="Attach sales documents…" emptyMessage="No sales documents yet — add them under Sales Documents" />
            </div>
            <div>
              <label className="form-label">Related products</label>
              <MultiSelect items={productItems} value={form.relatedProducts} onChange={(v) => set('relatedProducts', v)} placeholder="Pick related products…" emptyMessage="No other products" />
            </div>
          </div>

          {product && (
            <div className="flex items-center">
              <input id="p-active" type="checkbox" checked={form.status === 'active'} onChange={(e) => set('status', e.target.checked ? 'active' : 'archived')} className="form-checkbox" />
              <label htmlFor="p-active" className="ml-2.5 text-sm font-medium text-on-surface cursor-pointer">Active (visible to agents)</label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || uploading}>{loading ? 'Saving…' : product ? 'Update Product' : 'Create Product'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
