import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  TicketAttachment,
  AttachmentsResponse,
  UploadAttachmentParams,
} from '@/types/attachment.types';
import * as attachmentApi from '@/api/attachmentApi';
import { toast } from 'sonner';

interface AttachmentState {
  attachments: TicketAttachment[];
  loading: boolean;
  uploading: boolean;
  error: string | null;
  total: number;
  totalSize: number;
  page: number;
  pages: number;
}

const initialState: AttachmentState = {
  attachments: [],
  loading: false,
  uploading: false,
  error: null,
  total: 0,
  totalSize: 0,
  page: 1,
  pages: 1,
};

// Upload attachment
export const uploadAttachment = createAsyncThunk(
  'attachments/upload',
  async (params: UploadAttachmentParams, { rejectWithValue }) => {
    try {
      // Validate file before upload
      const validation = attachmentApi.validateFile(params.file);
      if (!validation.valid) {
        toast.error(validation.error || 'Invalid file');
        return rejectWithValue(validation.error);
      }

      const attachment = await attachmentApi.uploadTicketAttachment(params);
      toast.success('File uploaded successfully!');
      return attachment;
    } catch (error: any) {
      const message = error.response?.data?.message
        || error.response?.data?.error
        || error.message
        || 'Failed to upload file';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Get attachments for a ticket
export const fetchTicketAttachments = createAsyncThunk(
  'attachments/fetchByTicket',
  async ({ ticketId, page = 1, limit = 50 }: { ticketId: string; page?: number; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await attachmentApi.getTicketAttachments(ticketId, page, limit);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch attachments';
      return rejectWithValue(message);
    }
  }
);

// Delete attachment
export const removeAttachment = createAsyncThunk(
  'attachments/delete',
  async (attachmentId: string, { rejectWithValue }) => {
    try {
      await attachmentApi.deleteAttachment(attachmentId);
      toast.success('Attachment deleted successfully');
      return attachmentId;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete attachment';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const attachmentSlice = createSlice({
  name: 'attachments',
  initialState,
  reducers: {
    clearAttachments: (state) => {
      state.attachments = [];
      state.total = 0;
      state.totalSize = 0;
      state.page = 1;
      state.pages = 1;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Upload attachment
    builder
      .addCase(uploadAttachment.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(uploadAttachment.fulfilled, (state, action: PayloadAction<TicketAttachment>) => {
        state.uploading = false;
        state.attachments.unshift(action.payload);
        state.total += 1;
        state.totalSize += action.payload.fileSize;
      })
      .addCase(uploadAttachment.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload as string;
      });

    // Fetch attachments
    builder
      .addCase(fetchTicketAttachments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTicketAttachments.fulfilled, (state, action: PayloadAction<AttachmentsResponse>) => {
        state.loading = false;
        state.attachments = action.payload.data;
        state.total = action.payload.total;
        state.totalSize = action.payload.totalSize;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchTicketAttachments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete attachment
    builder
      .addCase(removeAttachment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeAttachment.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        const deletedAttachment = state.attachments.find(a => a._id === action.payload);
        state.attachments = state.attachments.filter((a) => a._id !== action.payload);
        state.total -= 1;
        if (deletedAttachment) {
          state.totalSize -= deletedAttachment.fileSize;
        }
      })
      .addCase(removeAttachment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearAttachments, clearError } = attachmentSlice.actions;
export default attachmentSlice.reducer;
