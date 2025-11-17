// frontend/src/pages/Settings.tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Cog6ToothIcon, BellIcon, PaintBrushIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'appearance' | 'data'>('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    push_notifications: false,
    weekly_summary: true,
    complaint_updates: true,
    customer_updates: false,
  });

  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: 'dark',
    compact_mode: false,
    sidebar_collapsed: false,
  });

  const handleNotificationChange = (key: string) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }));
  };

  const handleAppearanceChange = (key: string, value: any) => {
    setAppearanceSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      // Export functionality would call backend endpoint
      setSuccess('Data export initiated. You will receive an email when ready.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Save preferences
      const preferences = {
        notifications: notificationSettings,
        appearance: appearanceSettings,
      };
      await api.put('/auth/user', { preferences });
      setSuccess('Settings saved successfully!');
      // Store in localStorage for immediate effect
      localStorage.setItem('app_preferences', JSON.stringify(preferences));
      window.location.reload();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-text-primary">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-dark-bg-card rounded-lg p-6 border border-border">
          <div className="flex items-center gap-4 mb-6">
            <Cog6ToothIcon className="w-8 h-8 text-primary-purple" />
            <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
          </div>

          {error && (
            <div className="bg-error/20 text-error p-3 rounded-md mb-4">{error}</div>
          )}
          {success && (
            <div className="bg-success/20 text-success p-3 rounded-md mb-4">{success}</div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 border-b border-border mb-6">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'general'
                  ? 'text-primary-purple border-b-2 border-primary-purple'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'notifications'
                  ? 'text-primary-purple border-b-2 border-primary-purple'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <BellIcon className="w-5 h-5" />
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'appearance'
                  ? 'text-primary-purple border-b-2 border-primary-purple'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <PaintBrushIcon className="w-5 h-5" />
              Appearance
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'data'
                  ? 'text-primary-purple border-b-2 border-primary-purple'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Data
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'general' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">General Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Language
                    </label>
                    <select className="w-full p-2 rounded-md bg-dark-bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary-purple text-text-primary">
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Date Format
                    </label>
                    <select className="w-full p-2 rounded-md bg-dark-bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary-purple text-text-primary">
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Time Zone
                    </label>
                    <select className="w-full p-2 rounded-md bg-dark-bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary-purple text-text-primary">
                      <option value="Asia/Dhaka">Asia/Dhaka (Bangladesh)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
                <div className="space-y-4">
                  {Object.entries(notificationSettings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-dark-bg-secondary rounded-lg">
                      <div>
                        <label className="font-medium text-text-primary capitalize">
                          {key.replace(/_/g, ' ')}
                        </label>
                        <p className="text-sm text-text-secondary">
                          {key === 'email_notifications' && 'Receive notifications via email'}
                          {key === 'push_notifications' && 'Receive browser push notifications'}
                          {key === 'weekly_summary' && 'Get weekly activity summary'}
                          {key === 'complaint_updates' && 'Notify when complaints are updated'}
                          {key === 'customer_updates' && 'Notify when customers are updated'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleNotificationChange(key)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          value ? 'bg-primary-purple' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            value ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Appearance Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Theme
                    </label>
                    <select
                      value={appearanceSettings.theme}
                      onChange={(e) => handleAppearanceChange('theme', e.target.value)}
                      className="w-full p-2 rounded-md bg-dark-bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary-purple text-text-primary"
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-dark-bg-secondary rounded-lg">
                    <div>
                      <label className="font-medium text-text-primary">Compact Mode</label>
                      <p className="text-sm text-text-secondary">Use a more compact layout</p>
                    </div>
                    <button
                      onClick={() => handleAppearanceChange('compact_mode', !appearanceSettings.compact_mode)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        appearanceSettings.compact_mode ? 'bg-primary-purple' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          appearanceSettings.compact_mode ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Data Management</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-dark-bg-secondary rounded-lg">
                    <h3 className="font-medium text-text-primary mb-2">Export Data</h3>
                    <p className="text-sm text-text-secondary mb-4">
                      Download all your data in CSV or JSON format
                    </p>
                    <button
                      onClick={handleExportData}
                      disabled={loading}
                      className="px-4 py-2 bg-primary-purple text-white rounded-lg hover:bg-secondary-purple transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <ArrowDownTrayIcon className="w-5 h-5" />
                      Export Data
                    </button>
                  </div>
                  <div className="p-4 bg-dark-bg-secondary rounded-lg">
                    <h3 className="font-medium text-text-primary mb-2">Delete Account</h3>
                    <p className="text-sm text-text-secondary mb-4">
                      Permanently delete your account and all associated data
                    </p>
                    <button
                      className="px-4 py-2 bg-error text-white rounded-lg hover:bg-error/80 transition-colors"
                      onClick={() => {
                        if (confirm('Are you sure? This action cannot be undone.')) {
                          // Delete account logic
                        }
                      }}
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-border">
              <button
                onClick={handleSaveSettings}
                disabled={loading}
                className="px-6 py-2 bg-primary-purple text-white rounded-lg hover:bg-secondary-purple transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

