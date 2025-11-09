import api from "./api";

export interface ListLogsParams {
  page?: number;
  limit?: number;
  type?: string; // optional filter
  customer_id?: string; // optional filter
}

export async function listLogs(params: ListLogsParams = {}) {
  const res = await api.get("/logs", { params });
  // backend returns { logs, total?, page, pageSize } or {logs,page,limit,returned}
  return res.data;
}
