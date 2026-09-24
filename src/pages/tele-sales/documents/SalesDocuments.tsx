import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import { FileText, Plus, Search, RefreshCw, Download, Pencil, Archive, ArchiveRestore, Trash2, Link2, Info } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  fetchSalesDocuments,
  fetchProducts,
  createSalesDocument,
  updateSalesDocument,
  toggleSalesDocumentStatus,
  deleteSalesDocument,
} from '@/redux/slices/salesAssistantSlice';
import { isSystemAdmin } from '@/lib/teleSalesRole';
import * as teleSalesApi from '@/api/teleSalesApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CustomSelect } from '@/components/ui/custom-select';
import { formatFileSize, apiErrorMessage } from '@/lib/salesAssistant';
import SalesDocumentFormDialog from './SalesDocumentFormDialog';
import type { SalesDocument, SalesDocumentInput, SalesDocumentType } from '@/types/salesAssistant.types';
import { SALES_DOCUMENT_TYPE_LABELS } from '@/types/salesAssistant.types';

const TYPE_ORDER = Object.keys(SALES_DOCUMENT_TYPE_LABELS) as SalesDocumentType[];

const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

/**
 * The sales collateral library: company profile, brochures, catalog, pricing…
 * Grouped by type so an agent sees at a glance what exists to send.
 */
export default function SalesDocuments() {
  const dispatch = useAppDispatch();
  const { documents, documentsLoading, products } = useAppSelector((s) => s.salesAssistant);
  const user = useAppSelector((s) => s.auth.user);
  // Catalog writes are admin-only on the API
  const isAdmin = isSystemAdmin(user);

  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState<'active' | 'archived' | 'all'>('active');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SalesDocument | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    const params: Record<string, unknown> = { limit: 200 };
    if (search.trim()) params.search = search.trim();
    if (type) params.type = type;
    if (isAdmin) params.status = status;
    dispatch(fetchSalesDocuments(params));
  };

  useEffect(() => { load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [type, status]);
  useEffect(() => {
    if (isAdmin) dispatch(fetchProducts({ limit: 100, status: 'all' }));
  }, [dispatch, isAdmin]);

  const grouped = useMemo(() => {
    const map = new Map<SalesDocumentType, SalesDocument[]>();
    for (const d of documents) {
      if (!map.has(d.type)) map.set(d.type, []);
      map.get(d.type)!.push(d);
    }
    return TYPE_ORDER.filter((t) => map.has(t)).map((t) => ({ type: t, items: map.get(t)! }));
  }, [documents]);

  const handleDownload = async (doc: SalesDocument) => {
    try {
      const blob = await teleSalesApi.downloadFile(doc.file.fileId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Download failed'));
    }
  };

  const handleCopyLink = async (doc: SalesDocument) => {
    if (!doc.publicUrl) return;
    try {
      await navigator.clipboard.writeText(doc.publicUrl);
      toast.success('Public link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  };

  const handleSubmit = async (data: SalesDocumentInput) => {
    setSaving(true);
    try {
      if (editing) await dispatch(updateSalesDocument({ id: editing._id, data })).unwrap();
      else await dispatch(createSalesDocument(data)).unwrap();
      setFormOpen(false);
      setEditing(null);
    } catch {
      // toast shown by the slice
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (doc: SalesDocument) => {
    const result = await Swal.fire({
      title: `Delete "${doc.name}"?`,
      text: 'The file is removed too. Archive it instead to keep the link working for leads who already received it.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#ef4444',
    });
    if (result.isConfirmed) dispatch(deleteSalesDocument(doc._id));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Sales Documents</h1>
          <p className="text-on-surface-variant mt-1">Company profile, brochures, catalog and pricing — what agents send to leads.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Add Document</Button>
        )}
      </div>

      <div className="bg-surface-container-lowest rounded-[1rem] p-4">
        <div className={`grid grid-cols-1 gap-4 ${isAdmin ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
              <Input type="search" placeholder="Search documents…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} className="pl-10" />
            </div>
          </div>
          <CustomSelect variant="filter" label="Type" value={type} onChange={setType} options={[{ value: '', label: 'All types' }, ...TYPE_ORDER.map((t) => ({ value: t, label: SALES_DOCUMENT_TYPE_LABELS[t] }))]} />
          {isAdmin && (
            <CustomSelect variant="filter" label="Status" value={status} onChange={(v) => setStatus(v as typeof status)} options={[{ value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }, { value: 'all', label: 'All' }]} />
          )}
          <div className="flex gap-2">
            <Button onClick={load} className="flex-1 gap-2"><Search className="h-4 w-4" /> Search</Button>
            <Button onClick={() => { setSearch(''); setType(''); setStatus('active'); }} variant="outline"><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-on-surface-variant inline-flex items-center gap-1">
          <Info className="w-3.5 h-3.5" /> Quick actions pick the newest active document of each type — keep one Company Profile, Catalog and Pricing active.
        </p>
      </div>

      {documentsLoading && documents.length === 0 ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-2xl bg-surface-container animate-pulse" />)}</div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
          <FileText className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No documents yet</p>
          <p className="text-xs mt-1">{isAdmin ? 'Upload the company profile to enable "Send Company Profile".' : 'Ask an admin to upload the sales collateral.'}</p>
        </div>
      ) : (
        grouped.map(({ type: t, items }) => (
          <section key={t} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{SALES_DOCUMENT_TYPE_LABELS[t]} <span className="font-normal">({items.length})</span></h2>
            <div className="space-y-2">
              {items.map((doc) => (
                <div key={doc._id} className="group flex items-center gap-3 p-3 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 hover:bg-surface-container transition-colors">
                  <div className="w-11 h-11 rounded-xl bg-surface-container-high flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-on-surface-variant" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-on-surface truncate">{doc.name}</p>
                      {doc.version && <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">v{doc.version}</span>}
                      {doc.status === 'archived' && <Badge variant="destructive">Archived</Badge>}
                      {doc.product && typeof doc.product === 'object' && <Badge variant="outline">{doc.product.name}</Badge>}
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                      {doc.file.fileName} · {formatFileSize(doc.file.fileSize)} · updated {formatDate(doc.updatedAt)}
                      {doc.description && ` · ${doc.description}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleDownload(doc)} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-primary" title="Download"><Download className="w-4 h-4" /></button>
                    <button onClick={() => handleCopyLink(doc)} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-primary" title="Copy public link"><Link2 className="w-4 h-4" /></button>
                    {isAdmin && (
                      <>
                        <button onClick={() => { setEditing(doc); setFormOpen(true); }} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface" title="Edit"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => dispatch(toggleSalesDocumentStatus(doc._id))} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface" title={doc.status === 'active' ? 'Archive' : 'Restore'}>
                          {doc.status === 'active' ? <Archive className="w-4 h-4" /> : <ArchiveRestore className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDelete(doc)} className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {isAdmin && (
        <SalesDocumentFormDialog
          isOpen={formOpen}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSubmit={handleSubmit}
          document={editing}
          loading={saving}
          products={products}
        />
      )}
    </div>
  );
}
