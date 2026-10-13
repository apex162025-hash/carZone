"use client";

import { useQuery } from "@tanstack/react-query";

import { CACHE_TTL_LIVE } from "@/lib/cache/ttl";
import { fetchApplications } from "@/lib/services/applications.service";
import { fetchComplaints } from "@/lib/services/complaints.service";
import type { NavBadgeKey } from "@/lib/admin-nav";

/**
 * Live sidebar counters. Reuses the list endpoints with per_page=1 so only
 * the `meta.counts` payload matters — cheap and always consistent with lists.
 */
export function useNavBadges(): Record<NavBadgeKey, number> {
  const apps = useQuery({
    queryKey: ["applications", "badge"],
    queryFn: () => fetchApplications({ per_page: 1 }),
    staleTime: CACHE_TTL_LIVE * 1000,
    refetchInterval: 60_000,
  });
  const complaints = useQuery({
    queryKey: ["complaints", "badge"],
    queryFn: () => fetchComplaints({ per_page: 1 }),
    staleTime: CACHE_TTL_LIVE * 1000,
    refetchInterval: 60_000,
  });

  return {
    applications: apps.data?.meta.counts.pending ?? 0,
    complaints: complaints.data?.meta.counts.open ?? 0,
  };
}
