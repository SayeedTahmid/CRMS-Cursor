// frontend/src/services/logs.ts

/** Log API service */
import api from './api';
import { Log } from '../types';

export interface ListLogsParams {
  page?: number;
  limit?: number;
  customer_id?: string;
  type?: string;
}

export const logService = {
  /**
   * Get all logs with optional filtering
   */
  getAll: async (filters?: {
    customer_id?: string;
    type?: string;
  }): Promise<{ logs: Log[]; total: number }> => {
    const params = new URLSearchParams();
    if (filters?.customer_id) params.append('customer_id', filters.customer_id);
    if (filters?.type) params.append('type', filters.type);

    const response = await api.get(`/logs?${params.toString()}`);
    return response.data;
  },

  /**
   * Get a single log by ID
   */
  getById: async (id: string): Promise<Log> => {
    const response = await api.get(`/logs/${id}`);
    return response.data;
  },

  /**
   * Create a new log
   */
  create: async (log: Partial<Log>): Promise<Log> => {
    const response = await api.post('/logs', log);
    return response.data.log;
  },

  /**
   * Update an existing log
   */
  update: async (id: string, log: Partial<Log>): Promise<Log> => {
    const response = await api.put(`/logs/${id}`, log);
    return response.data.log;
  },

  /**
   * Delete a log
   */
  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`/logs/${id}`);
    } catch (error: any) {
      const status = error.response?.status;
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete log';
      
      // Create detailed error message
      let detailedError = `Delete failed (HTTP ${status || 'unknown'}): ${errorMessage}`;
      
      if (status === 403) {
        detailedError += '\n\nYou do not have permission to delete logs. Required role: SUPER_ADMIN, TENANT_ADMIN, or MANAGER.';
      } else if (status === 404) {
        detailedError += '\n\nThe log may not exist or may belong to a different tenant.';
      } else if (status === 401) {
        detailedError += '\n\nYour session may have expired. Please log out and log back in.';
      }
      
      throw new Error(detailedError);
    }
  },
};

/**
 * List logs with pagination (wrapper for convenience)
 */
export async function listLogs(params: ListLogsParams = {}): Promise<{ logs: Log[]; page: number; limit: number; returned: number }> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.customer_id) queryParams.append('customer_id', params.customer_id);
  if (params.type) queryParams.append('type', params.type);

  const response = await api.get(`/logs?${queryParams.toString()}`);
  const logs = response.data.logs || [];
  return {
    logs,
    page: params.page || 1,
    limit: params.limit || 20,
    returned: logs.length,
  };
}

/**
 * Delete a log (wrapper for convenience)
 */
export async function deleteLog(id: string): Promise<void> {
  return logService.delete(id);
}
