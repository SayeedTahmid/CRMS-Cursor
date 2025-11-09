import { useEffect, useState } from "react";
import { getMetricsSummary, MetricsSummary } from "@/services/metrics";

export default function useMetrics() {
  const [data, setData] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getMetricsSummary();
      setData(d);
    } catch (e: any) {
      setError(e?.message || "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return { data, loading, error, reload: load };
}
