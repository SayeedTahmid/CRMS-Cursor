// frontend/src/pages/LogForm.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { logService } from '../services/logs';
import { customerService } from '../services/customers';
import { Log, Customer } from '../types';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import FileUpload from '../components/FileUpload';

const LogForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const customerId = location.state?.customerId || new URLSearchParams(location.search).get('customer_id');

  const [formData, setFormData] = useState<Partial<Log>>({
    type: 'note',
    customer_id: customerId || '',
    title: '',
    description: '',
    content: '',
    priority: 'normal',
    status: 'completed',
    log_date: new Date().toISOString().split('T')[0] + 'T' + new Date().toTimeString().slice(0, 5),
    duration: undefined,
    follow_up_required: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    loadCustomers();
    if (isEditMode && id) {
      loadLog();
    }
  }, [id, isEditMode]);

  const loadCustomers = async () => {
    try {
      const data = await customerService.getAll();
      setCustomers(data.customers);
    } catch (err) {
      console.error('Error loading customers:', err);
    }
  };

  const loadLog = async () => {
    try {
      const log = await logService.getById(id!);
      setFormData(log);
    } catch (err) {
      setError('Failed to load log data');
    }
  };

  const handleFileUploaded = (file: any) => {
    console.log('File uploaded:', file);
    // File is stored in database, no need to track in state
  };

  const handleFileRemoved = (fileId: string) => {
    console.log('File removed:', fileId);
    // File is removed from database
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: value ? parseInt(value) : undefined }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEditMode && id) {
        await logService.update(id, formData);
      } else {
        await logService.create(formData);
      }
      
      // Navigate back to customer detail or logs page
      if (formData.customer_id) {
        navigate(`/customers/${formData.customer_id}`);
      } else {
        navigate('/customers');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save log');
    } finally {
      setLoading(false);
    }
  };

  const logTypes = [
    { value: 'call', label: '📞 Call' },
    { value: 'email', label: '📧 Email' },
    { value: 'meeting', label: '🤝 Meeting' },
    { value: 'note', label: '📝 Note' },
    { value: 'sample', label: '📦 Sample' },
    { value: 'task', label: '✓ Task' },
    { value: 'other', label: '• Other' },
  ];

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="bg-dark-bg-secondary border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/dashboard" className="text-2xl font-bold text-text-primary">
              Modern CRM
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        {formData.customer_id ? (
          <Link to={`/customers/${formData.customer_id}`} className="flex items-center text-text-secondary hover:text-primary-purple mb-6">
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Customer
          </Link>
        ) : (
          <Link to="/customers" className="flex items-center text-text-secondary hover:text-primary-purple mb-6">
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Customers
          </Link>
        )}

        {/* Form Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-text-primary">
            {isEditMode ? 'Edit Log' : 'Create New Log'}
          </h2>
          <p className="text-text-secondary mt-1">
            {isEditMode ? 'Update log information' : 'Record a new customer interaction'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-dark-bg-card rounded-lg p-6 border border-border space-y-6">
          {error && (
            <div className="rounded-md bg-red-900/20 p-4 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="customer_id" className="block text-sm font-medium text-text-primary mb-1">
                  Customer *
                </label>
                <select
                  id="customer_id"
                  name="customer_id"
                  required
                  value={formData.customer_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
                  disabled={!!customerId}
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.company ? `(${customer.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-text-primary mb-1">
                  Type *
                </label>
                <select
                  id="type"
                  name="type"
                  required
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
                >
                  {logTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="title" className="block text-sm font-medium text-text-primary mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
                  placeholder="Enter log title"
                />
              </div>

              <div>
                <label htmlFor="log_date" className="block text-sm font-medium text-text-primary mb-1">
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  id="log_date"
                  name="log_date"
                  required
                  value={formData.log_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
                />
              </div>

              {(formData.type === 'call' || formData.type === 'meeting') && (
                <div>
                  <label htmlFor="duration" className="block text-sm font-medium text-text-primary mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    id="duration"
                    name="duration"
                    min="0"
                    value={formData.duration || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
                    placeholder="Duration in minutes"
                  />
                </div>
              )}

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-text-primary mb-1">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-text-primary mb-1">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-text-primary mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formData.description || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
              placeholder="Brief description..."
            />
          </div>

          {/* Content/Notes */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-text-primary mb-1">
              Details / Notes
            </label>
            <textarea
              id="content"
              name="content"
              rows={6}
              value={formData.content || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
              placeholder="Enter detailed notes about this interaction..."
            />
          </div>

          {/* Follow-up */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="follow_up_required"
              name="follow_up_required"
              checked={formData.follow_up_required || false}
              onChange={handleChange}
              className="w-4 h-4 text-primary-purple bg-dark-bg border-border rounded focus:ring-primary-purple"
            />
            <label htmlFor="follow_up_required" className="ml-2 text-sm text-text-primary">
              Follow-up required
            </label>
          </div>

          {formData.follow_up_required && (
            <div>
              <label htmlFor="follow_up_date" className="block text-sm font-medium text-text-primary mb-1">
                Follow-up Date
              </label>
              <input
                type="datetime-local"
                id="follow_up_date"
                name="follow_up_date"
                value={formData.follow_up_date || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
              />
            </div>
          )}

          {/* File Attachments */}
          {(isEditMode && id) || (!isEditMode && formData.customer_id) ? (
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">Attachments</h3>
              <FileUpload
                entityType="log"
                entityId={isEditMode ? id : undefined}
                onUploadComplete={handleFileUploaded}
                onFileRemove={handleFileRemoved}
                maxFiles={10}
                maxSize={10}
              />
            </div>
          ) : null}

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => {
                if (formData.customer_id) {
                  navigate(`/customers/${formData.customer_id}`);
                } else {
                  navigate('/customers');
                }
              }}
              className="px-6 py-2 border border-border text-text-primary rounded-md hover:bg-dark-bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary-purple text-white rounded-md hover:bg-secondary-purple transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (isEditMode ? 'Update Log' : 'Create Log')}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default LogForm;

