import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Upload, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CustomSelect } from '@/components/ui/custom-select';
import { SearchSelect } from '@/components/ui/search-select';
import * as teleSalesApi from '@/api/teleSalesApi';
import { apiErrorMessage, formatFileSize } from '@/lib/salesAssistant';
import type { FileRef, Product, SalesDocument, SalesDocumentInput, SalesDocumentType } from '@/types/salesAssistant.types';
import { SALES_DOCUMENT_TYPE_LABELS } from '@/types/salesAssistant.types';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // must fit in an email — mirrors the backend attachment budget
const ACCEPT = 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*';

interface SalesDocumentFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SalesDocumentInput) => Promise<void> | void;
  document?: SalesDocument | null;
  loading: boolean;
  products: Product[];
}

const TYPE_OPTIONS = (Object.keys(SALES_DOCUMENT_TYPE_LABELS) as SalesDocumentType[]).map((t) => ({ value: t, label: SALES_DOCUMENT_TYPE_LABELS[t] }));

export default function SalesDocumentFormDialog({ isOpen, onClose, onSubmit, document, loading, products }: SalesDocumentFormDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<SalesDocumentType>('company_profile');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0');
  const [product, setProduct] = useState('');
  const [status, setStatus] = useState<'active' | 'archived'>('active');
  const [file, setFile] = useState<FileRef | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; file?: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(document?.name ?? '');
    setType(document?.type ?? 'company_profile');
    setDescription(document?.description ?? '');
    setVersion(document?.version ?? '1.0');
    setProduct(document?.product ? (typeof document.product === 'string' ? document.product : document.product._id) : '');
    setStatus(document?.status ?? 'active');
    setFile(document?.file ?? null);
    setErrors({});
  }, [document, isOpen]);

  const productOptions = useMemo(() => products.map((p) => ({ value: p._id, label: p.name, sub: p.sku })), [products]);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    if (picked.size > MAX_FILE_BYTES) { toast.error(`File is larger than ${formatFileSize(MAX_FILE_BYTES)} — it would not fit in an email`); return; }
    setUploading(true);
    try {
      const r = await teleSalesApi.uploadFile(picked);
      setFile({ fileId: r.data.fileId, fileName: r.data.fileName, fileType: r.data.fileType, fileSize: r.data.fileSize });
      if (!name.trim()) setName(picked.name.replace(/\.[^.]+$/, ''));
      setErrors((er) => ({ ...er, file: undefined }));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Name is required';
    if (!file) next.file = 'Upload a file';
    setErrors(next);
    if (Object.keys(next).length) return;
    const data: SalesDocumentInput = {
      name: name.trim(),
      type,
      description: description.trim(),
      version: version.trim() || '1.0',
      product: product || null,
      status,
    };
    // Only send the file when it changed, so an unchanged edit doesn't re-validate GridFS.
    if (!document || file!.fileId !== document.file.fileId) data.file = file!;
    onSubmit(data);
  };

  if (!isOpen) return null;

  return (
    <div className="form-dialog-overlay">
      <div className="form-dialog-content max-w-lg">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-outline-variant/20">
          <h2 className="text-xl font-semibold text-on-surface">{document ? 'Edit Document' : 'Add Document'}</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="form-label">File <span className="text-error">*</span></label>
            <input ref={fileInputRef} type="file" accept={ACCEPT} className="hidden" onChange={handleFileSelected} />
            <div className={`rounded-xl border-2 border-dashed p-4 flex items-center gap-3 ${errors.file ? 'border-error/50' : 'border-outline-variant/50'}`}>
              {file ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-on-surface truncate">{file.fileName}</p>
                    <p className="text-xs text-on-surface-variant">{formatFileSize(file.fileSize)}</p>
                  </div>
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
                  <p className="text-sm text-on-surface-variant flex-1">PDF, Word, Excel, PowerPoint or image · max {formatFileSize(MAX_FILE_BYTES)}</p>
                </>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2 flex-shrink-0">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {file ? 'Replace' : 'Upload'}
              </Button>
            </div>
            {errors.file && <p className="form-error">{errors.file}</p>}
          </div>

          <div>
            <label htmlFor="d-name" className="form-label">Name <span className="text-error">*</span></label>
            <Input id="d-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="GrowPath Company Profile" className={errors.name ? 'ring-[2px] ring-error/30' : ''} />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <CustomSelect label="Type" value={type} onChange={(v) => setType(v as SalesDocumentType)} options={TYPE_OPTIONS} />
            <div>
              <label htmlFor="d-version" className="form-label">Version</label>
              <Input id="d-version" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0" />
            </div>
          </div>

          <SearchSelect
            label="Product (optional)"
            value={product}
            onChange={setProduct}
            options={productOptions}
            allLabel="Not product-specific"
            placeholder="Link to a product…"
          />

          <div>
            <label htmlFor="d-desc" className="form-label">Description</label>
            <Textarea id="d-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What the agent should know before sending it" />
          </div>

          {document && (
            <div className="flex items-center">
              <input id="d-active" type="checkbox" checked={status === 'active'} onChange={(e) => setStatus(e.target.checked ? 'active' : 'archived')} className="form-checkbox" />
              <label htmlFor="d-active" className="ml-2.5 text-sm font-medium text-on-surface cursor-pointer">Active (available to send)</label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || uploading}>{loading ? 'Saving…' : document ? 'Update' : 'Add Document'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
