import { useEffect, useState } from "react";
import { listLogs, ListLogsParams } from "@/services/logs";

export default function useLogs(initial: ListLogsParams = {}) {
  const [params, setParams] = useState<ListLogsParams>({ page: 1, limit: 20, ...initial });
  const [data, setData] = useState<{ logs: any[]; page: number; limit?: number; pageSize?: number; returned?: number; total?: number }>({
    logs: [],
    page: 1,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (override?: Partial<ListLogsParams>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listLogs({ ...params, ...(override ?? {}) });
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [params.page, params.limit, params.type, params.customer_id]);

  return { ...data, loading, error, params, setParams, reload: () => load() };
}
