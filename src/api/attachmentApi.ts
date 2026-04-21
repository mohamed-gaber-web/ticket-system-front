import axiosInstance from './axiosConfig';
import type {
  TicketAttachment,
  UploadFileResponse,
  AttachmentsResponse,
  AttachmentStats,
  CreateAttachmentParams,
  UploadAttachmentParams,
} from '@/types/attachment.types';

// Step 1: Upload file to server (when backend implements this endpoint)
export const uploadFile = async (file: File, ticketId: string): Promise<UploadFileResponse> => {
  try {
    const formData = new FormData();

    // Try different common field names that multer might expect
    // Common names: 'file', 'upload', 'attachment', 'image'
    formData.append('file', file, file.name);
    formData.append('ticketId', ticketId);

    const response = await axiosInstance.post<{ success: boolean; data: UploadFileResponse }>(
      '/upload',
      formData
    );

    return response.data.data;
  } catch (error: any) {
    throw error;
  }
};

// Step 2: Create attachment record in database
export const createAttachment = async (
  attachmentData: CreateAttachmentParams
): Promise<TicketAttachment> => {
  const response = await axiosInstance.post<{ success: boolean; data: TicketAttachment }>(
    '/ticket-attachments',
    attachmentData
  );

  return response.data.data;
};

// Combined function: Upload file and create attachment record
export const uploadTicketAttachment = async ({
  ticketId,
  file,
  uploadedByUserId,
  uploadedByUserType,
}: UploadAttachmentParams): Promise<TicketAttachment> => {
  // Step 1: Upload file to server
  const fileData = await uploadFile(file, ticketId);

  // Step 2: Create attachment record
  const attachmentData: CreateAttachmentParams = {
    ticket: ticketId,
    fileName: fileData.fileName,
    filePath: fileData.filePath,
    fileSize: fileData.fileSize,
    fileType: fileData.fileType,
    uploadedByUserId,
    uploadedByUserType,
  };

  const attachment = await createAttachment(attachmentData);
  return attachment;
};

// Get attachments for a ticket
export const getTicketAttachments = async (
  ticketId: string,
  page: number = 1,
  limit: number = 50
): Promise<AttachmentsResponse> => {
  const response = await axiosInstance.get<AttachmentsResponse>(
    `/ticket-attachments/ticket/${ticketId}`,
    {
      params: { page, limit },
    }
  );

  return response.data;
};

// Delete an attachment
export const deleteAttachment = async (attachmentId: string): Promise<void> => {
  await axiosInstance.delete(`/ticket-attachments/${attachmentId}`);
};

// Get attachment statistics
export const getAttachmentStats = async (): Promise<AttachmentStats> => {
  const response = await axiosInstance.get<{ success: boolean; data: AttachmentStats }>(
    '/ticket-attachments/stats'
  );

  return response.data.data;
};

// Validate file before upload
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload an image or document (PDF, Word, Excel, PowerPoint, TXT).',
    };
  }

  // Validate file size (10MB max for all files)
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size: 10MB',
    };
  }

  return { valid: true };
};

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
