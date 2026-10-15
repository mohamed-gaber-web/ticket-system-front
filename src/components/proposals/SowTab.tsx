import { useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch } from '@/redux/hooks/hooks';
import {
  addAttachment,
  addSection,
  appendSectionText,
  moveAttachment,
  removeAttachment,
  removeSection,
  setDuration,
  setSowTemplate,
  updateAttachment,
  updateSection,
  uploadAttachment,
} from '@/redux/slices/proposalBuilderSlice';
import { downscaleImage, parseTsv, readClipboard } from '@/lib/proposalPaste';
import type { ImageAttachment, Proposal, ProposalCatalog, SowAttachment } from '@/types/proposal.types';
import { Box, Chip, Field, NativeSelect, RailSection, RemoveButton, fieldCls, textareaCls } from './builderUi';

/** Have the sections been changed from their template (so switching would lose work)? */
const editedFromTemplate = (proposal: Proposal, catalog: ProposalCatalog) => {
  const tpl = catalog.config.sowTemplates[proposal.sow.templateKey] ?? [];
  const secs = proposal.sow.sections;
  if (secs.length !== tpl.length) return true;
  return secs.some((s, i) => s.title !== tpl[i].t || s.body !== tpl[i].b || s.attachments.length > 0);
};

function PasteZone({ index, disabled }: { index: number; disabled: boolean }) {
  const dispatch = useAppDispatch();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const addImage = async (file: File) => {
    setBusy(true);
    try {
      const { blob, width, height } = await downscaleImage(file);
      await dispatch(uploadAttachment({ sectionIdx: index, blob, width, height })).unwrap();
    } catch (e) {
      if (e instanceof Error) toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled || busy) return;
    const r = readClipboard(e.clipboardData);
    if (r.kind === 'table') {
      dispatch(addAttachment({ i: index, attachment: { type: 'table', rows: r.rows, headerRow: true, caption: '' } }));
      toast.success(`Table added (${r.rows.length} rows)`);
    } else if (r.kind === 'image') void addImage(r.file);
    else if (r.kind === 'text') {
      dispatch(appendSectionText({ i: index, text: r.text }));
      toast.success('Text added to the section');
    } else toast.error('Paste a table copied from Excel or Word, or an image.');
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled || busy) return;
    const f = [...(e.dataTransfer?.files ?? [])].find((x) => x.type.startsWith('image/'));
    if (f) void addImage(f);
  };

  if (disabled) return null;
  return (
    <div
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      aria-label={`Paste a table or image into section ${index + 1}`}
      onKeyDown={(e) => {
        if (!(e.ctrlKey || e.metaKey) && !['Tab', 'Shift'].includes(e.key)) e.preventDefault();
      }}
      onBeforeInput={(e) => {
        if ((e.nativeEvent as InputEvent).inputType !== 'insertFromPaste') e.preventDefault();
      }}
      onPaste={onPaste}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="min-h-10 cursor-text rounded-xl border-[1.5px] border-dashed border-outline-variant/70 p-2.5 text-center text-xs text-on-surface-variant caret-transparent outline-none transition-colors focus:border-accent-orange-500 focus:bg-surface-container-low focus:text-on-surface"
    >
      <span contentEditable={false} className="inline-flex flex-wrap items-center justify-center gap-1 select-none">
        {busy ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Adding image…
          </>
        ) : (
          <>
            Click here, then paste (Ctrl+V) a table from Excel / Word or an image · or
            <button type="button" className="font-semibold text-primary underline" onClick={() => fileRef.current?.click()}>
              upload an image
            </button>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void addImage(f);
            e.target.value = '';
          }}
        />
      </span>
    </div>
  );
}

