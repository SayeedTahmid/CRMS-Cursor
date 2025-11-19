// frontend/src/services/calls.ts
/** Call service for VoIP integration */

import api from './api';

export interface CallToken {
  success: boolean;
  identity: string;
  accountSid: string;
  apiKey: string;
  apiSecret: string;
  message?: string;
}

export interface InitiateCallRequest {
  to: string;
  customer_id?: string;
  from?: string;
}

export interface InitiateCallResponse {
  success: boolean;
  callSid: string;
  status: string;
  logId: string;
  message: string;
}

export interface CallHistoryItem {
  id: string;
  type: 'call';
  customer_id?: string;
  title: string;
  description?: string;
  direction: 'inbound' | 'outbound';
  status: string;
  call_status?: string;
  call_outcome?: string;
  duration?: number;
  call_sid?: string;
  call_to?: string;
  call_from?: string;
  log_date?: string;
  created_at?: string;
}

export interface CallHistoryResponse {
  success: boolean;
  calls: CallHistoryItem[];
  total: number;
}

/**
 * Generate Twilio access token for making calls
 */
export async function generateCallToken(): Promise<CallToken> {
  const response = await api.post<CallToken>('/calls/token');
  return response.data;
}

/**
 * Initiate an outbound call
 */
export async function initiateCall(request: InitiateCallRequest): Promise<InitiateCallResponse> {
  const response = await api.post<InitiateCallResponse>('/calls/initiate', request);
  return response.data;
}

/**
 * Get call history
 */
export async function getCallHistory(params?: {
  customer_id?: string;
  direction?: 'inbound' | 'outbound';
}): Promise<CallHistoryResponse> {
  const queryParams = new URLSearchParams();
  if (params?.customer_id) queryParams.append('customer_id', params.customer_id);
  if (params?.direction) queryParams.append('direction', params.direction);
  
  const url = `/calls/history${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const response = await api.get<CallHistoryResponse>(url);
  return response.data;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Format based on length
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  } else if (digits.length > 11) {
    // International format
    return `+${digits}`;
  }
  
  return phone; // Return original if can't format
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Jitsi Call Interfaces
 */
export interface JitsiCallStartRequest {
  room_name: string;
  customer_id?: string;
  customer_name?: string;
}

export interface JitsiCallStartResponse {
  success: boolean;
  logId: string;
  room_name: string;
  message?: string;
}

export interface JitsiCallEndRequest {
  log_id?: string;
  room_name: string;
  customer_id?: string;
  duration: number; // in seconds
  participants: string[];
}

export interface JitsiCallEndResponse {
  success: boolean;
  message?: string;
}

/**
 * Log Jitsi call start
 */
export async function logJitsiCallStart(
  request: JitsiCallStartRequest
): Promise<JitsiCallStartResponse> {
  const response = await api.post<JitsiCallStartResponse>('/calls/jitsi/start', request);
  return response.data;
}

/**
 * Log Jitsi call end
 */
export async function logJitsiCallEnd(
  request: JitsiCallEndRequest
): Promise<JitsiCallEndResponse> {
  const response = await api.post<JitsiCallEndResponse>('/calls/jitsi/end', request);
  return response.data;
}

/**
 * Generate a unique room name for Jitsi call
 */
export function generateRoomName(customerId?: string, customerName?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const prefix = customerId ? customerId.substring(0, 8) : 'crm';
  const name = customerName
    ? customerName.replace(/\s+/g, '-').toLowerCase().substring(0, 20)
    : 'call';
  return `${prefix}-${name}-${timestamp}-${random}`;
}

