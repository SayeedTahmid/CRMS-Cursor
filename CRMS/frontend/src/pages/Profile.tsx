// frontend/src/pages/Profile.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { UserCircleIcon, PencilIcon } from '@heroicons/react/24/outline';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    display_name: '',
    first_name: '',
    last_name: '',
    phone: '',
    department: '',
    position: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        display_name: user.displayName || user.display_name || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        department: user.department || '',
        position: user.position || '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.put('/auth/user', formData);
      setSuccess('Profile updated successfully!');
      // Refresh user data
      window.location.reload();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-text-primary">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-dark-bg-card rounded-lg p-6 border border-border">
          <div className="flex items-center gap-4 mb-6">
            <UserCircleIcon className="w-12 h-12 text-primary-purple" />
            <div>
              <h1 className="text-2xl font-bold text-text-primary">My Profile</h1>
              <p className="text-text-secondary">{user?.email}</p>
            </div>
          </div>

          {error && (
            <div className="bg-error/20 text-error p-3 rounded-md mb-4">{error}</div>
          )}
          {success && (
            <div className="bg-success/20 text-success p-3 rounded-md mb-4">{success}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="display_name" className="block text-sm font-medium text-text-secondary mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  id="display_name"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleChange}
                  className="w-full p-2 rounded-md bg-dark-bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary-purple text-text-primary"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full p-2 rounded-md bg-dark-bg-secondary border border-border text-text-secondary cursor-not-allowed"
                />
              </div>
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-text-secondary mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full p-2 rounded-md bg-dark-bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary-purple text-text-primary"
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-text-secondary mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full p-2 rounded-md bg-dark-bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary-purple text-text-primary"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-text-secondary mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full p-2 rounded-md bg-dark-bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary-purple text-text-primary"
                />
              </div>
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-text-secondary mb-1">
                  Department
                </label>
                <input
                  type="text"
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full p-2 rounded-md bg-dark-bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary-purple text-text-primary"
                />
              </div>
              <div>
                <label htmlFor="position" className="block text-sm font-medium text-text-secondary mb-1">
                  Position
                </label>
                <input
                  type="text"
                  id="position"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className="w-full p-2 rounded-md bg-dark-bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary-purple text-text-primary"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-primary-purple text-white rounded-lg hover:bg-secondary-purple transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <PencilIcon className="w-5 h-5" />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;

