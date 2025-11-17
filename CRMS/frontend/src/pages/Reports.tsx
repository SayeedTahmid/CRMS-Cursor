// frontend/src/pages/Reports.tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { reportService, ReportFilters } from '../services/reports';
import { DocumentArrowDownIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  const handleExport = async (type: 'customers' | 'logs' | 'complaints') => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let blob: Blob;
      let filename: string;

      switch (type) {
        case 'customers':
          blob = await reportService.exportCustomers(filters);
          filename = `customers_report_${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'logs':
          blob = await reportService.exportLogs(filters);
          filename = `logs_report_${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'complaints':
          blob = await reportService.exportComplaints(filters);
          filename = `complaints_report_${new Date().toISOString().split('T')[0]}.csv`;
          break;
      }

      reportService.downloadBlob(blob, filename);
      setSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} report exported successfully!`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-text-primary">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-dark-bg-card rounded-lg p-6 border border-border">
          <div className="flex items-center gap-4 mb-6">
            <ChartBarIcon className="w-8 h-8 text-primary-purple" />
            <h1 className="text-2xl font-bold text-text-primary">Reports & Exports</h1>
          </div>

          {error && (
            <div className="bg-error/20 text-error p-3 rounded-md mb-4">{error}</div>
          )}
          {success && (
            <div className="bg-success/20 text-success p-3 rounded-md mb-4">{success}</div>
          )}

          {/* Filters */}
          <div className="bg-dark-bg-secondary rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full p-2 rounded-md bg-dark-bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary-purple text-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full p-2 rounded-md bg-dark-bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary-purple text-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Status
                </label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full p-2 rounded-md bg-dark-bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary-purple text-text-primary"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="prospect">Prospect</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Type
                </label>
                <select
                  value={filters.type || ''}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full p-2 rounded-md bg-dark-bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary-purple text-text-primary"
                >
                  <option value="">All Types</option>
                  <option value="customer">Customer</option>
                  <option value="prospect">Prospect</option>
                  <option value="vendor">Vendor</option>
                </select>
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4">Export Reports</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Customers Report */}
              <div className="bg-dark-bg-secondary rounded-lg p-6 border border-border">
                <h3 className="text-lg font-semibold mb-2">Customers Report</h3>
                <p className="text-sm text-text-secondary mb-4">
                  Export all customer data with filters applied
                </p>
                <button
                  onClick={() => handleExport('customers')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-purple text-white rounded-lg hover:bg-secondary-purple transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <DocumentArrowDownIcon className="w-5 h-5" />
                  {loading ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>

              {/* Logs Report */}
              <div className="bg-dark-bg-secondary rounded-lg p-6 border border-border">
                <h3 className="text-lg font-semibold mb-2">Logs Report</h3>
                <p className="text-sm text-text-secondary mb-4">
                  Export all activity logs with filters applied
                </p>
                <button
                  onClick={() => handleExport('logs')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-purple text-white rounded-lg hover:bg-secondary-purple transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <DocumentArrowDownIcon className="w-5 h-5" />
                  {loading ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>

              {/* Complaints Report */}
              <div className="bg-dark-bg-secondary rounded-lg p-6 border border-border">
                <h3 className="text-lg font-semibold mb-2">Complaints Report</h3>
                <p className="text-sm text-text-secondary mb-4">
                  Export all complaints with filters applied
                </p>
                <button
                  onClick={() => handleExport('complaints')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-purple text-white rounded-lg hover:bg-secondary-purple transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <DocumentArrowDownIcon className="w-5 h-5" />
                  {loading ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;

