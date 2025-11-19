// frontend/src/pages/CustomerDetail.tsx

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { customerService } from '../services/customers';
import { Customer, Log } from '../types';
import { ArrowLeftIcon, PlusIcon, PencilIcon, TrashIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { canDeleteCustomer } from '../utils/permissions';
import CallDialer from '../components/CallDialer';
import JitsiCall from '../components/JitsiCall';
import { generateRoomName } from '../services/calls';

const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCallDialer, setShowCallDialer] = useState(false);
  const [showJitsiCall, setShowJitsiCall] = useState(false);
  const [jitsiRoomName, setJitsiRoomName] = useState<string>('');

  useEffect(() => {
    if (id && id !== "undefined" && id.trim() !== "") {
      loadCustomer();
      loadLogs();
    } else {
      setLoading(false);
    }
  }, [id]);

  const loadCustomer = async () => {
    if (!id || id === "undefined" || id.trim() === "") {
      console.warn("CustomerDetail: Invalid customer ID:", id);
      setLoading(false);
      return;
    }
    console.log("CustomerDetail: Loading customer with ID:", id);
    try {
      const data = await customerService.getById(id);
      console.log("CustomerDetail: Customer loaded successfully:", data);
      setCustomer(data);
    } catch (error: any) {
      console.error('CustomerDetail: Error loading customer:', error);
      console.error('CustomerDetail: Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const logsData = await customerService.getLogs(id!);
      // Extract logs array from paginated response
      setLogs(Array.isArray(logsData) ? logsData : (logsData.logs || []));
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const handleDelete = async () => {
    if (!canDeleteCustomer(user?.role)) {
      const userRole = user?.role || 'unknown';
      alert(`You do not have permission to delete customers.\n\nYour role: ${userRole}\nRequired roles: SUPER_ADMIN, TENANT_ADMIN, or MANAGER`);
      return;
    }

    if (!customer) return;

    if (!window.confirm(`Are you sure you want to delete "${customer.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      if (id) {
        console.log(`🗑️ Deleting customer: ${customer.name} (ID: ${id})`);
        
        await customerService.delete(id);
        
        console.log(`✅ Customer deleted successfully: ${customer.name} (ID: ${id})`);
        
        // Show success message before navigating
        alert(`Customer "${customer.name}" has been permanently deleted.`);
        
        navigate('/customers');
      }
    } catch (error: any) {
      console.error('❌ Error deleting customer:', error);
      
      // Build detailed error message
      const userRole = user?.role || 'unknown';
      const errorMessage = error.message || error.response?.data?.error || 'Failed to delete customer';
      const status = error.response?.status || 'unknown';
      
      const detailedMessage = `Failed to delete customer "${customer.name}"\n\n` +
        `Error: ${errorMessage}\n` +
        `HTTP Status: ${status}\n` +
        `Your Role: ${userRole}\n` +
        `Permission Check: ${canDeleteCustomer(user?.role) ? 'PASSED' : 'FAILED'}\n\n` +
        `If you believe this is an error, please check:\n` +
        `1. Your role is correctly set in the system\n` +
        `2. You are logged in with the correct account\n` +
        `3. The customer belongs to your tenant`;
      
      alert(detailedMessage);
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
            <div className="flex-1 min-w-0">
              <h2 className="text-3xl font-bold text-text-primary truncate">{customer.name}</h2>
              <p className="text-text-secondary truncate">{customer.company || 'No company'}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 text-sm font-medium rounded ${
                customer.status === 'active' ? 'bg-success/20 text-success' :
                customer.status === 'inactive' ? 'bg-warning/20 text-warning' :
                'bg-error/20 text-error'
              }`}>
                {customer.status}
              </span>
              <button
                onClick={() => navigate(`/customers/edit/${id}`)}
                className="flex items-center px-4 py-2 border border-border text-text-primary rounded-md hover:bg-dark-bg-secondary transition-colors"
              >
                <PencilIcon className="w-5 h-5 mr-2" />
                Edit
              </button>
              {canDeleteCustomer(user?.role) && (
                <button
                  onClick={handleDelete}
                  className="flex items-center px-4 py-2 border border-red-500/50 text-red-400 rounded-md hover:bg-red-500/10 transition-colors"
                  title="Delete customer"
                >
                  <TrashIcon className="w-5 h-5 mr-2" />
                  Delete
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-2">Contact Information</h3>
              <div className="space-y-2">
                {customer.email && (
                  <p className="text-text-primary">📧 {customer.email}</p>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <p className="text-text-primary">📱 {customer.phone}</p>
                    <button
                      onClick={() => setShowCallDialer(true)}
                      className="flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm transition-colors"
                      title="Phone call (Twilio)"
                    >
                      <PhoneIcon className="w-4 h-4 mr-1" />
                      Call
                    </button>
                  </div>
                )}
                <div className="mt-2">
                  <button
                    onClick={() => {
                      const roomName = generateRoomName(customer?.id, customer?.name);
                      setJitsiRoomName(roomName);
                      setShowJitsiCall(true);
                    }}
                    className="flex items-center px-4 py-2 bg-primary-purple hover:bg-secondary-purple text-white rounded-md text-sm font-medium transition-colors"
                    title="Start video/audio call (Jitsi - Free, no phone costs)"
                  >
                    <PhoneIcon className="w-5 h-5 mr-2" />
                    Start Call
                  </button>
                </div>
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

        {/* Timeline / Activity Logs */}
        <div className="bg-dark-bg-card rounded-lg p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-text-primary">Activity Timeline</h3>
            <button
              onClick={() => navigate(`/logs/new`, { state: { customerId: id } })}
              className="flex items-center px-4 py-2 bg-primary-purple text-white rounded-lg hover:bg-secondary-purple transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Log
            </button>
          </div>
          {logs.length === 0 ? (
            <p className="text-text-secondary">No activity logs yet</p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>
              
              <div className="space-y-6">
                {logs.slice(0, 10).map((log) => (
                  <div key={log.id} className="relative pl-12">
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-2 w-8 h-8 bg-primary-purple rounded-full border-4 border-dark-bg-card flex items-center justify-center">
                      <div className="w-2 h-2 bg-primary-purple rounded-full"></div>
                    </div>
                    
                    <div className="bg-dark-bg-secondary rounded-lg p-4 border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-text-primary">{log.title}</h4>
                          <p className="text-sm text-text-secondary mt-1">{log.description || log.content}</p>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium bg-primary-purple/20 text-primary-purple rounded ml-4">
                          {log.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-text-secondary mt-2">
                        <span>{new Date(log.log_date || log.created_at || '').toLocaleDateString()}</span>
                        <span>{new Date(log.log_date || log.created_at || '').toLocaleTimeString()}</span>
                        {log.duration && (
                          <span>Duration: {log.duration} min</span>
                        )}
                        {log.priority && (
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            log.priority === 'urgent' ? 'bg-error/20 text-error' :
                            log.priority === 'high' ? 'bg-warning/20 text-warning' :
                            'bg-success/20 text-success'
                          }`}>
                            {log.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Call Dialer Modal (Twilio Phone Calls) */}
      {showCallDialer && (
        <CallDialer
          customerId={customer?.id}
          customerPhone={customer?.phone}
          customerName={customer?.name}
          onCallEnd={(logId) => {
            setShowCallDialer(false);
            if (logId) {
              // Reload logs to show the new call log
              loadLogs();
            }
          }}
          onClose={() => setShowCallDialer(false)}
        />
      )}

      {/* Jitsi Video/Audio Call */}
      {showJitsiCall && jitsiRoomName && (
        <JitsiCall
          roomName={jitsiRoomName}
          customerId={customer?.id}
          customerName={customer?.name}
          onCallEnd={() => {
            setShowJitsiCall(false);
            setJitsiRoomName('');
            // Reload logs to show the new call log
            loadLogs();
          }}
          onClose={() => {
            setShowJitsiCall(false);
            setJitsiRoomName('');
          }}
        />
      )}
    </div>
  );
};

export default CustomerDetail;


