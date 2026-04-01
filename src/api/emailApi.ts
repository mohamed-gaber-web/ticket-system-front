import api from './axiosConfig';

export interface SendCommentEmailPayload {
  ticketId: string;
  ticketNumber: string;
  commentText: string;
  recipients: string[];
  senderName: string;
}

export const sendCommentEmail = (payload: SendCommentEmailPayload) =>
  api.post('/emails/send-comment', payload);
