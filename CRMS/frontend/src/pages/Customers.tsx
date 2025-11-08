import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { customerService } from '../services/customers';
import { Customer } from '../types';
import { UserGroupIcon, PlusIcon } from '@heroicons/react/24/outline';

const Customers: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await customerService.getAll({ search });
      setCustomers(data.customers);
      setTotal(data.total || data.customers?.length || 0);
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
                <span className="text-text-secondary text-base ml-2">({total})</span>
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

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6">
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 bg-dark-bg-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
          />
        </form>

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
            {/* ✅ now navigates to create form */}
            <button
              onClick={() => navigate('/customers/new')}
              className="px-6 py-2 bg-primary-purple text-white rounded-lg hover:bg-secondary-purple transition-colors"
            >
              Add Customer
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customers.map((c) => {
              // ✅ normalize id for key + link (handles id/docId/_id)
              const id = (c as any).id ?? (c as any).docId ?? (c as any)._id;
              return (
                <Link key={id} to={`/customers/${id}`}>
                  <div className="bg-dark-bg-card rounded-lg p-6 border border-border hover:border-primary-purple transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary">
                          {c.name ?? (c as any).email ?? (c as any).company ?? id}
                        </h3>
                        <p className="text-sm text-text-secondary">{(c as any).company || 'No company'}</p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          (c as any).status === 'active'
                            ? 'bg-success/20 text-success'
                            : (c as any).status === 'inactive'
                            ? 'bg-warning/20 text-warning'
                            : 'bg-error/20 text-error'
                        }`}
                      >
                        {(c as any).status}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {(c as any).email && (
                        <p className="text-sm text-text-secondary">📧 {(c as any).email}</p>
                      )}
                      {(c as any).phone && (
                        <p className="text-sm text-text-secondary">📱 {(c as any).phone}</p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Customers;
