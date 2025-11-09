/** Customer API service */
import api from "./api";
import { Customer } from "../types";

export interface ListCustomersParams {
  page?: number;
  limit?: number;        // PRD
  pageSize?: number;     // legacy alias
  status?: string;
  type?: string;
  ownerId?: string;
  from?: string;         // 'YYYY-MM-DD' or ISO
  to?: string;
  search?: string;
  orderBy?: string;      // default: created_at
  orderDir?: "asc" | "desc"; // default: "desc"
}

export interface ListCustomersResponse {
  customers: Customer[];
  page: number;
  limit: number;
  returned: number;
}

export const customerService = {
  /**
   * PRD-aligned list with pagination, filters, ordering
   * GET /api/customers?{page,limit,status,type,ownerId,from,to,search,orderBy,orderDir}
   */
  list: async (params: ListCustomersParams = {}): Promise<ListCustomersResponse> => {
    const res = await api.get("/customers", { params });
    return res.data; // { customers, page, limit, returned }
  },

  /**
   * Backward-compatible wrapper for old getAll({status,type,search})
   * Returns PRD shape; callers should migrate to `list()` directly.
   */
  getAll: async (filters?: {
    status?: string;
    type?: string;
    search?: string;
  }): Promise<ListCustomersResponse> => {
    const params: ListCustomersParams = {
      page: 1,
      limit: 20,
      status: filters?.status,
      type: filters?.type,
      search: filters?.search,
      orderBy: "created_at",
      orderDir: "desc",
    };
    return customerService.list(params);
  },

  /**
   * Get a single customer by ID
   * GET /api/customers/:id
   * Backend returns the full customer object (not wrapped).
   */
  getById: async (id: string): Promise<Customer> => {
    if (!id || id === "undefined" || id === "null") {
      throw new Error("Valid customer id is required");
    }
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  /**
   * Create a new customer
   * POST /api/customers
   */
  create: async (customer: Partial<Customer>): Promise<Customer> => {
    const response = await api.post("/customers", customer);
    // backend responds: { message, customer }
    return response.data.customer;
  },

  /**
   * Update an existing customer
   * PUT /api/customers/:id
   */
  update: async (id: string, customer: Partial<Customer>): Promise<Customer> => {
    if (!id || id === "undefined" || id === "null") {
      throw new Error("Valid customer id is required");
    }
    const response = await api.put(`/customers/${id}`, customer);
    // backend responds: { message, customer }
    return response.data.customer;
  },

  /**
   * Delete (soft-delete) a customer
   * DELETE /api/customers/:id
   */
  delete: async (id: string): Promise<void> => {
    if (!id || id === "undefined" || id === "null") {
      throw new Error("Valid customer id is required");
    }
    await api.delete(`/customers/${id}`);
  },

  /**
   * Customer logs (supports pagination)
   * GET /api/customers/:id/logs?page&limit
   */
  getLogs: async (
    customerId: string,
    params: { page?: number; limit?: number; pageSize?: number } = {}
  ): Promise<{ logs: any[]; page: number; limit: number; returned: number }> => {
    if (!customerId || customerId === "undefined" || customerId === "null") {
      throw new Error("Valid customer id is required");
    }
    const res = await api.get(`/customers/${customerId}/logs`, { params });
    return res.data; // { logs, page, limit, returned }
  },

  /**
   * Customer complaints (supports pagination)
   * GET /api/customers/:id/complaints?page&limit
   */
  getComplaints: async (
    customerId: string,
    params: { page?: number; limit?: number; pageSize?: number } = {}
  ): Promise<{ complaints: any[]; page: number; limit: number; returned: number }> => {
    if (!customerId || customerId === "undefined" || customerId === "null") {
      throw new Error("Valid customer id is required");
    }
    const res = await api.get(`/customers/${customerId}/complaints`, { params });
    return res.data; // { complaints, page, limit, returned }
  },
};
