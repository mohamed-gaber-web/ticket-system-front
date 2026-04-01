import React, { useEffect } from 'react';
import { Download, Trash2, File, Image as ImageIcon, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTicketAttachments, removeAttachment } from '@/redux/slices/attachmentSlice';
import { formatFileSize } from '@/api/attachmentApi';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

interface AttachmentListProps {
  ticketId: string;
}

const AttachmentList: React.FC<AttachmentListProps> = ({ ticketId }) => {
  const dispatch = useAppDispatch();
  const { attachments, loading, total, totalSize } = useAppSelector((state) => state.attachments);
  const { userType } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (ticketId) {
      dispatch(fetchTicketAttachments({ ticketId }));
    }
  }, [ticketId, dispatch]);

  const handleDelete = async (attachmentId: string, fileName: string) => {
    const result = await MySwal.fire({
      title: 'Delete Attachment?',
      html: `
        <div class="text-left">
          <p class="mb-2">Are you sure you want to delete:</p>
          <p class="font-semibold">${fileName}</p>
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

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-brand-500" />;
    if (fileType === 'application/pdf') return <FileText className="h-5 w-5 text-error" />;
    return <File className="h-5 w-5 text-on-surface-variant" />;
  };

  const getDownloadUrl = (filePath: string) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    return `${baseUrl}${filePath}`;
  };

  const isTemporaryFile = (filePath: string) => {
    return filePath.includes('/uploads/temp/');
  };

  if (loading && attachments.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary"></div>
      </div>
    );
  }

  return (
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

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <div className="text-center py-8 bg-surface-container-high rounded-[1rem]">
          <File className="mx-auto h-10 w-10 text-on-surface-variant/30 mb-3" />
          <p className="text-on-surface font-medium text-sm">No attachments yet</p>
          <p className="text-xs text-on-surface-variant mt-1">Upload files to attach them to this ticket</p>
        </div>
      ) : (
        <div className="space-y-3">
          {attachments.map((attachment) => (
            <div
              key={attachment._id}
              className="flex items-start gap-3 p-3 bg-surface-container-low rounded-[0.75rem] hover:bg-surface-container-high transition-colors"
            >
              {/* File Preview/Icon */}
              <div className="flex-shrink-0">
                {attachment.fileType.startsWith('image/') ? (
                  isTemporaryFile(attachment.filePath) ? (
                    <div className="w-16 h-16 rounded-[0.75rem] bg-primary-fixed flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-brand-500" />
                    </div>
                  ) : (
                    <div className="relative w-16 h-16 rounded-[0.75rem] overflow-hidden">
                      <img
                        src={getDownloadUrl(attachment.filePath)}
                        alt={attachment.fileName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-full h-full flex items-center justify-center bg-surface-container-high">
                                <svg class="h-6 w-6" style="color: #434653" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                              </div>
                            `;
                          }
                        }}
                      />
                    </div>
                  )
                ) : (
                  <div className="w-16 h-16 rounded-[0.75rem] bg-surface-container-high flex items-center justify-center">
                    {getFileIcon(attachment.fileType)}
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-on-surface truncate">
                    {attachment.fileName}
                  </h4>
                  {isTemporaryFile(attachment.filePath) && (
                    <span className="px-2 py-0.5 rounded-[0.375rem] text-[10px] font-semibold bg-yellow-500/10 text-yellow-700 whitespace-nowrap">
                      Pending
                    </span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {formatFileSize(attachment.fileSize)}
                </p>
                {attachment.uploadedBy && (
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {attachment.uploadedBy.firstName} {attachment.uploadedBy.lastName}
                    {' · '}
                    {new Date(attachment.uploadedAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                  </p>
                )}
                {attachment.fileType.startsWith('image/') && (
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {new Date(attachment.uploadedAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                    {' · '}
                    {new Date(attachment.uploadedAt).toLocaleTimeString('en-US', {
                      hour: '2-digit', minute: '2-digit', hour12: true,
                    })}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {!isTemporaryFile(attachment.filePath) ? (
                  <a
                    href={getDownloadUrl(attachment.filePath)}
                    download={attachment.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-brand-500 hover:text-brand-600"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                ) : (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    disabled
                    className="text-on-surface-variant/30"
                    title="Download not available"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                {userType !== 'consultant' && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="text-on-surface-variant hover:text-error"
                    onClick={() => handleDelete(attachment._id, attachment.fileName)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default AttachmentList;
