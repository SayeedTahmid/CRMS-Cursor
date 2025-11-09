import api from "./api";

export type MetricsSummary = {
  total_customers: number;
  active_customers: number;
  open_complaints: number;
  recent_logs_7d: number;
  performance_month: number;
};

export async function getMetricsSummary(): Promise<MetricsSummary> {
  const res = await api.get("/metrics/summary");
  return res.data as MetricsSummary;
}
