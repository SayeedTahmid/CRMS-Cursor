"use client";

import React, { useEffect, useState } from "react";
import { customerService } from "@/services/customers";
import useCustomerLogs from "@/hooks/useCustomerLogs";
import useCustomerComplaints from "@/hooks/useCustomerComplaints";

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customerId = params.id;
  const [customer, setCustomer] = useState<any>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [tab, setTab] = useState<"logs" | "complaints">("logs");

  const logs = useCustomerLogs(customerId, { page: 1, limit: 10 });
  const complaints = useCustomerComplaints(customerId, { page: 1, limit: 10 });

  useEffect(() => {
    setLoadingCustomer(true);
    customerService
      .getById(customerId)
      .then(setCustomer)
      .finally(() => setLoadingCustomer(false));
  }, [customerId]);

  return (
    <div className="p-6 space-y-4">
      <a className="text-blue-600 underline" href="/customers">← Back to customers</a>
      <h1 className="text-2xl font-semibold">Customer detail</h1>

      {loadingCustomer && <div>Loading customer…</div>}
      {!loadingCustomer && !customer && <div className="text-red-600">Customer not found</div>}

      {customer && (
        <div className="border rounded p-4">
          <div className="font-medium text-lg">{customer.name}</div>
          <div className="text-gray-700">{customer.email || "-"}</div>
          <div className="text-gray-700">{customer.phone || "-"}</div>
          <div className="text-gray-700">Status: {customer.status || "-"}</div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          className={`border rounded px-3 py-2 ${tab === "logs" ? "bg-gray-100" : ""}`}
          onClick={() => setTab("logs")}
        >
          Logs
        </button>
        <button
          className={`border rounded px-3 py-2 ${tab === "complaints" ? "bg-gray-100" : ""}`}
          onClick={() => setTab("complaints")}
        >
          Complaints
        </button>
      </div>

      {tab === "logs" && (
        <section className="space-y-3">
          {logs.loading && <div>Loading logs…</div>}
          {logs.error && <div className="text-red-600">Error: {logs.error}</div>}
          {!logs.loading && !logs.error && (
            <>
              <div className="text-sm text-gray-600">
                Showing {logs.returned} — page {logs.page} (limit {logs.limit})
              </div>
              <ul className="space-y-2">
                {logs.logs.map((l: any) => (
                  <li key={l.id} className="border rounded p-3">
                    <div className="font-medium">{l.type || "log"}</div>
                    <div>{l.title || l.subject || l.description || "-"}</div>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <button
                  className="border rounded px-3 py-2"
                  onClick={() => logs.setParams((p) => ({ ...p, page: Math.max(1, (p.page ?? 1) - 1) }))}
                >
                  Prev
                </button>
                <button
                  className="border rounded px-3 py-2"
                  onClick={() => logs.setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {tab === "complaints" && (
        <section className="space-y-3">
          {complaints.loading && <div>Loading complaints…</div>}
          {complaints.error && <div className="text-red-600">Error: {complaints.error}</div>}
          {!complaints.loading && !complaints.error && (
            <>
              <div className="text-sm text-gray-600">
                Showing {complaints.returned} — page {complaints.page} (limit {complaints.limit})
              </div>
              <ul className="space-y-2">
                {complaints.complaints.map((c: any) => (
                  <li key={c.id} className="border rounded p-3">
                    <div className="font-medium">{c.status || "complaint"}</div>
                    <div>{c.title || c.summary || "-"}</div>
                    <div className="text-gray-700">Severity: {c.severity || "-"}</div>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <button
                  className="border rounded px-3 py-2"
                  onClick={() => complaints.setParams((p) => ({ ...p, page: Math.max(1, (p.page ?? 1) - 1) }))}
                >
                  Prev
                </button>
                <button
                  className="border rounded px-3 py-2"
                  onClick={() => complaints.setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
