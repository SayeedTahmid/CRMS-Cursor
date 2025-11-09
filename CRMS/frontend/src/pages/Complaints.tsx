import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { complaintsService } from "../services/complaints";
import { useAuth } from "../contexts/AuthContext";

type Complaint = {
  id: string;
  title: string;
  description?: string;
  customer_id: string;
  status: "new" | "acknowledged" | "in_progress" | "resolved" | "closed";
  severity?: string;
  priority?: number;
  ticket_number?: string;
  created_at?: string;
};

const STATUS_OPTS = ["new", "acknowledged", "in_progress", "resolved", "closed"];

export default function Complaints() {
  const { user, authenticated, loading } = useAuth(); // ✅ use auth signals
  const [sp, setSp] = useSearchParams();

  const [items, setItems] = useState<Complaint[]>([]);
  const [busy, setBusy] = useState(true);            // was "loading" (avoid name clash)
  const [error, setError] = useState("");
  const [page, setPage] = useState<number>(Number(sp.get("page") || 1));
  const [hasMore, setHasMore] = useState(false);

  // filters from querystring (so /complaints?customerId=... works)
  const customerId = sp.get("customerId") || "";
  const [status, setStatus] = useState<string>(sp.get("status") || "");
  const [search, setSearch] = useState<string>(sp.get("search") || "");
  const pageSize = 20;

  // create form
  const [newTitle, setNewTitle] = useState("");
  const [newCustomerId, setNewCustomerId] = useState(customerId);
  const [newDescription, setNewDescription] = useState("");

  // ✅ keep quick-create Customer ID in sync when URL param changes
  useEffect(() => {
    if (customerId) setNewCustomerId(customerId);
  }, [customerId]);

  // ✅ only load when auth is ready & user is authenticated
  useEffect(() => {
    if (loading || !authenticated) return;

    let alive = true;
    setBusy(true);
    setError("");

    complaintsService
      .list({ customerId, status, search, page, pageSize })
      .then((res) => {
        if (!alive) return;
        setItems(res.complaints || []);
        setHasMore(!!res.hasMore);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e?.message || "Failed to load complaints");
        setItems([]);
        setHasMore(false);
      })
      .finally(() => alive && setBusy(false));

    return () => {
      alive = false;
    };
  }, [loading, authenticated, customerId, status, search, page]);

  const onFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(sp);
    if (customerId) next.set("customerId", customerId);
    else next.delete("customerId");
    if (status) next.set("status", status);
    else next.delete("status");
    if (search) next.set("search", search);
    else next.delete("search");
    next.set("page", "1");
    setSp(next, { replace: true });
    setPage(1);
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBusy(true);
      setError("");
      if (!newTitle.trim() || !newCustomerId.trim()) {
        setError("Title and Customer ID are required.");
        setBusy(false);
        return;
      }
      await complaintsService.create({
        title: newTitle,
        customerId: newCustomerId,
        description: newDescription,
      });
      // reset inputs
      setNewTitle("");
      setNewDescription("");
      if (!customerId) setNewCustomerId("");
      // reload first page to show the new one
      setPage(1);
      const next = new URLSearchParams(sp);
      next.set("page", "1");
      setSp(next, { replace: true });
    } catch (e: any) {
      setError(e?.message || "Failed to create complaint");
    } finally {
      setBusy(false);
    }
  };

  const onChangeStatus = async (id: string, next: Complaint["status"]) => {
    try {
      await complaintsService.updateStatus(id, next);
      const res = await complaintsService.list({ customerId, status, search, page, pageSize });
      setItems(res.complaints || []);
      setHasMore(!!res.hasMore);
    } catch (e: any) {
      alert(e?.message || "Failed to update status");
    }
  };

  const nextPage = () => setPage((p) => p + 1);
  const prevPage = () => setPage((p) => Math.max(1, p - 1));

  // 🔒 Block UI calls until auth is resolved (prevents 401 bursts)
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-purple" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center text-text-secondary">
        Please sign in to view complaints.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="bg-dark-bg-secondary border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">Complaints</h1>
          <div className="text-text-secondary text-sm">Signed in as {user?.email}</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <form onSubmit={onFilterSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
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
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {STATUS_OPTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            placeholder="Search title/description"
            className="px-3 py-2 rounded bg-dark-bg-card border border-border text-text-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="px-4 py-2 rounded bg-primary-purple text-white hover:bg-secondary-purple">
            Apply
          </button>
        </form>

        {error && (
          <div className="rounded bg-red-900/20 border border-red-800 text-red-300 px-3 py-2 mb-4">
            {error}
          </div>
        )}

        {/* Quick create */}
        <form onSubmit={onCreate} className="bg-dark-bg-card border border-border rounded p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
              Create Complaint
            </button>
          </div>
        </form>

        {/* List */}
        {busy ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-purple" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-text-secondary">No complaints found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((c) => {
              const created = c.created_at ? new Date(c.created_at).toLocaleString() : "";
              return (
                <div key={c.id} className="bg-dark-bg-card border border-border rounded p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-text-primary font-semibold">
                        {c.title} <span className="text-text-secondary">({c.ticket_number || c.id})</span>
                      </div>
                      <div className="text-text-secondary text-sm mt-1">{c.description || "—"}</div>
                      <div className="text-text-secondary text-xs mt-1">
                        Customer:{" "}
                        <Link to={`/customers/${c.customer_id}`} className="text-primary-purple">
                          {c.customer_id}
                        </Link>
                      </div>
                      {created && <div className="text-text-secondary text-xs mt-1">Created: {created}</div>}
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded border border-border ${
                        c.status === "new"
                          ? "bg-slate-800 text-slate-200"
                          : c.status === "acknowledged"
                          ? "bg-amber-900/30 text-amber-300"
                          : c.status === "in_progress"
                          ? "bg-blue-900/30 text-blue-300"
                          : c.status === "resolved"
                          ? "bg-emerald-900/30 text-emerald-300"
                          : "bg-zinc-800 text-zinc-200"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  {/* Status changer */}
                  <div className="mt-3 flex items-center gap-2">
                    <label className="text-xs text-text-secondary">Change status:</label>
                    <select
                      className="px-2 py-1 text-xs rounded bg-dark-bg border border-border text-text-primary"
                      value={c.status}
                      onChange={(e) => onChangeStatus(c.id, e.target.value as Complaint["status"])}
                    >
                      {STATUS_OPTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <Link
                      to={`/complaints/${c.id}`}
                      className="ml-auto text-xs text-primary-purple hover:text-secondary-purple"
                    >
                      Open
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={prevPage}
            disabled={page <= 1}
            className="px-3 py-2 rounded border border-border text-text-primary disabled:opacity-40"
          >
            Prev
          </button>
          <div className="text-text-secondary text-sm">Page {page}</div>
          <button
            onClick={nextPage}
            disabled={!hasMore}
            className="px-3 py-2 rounded border border-border text-text-primary disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </main>
    </div>
  );
}