function AttachmentRow({
  i,
  j,
  a,
  last,
  images,
  canEdit,
}: {
  i: number;
  j: number;
  a: SowAttachment;
  last: boolean;
  images: Record<string, string>;
  canEdit: boolean;
}) {
  const dispatch = useAppDispatch();
  const [tsv, setTsv] = useState<string | null>(null);
  const cols = a.type === 'table' ? Math.max(0, ...a.rows.map((r) => r.length)) : 0;
  const src = a.type === 'image' ? images[a.fileId] : undefined;

  return (
    <div className="grid grid-cols-[4rem_minmax(0,1fr)] items-start gap-2 rounded-xl border border-outline-variant/40 bg-surface-container-low p-2">
      <div
        className="grid h-12 w-16 place-items-center rounded-lg border border-outline-variant/40 bg-surface-container-lowest bg-contain bg-center bg-no-repeat text-[11px] font-bold text-on-surface-variant"
        style={src ? { backgroundImage: `url(${src})` } : undefined}
      >
        {a.type === 'table' ? `${a.rows.length}×${cols}` : src ? '' : 'Image'}
      </div>
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <b className="text-on-surface">{a.type === 'table' ? 'Table' : 'Image'}</b>
          <input
            className={`${fieldCls} h-8 flex-[1_1_8rem]`}
            value={a.caption}
            placeholder="Caption (optional)"
            aria-label="Caption"
            disabled={!canEdit}
            onChange={(e) => dispatch(updateAttachment({ i, j, patch: { caption: e.target.value } }))}
          />
          {a.type === 'table' ? (
            <>
              <label className="flex items-center gap-1 text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={a.headerRow !== false}
                  disabled={!canEdit}
                  onChange={(e) => dispatch(updateAttachment({ i, j, patch: { headerRow: e.target.checked } }))}
                />
                First row is header
              </label>
              {canEdit && (
                <Button type="button" variant="outline" size="sm" className="h-7" onClick={() => setTsv(tsv == null ? a.rows.map((r) => r.join('\t')).join('\n') : null)}>
                  {tsv == null ? 'Edit' : 'Done'}
                </Button>
              )}
            </>
          ) : (
            <NativeSelect
              className="w-28"
              value={String((a as ImageAttachment).widthPct || 100)}
              ariaLabel="Image width"
              disabled={!canEdit}
              onChange={(v) => dispatch(updateAttachment({ i, j, patch: { widthPct: Number(v) as ImageAttachment['widthPct'] } }))}
            >
              {[40, 60, 80, 100].map((w) => (
                <option key={w} value={w}>
                  {w}% width
                </option>
              ))}
            </NativeSelect>
          )}
          {canEdit && (
            <>
              <button type="button" aria-label="Move up" disabled={j === 0} onClick={() => dispatch(moveAttachment({ i, j, dir: -1 }))} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-surface-container-high disabled:opacity-30">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" aria-label="Move down" disabled={last} onClick={() => dispatch(moveAttachment({ i, j, dir: 1 }))} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-surface-container-high disabled:opacity-30">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <RemoveButton label="Remove attachment" onClick={() => dispatch(removeAttachment({ i, j }))} />
            </>
          )}
        </div>
        {a.type === 'table' && tsv != null && (
          <>
            <textarea
              className={`${textareaCls} min-h-24 whitespace-pre font-mono text-[11px]`}
              value={tsv}
              onChange={(e) => {
                setTsv(e.target.value);
                dispatch(updateAttachment({ i, j, patch: { rows: parseTsv(e.target.value) } }));
              }}
            />
            <p className="text-[11px] text-on-surface-variant">Cells are separated by tabs, rows by new lines.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function SowTab({
  proposal,
  catalog,
  images,
  canEdit,
}: {
  proposal: Proposal;
  catalog: ProposalCatalog;
  images: Record<string, string>;
  canEdit: boolean;
}) {
  const dispatch = useAppDispatch();
  const templates = Object.keys(catalog.config.sowTemplates);

  const chooseTemplate = async (key: string) => {
    if (key === proposal.sow.templateKey && !editedFromTemplate(proposal, catalog)) return;
    if (editedFromTemplate(proposal, catalog)) {
      const r = await Swal.fire({
        title: `Switch to "${key}"?`,
        text: 'The scope of work sections are replaced by the template, including your edits, pasted tables and images.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#003A8F',
        confirmButtonText: 'Replace sections',
      });
      if (!r.isConfirmed) return;
    }
    dispatch(setSowTemplate(key));
  };

  return (
    <div className="space-y-5">
      <RailSection title="Scope of work type">
        <div className="flex flex-wrap gap-1.5">
          {templates.map((k) => (
            <Chip key={k} on={proposal.sow.templateKey === k} onClick={() => chooseTemplate(k)} disabled={!canEdit}>
              {k}
            </Chip>
          ))}
        </div>
        <Field label="Estimated project duration">
          <input className={fieldCls} value={proposal.sow.duration} disabled={!canEdit} onChange={(e) => dispatch(setDuration(e.target.value))} />
        </Field>
        <p className="rounded-xl bg-surface-container-low p-3 text-xs leading-relaxed text-on-surface-variant">
          Filled in automatically: <b>{'{client}'}</b>, <b>{'{entities}'}</b>, <b>{'{modules}'}</b>, <b>{'{finance}'}</b>, <b>{'{scm}'}</b>,{' '}
          <b>{'{product}'}</b>, <b>{'{duration}'}</b>. Line formats: plain line = ➢ paragraph, <b>* item</b> = bullet, <b># item</b> = numbered,{' '}
          <b>## text</b> = bold heading, <b>**bold**</b>.
        </p>
      </RailSection>

      {proposal.sow.sections.map((s, i) => (
        <Box key={i}>
          <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_2rem] items-center gap-1.5">
            <b className="text-sm text-on-surface">{i + 1}.</b>
            <input
              className={fieldCls}
              value={s.title}
              aria-label={`Section ${i + 1} title`}
              disabled={!canEdit}
              onChange={(e) => dispatch(updateSection({ i, patch: { title: e.target.value } }))}
            />
            <RemoveButton label={`Remove section ${i + 1}`} onClick={() => dispatch(removeSection(i))} disabled={!canEdit} />
          </div>
          <textarea
            className={`${textareaCls} min-h-28`}
            rows={5}
            value={s.body}
            aria-label={`Section ${i + 1} text`}
            disabled={!canEdit}
            onChange={(e) => dispatch(updateSection({ i, patch: { body: e.target.value } }))}
          />
          {s.attachments.map((a, j) => (
            <AttachmentRow key={a._key ?? j} i={i} j={j} a={a} last={j === s.attachments.length - 1} images={images} canEdit={canEdit} />
          ))}
          <PasteZone index={i} disabled={!canEdit} />
        </Box>
      ))}

      {canEdit && (
        <Button type="button" variant="outline" size="sm" onClick={() => dispatch(addSection())}>
          <Plus /> Section
        </Button>
      )}
      {!proposal.sow.sections.length && (
        <p className="flex items-center gap-2 text-xs text-on-surface-variant">
          <ImagePlus className="h-4 w-4" /> No sections — the scope of work pages are left out of the PDF.
        </p>
      )}
    </div>
  );
}
