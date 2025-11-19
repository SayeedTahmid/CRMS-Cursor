// frontend/src/pages/Dashboard.tsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { metricsService, DashboardMetrics } from '../services/metrics';
import SearchBar from '../components/SearchBar';
import {
  UserGroupIcon,
  ClipboardDocumentListIcon,
  EnvelopeIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    active_customers: 0,
    open_complaints: 0,
    recent_logs_7d: 0,
    performance_month: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const data = await metricsService.getDashboardMetrics();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to load dashboard metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    
    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="bg-dark-bg-secondary border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Modern CRM</h1>
            </div>
            <div className="flex-1 max-w-lg">
              <SearchBar />
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-text-secondary">Welcome, {user?.displayName || user?.display_name || user?.email}</span>
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
          <h2 className="text-3xl font-bold text-text-primary">Dashboard</h2>
          <p className="text-text-secondary mt-1">Manage your customers and track interactions</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<UserGroupIcon className="w-8 h-8" />}
            title="Total Customers"
            value={loading ? '...' : metrics.active_customers.toString()}
            subtitle="Active customers"
            color="primary-purple"
          />
          <StatCard
            icon={<ClipboardDocumentListIcon className="w-8 h-8" />}
            title="Open Complaints"
            value={loading ? '...' : metrics.open_complaints.toString()}
            subtitle="In progress"
            color="warning"
          />
          <StatCard
            icon={<EnvelopeIcon className="w-8 h-8" />}
            title="Recent Logs"
            value={loading ? '...' : metrics.recent_logs_7d.toString()}
            subtitle="Last 7 days"
            color="success"
          />
          <StatCard
            icon={<ChartBarIcon className="w-8 h-8" />}
            title="Performance"
            value={loading ? '...' : metrics.performance_month.toString()}
            subtitle="This month"
            color="secondary-purple"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <QuickActionCard
            title="Manage Customers"
            description="View, add, and update customer information"
            link="/customers"
            color="primary-purple"
          />
          <QuickActionCard
            title="Manage Complaints"
            description="Track and resolve customer complaints"
            link="/complaints"
            color="warning"
          />
          <QuickActionCard
            title="View All Logs"
            description="See all customer interactions and activities"
            link="/logs"
            color="secondary-purple"
          />
          <QuickActionCard
            title="Create Log"
            description="Record a new customer interaction"
            link="/logs/new"
            color="success"
          />
        </div>
      </main>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, subtitle, color }) => {
  return (
    <div className="bg-dark-bg-card rounded-lg p-6 border border-border">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-text-secondary text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-text-primary mt-2">{value}</p>
          <p className="text-text-secondary text-xs mt-1">{subtitle}</p>
        </div>
        <div className={`text-${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

interface QuickActionCardProps {
  title: string;
  description: string;
  link: string;
  color: string;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ title, description, link, color }) => {
  return (
    <Link to={link} className="block">
      <div className={`bg-${color}/10 border border-${color}/20 rounded-lg p-6 hover:bg-${color}/20 transition-colors cursor-pointer`}>
        <h3 className="text-xl font-semibold text-text-primary mb-2">{title}</h3>
        <p className="text-text-secondary">{description}</p>
      </div>
    </Link>
  );
};

export default Dashboard;


