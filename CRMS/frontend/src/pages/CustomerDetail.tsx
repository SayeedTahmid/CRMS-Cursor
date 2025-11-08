import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { customerService } from '../services/customers';
import { Customer, Log } from '../types';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    // ✅ must have a real string id from the router before hitting the API
    if (!id || typeof id !== "string" || id === "undefined" || id === "null") {
      return;
    }

    let alive = true; // 🧽 cancel setState if unmounted
    setLoading(true);
    setErr("");

    (async () => {
      try {
        // If your service has getLogsByCustomer(id) use that; otherwise getLogs(id)
        const [cust, logsData] = await Promise.all([
          customerService.getById(id),
          (customerService as any).getLogsByCustomer
            ? (customerService as any).getLogsByCustomer(id)
            : customerService.getLogs(id),
        ]);

        if (!alive) return;
        setCustomer(cust);
        // normalize logs shape: prefer array, otherwise {logs: [...]}
        const list = Array.isArray(logsData) ? logsData : (logsData?.logs ?? []);
        setLogs(list);
      } catch (e: any) {
        if (!alive) return;
        console.error("Error loading customer or logs:", e);
        setErr(e?.message || "Failed to load customer");
        setCustomer(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-purple"></div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-2">Error</h2>
          <p className="text-text-secondary mb-4">{err}</p>
          <Link to="/customers" className="text-primary-purple hover:text-secondary-purple">
            Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-2">Customer not found</h2>
          <Link to="/customers" className="text-primary-purple hover:text-secondary-purple">
            Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="bg-dark-bg-secondary border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/dashboard" className="text-2xl font-bold text-text-primary">
              Modern CRM
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-text-secondary">Signed in as {user?.email ?? user?.displayName}</span>
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
        {/* Back Button */}
        <Link to="/customers" className="flex items-center text-text-secondary hover:text-primary-purple mb-6">
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back to Customers
        </Link>

        {/* Customer Info */}
        <div className="bg-dark-bg-card rounded-lg p-6 border border-border mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold text-text-primary">
                {customer.name ?? (customer as any).email ?? (customer as any).company ?? (customer as any).id}
              </h2>
              <p className="text-text-secondary">{(customer as any).company || 'No company'}</p>
            </div>
            {(customer as any).status && (
              <span
                className={`px-3 py-1 text-sm font-medium rounded ${
                  (customer as any).status === 'active'
                    ? 'bg-success/20 text-success'
                    : (customer as any).status === 'inactive'
                    ? 'bg-warning/20 text-warning'
                    : 'bg-error/20 text-error'
                }`}
              >
                {(customer as any).status}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-2">Contact Information</h3>
              <div className="space-y-2">
                {customer.email && <p className="text-text-primary">📧 {customer.email}</p>}
                {(customer as any).phone && <p className="text-text-primary">📱 {(customer as any).phone}</p>}
                {(customer as any).website && <p className="text-text-primary">🌐 {(customer as any).website}</p>}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-2">Address</h3>
              <div className="text-text-primary">
                {(customer as any).address && <p>{(customer as any).address}</p>}
                {((customer as any).city || (customer as any).state) && (
                  <p>
                    {(customer as any).city}
                    {(customer as any).city && (customer as any).state ? ', ' : ''}
                    {(customer as any).state}
                  </p>
                )}
                {(customer as any).country && <p>{(customer as any).country}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Logs */}
        <div className="bg-dark-bg-card rounded-lg p-6 border border-border">
          <h3 className="text-xl font-bold text-text-primary mb-4">Recent Activity</h3>
          {logs.length === 0 ? (
            <p className="text-text-secondary">No activity logs yet</p>
          ) : (
            <div className="space-y-4">
              {logs.slice(0, 5).map((log) => {
                // ✅ Stable key + safe date
                const key =
                  log.id ??
                  String((log as any).createdAt ?? (log as any).timestamp ?? (log as any).log_date ?? Math.random());
                const when =
                  (log as any).log_date ??
                  (log as any).createdAt ??
                  (log as any).timestamp ??
                  null;
                const whenText = when ? new Date(when).toLocaleString() : "";

                return (
                  <div key={key} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-text-primary">{log.title ?? (log as any).type ?? "(log)"}</h4>
                        {(log as any).description || (log as any).content ? (
                          <p className="text-sm text-text-secondary">
                            {(log as any).description ?? (log as any).content}
                          </p>
                        ) : null}
                      </div>
                      {(log as any).type && (
                        <span className="px-2 py-1 text-xs font-medium bg-primary-purple/20 text-primary-purple rounded">
                          {(log as any).type}
                        </span>
                      )}
                    </div>
                    {whenText && <p className="text-xs text-text-secondary mt-2">{whenText}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default CustomerDetail;
