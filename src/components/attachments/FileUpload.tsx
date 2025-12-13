import React, { useRef, useState } from 'react';
import { Upload, X, File, Image as ImageIcon, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { uploadAttachment } from '@/redux/slices/attachmentSlice';
import { formatFileSize } from '@/api/attachmentApi';

interface FileUploadProps {
  ticketId: string;
  onUploadSuccess?: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ ticketId, onUploadSuccess }) => {
  const dispatch = useAppDispatch();
  const { uploading } = useAppSelector((state) => state.attachments);
  const { user, userType } = useAppSelector((state) => state.auth);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setSelectedFile(file);

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    const result = await dispatch(
      uploadAttachment({
        ticketId,
        file: selectedFile,
        uploadedByUserId: user._id,
        uploadedByUserType: userType as 'customer' | 'consultant' | 'team_member',
      })
    );

    if (uploadAttachment.fulfilled.match(result)) {
      // Reset state
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Callback on success
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="h-5 w-5" />;
    if (selectedFile.type.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    if (selectedFile.type.startsWith('video/')) return <Video className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  return (
    <div className="space-y-4">
      {/* File Input */}
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,application/pdf"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload">
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            className="cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            asChild
          >
            <span>
              <Upload className="h-4 w-4 mr-2" />
              Choose File
            </span>
          </Button>
        </label>

        {selectedFile && (
          <div className="flex-1 flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
            {getFileIcon()}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div className="relative w-full max-w-xs">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-auto rounded-lg border shadow-sm"
          />
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && (
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={uploading}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* File Type Info */}
      <div className="text-xs text-gray-500">
        <p>Supported formats: Images (JPG, PNG, GIF, WebP), Videos (MP4, WebM), PDF</p>
        <p>Max size: 5MB for images, 50MB for videos, 10MB for PDFs</p>
      </div>
    </div>
  );
};

export default FileUpload;
