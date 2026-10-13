import { getPaginated, send } from "@/lib/api/request";
import type { Offer, OfferListItem, OfferListMeta, OfferListParams, OfferPayload } from "@/types/offers";

export function fetchOffers(params: OfferListParams) {
  return getPaginated<OfferListItem, OfferListMeta>("/admin/offers", params, "تعذر تحميل العروض");
}

export function createOffer(payload: OfferPayload) {
  return send<Offer>("post", "/admin/offers", payload);
}

export function updateOffer(id: string, payload: OfferPayload) {
  return send<Offer>("patch", `/admin/offers/${id}`, payload);
}

export function setOfferEnabled(id: string, enabled: boolean, reason?: string) {
  return send<Offer>("post", `/admin/offers/${id}/status`, { enabled, reason });
}
