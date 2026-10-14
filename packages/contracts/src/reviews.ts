import type { ListParams, Localized, StatusCounts } from "./common";

export type ReviewStatus = "visible" | "hidden";

export type HideReviewReason =
  | "abusive_language"
  | "spam"
  | "off_topic"
  | "personal_data";

export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  businessId: string;
  branchId: string;
  serviceId: string;
  stars: number;
  comment: Localized;
  tags: string[];
  reply: string | null;
  replyAt?: string | null;
  /** Why the wash reported it to Carzen moderation. */
  reportReason?: string | null;
  status: ReviewStatus;
  hiddenReason: string | null;
  reportedByWash: boolean;
  createdAt: string;
}

export interface ReviewListItem extends Review {
  customerName: string;
  businessName: Localized;
  branchName: Localized;
  serviceName: Localized;
  orderNumber: string | null;
}

export type ReviewFilter = "all" | "low" | "reported" | "hidden";

export type ReviewListMeta = {
  counts: StatusCounts<Exclude<ReviewFilter, "all">>;
  averageRating: number;
};

export interface ReviewListParams extends ListParams {
  filter?: ReviewFilter;
}

export interface ToggleReviewPayload {
  hidden: boolean;
  reason: string;
  /** Optional extra context when hiding (stored in the audit log). */
  note?: string;
}
