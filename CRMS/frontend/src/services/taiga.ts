// frontend/src/services/taiga.ts
/** Taiga integration service */

import api from './api';

export interface CreateTaigaIssueRequest {
  complaint_id: string;
  project_slug?: string;
  priority?: string;
  tags?: string[];
}

export interface CreateTaigaIssueResponse {
  success: boolean;
  taiga_issue: {
    id: number;
    ref: number;
    subject: string;
    status: string;
    url: string;
    project_slug: string;
  };
  message: string;
}

export interface LinkTaigaIssueRequest {
  complaint_id: string;
  taiga_issue_id: number;
}

export interface LinkTaigaIssueResponse {
  success: boolean;
  taiga_issue: {
    id: number;
    ref: number;
    subject: string;
    status: string;
    url: string;
    project_slug: string;
  };
  message: string;
}

export interface SyncTaigaStatusRequest {
  complaint_id: string;
}

export interface SyncTaigaStatusResponse {
  success: boolean;
  taiga_status: string;
  crm_status: string;
  message: string;
}

export interface TaigaIssue {
  id: number;
  ref: number;
  subject: string;
  description?: string;
  status: string;
  status_id?: number;
  priority?: number;
  url: string;
  project_slug: string;
  assigned_to?: number;
  created_date?: string;
  modified_date?: string;
}

/**
 * Create a Taiga issue from a complaint
 */
export async function createTaigaIssue(
  request: CreateTaigaIssueRequest
): Promise<CreateTaigaIssueResponse> {
  const response = await api.post<CreateTaigaIssueResponse>('/taiga/create-issue', request);
  return response.data;
}

/**
 * Link an existing Taiga issue to a complaint
 */
export async function linkTaigaIssue(
  request: LinkTaigaIssueRequest
): Promise<LinkTaigaIssueResponse> {
  const response = await api.post<LinkTaigaIssueResponse>('/taiga/link-issue', request);
  return response.data;
}

/**
 * Sync status from Taiga to CRM
 */
export async function syncTaigaStatus(
  request: SyncTaigaStatusRequest
): Promise<SyncTaigaStatusResponse> {
  const response = await api.post<SyncTaigaStatusResponse>('/taiga/sync-status', request);
  return response.data;
}

/**
 * Get Taiga issue details
 */
export async function getTaigaIssue(issueId: number): Promise<{ success: boolean; issue: TaigaIssue }> {
  const response = await api.get<{ success: boolean; issue: TaigaIssue }>(`/taiga/issue/${issueId}`);
  return response.data;
}

