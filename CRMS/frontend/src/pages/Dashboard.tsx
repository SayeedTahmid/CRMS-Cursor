import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useMetrics from '../hooks/useMetrics'; // ⬅️ NEW
import {
  UserGroupIcon,
  ClipboardDocumentListIcon,
  EnvelopeIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { data, loading, error, reload } = useMetrics(); // ⬅️ NEW

  // Map API -> tiles (fallbacks so UI never breaks)
  const totalCustomers = data?.active_customers ?? 0;     // tile text says "Total Customers" subtitle "Active customers"
  const openComplaints = data?.open_complaints ?? 0;
  const recentLogs = data?.recent_logs_7d ?? 0;
  const performance = data?.performance_month ?? 0;

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="bg-dark-bg-secondary border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Modern CRM</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-text-secondary">Welcome, {user?.display_name}</span>
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-text-primary">Dashboard</h2>
            <p className="text-text-secondary mt-1">Manage your customers and track interactions</p>
          </div>
          <div className="flex items-center gap-3">
            {loading && <span className="text-text-secondary text-sm">Loading…</span>}
            {error && (
              <span className="text-red-400 text-sm">
                Failed to load metrics
                <button className="ml-2 underline" onClick={reload}>Retry</button>
              </span>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<UserGroupIcon className="w-8 h-8" />}
            title="Total Customers"
            value={String(totalCustomers)}
            subtitle="Active customers"
            color="primary-purple"
            action={<Link to="/customers?status=active" className="text-sm text-primary-purple underline">View</Link>}
          />
          <StatCard
            icon={<ClipboardDocumentListIcon className="w-8 h-8" />}
            title="Open Complaints"
            value={String(openComplaints)}
            subtitle="In progress"
            color="warning"
            action={<Link to="/complaints?status=in_progress" className="text-sm text-primary-purple underline">View</Link>}
          />
          <StatCard
            icon={<EnvelopeIcon className="w-8 h-8" />}
            title="Recent Logs"
            value={String(recentLogs)}
            subtitle="Last 7 days"
            color="success"
            action={<Link to="/logs?range=7d" className="text-sm text-primary-purple underline">View</Link>}
          />
          <StatCard
            icon={<ChartBarIcon className="w-8 h-8" />}
            title="Performance"
            value={loading ? '---' : String(performance)}
            subtitle="This month"
            color="secondary-purple"
            action={<Link to="/logs?range=month" className="text-sm text-primary-purple underline">View</Link>}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <QuickActionCard
            title="Manage Customers"
            description="View, add, and update customer information"
            link="/customers"
            color="primary-purple"
          />
          <QuickActionCard
            title="View Logs"
            description="Track all customer interactions and activities"
            link="/logs"
            color="secondary-purple"
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
  action?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, subtitle, color, action }) => {
  return (
    <div className="bg-dark-bg-card rounded-lg p-6 border border-border">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-text-secondary text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-text-primary mt-2">{value}</p>
          <p className="text-text-secondary text-xs mt-1">{subtitle}</p>
          {action ? <div className="mt-2">{action}</div> : null}
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
