// frontend/src/pages/Settings.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { sendEmail, getEmailStatus, EmailStatusResponse } from '../services/email';
import { usersService, User } from '../services/users';
import { canManageUsers, normalizeRole } from '../utils/permissions';
import { Cog6ToothIcon, BellIcon, PaintBrushIcon, ArrowDownTrayIcon, EnvelopeIcon, UserGroupIcon } from '@heroicons/react/24/outline';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'appearance' | 'data' | 'email' | 'users'>('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // User management state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState<User | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteLoading, setInviteLoading] = useState(false);
  
  const canManage = canManageUsers(user?.role);

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
  const [emailStatusInfo, setEmailStatusInfo] = useState<EmailStatusResponse | null>(null);
  const [emailStatusLoading, setEmailStatusLoading] = useState(false);
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState('');
  const [testEmailForm, setTestEmailForm] = useState({
    to: '',
    subject: 'Test email from NextGen CRM',
    message: 'Hello!\n\nThis is a test email from NextGen CRM settings.\n\nThanks!',
  });

  useEffect(() => {
    if (activeTab === 'email') {
      loadEmailStatus();
    } else if (activeTab === 'users' && canManage) {
      loadUsers();
    }
  }, [activeTab, canManage]);
  
  const loadUsers = async () => {
    if (!canManage) return;
    setUsersLoading(true);
    try {
      const response = await usersService.list();
      setUsers(response.users || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };
  
  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) {
      setError('Email is required');
      return;
    }
    setInviteLoading(true);
    setError('');
    try {
      await usersService.invite(inviteEmail.trim(), inviteRole);
      setSuccess(`User ${inviteEmail} invited successfully with role ${inviteRole}`);
      setInviteEmail('');
      setInviteRole('viewer');
      setShowInviteModal(false);
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to invite user');
    } finally {
      setInviteLoading(false);
    }
  };
  
  const handleChangeRole = async (uid: string, newRole: string) => {
    if (!uid) return;
    setInviteLoading(true);
    setError('');
    try {
      await usersService.setRole(uid, newRole);
      setSuccess('User role updated successfully');
      setShowRoleModal(null);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleNotificationChange = (key: string) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }));
  };

  const loadEmailStatus = async () => {
    try {
      setEmailStatusLoading(true);
      const status = await getEmailStatus();
      setEmailStatusInfo(status);
    } catch (error: any) {
      console.error('Error loading email status:', error);
      setEmailStatusInfo({
        configured: false,
        message: error.response?.data?.error || 'Failed to load email status',
      });
    } finally {
      setEmailStatusLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailForm.to) {
      setTestEmailResult('Please enter a recipient email address.');
      return;
    }
    try {
      setTestEmailSending(true);
      setTestEmailResult('');
      await sendEmail({
        to: testEmailForm.to,
        subject: testEmailForm.subject,
        text: testEmailForm.message,
        trigger: 'settings_test_email',
      });
      setTestEmailResult('Test email sent successfully ✅');
    } catch (error: any) {
      console.error('Error sending test email:', error);
      setTestEmailResult(error.response?.data?.error || error.message || 'Failed to send test email');
    } finally {
      setTestEmailSending(false);
    }
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
    <>
    <div className="min-h-screen bg-dark-bg text-text-primary">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-dark-bg-card rounded-lg p-6 border border-border">
          <div className="flex items-center gap-4 mb-6">
            <Cog6ToothIcon className="w-8 h-8 text-primary-purple" />
            <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
            {user && (
              <div className="ml-auto text-sm text-text-secondary">
                Role: <span className="text-primary-purple">{normalizeRole(user.role)}</span>
                {canManage && <span className="ml-2 text-success">✓ Can manage users</span>}
              </div>
            )}
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
            <button
              onClick={() => setActiveTab('email')}
              className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'email'
                  ? 'text-primary-purple border-b-2 border-primary-purple'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <EnvelopeIcon className="w-5 h-5" />
              Email
            </button>
            {canManage && (
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'users'
                    ? 'text-primary-purple border-b-2 border-primary-purple'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <UserGroupIcon className="w-5 h-5" />
                Users
              </button>
            )}
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

            {activeTab === 'email' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Email (Resend) Settings</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="p-4 bg-dark-bg-secondary rounded-lg border border-border">
                    <h3 className="font-medium text-text-primary mb-2">Service Status</h3>
                    {emailStatusLoading ? (
                      <p className="text-text-secondary text-sm">Checking Resend status...</p>
                    ) : (
                      <div className="space-y-2 text-sm text-text-primary">
                        <p>
                          Status:{' '}
                          <span className={emailStatusInfo?.configured ? 'text-green-400' : 'text-red-400'}>
                            {emailStatusInfo?.configured ? 'Configured' : 'Not configured'}
                          </span>
                        </p>
                        {emailStatusInfo?.from_email && <p>From: {emailStatusInfo.from_email}</p>}
                        <p className="text-text-secondary">{emailStatusInfo?.message}</p>
                      </div>
                    )}
                    <button
                      onClick={loadEmailStatus}
                      className="mt-3 px-4 py-2 bg-primary-purple text-white rounded-lg hover:bg-secondary-purple transition-colors"
                    >
                      Refresh Status
                    </button>
                  </div>
                  <div className="p-4 bg-dark-bg-secondary rounded-lg border border-border">
                    <h3 className="font-medium text-text-primary mb-2">Send Test Email</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-text-secondary mb-1">Recipient</label>
                        <input
                          type="email"
                          value={testEmailForm.to}
                          onChange={(e) => setTestEmailForm((prev) => ({ ...prev, to: e.target.value }))}
                          className="w-full p-2 rounded-md bg-dark-bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary-purple text-text-primary"
                          placeholder="recipient@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-text-secondary mb-1">Subject</label>
                        <input
                          type="text"
                          value={testEmailForm.subject}
                          onChange={(e) => setTestEmailForm((prev) => ({ ...prev, subject: e.target.value }))}
                          className="w-full p-2 rounded-md bg-dark-bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary-purple text-text-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-text-secondary mb-1">Message</label>
                        <textarea
                          value={testEmailForm.message}
                          onChange={(e) => setTestEmailForm((prev) => ({ ...prev, message: e.target.value }))}
                          rows={6}
                          className="w-full p-2 rounded-md bg-dark-bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary-purple text-text-primary"
                        />
                      </div>
                      {testEmailResult && (
                        <p className={`text-sm ${testEmailResult.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                          {testEmailResult}
                        </p>
                      )}
                      <button
                        onClick={handleSendTestEmail}
                        disabled={testEmailSending}
                        className="px-4 py-2 bg-primary-purple text-white rounded-lg hover:bg-secondary-purple transition-colors disabled:opacity-50"
                      >
                        {testEmailSending ? 'Sending...' : 'Send Test Email'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && canManage && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">User Management</h2>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="px-4 py-2 bg-primary-purple text-white rounded-lg hover:bg-secondary-purple transition-colors flex items-center gap-2"
                  >
                    <span>+</span> Invite User
                  </button>
                </div>
                
                {usersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-purple mx-auto"></div>
                    <p className="mt-2 text-text-secondary">Loading users...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-text-secondary">No users found.</div>
                ) : (
                  <div className="space-y-2">
                    {users.map((u) => (
                      <div
                        key={u.id}
                        className="p-4 bg-dark-bg-secondary rounded-lg border border-border flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-text-primary">
                            {u.displayName || u.email || u.id}
                          </p>
                          <p className="text-sm text-text-secondary">{u.email}</p>
                          <p className="text-xs text-text-secondary mt-1">
                            Role: <span className="text-primary-purple">{normalizeRole(u.role)}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => setShowRoleModal(u)}
                          className="px-3 py-1 text-sm bg-dark-bg-card border border-border rounded hover:bg-dark-bg transition-colors"
                        >
                          Change Role
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-bg-card rounded-lg p-6 border border-border w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Invite User</h3>
            {error && (
              <div className="bg-error/20 text-error p-3 rounded-md mb-4">{error}</div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full p-2 rounded-md bg-dark-bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary-purple text-text-primary"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full p-2 rounded-md bg-dark-bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary-purple text-text-primary"
                >
                  <option value="viewer">Viewer</option>
                  <option value="support">Support</option>
                  <option value="sales_rep">Sales Rep</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin (Tenant Admin)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                  setError('');
                }}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
                disabled={inviteLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleInviteUser}
                disabled={inviteLoading || !inviteEmail.trim()}
                className="px-4 py-2 bg-primary-purple text-white rounded-lg hover:bg-secondary-purple transition-colors disabled:opacity-50"
              >
                {inviteLoading ? 'Inviting...' : 'Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-bg-card rounded-lg p-6 border border-border w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Change Role</h3>
            <p className="text-text-secondary mb-4">
              User: {showRoleModal.email || showRoleModal.id}
            </p>
            {error && (
              <div className="bg-error/20 text-error p-3 rounded-md mb-4">{error}</div>
            )}
            <div className="space-y-2 mb-6">
              {['viewer', 'support', 'sales_rep', 'manager', 'admin'].map((role) => {
                const currentRole = showRoleModal.role?.toLowerCase();
                const isSelected = currentRole === role || (role === 'admin' && (currentRole === 'tenant_admin' || currentRole === 'admin'));
                return (
                  <label
                    key={role}
                    className="flex items-center p-3 bg-dark-bg-secondary rounded-lg cursor-pointer hover:bg-dark-bg transition-colors"
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      checked={isSelected}
                      onChange={() => {
                        const newRole = role === 'admin' ? 'admin' : role;
                        handleChangeRole(showRoleModal.id, newRole);
                      }}
                      className="mr-3"
                    />
                    <span className="text-text-primary capitalize">
                      {role === 'admin' ? 'Admin (Tenant Admin)' : role.replace('_', ' ')}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowRoleModal(null);
                  setError('');
                }}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
                disabled={inviteLoading}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default Settings;

