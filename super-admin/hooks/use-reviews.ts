"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { queryKeys } from "@/lib/query-keys";
import { fetchReviews, toggleReviewVisibility } from "@/lib/services/reviews.service";
import type { ReviewListParams, ToggleReviewPayload } from "@/types/reviews";

export function useReviews(params: ReviewListParams) {
  return useQuery({
    queryKey: queryKeys.reviews(params),
    queryFn: () => fetchReviews(params),
    placeholderData: keepPreviousData,
  });
}

export function useToggleReview() {
  return useAdminMutation(
    ({ id, ...payload }: ToggleReviewPayload & { id: string }) => toggleReviewVisibility(id, payload),
    { invalidate: [queryKeys.reviewsRoot, queryKeys.washesRoot, queryKeys.branchesRoot] },
  );
}
