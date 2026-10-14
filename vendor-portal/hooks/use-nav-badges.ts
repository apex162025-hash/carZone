"use client";

import { useQuery } from "@tanstack/react-query";

import { useBranchScope } from "@/hooks/use-branch-scope";
import { fetchLive } from "@/lib/services/operations.service";
import { fetchReviews } from "@/lib/services/insights.service";
import { fetchShifts } from "@/lib/services/team.service";
import type { NavBadgeKey } from "@/lib/vendor-nav";

/**
 * Live sidebar counters. The live board is shared with the Live screen's cache
 * (same key), so badges cost one extra request each for shifts and reviews.
 */
export function useNavBadges(): Record<NavBadgeKey, number> {
  const { branchId } = useBranchScope();
  const live = useQuery({ queryKey: ["orders", "live", branchId], queryFn: () => fetchLive(branchId), refetchInterval: 15_000 });
  const shifts = useQuery({
    queryKey: ["shifts", "badge", branchId],
    queryFn: () => fetchShifts({ branchId, filter: "submitted", per_page: 1 }),
    refetchInterval: 60_000,
  });
  const reviews = useQuery({
    queryKey: ["reviews", "badge", branchId],
    queryFn: () => fetchReviews({ branchId, replied: "no", per_page: 1 }),
    refetchInterval: 60_000,
  });

  return {
    pendingBookings: live.data?.columns.upcoming.filter((o) => o.status === "pending").length ?? 0,
    paymentPending: live.data?.columns.payment_pending.length ?? 0,
    shiftsToReview: shifts.data?.meta.counts.submitted ?? 0,
    unrepliedReviews: reviews.data?.meta.unreplied ?? 0,
  };
}
