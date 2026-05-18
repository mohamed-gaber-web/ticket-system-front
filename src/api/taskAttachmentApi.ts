import axiosInstance from './axiosConfig';
import { validateFile, formatFileSize } from './attachmentApi';
export { validateFile, formatFileSize };

export interface TaskAttachment {
  _id: string;
  task: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  uploadedByUserId: string;
  uploadedByUserType: 'consultant' | 'team_member';
  uploadedAt: string;
  uploadedBy?: { firstName: string; lastName: string };
}

export interface TaskAttachmentsResponse {
  success: boolean;
  total: number;
  totalSize: number;
  data: TaskAttachment[];
}

export const uploadTaskAttachment = async ({
  taskId,
  file,
}: {
  taskId: string;
  file: File;
}): Promise<TaskAttachment> => {
  const formData = new FormData();
  formData.append('file', file, file.name);
  formData.append('ticketId', taskId);

  const uploadRes = await axiosInstance.post<{ success: boolean; data: any }>('/upload', formData);
  const fileData = uploadRes.data.data;

  const res = await axiosInstance.post<{ success: boolean; data: TaskAttachment }>('/task-attachments', {
    task: taskId,
    fileName: fileData.fileName,
    filePath: fileData.filePath,
    fileSize: fileData.fileSize,
    fileType: fileData.fileType,
  });
  return res.data.data;
};

export const getTaskAttachments = async (taskId: string): Promise<TaskAttachmentsResponse> => {
  const res = await axiosInstance.get<TaskAttachmentsResponse>(`/task-attachments/task/${taskId}`);
  return res.data;
};

export const deleteTaskAttachment = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/task-attachments/${id}`);
};
