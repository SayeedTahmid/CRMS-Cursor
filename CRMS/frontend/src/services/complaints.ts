// frontend/src/services/complaints.ts

/** Complaint API service */
import api from './api';
import { Complaint } from '../types';

export const complaintService = {
  /**
   * Get all complaints with optional filtering
   */
  getAll: async (filters?: {
    customer_id?: string;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ complaints: Complaint[]; total: number; pagination?: any }> => {
    const params = new URLSearchParams();
    if (filters?.customer_id) params.append('customerId', filters.customer_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.pageSize) params.append('pageSize', filters.pageSize.toString());

    const response = await api.get(`/complaints?${params.toString()}`);
    return response.data;
  },

  /**
   * Get a single complaint by ID
   */
  getById: async (id: string): Promise<Complaint> => {
    const response = await api.get(`/complaints/${id}`);
    return response.data;
  },

  /**
   * Create a new complaint
   */
  create: async (complaint: Partial<Complaint>): Promise<Complaint> => {
    // Map frontend fields to backend fields
    const payload = {
      customerId: complaint.customer_id || complaint.customer_id,
      customer_id: complaint.customer_id,
      title: complaint.subject,
      subject: complaint.subject,
      description: complaint.description,
      category: complaint.type,
      type: complaint.type,
      severity: complaint.priority,
      priority: complaint.priority,
      status: complaint.status || 'new',
      attachments: complaint.attachments || [],
    };
    
    const response = await api.post('/complaints', payload);
    const result = response.data.data || response.data;
    
    // Map response back to frontend format
    return {
      id: result.id,
      customer_id: result.customer_id || payload.customer_id,
      subject: result.title || result.subject || payload.title,
      description: result.description || payload.description,
      type: result.category || result.type || payload.category,
      status: result.status || payload.status,
      priority: result.severity || result.priority || payload.priority,
      ticket_number: result.ticketNumber || result.ticket_number,
      created_date: result.created_at || result.created_date,
      ...result,
    };
  },

  /**
   * Update complaint status
   */
  updateStatus: async (id: string, status: string): Promise<Complaint> => {
    const response = await api.put(`/complaints/${id}/status`, { status });
    // Backend returns { complaint: {...} } or { status, message, complaint }
    const result = response.data.complaint || response.data.data || response.data;
    // Map backend fields to frontend format
    return {
      id: result.id || id,
      customer_id: result.customer_id,
      subject: result.title || result.subject,
      description: result.description,
      type: result.category || result.type,
      status: result.status || status,
      priority: result.severity || result.priority,
      ticket_number: result.ticketNumber || result.ticket_number,
      created_date: result.created_at || result.created_date,
      ...result,
    };
  },

  /**
   * Update complaint (full update)
   */
  update: async (id: string, complaint: Partial<Complaint>): Promise<Complaint> => {
    const payload: any = {};
    if (complaint.subject) {
      payload.title = complaint.subject;
    }
    if (complaint.description !== undefined) {
      payload.description = complaint.description;
    }
    if (complaint.type || (complaint as any).category) {
      payload.category = complaint.type || (complaint as any).category;
    }
    if (complaint.priority || (complaint as any).severity) {
      payload.severity = complaint.priority || (complaint as any).severity;
    }
    if (complaint.status) {
      payload.status = complaint.status;
    }
    if ((complaint as any).attachments) {
      payload.attachments = (complaint as any).attachments;
    }

    const response = await api.put(`/complaints/${id}`, payload);
    const result = response.data.complaint || response.data.data || response.data;
    
    return {
      id: result.id || id,
      customer_id: result.customer_id || complaint.customer_id,
      subject: result.title || result.subject || payload.title,
      description: result.description || payload.description,
      type: result.category || result.type || payload.category,
      status: result.status || payload.status,
      priority: result.severity || result.priority || payload.severity,
      ticket_number: result.ticketNumber || result.ticket_number,
      created_date: result.created_at || result.created_date,
      ...result,
    };
  },

  /**
   * Delete a complaint
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/complaints/${id}`);
  },
};
