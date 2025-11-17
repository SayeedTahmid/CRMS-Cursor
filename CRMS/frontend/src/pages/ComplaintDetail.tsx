// frontend/src/pages/ComplaintDetail.tsx

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { complaintService } from '../services/complaints';
import { customerService } from '../services/customers';
import { Complaint, Customer } from '../types';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';

const ComplaintDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      loadComplaint();
    }
  }, [id]);

  const loadComplaint = async () => {
    try {
      const data = await complaintService.getById(id!);
      setComplaint(data);
      
      // Load customer if customer_id exists
      if (data.customer_id) {
        try {
          const customerData = await customerService.getById(data.customer_id);
          setCustomer(customerData);
        } catch (err) {
          console.error('Error loading customer:', err);
        }
      }
    } catch (error) {
      console.error('Error loading complaint:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    
    setUpdating(true);
    try {
      await complaintService.updateStatus(id, newStatus);
      await loadComplaint(); // Reload to get updated data
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'acknowledged':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'resolved':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'closed':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-400';
      case 'high':
        return 'text-orange-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const workflow: { [key: string]: string } = {
      'new': 'acknowledged',
      'acknowledged': 'in_progress',
      'in_progress': 'resolved',
      'resolved': 'closed',
    };
    return workflow[currentStatus] || null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-purple"></div>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-2">Complaint not found</h2>
          <Link to="/complaints" className="text-primary-purple hover:text-secondary-purple">
            Back to Complaints
          </Link>
        </div>
      </div>
    );
  }

  const nextStatus = getNextStatus(complaint.status);

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
              <span className="text-text-secondary">Welcome, {user?.displayName || user?.display_name || user?.email}</span>
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
        <Link to="/complaints" className="flex items-center text-text-secondary hover:text-primary-purple mb-6">
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back to Complaints
        </Link>

        {/* Complaint Header */}
        <div className="bg-dark-bg-card rounded-lg p-6 border border-border mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <h2 className="text-3xl font-bold text-text-primary">{complaint.subject}</h2>
                {(complaint as any).ticket_number && (
                  <span className="px-3 py-1 bg-primary-purple/20 text-primary-purple rounded font-mono text-sm">
                    {(complaint as any).ticket_number}
                  </span>
                )}
              </div>
              {customer && (
                <Link 
                  to={`/customers/${customer.id}`}
                  className="text-primary-purple hover:text-secondary-purple text-sm"
                >
                  📧 {customer.name} {customer.company ? `(${customer.company})` : ''}
                </Link>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`px-4 py-2 text-sm font-medium rounded border ${getStatusColor(complaint.status)}`}>
                {complaint.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className={`text-sm font-medium ${getPriorityColor(complaint.priority)}`}>
                Priority: {complaint.priority.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Status Actions */}
          {nextStatus && !updating && (
            <div className="mt-4 pt-4 border-t border-border">
              <button
                onClick={() => handleStatusChange(nextStatus)}
                className="px-4 py-2 bg-primary-purple text-white rounded-lg hover:bg-secondary-purple transition-colors"
              >
                Move to {nextStatus.replace('_', ' ')}
              </button>
            </div>
          )}
          {updating && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-text-secondary">Updating...</p>
            </div>
          )}
        </div>

        {/* Complaint Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-dark-bg-card rounded-lg p-6 border border-border">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Description</h3>
              <p className="text-text-primary whitespace-pre-wrap">{complaint.description}</p>
            </div>

            {/* Internal Notes */}
            {complaint.internal_notes && (
              <div className="bg-dark-bg-card rounded-lg p-6 border border-border">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Internal Notes</h3>
                <p className="text-text-primary whitespace-pre-wrap">{complaint.internal_notes}</p>
              </div>
            )}

            {/* Resolution */}
            {complaint.resolution && (
              <div className="bg-dark-bg-card rounded-lg p-6 border border-border">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Resolution</h3>
                <p className="text-text-primary whitespace-pre-wrap">{complaint.resolution}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Details Card */}
            <div className="bg-dark-bg-card rounded-lg p-6 border border-border">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Details</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-text-secondary">Type:</span>
                  <span className="ml-2 text-text-primary capitalize">{complaint.type}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Priority:</span>
                  <span className={`ml-2 font-medium ${getPriorityColor(complaint.priority)}`}>
                    {complaint.priority.toUpperCase()}
                  </span>
                </div>
                {complaint.created_date && (
                  <div>
                    <span className="text-text-secondary">Created:</span>
                    <span className="ml-2 text-text-primary">
                      {new Date(complaint.created_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {complaint.acknowledged_date && (
                  <div>
                    <span className="text-text-secondary">Acknowledged:</span>
                    <span className="ml-2 text-text-primary">
                      {new Date(complaint.acknowledged_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {complaint.resolved_date && (
                  <div>
                    <span className="text-text-secondary">Resolved:</span>
                    <span className="ml-2 text-text-primary">
                      {new Date(complaint.resolved_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {complaint.closed_date && (
                  <div>
                    <span className="text-text-secondary">Closed:</span>
                    <span className="ml-2 text-text-primary">
                      {new Date(complaint.closed_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {complaint.sla_deadline && (
                  <div>
                    <span className="text-text-secondary">SLA Deadline:</span>
                    <span className="ml-2 text-text-primary">
                      {new Date(complaint.sla_deadline).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Card */}
            <div className="bg-dark-bg-card rounded-lg p-6 border border-border">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate(`/complaints/edit/${id}`)}
                  className="w-full flex items-center justify-center px-4 py-2 border border-border text-text-primary rounded-md hover:bg-dark-bg-secondary transition-colors"
                >
                  <PencilIcon className="w-5 h-5 mr-2" />
                  Edit Complaint
                </button>
                {customer && (
                  <Link
                    to={`/customers/${customer.id}`}
                    className="block w-full text-center px-4 py-2 border border-border text-text-primary rounded-md hover:bg-dark-bg-secondary transition-colors"
                  >
                    View Customer
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ComplaintDetail;

