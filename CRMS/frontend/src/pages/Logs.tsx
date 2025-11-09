// frontend/src/pages/Logs.tsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { listLogs } from "../services/logs";
import { useAuth } from "../contexts/AuthContext";

type LogItem = {
  id: string;
  type?: string;
  title?: string;
  subject?: string;
  description?: string;
  customer_id?: string;
  created_at?: string;
  log_date?: string;
  tags?: string[];
};

export default function LogsPage() {
  const { loading: authLoading, authenticated } = useAuth();

  const [sp, setSp] = useSearchParams();
  const [rows, setRows] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // filters from query string (so dashboard links work)
  const customerId = sp.get("customerId") || "";
  const type = sp.get("type") || "";
  const range = sp.get("range") || ""; // "7d" | "month" (from dashboard links)
  const page = Number(sp.get("page") || 1);
  const limit = 20;

  const dateFilter = useMemo(() => {
    const now = new Date();
    if (range === "7d") {
      const from = new Date(now); from.setDate(now.getDate() - 7);
      return { from: from.toISOString() };
    }
    if (range === "month") {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: from.toISOString() };
    }
    return {};
  }, [range]);

  useEffect(() => {
    if (authLoading || !authenticated) return;
    let alive = true;
    setLoading(true);
    setErr("");
    listLogs({
      page,
      limit,
      type: type || undefined,
      customer_id: customerId || undefined,
      ...dateFilter,
    })
      .then((res) => {
        if (!alive) return;
        setRows(res.logs || []);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e?.message || "Failed to load logs");
        setRows([]);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [authLoading, authenticated, page, type, customerId, dateFilter]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-purple" />
      </div>
    );
  }
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center text-text-secondary">
        Please sign in to view logs.
      </div>
    );
  }

  const onApply = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(sp);
    page !== 1 && next.set("page", "1");
    setSp(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="bg-dark-bg-secondary border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">Logs</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <form onSubmit={onApply} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <input
            placeholder="Customer ID"
            className="px-3 py-2 rounded bg-dark-bg-card border border-border text-text-primary"
            defaultValue={customerId}
            onChange={(e) => {
              const next = new URLSearchParams(sp);
              if (e.target.value) next.set("customerId", e.target.value);
              else next.delete("customerId");
              setSp(next, { replace: true });
            }}
          />
          <input
            placeholder="Type (call/email/meeting/…)"
            className="px-3 py-2 rounded bg-dark-bg-card border border-border text-text-primary"
            defaultValue={type}
            onChange={(e) => {
              const next = new URLSearchParams(sp);
              if (e.target.value) next.set("type", e.target.value);
              else next.delete("type");
              setSp(next, { replace: true });
            }}
          />
          <select
            className="px-3 py-2 rounded bg-dark-bg-card border border-border text-text-primary"
            value={range}
            onChange={(e) => {
              const next = new URLSearchParams(sp);
              if (e.target.value) next.set("range", e.target.value);
              else next.delete("range");
              setSp(next, { replace: true });
            }}
          >
            <option value="">Any time</option>
            <option value="7d">Last 7 days</option>
            <option value="month">This month</option>
          </select>
          <button className="px-4 py-2 rounded bg-primary-purple text-white hover:bg-secondary-purple">
            Apply
          </button>
        </form>

        {err && (
          <div className="rounded bg-red-900/20 border border-red-800 text-red-300 px-3 py-2 mb-4">
            {err}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-purple" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-text-secondary">No logs found.</div>
        ) : (
          <div className="space-y-3">
            {rows.map((l) => {
              const ts =
                (l.created_at && new Date(l.created_at).toLocaleString()) ||
                (l.log_date && new Date(l.log_date).toLocaleString()) ||
                "";
              return (
                <div key={l.id} className="bg-dark-bg-card border border-border rounded p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-text-primary font-semibold">
                        {l.title || l.subject || "(no title)"}{" "}
                        <span className="text-xs text-text-secondary">[{l.type || "—"}]</span>
                      </div>
                      <div className="text-text-secondary text-sm mt-1">
                        {l.description || "—"}
                      </div>
                      <div className="text-text-secondary text-xs mt-1">
                        Customer: <span className="text-primary-purple">{l.customer_id || "—"}</span>
                      </div>
                      {ts && <div className="text-text-secondary text-xs mt-1">Created: {ts}</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
