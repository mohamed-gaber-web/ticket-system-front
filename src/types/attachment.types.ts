export interface TicketAttachment {
  _id: string;
  ticket: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  uploadedByUserId: string;
  uploadedByUserType: 'customer' | 'consultant' | 'team_member';
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
  uploadedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface UploadFileResponse {
  fileId?: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  url: string;
}

export interface AttachmentsResponse {
  success: boolean;
  count: number;
  total: number;
  totalSize: number;
  page: number;
  pages: number;
  data: TicketAttachment[];
}

export interface AttachmentStats {
  total: number;
  totalSize: number;
  averageSize: number;
  byFileType: {
    _id: string;
    count: number;
    totalSize: number;
  }[];
  byUserType: {
    _id: string;
    count: number;
  }[];
}

export interface CreateAttachmentParams {
  ticket: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  uploadedByUserId: string;
  uploadedByUserType: 'customer' | 'consultant' | 'team_member';
}

export interface UploadAttachmentParams {
  ticketId: string;
  file: File;
  uploadedByUserId: string;
  uploadedByUserType: 'customer' | 'consultant' | 'team_member';
}
