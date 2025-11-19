// frontend/src/pages/Logs.tsx

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listLogs, createLog, deleteLog, ListLogsParams, LogItem } from "../services/logs";
import { useAuth } from "../contexts/AuthContext";

const LOG_TYPES = ["call", "email", "meeting", "note", "task"];

import { normalizeRole } from "../utils/permissions";

const canCreate = (role?: string) => {
  const normalized = normalizeRole(role);
  return ["SUPER_ADMIN","TENANT_ADMIN","MANAGER","SALES_REP","SUPPORT"].includes(normalized);
};

const canDelete = (role?: string) => {
  const normalized = normalizeRole(role);
  return ["SUPER_ADMIN","TENANT_ADMIN","MANAGER"].includes(normalized);
};

export default function LogsPage() {
  const { user, authenticated, loading } = useAuth();
  const [sp, setSp] = useSearchParams();

  const page       = Number(sp.get("page") || 1);
  const type       = sp.get("type") || "";
  const search     = sp.get("search") || "";
  const customerId = sp.get("customerId") || "";
  const limit = 20;

  const [items, setItems] = useState<LogItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const allowCreate = useMemo(() => canCreate(user?.role), [user?.role]);

  // quick-create state
  const [newType, setNewType] = useState("note");
  const [newTitle, setNewTitle] = useState("");
  const [newCustomerId, setNewCustomerId] = useState(customerId);
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => { if (customerId) setNewCustomerId(customerId); }, [customerId]);

  useEffect(() => {
    if (loading || !authenticated) return;

    let alive = true;
    setBusy(true);
    setError("");

    const params: ListLogsParams = { page, limit };
    if (type) params.type = type;
    if (customerId) params.customer_id = customerId;
    if (search) (params as any).search = search;

    listLogs(params)
      .then(res => { if (alive) setItems(res.logs || []); })
      .catch(e => { if (alive) { setError(e?.message || "Failed to load logs"); setItems([]); } })
      .finally(() => { if (alive) setBusy(false); });

    return () => { alive = false; };
  }, [loading, authenticated, page, type, search, customerId]);

  const setPage = (n: number) => {
    const next = new URLSearchParams(sp);
    next.set("page", String(Math.max(1, n)));
    setSp(next, { replace: true });
  };

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(sp);
    type ? next.set("type", type) : next.delete("type");
    search ? next.set("search", search) : next.delete("search");
    customerId ? next.set("customerId", customerId) : next.delete("customerId");
    next.set("page", "1");
    setSp(next, { replace: true });
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowCreate) return;
    if (!newCustomerId.trim() || !newType.trim() || !newTitle.trim()) {
      setError("Type, Title and Customer ID are required.");
      return;
    }
    try {
      setBusy(true);
      setError("");
      await createLog({
        type: newType,
        title: newTitle,
        subject: newTitle,
        description: newDescription,
        customerId: newCustomerId,
      });
      // reset and go back to page 1
      setNewTitle("");
      setNewDescription("");
      if (!customerId) setNewCustomerId("");
      const next = new URLSearchParams(sp);
      next.set("page", "1");
      setSp(next, { replace: true });
    } catch (e: any) {
      setError(e?.message || "Failed to create log");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-purple" />
      </div>
    );
  }
  if (!authenticated) {
    return <div className="min-h-screen bg-dark-bg flex items-center justify-center text-text-secondary">
      Please sign in to view logs.
    </div>;
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="bg-dark-bg-secondary border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">Logs</h1>
          <div className="text-text-secondary text-sm">Signed in as {user?.email}</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <form onSubmit={applyFilters} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
          <input
            placeholder="Filter by customerId"
            className="px-3 py-2 rounded bg-dark-bg-card border border-border text-text-primary"
            defaultValue={customerId}
            onChange={(e) => {
              const next = new URLSearchParams(sp);
              if (e.target.value) next.set("customerId", e.target.value);
              else next.delete("customerId");
              setSp(next, { replace: true });
            }}
          />
          <select
            className="px-3 py-2 rounded bg-dark-bg-card border border-border text-text-primary"
            value={type}
            onChange={(e) => {
              const next = new URLSearchParams(sp);
              if (e.target.value) next.set("type", e.target.value);
              else next.delete("type");
              next.set("page", "1");
              setSp(next, { replace: true });
            }}
          >
            <option value="">All types</option>
            {LOG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            placeholder="Search title/subject/description"
            className="px-3 py-2 rounded bg-dark-bg-card border border-border text-text-primary"
            defaultValue={search}
            onChange={(e) => {
              const next = new URLSearchParams(sp);
              if (e.target.value) next.set("search", e.target.value);
              else next.delete("search");
              setSp(next, { replace: true });
            }}
          />
          <button className="px-4 py-2 rounded bg-primary-purple text-white hover:bg-secondary-purple">
            Apply
          </button>
          <Link to="/customers" className="px-4 py-2 rounded border border-border text-text-primary text-center">
            Customers
          </Link>
        </form>

        {error && <div className="rounded bg-red-900/20 border border-red-800 text-red-300 px-3 py-2 mb-4">{error}</div>}

        {/* Quick create */}
        {allowCreate && (
          <form onSubmit={onCreate} className="bg-dark-bg-card border border-border rounded p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                className="px-3 py-2 rounded bg-dark-bg border border-border text-text-primary"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
              >
                {LOG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input
                placeholder="Title *"
                className="px-3 py-2 rounded bg-dark-bg border border-border text-text-primary"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
              <input
                placeholder="Customer ID *"
                className="px-3 py-2 rounded bg-dark-bg border border-border text-text-primary"
                value={newCustomerId}
                onChange={(e) => setNewCustomerId(e.target.value)}
                required
              />
              <input
                placeholder="Description"
                className="px-3 py-2 rounded bg-dark-bg border border-border text-text-primary"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div className="mt-3">
              <button className="px-4 py-2 rounded bg-primary-purple text-white hover:bg-secondary-purple">
                Create Log
              </button>
            </div>
          </form>
        )}

        {/* List */}
        {busy ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-purple" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-text-secondary">No logs found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((log) => {
              const created = (typeof log.created_at === "string") ? new Date(log.created_at).toLocaleString() : "";
              return (
                <div key={log.id} className="bg-dark-bg-card border border-border rounded p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-text-primary font-semibold">
                        {log.title || "(no title)"} <span className="text-text-secondary">[{log.type}]</span>
                      </div>
                      {log.description && <div className="text-text-secondary text-sm mt-1">{log.description}</div>}
                      <div className="text-text-secondary text-xs mt-1">
                        Customer:{" "}
                        <Link to={`/customers/${log.customer_id}`} className="text-primary-purple">
                          {log.customer_id}
                        </Link>
                      </div>
                      {created && <div className="text-text-secondary text-xs mt-1">Created: {created}</div>}
                    </div>
                    <div className="text-xs text-text-secondary">#{log.id.slice(0,6)}</div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Link to={`/customers/${log.customer_id}`} className="text-xs text-primary-purple hover:text-secondary-purple">
                      Open customer
                    </Link>
                    {canDelete(user?.role) && (
                      <button
                        className="ml-auto text-xs text-red-300 hover:text-red-200"
                        onClick={async () => {
                          if (!canDelete(user?.role)) {
                            const userRole = user?.role || 'unknown';
                            alert(`You do not have permission to delete logs.\n\nYour role: ${userRole}\nRequired roles: SUPER_ADMIN, TENANT_ADMIN, or MANAGER`);
                            return;
                          }
                          
                          if (!confirm("Delete this log?")) return;
                          try {
                            await deleteLog(log.id);
                            const next = new URLSearchParams(sp);
                            next.set("page", "1");
                            setSp(next, { replace: true });
                          } catch (e: any) {
                            console.error('Error deleting log:', e);
                            
                            // Build detailed error message
                            const userRole = user?.role || 'unknown';
                            const errorMessage = e?.message || e?.response?.data?.error || 'Failed to delete log';
                            const status = e?.response?.status || 'unknown';
                            
                            const detailedMessage = `Failed to delete log\n\n` +
                              `Error: ${errorMessage}\n` +
                              `HTTP Status: ${status}\n` +
                              `Your Role: ${userRole}\n` +
                              `Permission Check: ${canDelete(user?.role) ? 'PASSED' : 'FAILED'}\n\n` +
                              `If you believe this is an error, please check:\n` +
                              `1. Your role is correctly set in the system\n` +
                              `2. You are logged in with the correct account\n` +
                              `3. The log belongs to your tenant`;
                            
                            alert(detailedMessage);
                          }
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pager */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="px-3 py-2 rounded border border-border text-text-primary disabled:opacity-40"
          >
            Prev
          </button>
          <div className="text-text-secondary text-sm">Page {page}</div>
          <button
            onClick={() => setPage(page + 1)}
            className="px-3 py-2 rounded border border-border text-text-primary"
          >
            Next
          </button>
        </div>
      </main>
    </div>
  );
}
