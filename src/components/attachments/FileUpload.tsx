import React, { useRef, useState } from 'react';
import { Upload, X, File, Image as ImageIcon } from 'lucide-react';
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
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
    return <File className="h-5 w-5" />;
  };

  return (
    <div className="space-y-3">
      {/* File Input */}
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            className="cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            asChild
          >
            <span>
              <Upload className="h-4 w-4 mr-1.5" />
              Choose File
            </span>
          </Button>
        </label>

        {selectedFile && (
          <div className="flex-1 flex items-center gap-2 p-2.5 bg-surface-container-high rounded-[0.5rem]">
            {getFileIcon()}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-on-surface truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-on-surface-variant">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleCancel}
              disabled={uploading}
              className="text-on-surface-variant hover:text-on-surface"
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
            className="w-full h-auto rounded-[0.75rem]"
          />
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white mr-1.5" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Upload
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={uploading}
            className="text-on-surface-variant"
          >
            Cancel
          </Button>
        </div>
      )}

      {/* File Type Info */}
      <p className="text-xs text-on-surface-variant">
        Images, PDF · Max 10MB
      </p>
    </div>
  );
};

export default FileUpload;
