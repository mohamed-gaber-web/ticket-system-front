import React, { useRef, useState } from 'react';
import { Upload, X, File, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { uploadTaskAttachment } from '@/redux/slices/taskAttachmentSlice';
import { formatFileSize } from '@/api/attachmentApi';

interface Props {
  taskId: string;
  onUploadSuccess?: () => void;
}

const TaskFileUpload: React.FC<Props> = ({ taskId, onUploadSuccess }) => {
  const dispatch = useAppDispatch();
  const { uploading } = useAppSelector((s) => s.taskAttachments);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    const result = await dispatch(uploadTaskAttachment({ taskId, file: selectedFile }));
    if (uploadTaskAttachment.fulfilled.match(result)) {
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploadSuccess?.();
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,application/zip,.zip"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id="task-file-upload"
        />
        <label htmlFor="task-file-upload">
          <Button type="button" variant="outline" size="sm" disabled={uploading} className="cursor-pointer" asChild>
            <span><Upload className="h-4 w-4 mr-1.5" />Choose File</span>
          </Button>
        </label>
        {selectedFile && (
          <div className="flex-1 flex items-center gap-2 p-2.5 bg-surface-container-high rounded-[0.5rem]">
            {selectedFile.type.startsWith('image/') ? <ImageIcon className="h-5 w-5 text-brand-500" /> : <File className="h-5 w-5 text-on-surface-variant" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-on-surface truncate">{selectedFile.name}</p>
              <p className="text-xs text-on-surface-variant">{formatFileSize(selectedFile.size)}</p>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" onClick={handleCancel} disabled={uploading} className="text-on-surface-variant hover:text-on-surface">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {preview && <img src={preview} alt="Preview" className="w-full max-w-xs h-auto rounded-[0.75rem]" />}

      {selectedFile && (
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={handleUpload} disabled={uploading}>
            {uploading ? <><div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white mr-1.5" />Uploading...</> : <><Upload className="h-3.5 w-3.5 mr-1.5" />Upload</>}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleCancel} disabled={uploading} className="text-on-surface-variant">Cancel</Button>
        </div>
      )}

      <p className="text-xs text-on-surface-variant">Images, PDF, Word, Excel, TXT, ZIP · Max 10MB</p>
    </div>
  );
};

export default TaskFileUpload;
