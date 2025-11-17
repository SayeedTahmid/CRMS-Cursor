// frontend/src/services/reports.ts
import api from './api';

export interface ReportFilters {
  status?: string;
  type?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
}

export const reportService = {
  exportCustomers: async (filters?: ReportFilters): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await api.get(`/reports/customers?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  exportLogs: async (filters?: ReportFilters): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters?.customerId) params.append('customerId', filters.customerId);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await api.get(`/reports/logs?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  exportComplaints: async (filters?: ReportFilters): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.customerId) params.append('customerId', filters.customerId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await api.get(`/reports/complaints?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  getSummary: async (filters?: ReportFilters): Promise<{
    customers: number;
    logs: number;
    complaints: number;
    date_range?: { start?: string; end?: string };
  }> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await api.get(`/reports/summary?${params.toString()}`);
    return response.data;
  },

  downloadBlob: (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

