import { getPaginated, send } from "@/lib/api/request";
import type { Review, ReviewListItem, ReviewListMeta, ReviewListParams, ToggleReviewPayload } from "@/types/reviews";

export function fetchReviews(params: ReviewListParams) {
  return getPaginated<ReviewListItem, ReviewListMeta>("/admin/reviews", params, "تعذر تحميل التقييمات");
}

export function toggleReviewVisibility(id: string, payload: ToggleReviewPayload) {
  return send<Review>("post", `/admin/reviews/${id}/visibility`, payload);
}
