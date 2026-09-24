import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { Mail, MessageCircle, Plus, Search, RefreshCw, Pencil, Trash2, Power, PowerOff, Star, Info } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  fetchMessageTemplates,
  fetchTemplateVariables,
  createMessageTemplate,
  updateMessageTemplate,
  toggleMessageTemplateStatus,
  deleteMessageTemplate,
} from '@/redux/slices/salesAssistantSlice';
import { isSystemAdmin } from '@/lib/teleSalesRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CustomSelect } from '@/components/ui/custom-select';
import { htmlToText } from '@/lib/salesAssistant';
import { cn } from '@/lib/utils';
import MessageTemplateFormDialog from './MessageTemplateFormDialog';
import type { MessageTemplate, MessageTemplateInput, TemplateChannel, TemplatePurpose } from '@/types/salesAssistant.types';
import { TEMPLATE_PURPOSE_LABELS } from '@/types/salesAssistant.types';

const PURPOSES = Object.keys(TEMPLATE_PURPOSE_LABELS) as TemplatePurpose[];

/**
 * Email + WhatsApp templates. Business users change wording here; no code
 * changes needed. One channel tab at a time keeps the list scannable.
 */
export default function MessageTemplates() {
  const dispatch = useAppDispatch();
  const { templates, templatesLoading, templateVariables } = useAppSelector((s) => s.salesAssistant);
  const user = useAppSelector((s) => s.auth.user);
  // Catalog writes are admin-only on the API
  const isAdmin = isSystemAdmin(user);

  const [channel, setChannel] = useState<TemplateChannel>('email');
  const [search, setSearch] = useState('');
  const [purpose, setPurpose] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>(isAdmin ? 'all' : 'active');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    const params: Record<string, unknown> = { channel };
    if (search.trim()) params.search = search.trim();
    if (purpose) params.purpose = purpose;
    if (isAdmin) params.status = status;
    dispatch(fetchMessageTemplates(params));
  };

  useEffect(() => { load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [channel, purpose, status]);
  useEffect(() => { dispatch(fetchTemplateVariables()); }, [dispatch]);

  const visible = useMemo(() => templates.filter((t) => t.channel === channel), [templates, channel]);

  const handleSubmit = async (data: MessageTemplateInput) => {
    setSaving(true);
    try {
      if (editing) await dispatch(updateMessageTemplate({ id: editing._id, data })).unwrap();
      else await dispatch(createMessageTemplate(data)).unwrap();
      setFormOpen(false);
      setEditing(null);
      if (data.channel !== channel) setChannel(data.channel);
    } catch {
      // toast shown by the slice
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: MessageTemplate) => {
    const result = await Swal.fire({
      title: `Delete "${t.name}"?`,
      text: 'Deactivate it instead if you may need it again.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#ef4444',
    });
    if (result.isConfirmed) dispatch(deleteMessageTemplate(t._id));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Message Templates</h1>
          <p className="text-on-surface-variant mt-1">Ready-to-send emails and WhatsApp messages, filled in from the lead automatically.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> New Template</Button>
        )}
      </div>

      <div className="flex rounded-xl bg-surface-container p-1 w-fit">
        {(['email', 'whatsapp'] as TemplateChannel[]).map((c) => (
          <button
            key={c}
            onClick={() => setChannel(c)}
            className={cn('inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors', channel === c ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface')}
          >
            {c === 'email' ? <Mail className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
            {c === 'email' ? 'Email' : 'WhatsApp'}
          </button>
        ))}
      </div>

      <div className="bg-surface-container-lowest rounded-[1rem] p-4">
        <div className={`grid grid-cols-1 gap-4 ${isAdmin ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
              <Input type="search" placeholder="Search templates…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} className="pl-10" />
            </div>
          </div>
          <CustomSelect variant="filter" label="Used for" value={purpose} onChange={setPurpose} options={[{ value: '', label: 'All' }, ...PURPOSES.map((p) => ({ value: p, label: TEMPLATE_PURPOSE_LABELS[p] }))]} />
          {isAdmin && (
            <CustomSelect variant="filter" label="Status" value={status} onChange={(v) => setStatus(v as typeof status)} options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          )}
          <div className="flex gap-2">
            <Button onClick={load} className="flex-1 gap-2"><Search className="h-4 w-4" /> Search</Button>
            <Button onClick={() => { setSearch(''); setPurpose(''); setStatus(isAdmin ? 'all' : 'active'); }} variant="outline"><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-on-surface-variant inline-flex items-center gap-1">
          <Info className="w-3.5 h-3.5" /> The <Star className="w-3 h-3 inline" /> default template of each purpose is what the one-click actions on a lead use.
        </p>
      </div>

      {templatesLoading && visible.length === 0 ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-surface-container animate-pulse" />)}</div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
          {channel === 'email' ? <Mail className="w-10 h-10 mb-3 opacity-30" /> : <MessageCircle className="w-10 h-10 mb-3 opacity-30" />}
          <p className="text-sm font-medium">No {channel === 'email' ? 'email' : 'WhatsApp'} templates</p>
          <p className="text-xs mt-1">{isAdmin ? 'Create one, or run the seed script for the defaults.' : 'Ask an admin to add templates.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {visible.map((t) => (
            <div key={t._id} className={cn('group p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 transition-colors', t.status === 'inactive' && 'opacity-60')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-on-surface truncate">{t.name}</p>
                    {t.isDefault && <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary"><Star className="w-3 h-3 fill-current" /> Default</span>}
                    <Badge variant="outline">{TEMPLATE_PURPOSE_LABELS[t.purpose]}</Badge>
                    {t.status === 'inactive' && <Badge variant="destructive">Inactive</Badge>}
                  </div>
                  {t.channel === 'email' && t.subject && <p className="text-xs text-on-surface-variant mt-1 truncate">Subject: <span className="font-mono">{t.subject}</span></p>}
                  {t.description && <p className="text-xs text-on-surface-variant mt-0.5">{t.description}</p>}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button onClick={() => { setEditing(t); setFormOpen(true); }} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface" title="Edit"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => dispatch(toggleMessageTemplateStatus(t._id))} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface" title={t.status === 'active' ? 'Deactivate' : 'Activate'}>
                      {t.status === 'active' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDelete(t)} className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              <pre className="mt-3 text-xs text-on-surface-variant whitespace-pre-wrap font-sans line-clamp-5 leading-relaxed">
                {t.channel === 'email' ? htmlToText(t.body) : t.body}
              </pre>
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <MessageTemplateFormDialog
          isOpen={formOpen}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSubmit={handleSubmit}
          template={editing}
          loading={saving}
          variables={templateVariables}
          defaultChannel={channel}
        />
      )}
    </div>
  );
}
