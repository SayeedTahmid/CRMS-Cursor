import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { customerService } from '../services/customers';
import { Customer } from '../types';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const CustomerForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    state: '',
    country: 'Bangladesh',
    postal_code: '',
    industry: '',
    type: 'customer',
    status: 'active',
    tags: [],
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (isEditMode && id) {
      loadCustomer();
    }
  }, [id, isEditMode]);

  const loadCustomer = async () => {
    try {
      const customer = await customerService.getById(id!);
      setFormData(customer);
    } catch (err) {
      setError('Failed to load customer data');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEditMode && id) {
        await customerService.update(id, formData);
      } else {
        await customerService.create(formData);
      }
      navigate('/customers');
    } catch (err: any) {
      setError(err.message || 'Failed to save customer');
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
        <Link to="/customers" className="flex items-center text-text-secondary hover:text-primary-purple mb-6">
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back to Customers
        </Link>

        {/* Form Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-text-primary">
            {isEditMode ? 'Edit Customer' : 'Add New Customer'}
          </h2>
          <p className="text-text-secondary mt-1">
            {isEditMode ? 'Update customer information' : 'Add a new customer to your CRM'}
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
                <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
                />
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-text-primary mb-1">
                  Company
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-text-primary mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
                />
              </div>

              <div>
                <label htmlFor="industry" className="block text-sm font-medium text-text-primary mb-1">
                  Industry
                </label>
                <input
                  type="text"
                  id="industry"
                  name="industry"
                  value={formData.industry || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
                />
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-text-primary mb-1">
                  Type
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
                >
                  <option value="customer">Customer</option>
                  <option value="prospect">Prospect</option>
                  <option value="vendor">Vendor</option>
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
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-text-primary mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
                />
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-medium text-text-primary mb-1">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-text-primary mb-1">
                  State
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
                />
              </div>

              <div>
                <label htmlFor="country" className="block text-sm font-medium text-text-primary mb-1">
                  Country
                </label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={formData.country || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
                />
              </div>

              <div>
                <label htmlFor="postal_code" className="block text-sm font-medium text-text-primary mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  id="postal_code"
                  name="postal_code"
                  value={formData.postal_code || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags?.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-primary-purple/20 text-primary-purple rounded-full text-sm flex items-center"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-2 hover:text-red-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add a tag"
                className="flex-1 px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-primary-purple text-white rounded-md hover:bg-secondary-purple transition-colors"
              >
                Add Tag
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-text-primary mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              value={formData.notes || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-purple"
              placeholder="Add any additional notes about this customer..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="px-6 py-2 border border-border text-text-primary rounded-md hover:bg-dark-bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary-purple text-white rounded-md hover:bg-secondary-purple transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (isEditMode ? 'Update Customer' : 'Create Customer')}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CustomerForm;


