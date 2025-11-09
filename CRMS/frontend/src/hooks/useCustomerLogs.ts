import { useEffect, useMemo, useRef, useState } from "react";
import { customerService } from "@/services/customers";

export interface UseCustomerLogsParams {
  page?: number;
  limit?: number;      // or pageSize
  pageSize?: number;   // alias
}

export function useCustomerLogs(customerId: string, initial: UseCustomerLogsParams = {}) {
  const [params, setParams] = useState<UseCustomerLogsParams>({
    page: initial.page ?? 1,
    limit: initial.limit ?? initial.pageSize ?? 20,
  });

  const effectiveParams = useMemo(
    () => ({ page: params.page ?? 1, limit: params.limit ?? params.pageSize ?? 20 }),
    [params.page, params.limit, params.pageSize]
  );

  const [data, setData] = useState<{ logs: any[]; page: number; limit: number; returned: number }>({
    logs: [],
    page: effectiveParams.page,
    limit: effectiveParams.limit,
    returned: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const reqSeq = useRef(0);

  const load = async (override?: Partial<UseCustomerLogsParams>) => {
    setLoading(true);
    setError(null);
    const seq = ++reqSeq.current;
    try {
      const merged = { ...effectiveParams, ...(override ?? {}) };
      const res = await customerService.getLogs(customerId, merged);
      if (seq === reqSeq.current) {
        setData(res);
      }
    } catch (e: any) {
      if (seq === reqSeq.current) {
        setError(e?.message || "Failed to load logs");
      }
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!customerId) {
      setError("customerId is required");
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, effectiveParams.page, effectiveParams.limit]);

  const reload = () => load();

  return {
    ...data,     // { logs, page, limit, returned }
    loading,
    error,
    params,
    setParams,  // setParams(p => ({...p, page: 2}))
    reload,
    load,
  };
}

export default useCustomerLogs;
