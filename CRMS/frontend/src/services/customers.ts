// frontend/src/services/customers.ts
/** Customer API service */
import api from './api';
import { Customer } from '../types';

export interface ListCustomersParams {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  ownerId?: string;
  from?: string;
  to?: string;
  search?: string;
  orderBy?: string;
  orderDir?: string;
}

export interface ListCustomersResponse {
  customers: Customer[];
  total: number;
  page?: number;
  limit?: number;
  returned?: number;
}

export const customerService = {
  /**
   * List customers with pagination and filtering
   */
  list: async (params: ListCustomersParams): Promise<ListCustomersResponse> => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.type) queryParams.append('type', params.type);
    if (params.ownerId) queryParams.append('owner_id', params.ownerId);
    if (params.from) queryParams.append('from', params.from);
    if (params.to) queryParams.append('to', params.to);
    if (params.search) queryParams.append('search', params.search);
    if (params.orderBy) queryParams.append('order_by', params.orderBy);
    if (params.orderDir) queryParams.append('order_dir', params.orderDir);

    const response = await api.get(`/customers?${queryParams.toString()}`);
    return {
      customers: response.data.customers || [],
      total: response.data.total || 0,
      page: params.page || 1,
      limit: params.limit || 20,
      returned: response.data.customers?.length || 0,
    };
  },

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
    const data = response.data;
    
    // DEBUG: Log the raw response
    if (data.customers && data.customers.length > 0) {
      const firstCustomer = data.customers[0];
      const allKeys = Object.keys(firstCustomer);
      console.log('🔍 Raw API response - First customer keys:', allKeys);
      console.log('🔍 Raw API response - First customer:', JSON.stringify(firstCustomer, null, 2));
      console.log('🔍 Raw API response - Has id field?', 'id' in firstCustomer);
      console.log('🔍 Raw API response - Has _id field?', '_id' in firstCustomer);
      console.log('🔍 Raw API response - id value:', firstCustomer.id);
      console.log('🔍 Raw API response - All 24 keys:', allKeys.sort());
      console.log('🔍 Raw API response - Looking for id in keys:', allKeys.includes('id'));
      
      // Check if ID might be stored differently
      if (!('id' in firstCustomer)) {
        console.warn('⚠️ ID field missing! Checking for alternatives...');
        console.warn('   Keys containing "id":', allKeys.filter(k => k.toLowerCase().includes('id')));
        console.warn('   First customer keys (full list):', allKeys);
      }
    }
    
    // Ensure all customers have IDs - log warnings for missing IDs
    if (data.customers) {
      data.customers = data.customers.map((customer: Customer, index: number) => {
        // Log detailed info about missing IDs
        if (!customer.id) {
          console.error(`❌ Customer at index ${index} missing ID:`, {
            name: customer.name,
            allKeys: Object.keys(customer),
            customerData: customer
          });
        } else {
          if (index < 3) {
            console.log(`✅ Customer ${index} HAS ID:`, customer.id, customer.name);
          }
        }
        return customer;
      });
    }
    
    return data;
  },

  /**
   * Get a single customer by ID
   */
  getById: async (id: string): Promise<Customer> => {
    try {
      const response = await api.get(`/customers/${encodeURIComponent(id)}`);
      // Handle both direct response and nested response
      return response.data.customer || response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load customer';
      console.error('getById error:', errorMessage, error.response?.data);
      throw new Error(errorMessage);
    }
  },

  /**
   * Create a new customer
   */
  create: async (customer: Partial<Customer>): Promise<Customer> => {
    try {
      const response = await api.post('/customers', customer);
      return response.data.customer;
    } catch (error: any) {
      // Extract error message from response
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create customer';
      throw new Error(errorMessage);
    }
  },

  /**
   * Update an existing customer
   */
  update: async (id: string, customer: Partial<Customer>): Promise<Customer> => {
    const response = await api.put(`/customers/${id}`, customer);
    return response.data.customer;
  },

  /**
   * Delete a customer (permanently removed from database)
   */
  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`/customers/${id}`);
    } catch (error: any) {
      const status = error.response?.status;
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete customer';
      
      // Create detailed error message
      let detailedError = `Delete failed (HTTP ${status || 'unknown'}): ${errorMessage}`;
      
      if (status === 403) {
        detailedError += '\n\nYou do not have permission to delete customers. Required role: SUPER_ADMIN, TENANT_ADMIN, or MANAGER.';
      } else if (status === 404) {
        detailedError += '\n\nThe customer may not exist or may belong to a different tenant.';
      } else if (status === 401) {
        detailedError += '\n\nYour session may have expired. Please log out and log back in.';
      }
      
      throw new Error(detailedError);
    }
  },

  /**
   * Get all logs for a customer with pagination
   */
  getLogs: async (
    customerId: string,
    params?: { page?: number; limit?: number }
  ): Promise<{ logs: any[]; page: number; limit: number; returned: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get(`/customers/${customerId}/logs?${queryParams.toString()}`);
    const logs = response.data.logs || [];
    return {
      logs,
      page: params?.page || 1,
      limit: params?.limit || 20,
      returned: logs.length,
    };
  },

  /**
   * Get all complaints for a customer with pagination
   */
  getComplaints: async (
    customerId: string,
    params?: { page?: number; limit?: number }
  ): Promise<{ complaints: any[]; page: number; limit: number; returned: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get(`/customers/${customerId}/complaints?${queryParams.toString()}`);
    const complaints = response.data.complaints || [];
    return {
      complaints,
      page: params?.page || 1,
      limit: params?.limit || 20,
      returned: complaints.length,
    };
  },
};


