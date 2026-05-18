import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import * as api from '@/api/taskAttachmentApi';
import type { TaskAttachment, TaskAttachmentsResponse } from '@/api/taskAttachmentApi';
import { validateFile } from '@/api/attachmentApi';
import { toast } from 'sonner';

interface State {
  attachments: TaskAttachment[];
  loading: boolean;
  uploading: boolean;
  error: string | null;
  total: number;
  totalSize: number;
}

const initialState: State = { attachments: [], loading: false, uploading: false, error: null, total: 0, totalSize: 0 };

export const uploadTaskAttachment = createAsyncThunk(
  'taskAttachments/upload',
  async (params: { taskId: string; file: File }, { rejectWithValue }) => {
    const v = validateFile(params.file);
    if (!v.valid) { toast.error(v.error || 'Invalid file'); return rejectWithValue(v.error); }
    try {
      const attachment = await api.uploadTaskAttachment(params);
      toast.success('File uploaded successfully!');
      return attachment;
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'Failed to upload file';
      toast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const fetchTaskAttachments = createAsyncThunk(
  'taskAttachments/fetch',
  async (taskId: string, { rejectWithValue }) => {
    try { return await api.getTaskAttachments(taskId); }
    catch (e: any) { return rejectWithValue(e.response?.data?.message || 'Failed to fetch attachments'); }
  }
);

export const removeTaskAttachment = createAsyncThunk(
  'taskAttachments/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.deleteTaskAttachment(id);
      toast.success('Attachment deleted');
      return id;
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to delete attachment';
      toast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

const slice = createSlice({
  name: 'taskAttachments',
  initialState,
  reducers: {
    clearTaskAttachments: (state) => { Object.assign(state, initialState); },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadTaskAttachment.pending, (s) => { s.uploading = true; })
      .addCase(uploadTaskAttachment.fulfilled, (s, a: PayloadAction<TaskAttachment>) => {
        s.uploading = false; s.attachments.unshift(a.payload); s.total += 1; s.totalSize += a.payload.fileSize;
      })
      .addCase(uploadTaskAttachment.rejected, (s) => { s.uploading = false; });

    builder
      .addCase(fetchTaskAttachments.pending, (s) => { s.loading = true; })
      .addCase(fetchTaskAttachments.fulfilled, (s, a: PayloadAction<TaskAttachmentsResponse>) => {
        s.loading = false; s.attachments = a.payload.data; s.total = a.payload.total; s.totalSize = a.payload.totalSize;
      })
      .addCase(fetchTaskAttachments.rejected, (s) => { s.loading = false; });

    builder
      .addCase(removeTaskAttachment.pending, (s) => { s.loading = true; })
      .addCase(removeTaskAttachment.fulfilled, (s, a: PayloadAction<string>) => {
        const found = s.attachments.find(x => x._id === a.payload);
        s.attachments = s.attachments.filter(x => x._id !== a.payload);
        s.total -= 1;
        if (found) s.totalSize -= found.fileSize;
        s.loading = false;
      })
      .addCase(removeTaskAttachment.rejected, (s) => { s.loading = false; });
  },
});

export const { clearTaskAttachments } = slice.actions;
export default slice.reducer;
