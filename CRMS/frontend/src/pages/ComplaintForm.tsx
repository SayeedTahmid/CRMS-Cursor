// frontend/src/pages/ComplaintForm.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { complaintService } from '../services/complaints';
import { customerService } from '../services/customers';
import { Complaint, Customer } from '../types';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import FileUpload from '../components/FileUpload';

const ComplaintForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const customerId = location.state?.customerId || new URLSearchParams(location.search).get('customer_id');

  const [formData, setFormData] = useState<Partial<Complaint>>({
    customer_id: customerId || '',
    subject: '',
    description: '',
    type: 'other',
    priority: 'medium',
    status: 'new',
    category: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    loadCustomers();
    if (isEditMode && id) {
      loadComplaint();
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

  const loadComplaint = async () => {
    try {
      const complaint = await complaintService.getById(id!);
      setFormData(complaint);
    } catch (err) {
      setError('Failed to load complaint data');
    }
  };

  const handleFileUploaded = (file: any) => {
    console.log('File uploaded:', file);
    // File is stored in database
  };

  const handleFileRemoved = (fileId: string) => {
    console.log('File removed:', fileId);
    // File is removed from database
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEditMode && id) {
        // Full update for edit mode
        await complaintService.update(id, formData);
      } else {
        await complaintService.create(formData);
      }
      
      navigate('/complaints');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to save complaint');
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link to="/complaints" className="flex items-center text-text-secondary hover:text-primary-purple mb-6">
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back to Complaints
        </Link>

        {/* Form Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-text-primary">
            {isEditMode ? 'Edit Complaint' : 'Create New Complaint'}
          </h2>
          <p className="text-text-secondary mt-1">
            {isEditMode ? 'Update complaint information' : 'Report a new customer complaint'}
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
                  disabled={!!customerId || isEditMode}
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
                  disabled={isEditMode}
                >
                  <option value="product">Product</option>
                  <option value="service">Service</option>
                  <option value="billing">Billing</option>
                  <option value="delivery">Delivery</option>
                  <option value="support">Support</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-text-primary mb-1">
                  Priority *
                </label>
                <select
                  id="priority"
                  name="priority"
                  required
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {isEditMode && (
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-text-primary mb-1">
                    Status *
                  </label>
                  <select
                    id="status"
                    name="status"
                    required
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
                  >
                    <option value="new">New</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              )}
            </div>

            <div className="mt-4">
              <label htmlFor="subject" className="block text-sm font-medium text-text-primary mb-1">
                Subject *
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                required
                value={formData.subject}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
                placeholder="Enter complaint subject"
                disabled={isEditMode}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-text-primary mb-1">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              rows={6}
              required
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
              placeholder="Enter detailed description of the complaint..."
              disabled={isEditMode}
            />
          </div>

          {/* File Attachments */}
          {(isEditMode && id) || (!isEditMode && formData.customer_id) ? (
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">Attachments</h3>
              <FileUpload
                entityType="complaint"
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
              onClick={() => navigate('/complaints')}
              className="px-6 py-2 border border-border text-text-primary rounded-md hover:bg-dark-bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary-purple text-white rounded-md hover:bg-secondary-purple transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (isEditMode ? 'Update Complaint' : 'Create Complaint')}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default ComplaintForm;

