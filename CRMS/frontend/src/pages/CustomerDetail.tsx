import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { customerService } from '../services/customers';
import { Customer, Log } from '../types';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadCustomer();
      loadLogs();
    }
  }, [id]);

  const loadCustomer = async () => {
    try {
      const data = await customerService.getById(id!);
      setCustomer(data);
    } catch (error) {
      console.error('Error loading customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const logsData = await customerService.getLogs(id!);
      setLogs(logsData);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-purple"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-2">Customer not found</h2>
          <Link to="/customers" className="text-primary-purple hover:text-secondary-purple">
            Back to Customers
          </Link>
        </div>
      </div>
    );
  }

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
        {/* Back Button */}
        <Link to="/customers" className="flex items-center text-text-secondary hover:text-primary-purple mb-6">
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back to Customers
        </Link>

        {/* Customer Info */}
        <div className="bg-dark-bg-card rounded-lg p-6 border border-border mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold text-text-primary">{customer.name}</h2>
              <p className="text-text-secondary">{customer.company || 'No company'}</p>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded ${
              customer.status === 'active' ? 'bg-success/20 text-success' :
              customer.status === 'inactive' ? 'bg-warning/20 text-warning' :
              'bg-error/20 text-error'
            }`}>
              {customer.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-2">Contact Information</h3>
              <div className="space-y-2">
                {customer.email && (
                  <p className="text-text-primary">📧 {customer.email}</p>
                )}
                {customer.phone && (
                  <p className="text-text-primary">📱 {customer.phone}</p>
                )}
                {customer.website && (
                  <p className="text-text-primary">🌐 {customer.website}</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-2">Address</h3>
              <div className="text-text-primary">
                {customer.address && <p>{customer.address}</p>}
                {(customer.city || customer.state) && (
                  <p>{customer.city}{customer.city && customer.state ? ', ' : ''}{customer.state}</p>
                )}
                {customer.country && <p>{customer.country}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Logs */}
        <div className="bg-dark-bg-card rounded-lg p-6 border border-border">
          <h3 className="text-xl font-bold text-text-primary mb-4">Recent Activity</h3>
          {logs.length === 0 ? (
            <p className="text-text-secondary">No activity logs yet</p>
          ) : (
            <div className="space-y-4">
              {logs.slice(0, 5).map((log) => (
                <div key={log.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-text-primary">{log.title}</h4>
                      <p className="text-sm text-text-secondary">{log.description || log.content}</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-primary-purple/20 text-primary-purple rounded">
                      {log.type}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-2">{new Date(log.log_date || '').toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CustomerDetail;


