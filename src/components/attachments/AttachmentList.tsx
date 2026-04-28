import React, { useEffect, useState } from 'react';
import { Download, Trash2, File, Image as ImageIcon, FileText, FileSpreadsheet, X, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTicketAttachments, removeAttachment } from '@/redux/slices/attachmentSlice';
import { formatFileSize } from '@/api/attachmentApi';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface AttachmentListProps {
  ticketId: string;
}

const AttachmentList: React.FC<AttachmentListProps> = ({ ticketId }) => {
  const dispatch = useAppDispatch();
  const { attachments, loading, total, totalSize } = useAppSelector((state) => state.attachments);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxName, setLightboxName] = useState<string>('');

  useEffect(() => {
    if (ticketId) {
      dispatch(fetchTicketAttachments({ ticketId }));
    }
  }, [ticketId, dispatch]);

  const getFileUrl = (filePath: string) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    return `${baseUrl}${filePath}`;
  };

  const isTemporaryFile = (filePath: string) => filePath.includes('/uploads/temp/');

  const isImage = (fileType: string) => fileType.startsWith('image/');
  const isPdf = (fileType: string) => fileType === 'application/pdf';
  const isExcel = (fileType: string) =>
    fileType === 'application/vnd.ms-excel' ||
    fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  const handleOpen = (filePath: string, fileType: string, fileName: string) => {
    if (isTemporaryFile(filePath)) return;
    const url = getFileUrl(filePath);
    if (isImage(fileType)) {
      setLightboxUrl(url);
      setLightboxName(fileName);
    } else if (isPdf(fileType)) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      handleDownload(filePath, fileName);
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const url = getFileUrl(filePath);
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error('Failed to download file');
    }
  };

  const handleDelete = async (attachmentId: string, fileName: string) => {
    const result = await MySwal.fire({
      title: 'Delete Attachment?',
      html: `
        <div class="text-left">
          <p class="mb-2">Are you sure you want to delete:</p>
          <p class="font-semibold">${escapeHtml(fileName)}</p>
          <p class="mt-3" style="color: #BA1A1A">This action cannot be undone!</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#BA1A1A',
      cancelButtonColor: '#434653',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
    });

    if (result.isConfirmed) {
      dispatch(removeAttachment(attachmentId));
    }
  };

  const getFileIcon = (fileType: string, size = 'h-5 w-5') => {
    if (isImage(fileType)) return <ImageIcon className={`${size} text-brand-500`} />;
    if (isPdf(fileType)) return <FileText className={`${size} text-error`} />;
    if (isExcel(fileType)) return <FileSpreadsheet className={`${size} text-green-600`} />;
    return <File className={`${size} text-on-surface-variant`} />;
  };

  const getClickHint = (fileType: string) => {
    if (isImage(fileType)) return 'Click to preview';
    if (isPdf(fileType)) return 'Click to open';
    return 'Click to download';
  };

  if (loading && attachments.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-on-surface">
            Attachments ({total})
          </h3>
          {totalSize > 0 && (
            <p className="text-xs text-on-surface-variant">
              Total: {formatFileSize(totalSize)}
            </p>
          )}
        </div>

        {attachments.length === 0 ? (
          <div className="text-center py-8 bg-surface-container-high rounded-[1rem]">
            <File className="mx-auto h-10 w-10 text-on-surface-variant/30 mb-3" />
            <p className="text-on-surface font-medium text-sm">No attachments yet</p>
            <p className="text-xs text-on-surface-variant mt-1">Upload files to attach them to this ticket</p>
          </div>
        ) : (
          <div className="space-y-2">
            {attachments.map((attachment) => {
              const isPending = isTemporaryFile(attachment.filePath);
              const canOpen = !isPending;

              return (
                <div
                  key={attachment._id}
                  className={`group flex items-center gap-3 p-3 bg-surface-container-low rounded-[0.75rem] transition-colors ${canOpen ? 'hover:bg-surface-container-high cursor-pointer' : ''}`}
                  onClick={canOpen ? () => handleOpen(attachment.filePath, attachment.fileType, attachment.fileName) : undefined}
                >
                  {/* Icon / Thumbnail */}
                  <div className="flex-shrink-0">
                    {isImage(attachment.fileType) && !isPending ? (
                      <div className="relative w-14 h-14 rounded-[0.5rem] overflow-hidden bg-surface-container-high">
                        <img
                          src={getFileUrl(attachment.filePath)}
                          alt={attachment.fileName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-[0.5rem] bg-surface-container-high flex items-center justify-center">
                        {getFileIcon(attachment.fileType)}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-on-surface truncate">
                        {attachment.fileName}
                      </p>
                      {isPending && (
                        <span className="px-2 py-0.5 rounded-[0.375rem] text-[10px] font-semibold bg-yellow-500/10 text-yellow-700 whitespace-nowrap">
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {formatFileSize(attachment.fileSize)}
                      {' · '}
                      <span className="italic">{getClickHint(attachment.fileType)}</span>
                    </p>
                    {attachment.uploadedBy && (
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {attachment.uploadedBy.firstName} {attachment.uploadedBy.lastName}
                        {' · '}
                        {new Date(attachment.uploadedAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {canOpen && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-brand-500 hover:text-brand-600"
                        title="Download"
                        onClick={() => handleDownload(attachment.filePath, attachment.fileName)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-on-surface-variant hover:text-error"
                      title="Delete"
                      onClick={() => handleDelete(attachment._id, attachment.fileName)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-5xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute -top-10 right-0 text-white/80 hover:text-white flex items-center gap-1.5 text-sm"
              onClick={() => setLightboxUrl(null)}
            >
              <X className="h-5 w-5" />
              Close
            </button>
            <img
              src={lightboxUrl}
              alt={lightboxName}
              className="max-w-full max-h-[85vh] rounded-[0.75rem] object-contain shadow-2xl"
            />
            <p className="text-white/70 text-xs text-center mt-3">{lightboxName}</p>
            <button
              className="absolute -bottom-10 right-0 text-white/80 hover:text-white flex items-center gap-1.5 text-sm"
              onClick={() => handleDownload(
                attachments.find(a => getFileUrl(a.filePath) === lightboxUrl)?.filePath || '',
                lightboxName
              )}
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AttachmentList;
