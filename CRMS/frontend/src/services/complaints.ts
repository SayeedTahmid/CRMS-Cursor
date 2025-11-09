// frontend/src/services/complaints.ts
import api from "./api";

type ListParams = {
  customerId?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

function qs(params: Record<string, unknown>) {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== "") u.set(k, String(v));
  });
  return u.toString();
}

export const complaintsService = {
  list: async (params: ListParams = {}) => {
    const { data } = await api.get(`/complaints?${qs(params)}`);
    return data; // { complaints, total, ... }
  },

  getById: async (id: string) => {
    const { data } = await api.get(`/complaints/${encodeURIComponent(id)}`);
    return data;
  },

  create: async (payload: {
    title: string;
    customerId: string;
    description?: string;
    category?: string;
    severity?: string;
    priority?: number;
    assigned_to?: string;
    sla?: Record<string, unknown>;
    attachments?: any[];
    status?: string;
  }) => {
    const { data } = await api.post(`/complaints`, payload);
    return data;
  },

  updateStatus: async (
    id: string,
    status: "new" | "acknowledged" | "in_progress" | "resolved" | "closed",
    extras?: { resolutionNotes?: string; customerSatisfaction?: number }
  ) => {
    const { data } = await api.put(`/complaints/${encodeURIComponent(id)}/status`, { status, ...extras });
    return data;
  },

  addInternalComment: async (id: string, comment: string) => {
    const { data } = await api.post(`/complaints/${encodeURIComponent(id)}/comments`, { comment });
    return data;
  },

  addCustomerUpdate: async (id: string, message: string) => {
    const { data } = await api.post(`/complaints/${encodeURIComponent(id)}/updates`, { message });
    return data;
  },
};
