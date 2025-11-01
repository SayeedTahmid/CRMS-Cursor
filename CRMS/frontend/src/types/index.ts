/** TypeScript type definitions */

export interface User {
  id: string;
  email: string;
  display_name: string;
  role: string;
  tenant_id: string;
  is_active: boolean;
}

export interface Customer {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  industry?: string;
  type: 'customer' | 'prospect' | 'vendor';
  status: 'active' | 'inactive' | 'archived';
  tags: string[];
  secondary_phone?: string;
  secondary_email?: string;
  website?: string;
  notes?: string;
  last_contact_date?: string;
  total_orders?: number;
  total_value?: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  tenant_id?: string;
}

export interface Log {
  id?: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'sample' | 'task' | 'other';
  customer_id: string;
  title: string;
  description?: string;
  content?: string;
  log_date?: string;
  duration?: number;
  participants?: string[];
  assigned_to?: string;
  attachments?: string[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  status?: 'pending' | 'completed' | 'cancelled';
  follow_up_required?: boolean;
  follow_up_date?: string;
  direction?: 'inbound' | 'outbound';
  call_outcome?: string;
  email_subject?: string;
  email_thread_id?: string;
  email_cc?: string[];
  email_bcc?: string[];
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  tenant_id?: string;
}

export interface Complaint {
  id?: string;
  customer_id: string;
  subject: string;
  description: string;
  type: 'product' | 'service' | 'billing' | 'delivery' | 'support' | 'other';
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  assigned_date?: string;
  created_date?: string;
  acknowledged_date?: string;
  resolved_date?: string;
  closed_date?: string;
  sla_deadline?: string;
  initial_response?: string;
  internal_notes?: string;
  customer_updates?: any[];
  attachments?: string[];
  resolution?: string;
  resolution_date?: string;
  tags?: string[];
  category?: string;
  subcategory?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  tenant_id?: string;
}


