import React, { useEffect, useState } from 'react';
import { Download, Trash2, File, Image as ImageIcon, FileText, FileSpreadsheet, X, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTaskAttachments, removeTaskAttachment } from '@/redux/slices/taskAttachmentSlice';
import { formatFileSize } from '@/api/attachmentApi';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface Props { taskId: string; }

const TaskAttachmentList: React.FC<Props> = ({ taskId }) => {
  const dispatch = useAppDispatch();
  const { attachments, loading, total, totalSize } = useAppSelector((s) => s.taskAttachments);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxName, setLightboxName] = useState('');

  useEffect(() => { if (taskId) dispatch(fetchTaskAttachments(taskId)); }, [taskId, dispatch]);

  const getFileUrl = (fp: string) => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    return `${base}${fp}`;
  };

  const isImage = (t: string) => t.startsWith('image/');
  const isPdf = (t: string) => t === 'application/pdf';
  const isExcel = (t: string) => t === 'application/vnd.ms-excel' || t === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  const handleDownload = async (fp: string, name: string) => {
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(getFileUrl(fp), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!resp.ok) throw new Error();
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { toast.error('Failed to download file'); }
  };

  const handleOpen = (fp: string, ft: string, name: string) => {
    const url = getFileUrl(fp);
    if (isImage(ft)) { setLightboxUrl(url); setLightboxName(name); }
    else if (isPdf(ft)) window.open(url, '_blank', 'noopener,noreferrer');
    else handleDownload(fp, name);
  };

  const handleDelete = async (id: string, name: string) => {
    const r = await MySwal.fire({
      title: 'Delete Attachment?',
      html: `<div class="text-left"><p class="mb-2">Are you sure you want to delete:</p><p class="font-semibold">${escapeHtml(name)}</p><p class="mt-3" style="color:#BA1A1A">This action cannot be undone!</p></div>`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#BA1A1A', cancelButtonColor: '#434653',
      confirmButtonText: 'Yes, delete it!', cancelButtonText: 'Cancel', reverseButtons: true, focusCancel: true,
    });
    if (r.isConfirmed) dispatch(removeTaskAttachment(id));
  };

  const getIcon = (ft: string, sz = 'h-5 w-5') => {
    if (isImage(ft)) return <ImageIcon className={`${sz} text-brand-500`} />;
    if (isPdf(ft)) return <FileText className={`${sz} text-error`} />;
    if (isExcel(ft)) return <FileSpreadsheet className={`${sz} text-green-600`} />;
    return <File className={`${sz} text-on-surface-variant`} />;
  };

  if (loading && attachments.length === 0) {
    return <div className="flex justify-center items-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" /></div>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-on-surface">Attachments ({total})</h3>
          {totalSize > 0 && <p className="text-xs text-on-surface-variant">Total: {formatFileSize(totalSize)}</p>}
        </div>

        {attachments.length === 0 ? (
          <div className="text-center py-8 bg-surface-container-high rounded-[1rem]">
            <File className="mx-auto h-10 w-10 text-on-surface-variant/30 mb-3" />
            <p className="text-on-surface font-medium text-sm">No attachments yet</p>
            <p className="text-xs text-on-surface-variant mt-1">Upload files to attach them to this task</p>
          </div>
        ) : (
          <div className="space-y-2">
            {attachments.map((a) => (
              <div
                key={a._id}
                className="group flex items-center gap-3 p-3 bg-surface-container-low rounded-[0.75rem] hover:bg-surface-container-high transition-colors cursor-pointer"
                onClick={() => handleOpen(a.filePath, a.fileType, a.fileName)}
              >
                <div className="flex-shrink-0">
                  {isImage(a.fileType) ? (
                    <div className="relative w-14 h-14 rounded-[0.5rem] overflow-hidden bg-surface-container-high">
                      <img src={getFileUrl(a.filePath)} alt={a.fileName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-[0.5rem] bg-surface-container-high flex items-center justify-center">{getIcon(a.fileType)}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">{a.fileName}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{formatFileSize(a.fileSize)}</p>
                  {a.uploadedBy && (
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {a.uploadedBy.firstName} {a.uploadedBy.lastName} · {new Date(a.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <Button size="icon-sm" variant="ghost" className="text-brand-500 hover:text-brand-600" title="Download" onClick={() => handleDownload(a.filePath, a.fileName)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="icon-sm" variant="ghost" className="text-on-surface-variant hover:text-error" title="Delete" onClick={() => handleDelete(a._id, a.fileName)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <div className="relative max-w-5xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button className="absolute -top-10 right-0 text-white/80 hover:text-white flex items-center gap-1.5 text-sm" onClick={() => setLightboxUrl(null)}>
              <X className="h-5 w-5" />Close
            </button>
            <img src={lightboxUrl} alt={lightboxName} className="max-w-full max-h-[85vh] rounded-[0.75rem] object-contain shadow-2xl" />
            <p className="text-white/70 text-xs text-center mt-3">{lightboxName}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default TaskAttachmentList;
