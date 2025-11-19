// frontend/src/pages/Customers.tsx

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { customerService } from '../services/customers';
import { Customer } from '../types';
import { UserGroupIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { canDeleteCustomer } from '../utils/permissions';

const Customers: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState<number>(0); // ✅ new state for total count
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      console.log('Loading customers...');
      const data = await customerService.getAll({ search });
      console.log('Customers response:', data);
      
      // Ensure all customers have IDs - log warning if any are missing
      const customersWithIds = (data.customers || []).map((customer: Customer, index: number) => {
        console.log(`Customer ${index}:`, { id: customer.id, name: customer.name, fullData: customer });
        if (!customer.id) {
          console.error(`❌ Customer at index ${index} missing ID:`, customer);
        }
        return customer;
      });
      
      console.log(`Loaded ${customersWithIds.length} customers, ${customersWithIds.filter(c => c.id).length} with IDs`);
      setCustomers(customersWithIds);
      setTotal(data.total || customersWithIds.length || 0);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };
  

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    loadCustomers();
  };

  const handleDelete = async (customerId: string, customerName: string) => {
    if (!canDeleteCustomer(user?.role)) {
      const userRole = user?.role || 'unknown';
      alert(`You do not have permission to delete customers.\n\nYour role: ${userRole}\nRequired roles: SUPER_ADMIN, TENANT_ADMIN, or MANAGER`);
      return;
    }

    if (!customerId || customerId.trim() === '') {
      alert(`Cannot delete customer: Missing customer ID.\n\nCustomer name: ${customerName}`);
      console.error('❌ Delete failed: Missing customer ID', { customerId, customerName });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${customerName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      console.log(`🗑️ Deleting customer: ${customerName} (ID: ${customerId})`);
      
      await customerService.delete(customerId);
      
      console.log(`✅ Customer deleted successfully: ${customerName} (ID: ${customerId})`);
      
      // Remove from local state immediately for better UX
      const initialCount = customers.length;
      let wasRemoved = false;
      setCustomers(prevCustomers => {
        const filtered = prevCustomers.filter(c => {
          if (c.id === customerId) {
            wasRemoved = true;
            return false;
          }
          return true;
        });
        console.log(`📊 Updated customer list: ${prevCustomers.length} -> ${filtered.length} customers (removed: ${customerId})`);
        if (!wasRemoved) {
          console.warn(`⚠️ Customer ${customerId} was not found in the list to remove! Current IDs:`, prevCustomers.map(c => c.id));
        }
        return filtered;
      });
      setTotal(prevTotal => Math.max(0, prevTotal - 1));
      
      // Reload customers list to ensure consistency with backend
      console.log('🔄 Reloading customers list from backend...');
      await loadCustomers();
      
      console.log(`✅ Delete complete. Initial count: ${initialCount}, Customer removed from UI: ${wasRemoved}`);
      
      // Show success message
      alert(`Customer "${customerName}" has been permanently deleted.`);
    } catch (error: any) {
      console.error('❌ Error deleting customer:', error);
      console.error('❌ Error details:', {
        customerId,
        customerName,
        errorMessage: error.message,
        status: error.response?.status,
        responseData: error.response?.data
      });
      
      // Build detailed error message
      const userRole = user?.role || 'unknown';
      const errorMessage = error.message || error.response?.data?.error || 'Failed to delete customer';
      const status = error.response?.status || 'unknown';
      
      const detailedMessage = `Failed to delete customer "${customerName}"\n\n` +
        `Error: ${errorMessage}\n` +
        `HTTP Status: ${status}\n` +
        `Customer ID: ${customerId}\n` +
        `Your Role: ${userRole}\n` +
        `Permission Check: ${canDeleteCustomer(user?.role) ? 'PASSED' : 'FAILED'}\n\n` +
        `If you believe this is an error, please check:\n` +
        `1. Your role is correctly set in the system\n` +
        `2. You are logged in with the correct account\n` +
        `3. The customer belongs to your tenant\n` +
        `4. Check the browser console for more details`;
      
      alert(detailedMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="bg-dark-bg-secondary border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/dashboard" className="text-2xl font-bold text-text-primary">
              Modern CRM
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-text-secondary">Welcome, {user?.displayName}</span>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-text-primary hover:text-primary-purple transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
            <h2 className="text-3xl font-bold text-text-primary">
               Customers
              <span className="text-text-secondary text-base ml-2">
                ({total})
             </span>
           </h2>
              <p className="text-text-secondary mt-1">Manage your customer relationships</p>
            </div>
            <button 
              onClick={() => navigate('/customers/new')}
              className="flex items-center px-4 py-2 bg-primary-purple text-white rounded-lg hover:bg-secondary-purple transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Customer
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <input
              type="text"
              placeholder="Search customers by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 bg-dark-bg-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-primary-purple text-white rounded-lg hover:bg-secondary-purple transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Customers List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-purple"></div>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="w-16 h-16 mx-auto text-text-secondary mb-4" />
            <h3 className="text-xl font-semibold text-text-primary mb-2">No customers yet</h3>
            <p className="text-text-secondary mb-4">Get started by adding your first customer</p>
            <button 
              onClick={() => navigate('/customers/new')}
              className="px-6 py-2 bg-primary-purple text-white rounded-lg hover:bg-secondary-purple transition-colors"
            >
              Add Customer
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customers.map((customer, index) => (
              <div key={customer.id || `customer-${index}-${customer.name || 'unnamed'}-${customer.email || ''}`} className="bg-dark-bg-card rounded-lg p-6 border border-border hover:border-primary-purple transition-colors">
                <Link 
                  to={customer.id ? `/customers/${encodeURIComponent(customer.id)}` : "/customers"} 
                  onClick={(e) => {
                    if (!customer.id) {
                      e.preventDefault();
                      console.error("❌ Cannot navigate: Customer missing ID", customer);
                      alert(`Cannot view customer: Missing ID. Customer name: ${customer.name}`);
                    } else {
                      console.log(`✅ Navigating to customer: ${customer.id} (${customer.name})`);
                    }
                  }}
                  className="block"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-text-primary">{customer.name}</h3>
                      <p className="text-sm text-text-secondary">{customer.company || 'No company'}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      customer.status === 'active' ? 'bg-success/20 text-success' :
                      customer.status === 'inactive' ? 'bg-warning/20 text-warning' :
                      'bg-error/20 text-error'
                    }`}>
                      {customer.status}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {customer.email && (
                      <p className="text-sm text-text-secondary">📧 {customer.email}</p>
                    )}
                    {customer.phone && (
                      <p className="text-sm text-text-secondary">📱 {customer.phone}</p>
                    )}
                  </div>
                </Link>
                <div className="mt-4 pt-4 border-t border-border flex justify-end gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (customer.id) {
                        navigate(`/customers/edit/${encodeURIComponent(customer.id)}`);
                      } else {
                        console.warn("Cannot edit: Customer missing ID", customer);
                      }
                    }}
                    disabled={!customer.id}
                    className="flex items-center px-3 py-1 text-sm text-primary-purple hover:text-secondary-purple transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PencilIcon className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                  {canDeleteCustomer(user?.role) && customer.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(customer.id!, customer.name || 'this customer');
                      }}
                      className="flex items-center px-3 py-1 text-sm text-red-400 hover:text-red-300 transition-colors"
                      title="Delete customer"
                    >
                      <TrashIcon className="w-4 h-4 mr-1" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Customers;

