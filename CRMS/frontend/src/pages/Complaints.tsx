// frontend/src/pages/Complaints.tsx

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { complaintService } from '../services/complaints';
import { Complaint } from '../types';
import ComplaintKanban from '../components/ComplaintKanban';
import Pagination from '../components/Pagination';
import { ClipboardDocumentListIcon, PlusIcon, Squares2X2Icon, ListBulletIcon, TrashIcon } from '@heroicons/react/24/outline';
import { canDeleteComplaint } from '../utils/permissions';

const Complaints: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasMore, setHasMore] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadComplaints();
  }, [statusFilter, currentPage, pageSize]);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const data = await complaintService.getAll({ 
        status: statusFilter || undefined,
        page: currentPage,
        pageSize: pageSize,
      });
      setComplaints(data.complaints || []);
      // Check if hasMore exists in response, otherwise infer from data
      const responseHasMore = (data as any).pagination?.hasMore ?? (data as any).hasMore;
      setHasMore(responseHasMore ?? (data.complaints?.length === pageSize));
      // Calculate total pages (estimate based on hasMore)
      if (data.pagination) {
        setTotalPages(Math.max(1, data.pagination.page || currentPage));
      } else {
        // If no pagination info, estimate based on hasMore
        setTotalPages(hasMore ? currentPage + 1 : currentPage);
      }
    } catch (error) {
      console.error('Error loading complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handleDelete = async (complaintId: string, complaintSubject: string) => {
    if (!canDeleteComplaint(user?.role)) {
      const userRole = user?.role || 'unknown';
      alert(`You do not have permission to delete complaints.\n\nYour role: ${userRole}\nRequired roles: SUPER_ADMIN, TENANT_ADMIN, or MANAGER`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete complaint "${complaintSubject}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await complaintService.delete(complaintId);
      // Reload complaints list
      await loadComplaints();
    } catch (error: any) {
      console.error('Error deleting complaint:', error);
      
      // Build detailed error message
      const userRole = user?.role || 'unknown';
      const errorMessage = error.message || error.response?.data?.error || 'Failed to delete complaint';
      const status = error.response?.status || 'unknown';
      
      const detailedMessage = `Failed to delete complaint "${complaintSubject}"\n\n` +
        `Error: ${errorMessage}\n` +
        `HTTP Status: ${status}\n` +
        `Your Role: ${userRole}\n` +
        `Permission Check: ${canDeleteComplaint(user?.role) ? 'PASSED' : 'FAILED'}\n\n` +
        `If you believe this is an error, please check:\n` +
        `1. Your role is correctly set in the system\n` +
        `2. You are logged in with the correct account\n` +
        `3. The complaint belongs to your tenant`;
      
      alert(detailedMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-red-500/20 text-red-400';
      case 'acknowledged':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-400';
      case 'resolved':
        return 'bg-green-500/20 text-green-400';
      case 'closed':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getPriorityColor = (priority: string | number | undefined) => {
    if (priority === undefined || priority === null) return 'text-gray-400';
    const priorityStr = priority.toString().toLowerCase();
    switch (priorityStr) {
      case 'urgent':
      case '3':
        return 'text-red-400';
      case 'high':
      case '2':
        return 'text-orange-400';
      case 'medium':
      case '1':
        return 'text-yellow-400';
      case 'low':
      case '0':
        return 'text-green-400';
      default:
        return 'text-gray-400';
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
              <span className="text-text-secondary">Welcome, {user?.display_name}</span>
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
              <h2 className="text-3xl font-bold text-text-primary">Complaints</h2>
              <p className="text-text-secondary mt-1">Manage customer complaints and track resolution</p>
            </div>
            <button
              onClick={() => navigate('/complaints/new')}
              className="flex items-center px-4 py-2 bg-primary-purple text-white rounded-lg hover:bg-secondary-purple transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              New Complaint
            </button>
          </div>
        </div>

        {/* Filters and View Toggle */}
        <div className="mb-6 flex gap-4 items-center justify-between">
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-dark-bg-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-dark-bg-card border border-border rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary-purple text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              title="List View"
            >
              <ListBulletIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-primary-purple text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              title="Kanban View"
            >
              <Squares2X2Icon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Complaints View */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-purple"></div>
          </div>
        ) : complaints.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardDocumentListIcon className="w-16 h-16 mx-auto text-text-secondary mb-4" />
            <h3 className="text-xl font-semibold text-text-primary mb-2">No complaints yet</h3>
            <p className="text-text-secondary mb-4">Get started by creating your first complaint</p>
            <button
              onClick={() => navigate('/complaints/new')}
              className="px-6 py-2 bg-primary-purple text-white rounded-lg hover:bg-secondary-purple transition-colors"
            >
              New Complaint
            </button>
          </div>
        ) : viewMode === 'kanban' ? (
          <ComplaintKanban 
            complaints={complaints} 
            onStatusChange={loadComplaints}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {complaints.map((complaint) => (
              <div
                key={complaint.id}
                className="bg-dark-bg-card rounded-lg p-6 border border-border hover:border-primary-purple transition-colors"
              >
                <div 
                  className="cursor-pointer"
                  onClick={() => navigate(`/complaints/${complaint.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-text-primary mb-1">{complaint.subject}</h3>
                      <p className="text-sm text-text-secondary line-clamp-2">{complaint.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 text-xs font-medium rounded ${getStatusColor(complaint.status)}`}>
                        {complaint.status.replace('_', ' ')}
                      </span>
                      <span className={`text-xs font-medium ${getPriorityColor(complaint.priority || complaint.severity || 'medium')}`}>
                        {(complaint.priority || complaint.severity || 'medium').toString().toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-text-secondary">
                    <div className="flex items-center gap-4">
                      {(complaint as any).ticket_number && (
                        <span className="font-mono">#{(complaint as any).ticket_number}</span>
                      )}
                      {complaint.created_date && (
                        <span>{new Date(complaint.created_date).toLocaleDateString()}</span>
                      )}
                    </div>
                    {complaint.customer_id && (
                      <Link
                        to={`/customers/${complaint.customer_id}`}
                        className="text-primary-purple hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Customer →
                      </Link>
                    )}
                  </div>
                </div>
                {canDeleteComplaint(user?.role) && complaint.id && (
                  <div className="mt-4 pt-4 border-t border-border flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(complaint.id!, complaint.subject || 'this complaint');
                      }}
                      className="flex items-center px-3 py-1 text-sm text-red-400 hover:text-red-300 transition-colors"
                      title="Delete complaint"
                    >
                      <TrashIcon className="w-4 h-4 mr-1" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination (only show in list view) */}
        {viewMode === 'list' && complaints.length > 0 && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              hasMore={hasMore}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default Complaints;
