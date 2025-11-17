// frontend/src/pages/ForgotPassword.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { LockClosedIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await api.post('/auth/reset-password', { email });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-dark-bg-card rounded-lg p-8 border border-border">
          <div className="text-center mb-8">
            <LockClosedIcon className="mx-auto h-12 w-12 text-primary-purple" />
            <h2 className="mt-6 text-3xl font-bold text-text-primary">Reset Password</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Enter your email address and we'll send you a link to reset your password
            </p>
          </div>

          {success ? (
            <div className="text-center">
              <div className="bg-success/20 text-success p-4 rounded-md mb-4">
                Password reset email sent! Please check your inbox.
              </div>
              <Link
                to="/login"
                className="text-primary-purple hover:text-secondary-purple"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-error/20 text-error p-3 rounded-md">{error}</div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 rounded-md bg-dark-bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary-purple text-text-primary"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-purple hover:bg-secondary-purple focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-purple disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>

              <div className="text-center">
                <Link
                  to="/login"
                  className="flex items-center justify-center text-primary-purple hover:text-secondary-purple"
                >
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

