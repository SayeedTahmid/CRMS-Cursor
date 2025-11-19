// frontend/src/pages/CallHistory.tsx
/** Call history page showing all call logs */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getCallHistory, formatPhoneNumber, CallHistoryItem } from '../services/calls';
import { PhoneIcon } from '@heroicons/react/24/outline';

const CallHistory: React.FC = () => {
  const { user } = useAuth();
  const [calls, setCalls] = useState<CallHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'inbound' | 'outbound'>('all');

  useEffect(() => {
    loadCallHistory();
  }, [filter]);

  const loadCallHistory = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params: any = {};
      if (filter !== 'all') {
        params.direction = filter;
      }
      
      const response = await getCallHistory(params);
      setCalls(response.calls || []);
    } catch (err: any) {
      console.error('Error loading call history:', err);
      setError(err.response?.data?.error || 'Failed to load call history');
    } finally {
      setLoading(false);
    }
  };

  const getCallStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'failed':
      case 'busy':
      case 'no-answer':
        return 'text-red-400';
      case 'in-progress':
        return 'text-blue-400';
      default:
        return 'text-yellow-400';
    }
  };

  const getCallOutcomeText = (outcome?: string) => {
    switch (outcome) {
      case 'answered':
        return 'Answered';
      case 'no_answer':
        return 'No Answer';
      case 'busy':
        return 'Busy';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="bg-dark-bg-secondary border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Call History</h1>
              <p className="text-text-secondary text-sm">View all call logs and history</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-text-secondary">Welcome, {user?.displayName || user?.display_name || user?.email}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${
              filter === 'all'
                ? 'bg-primary-purple text-white'
                : 'bg-dark-bg-card text-text-secondary hover:bg-dark-bg-secondary'
            }`}
          >
            All Calls
          </button>
          <button
            onClick={() => setFilter('outbound')}
            className={`px-4 py-2 rounded ${
              filter === 'outbound'
                ? 'bg-primary-purple text-white'
                : 'bg-dark-bg-card text-text-secondary hover:bg-dark-bg-secondary'
            }`}
          >
            Outbound
          </button>
          <button
            onClick={() => setFilter('inbound')}
            className={`px-4 py-2 rounded ${
              filter === 'inbound'
                ? 'bg-primary-purple text-white'
                : 'bg-dark-bg-card text-text-secondary hover:bg-dark-bg-secondary'
            }`}
          >
            Inbound
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded p-4 mb-6 text-red-300">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-purple" />
          </div>
        ) : calls.length === 0 ? (
          <div className="text-center py-12">
            <PhoneIcon className="w-16 h-16 text-text-secondary mx-auto mb-4" />
            <p className="text-text-secondary text-lg">No calls found</p>
            <p className="text-text-secondary text-sm mt-2">
              {filter !== 'all' ? `No ${filter} calls found.` : 'Start making calls to see them here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {calls.map((call) => (
              <div
                key={call.id}
                className="bg-dark-bg-card border border-border rounded-lg p-6 hover:border-primary-purple transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-text-primary">
                        {call.title || 'Call'}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          call.direction === 'inbound'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}
                      >
                        {call.direction === 'inbound' ? 'Inbound' : 'Outbound'}
                      </span>
                      <span className={`text-xs ${getCallStatusColor(call.call_status || call.status)}`}>
                        {call.call_status || call.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
                      <div>
                        <p className="text-text-secondary mb-1">Phone Number</p>
                        <p className="text-text-primary">
                          {call.call_to ? formatPhoneNumber(call.call_to) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-text-secondary mb-1">Duration</p>
                        <p className="text-text-primary">
                          {call.duration ? formatDuration(call.duration * 60) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-text-secondary mb-1">Outcome</p>
                        <p className="text-text-primary">
                          {getCallOutcomeText(call.call_outcome)}
                        </p>
                      </div>
                    </div>

                    {call.description && (
                      <p className="text-text-secondary text-sm mt-3">{call.description}</p>
                    )}

                    {call.customer_id && (
                      <div className="mt-3">
                        <Link
                          to={`/customers/${call.customer_id}`}
                          className="text-primary-purple hover:text-secondary-purple text-sm"
                        >
                          View Customer →
                        </Link>
                      </div>
                    )}

                    {call.log_date && (
                      <p className="text-text-secondary text-xs mt-3">
                        {new Date(call.log_date).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CallHistory;

