"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { CACHE_TTL_LIVE } from "@/lib/cache/ttl";
import { queryKeys } from "@/lib/query-keys";
import { fetchDashboard } from "@/lib/services/dashboard.service";
import type { DashboardPeriod } from "@/types/dashboard";

export function useDashboard(period: DashboardPeriod) {
  return useQuery({
    queryKey: queryKeys.dashboard(period),
    queryFn: () => fetchDashboard(period),
    placeholderData: keepPreviousData,
    staleTime: CACHE_TTL_LIVE * 1000,
    // KPIs should feel live while the tab is open.
    refetchInterval: 60_000,
  });
}
