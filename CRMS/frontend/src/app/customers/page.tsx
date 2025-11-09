"use client";

import React from "react";
import useCustomers from "@/hooks/useCustomers";

export default function CustomersPage() {
  const { customers, page, limit, returned, loading, error, params, setParams, reload } =
    useCustomers({ page: 1, limit: 20, search: "", orderBy: "created_at", orderDir: "desc" });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Customers</h1>

      <div className="flex items-center gap-3">
        <input
          className="border rounded px-3 py-2 w-80"
          placeholder="Search name/email/phone/company"
          value={params.search ?? ""}
          onChange={(e) => setParams((p) => ({ ...p, page: 1, search: e.target.value }))}
        />
        <select
          className="border rounded px-3 py-2"
          value={params.status ?? ""}
          onChange={(e) => setParams((p) => ({ ...p, page: 1, status: e.target.value || undefined }))}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="prospect">Prospect</option>
          <option value="inactive">Inactive</option>
        </select>
        <button className="border rounded px-3 py-2" onClick={reload}>Reload</button>
      </div>

      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">Error: {error}</div>}

      {!loading && !error && (
        <>
          <div className="text-sm text-gray-600">Showing {returned} items — page {page} (limit {limit})</div>
          <table className="w-full border border-gray-200 rounded">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-2 border-b">Name</th>
                <th className="text-left p-2 border-b">Email</th>
                <th className="text-left p-2 border-b">Phone</th>
                <th className="text-left p-2 border-b">Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="p-2">
                    <a className="text-blue-600 underline" href={`/customers/${c.id}`}>{c.name || "(no name)"}</a>
                  </td>
                  <td className="p-2">{c.email || "-"}</td>
                  <td className="p-2">{c.phone || "-"}</td>
                  <td className="p-2">{c.status || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center gap-2 pt-3">
            <button
              className="border rounded px-3 py-2"
              onClick={() => setParams((p) => ({ ...p, page: Math.max(1, (p.page ?? 1) - 1) }))}
            >
              Prev
            </button>
            <button
              className="border rounded px-3 py-2"
              onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
