import type { ListParams, Localized, StatusCounts } from "./common";

export type OfferStatus = "draft" | "scheduled" | "active" | "expired" | "disabled";

export type OfferScope = "platform" | "wash";

export type DiscountType = "percent" | "fixed";

export interface Offer {
  id: string;
  scope: OfferScope;
  businessId: string | null;
  branchIds: string[];
  serviceCategories: string[];
  title: Localized;
  description: Localized;
  discountType: DiscountType;
  discountValue: number;
  startAt: string;
  endAt: string;
  status: OfferStatus;
  featured: boolean;
}

export interface OfferListItem extends Offer {
  businessName: Localized | null;
  branchesCount: number;
  redemptions: number;
}

export type OfferListMeta = {
  counts: StatusCounts<OfferStatus>;
};

export interface OfferListParams extends ListParams {
  status?: OfferStatus | "all";
  scope?: OfferScope | "all";
}

export interface OfferPayload {
  title: Localized;
  description: Localized;
  discountType: DiscountType;
  discountValue: number;
  startAt: string;
  endAt: string;
  branchIds: string[];
  serviceCategories: string[];
  publish: boolean;
}
