/** Customer API service */
import api from './api';
import { Customer } from '../types';

export const customerService = {
  /**
   * Get all customers with optional filtering
   */
  getAll: async (filters?: {
    status?: string;
    type?: string;
    search?: string;
  }): Promise<{ customers: Customer[]; total: number }> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get(`/customers?${params.toString()}`);
    return response.data;
  },

  /**
   * Get a single customer by ID
   */
  getById: async (id: string): Promise<Customer> => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  /**
   * Create a new customer
   */
  create: async (customer: Partial<Customer>): Promise<Customer> => {
    const response = await api.post('/customers', customer);
    return response.data.customer;
  },

  /**
   * Update an existing customer
   */
  update: async (id: string, customer: Partial<Customer>): Promise<Customer> => {
    const response = await api.put(`/customers/${id}`, customer);
    return response.data.customer;
  },

  /**
   * Delete a customer (soft delete)
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/customers/${id}`);
  },

  /**
   * Get all logs for a customer
   */
  getLogs: async (customerId: string): Promise<any[]> => {
    const response = await api.get(`/customers/${customerId}/logs`);
    return response.data.logs;
  },

  /**
   * Get all complaints for a customer
   */
  getComplaints: async (customerId: string): Promise<any[]> => {
    const response = await api.get(`/customers/${customerId}/complaints`);
    return response.data.complaints;
  },
};


