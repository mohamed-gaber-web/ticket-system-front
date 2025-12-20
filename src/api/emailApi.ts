import api from './axiosConfig';

export interface SendWelcomeEmailData {
  customerEmail: string;
  customerName: string;
  companyName: string;
  temporaryPassword: string;
}

export interface SendCustomerCreatedNotificationData {
  consultantEmail: string;
  consultantName: string;
  customerName: string;
  companyName: string;
}

export interface EmailResponse {
  success: boolean;
  message: string;
}

// Send welcome email to newly created customer
export const sendWelcomeEmail = async (data: SendWelcomeEmailData): Promise<EmailResponse> => {
  const response = await api.post<EmailResponse>('/emails/welcome-customer', data);
  return response.data;
};

// Send notification to consultant about customer creation
export const sendCustomerCreatedNotification = async (data: SendCustomerCreatedNotificationData): Promise<EmailResponse> => {
  const response = await api.post<EmailResponse>('/emails/customer-created-notification', data);
  return response.data;
};
