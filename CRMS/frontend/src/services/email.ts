// frontend/src/services/email.ts
/** Resend email service */

import api from './api';

export interface SendEmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  reply_to?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: string; // base64 encoded
  }>;
  tags?: Array<{
    name: string;
    value: string;
  }>;
  customer_id?: string;
  complaint_id?: string;
  trigger?: string;
}

export interface SendEmailResponse {
  success: boolean;
  message: string;
  email_id: string;
  result: {
    id: string;
  };
}

export interface EmailStatusResponse {
  configured: boolean;
  from_email?: string;
  message: string;
}

export interface EmailHistoryEntry {
  id: string;
  tenant_id: string;
  customer_id?: string;
  complaint_id?: string;
  subject: string;
  html?: string;
  text?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  trigger?: string;
  sent_by?: string;
  status: string;
  error?: string;
  sent_at?: string;
}

export interface EmailHistoryResponse {
  history: EmailHistoryEntry[];
  count: number;
}

/**
 * Send an email via Resend
 */
export async function sendEmail(
  request: SendEmailRequest
): Promise<SendEmailResponse> {
  const response = await api.post<SendEmailResponse>('/email/send', request);
  return response.data;
}

/**
 * Get Resend email service status
 */
export async function getEmailStatus(): Promise<EmailStatusResponse> {
  const response = await api.get<EmailStatusResponse>('/email/status');
  return response.data;
}

/**
 * Get email history for a customer or complaint
 */
export async function getEmailHistory(params: {
  customerId?: string;
  complaintId?: string;
  limit?: number;
}): Promise<EmailHistoryResponse> {
  const searchParams = new URLSearchParams();
  if (params.customerId) searchParams.append('customerId', params.customerId);
  if (params.complaintId) searchParams.append('complaintId', params.complaintId);
  if (params.limit) searchParams.append('limit', String(params.limit));

  const response = await api.get<EmailHistoryResponse>(`/email/history?${searchParams.toString()}`);
  return response.data;
}

