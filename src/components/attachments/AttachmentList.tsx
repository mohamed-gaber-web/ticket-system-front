import React, { useEffect } from 'react';
import { Download, Trash2, File, Image as ImageIcon, Video, FileText } from 'lucide-react';
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
          <p class="mt-3 text-red-600">This action cannot be undone!</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
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
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    } else if (fileType.startsWith('video/')) {
      return <Video className="h-5 w-5 text-purple-500" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const getDownloadUrl = (filePath: string) => {
    // Ensure the URL is properly formatted
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    return `${baseUrl}${filePath}`;
  };

  const isTemporaryFile = (filePath: string) => {
    // Check if this is a temporary mock file (not uploaded to server yet)
    return filePath.includes('/uploads/temp/');
  };

  if (loading && attachments.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Attachments ({total})
        </h3>
        {totalSize > 0 && (
          <p className="text-sm text-gray-500">
            Total size: {formatFileSize(totalSize)}
          </p>
        )}
      </div>

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
          <File className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <p className="text-gray-600">No attachments yet</p>
          <p className="text-sm text-gray-500 mt-1">Upload files to attach them to this ticket</p>
        </div>
      ) : (
        <div className="space-y-3">
          {attachments.map((attachment) => (
            <div
              key={attachment._id}
              className="flex items-start gap-4 p-4 bg-white rounded-lg border hover:shadow-md transition-shadow"
            >
              {/* File Preview/Icon */}
              <div className="flex-shrink-0">
                {attachment.fileType.startsWith('image/') ? (
                  isTemporaryFile(attachment.filePath) ? (
                    // Show placeholder for temporary/mock files
                    <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border-2 border-dashed border-blue-300">
                      <div className="text-center">
                        <ImageIcon className="h-8 w-8 text-blue-500 mx-auto mb-1" />
                        <p className="text-xs text-blue-600 font-medium">Preview</p>
                      </div>
                    </div>
                  ) : (
                    // Show actual image for real uploaded files
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
                      <img
                        src={getDownloadUrl(attachment.filePath)}
                        alt={attachment.fileName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-full h-full flex items-center justify-center bg-gray-100">
                                <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center">
                    {getFileIcon(attachment.fileType)}
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {attachment.fileName}
                  </h4>
                  {isTemporaryFile(attachment.filePath) && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200 whitespace-nowrap">
                      Pending Upload
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatFileSize(attachment.fileSize)}
                </p>
                {isTemporaryFile(attachment.filePath) && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ File saved in database only. Actual file upload pending backend implementation.
                  </p>
                )}
                {attachment.uploadedBy && (
                  <p className="text-xs text-gray-500 mt-1">
                    Uploaded by {attachment.uploadedBy.firstName} {attachment.uploadedBy.lastName}
                    {' on '}
                    {new Date(attachment.uploadedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {!isTemporaryFile(attachment.filePath) ? (
                  <a
                    href={getDownloadUrl(attachment.filePath)}
                    download={attachment.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 hover:text-blue-700 hover:border-blue-300"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </a>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="text-gray-400 cursor-not-allowed"
                    title="Download not available for pending uploads"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                )}
                {userType !== 'consultant' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                    onClick={() => handleDelete(attachment._id, attachment.fileName)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video/PDF Preview Section */}
      <div className="space-y-4">
        {attachments
          .filter((a) => a.fileType.startsWith('video/'))
          .map((attachment) => (
            <div key={`preview-${attachment._id}`} className="rounded-lg border overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <p className="text-sm font-medium text-gray-900">{attachment.fileName}</p>
              </div>
              <div className="p-4 bg-black">
                <video
                  src={getDownloadUrl(attachment.filePath)}
                  controls
                  className="w-full max-h-96 rounded"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default AttachmentList;
