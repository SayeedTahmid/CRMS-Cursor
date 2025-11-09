import { useEffect, useMemo, useRef, useState } from "react";
import { customerService, ListCustomersParams, ListCustomersResponse } from "@/services/customers";

/**
 * Tiny debounce helper (kept local to the hook so no extra deps)
 */
function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export interface UseCustomersOptions extends ListCustomersParams {
  /**
   * Optional debounce for `search` param (ms). Default: 300ms
   * Set 0 to disable.
   */
  debounceMs?: number;
  /**
   * Auto-load on mount (default true)
   */
  auto?: boolean;
}

/**
 * useCustomers — vanilla React data hook (no SWR/React Query)
 * - Returns { customers, page, limit, returned, loading, error, reload, setParams }
 * - Accepts PRD params: page, limit, status, type, ownerId, search, from, to, orderBy, orderDir
 */
export function useCustomers(initial: UseCustomersOptions = {}) {
  const {
    debounceMs = 300,
    auto = true,
    ...initialParams
  } = initial;

  const [params, setParams] = useState<ListCustomersParams>({
    page: initialParams.page ?? 1,
    limit: initialParams.limit ?? initialParams.pageSize ?? 20,
    status: initialParams.status,
    type: initialParams.type,
    ownerId: initialParams.ownerId,
    from: initialParams.from,
    to: initialParams.to,
    search: initialParams.search ?? "",
    orderBy: initialParams.orderBy ?? "created_at",
    orderDir: initialParams.orderDir ?? "desc",
  });

  // Debounce search only
  const debouncedSearch = useDebouncedValue(params.search ?? "", debounceMs);
  const effectiveParams: ListCustomersParams = useMemo(
    () => ({ ...params, search: debouncedSearch }),
    [params, debouncedSearch]
  );

  const [data, setData] = useState<ListCustomersResponse>({
    customers: [],
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    returned: 0,
  });
  const [loading, setLoading] = useState<boolean>(auto);
  const [error, setError] = useState<string | null>(null);

  // Track latest request to avoid race conditions
  const reqSeq = useRef(0);

  const load = async (override?: Partial<ListCustomersParams>) => {
    setLoading(true);
    setError(null);
    const seq = ++reqSeq.current;
    try {
      const merged: ListCustomersParams = { ...effectiveParams, ...(override ?? {}) };
      const result = await customerService.list(merged);
      // Only apply the latest request
      if (seq === reqSeq.current) {
        setData(result);
      }
    } catch (e: any) {
      if (seq === reqSeq.current) {
        setError(e?.message || "Failed to load customers");
      }
    } finally {
      if (seq === reqSeq.current) {
        setLoading(false);
      }
    }
  };

  // Auto-load on mount & whenever effective (debounced) params change
  useEffect(() => {
    if (!auto) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveParams.page, effectiveParams.limit, effectiveParams.status, effectiveParams.type,
      effectiveParams.ownerId, effectiveParams.from, effectiveParams.to,
      effectiveParams.search, effectiveParams.orderBy, effectiveParams.orderDir, auto]);

  // Public API
  const reload = () => load();
  return {
    ...data,          // { customers, page, limit, returned }
    loading,
    error,
    params,           // current raw params (not debounced)
    setParams,        // setParams((prev) => ({...prev, page: 2}))
    reload,           // reload with current params
    load,             // load with override params (one-off)
  };
}

export default useCustomers;
