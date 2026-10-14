import { apiClient } from "@/lib/axios";
import { throwApiError } from "@/lib/api/api-error-handler";
import { getData, send } from "@/lib/api/request";
import type { ApiEnvelope } from "@carzen/contracts/common";
import type { Branch, WashService } from "@carzen/contracts/washes";
import type {
  ServicePayload,
  UpdateBookingRulesPayload,
  UpdateBranchPayload,
  UpdateVendorSettingsPayload,
  VendorBranch,
  VendorOffer,
  VendorOfferPayload,
  VendorService,
  VendorSettings,
} from "@carzen/contracts/vendor/catalog";

export type ServicesResult = { items: VendorService[]; canEdit: boolean };

export async function fetchServices(branchId: string): Promise<ServicesResult> {
  try {
    const { data } = await apiClient.get<ApiEnvelope<VendorService[], { canEdit: boolean }>>("/vendor/services", { params: { branchId } });
    return { items: data.data, canEdit: Boolean(data.meta?.canEdit) };
  } catch (error) {
    throwApiError(error, "تعذر تحميل الخدمات");
  }
}

export function createService(payload: ServicePayload) {
  return send<WashService>("post", "/vendor/services", payload);
}

export function updateService(id: string, payload: ServicePayload & { reason?: string }) {
  return send<WashService>("patch", `/vendor/services/${id}`, payload);
}

export type OffersResult = { items: VendorOffer[]; counts: Record<string, number> };

export async function fetchOffers(branchId: string, status: string): Promise<OffersResult> {
  try {
    const { data } = await apiClient.get<ApiEnvelope<VendorOffer[], { counts: Record<string, number> }>>("/vendor/offers", {
      params: { branchId, ...(status !== "all" ? { status } : {}) },
    });
    return { items: data.data, counts: data.meta?.counts ?? {} };
  } catch (error) {
    throwApiError(error, "تعذر تحميل العروض");
  }
}

export function createOffer(payload: VendorOfferPayload) {
  return send<VendorOffer>("post", "/vendor/offers", payload);
}

export function updateOffer(id: string, payload: VendorOfferPayload) {
  return send<VendorOffer>("patch", `/vendor/offers/${id}`, payload);
}

export function setOfferEnabled(id: string, enabled: boolean) {
  return send<VendorOffer>("post", `/vendor/offers/${id}/status`, { enabled });
}

export function fetchBranches() {
  return getData<VendorBranch[]>("/vendor/branches", undefined, "تعذر تحميل الفروع");
}

export function updateBranch(id: string, payload: UpdateBranchPayload) {
  return send<Branch>("patch", `/vendor/branches/${id}`, payload);
}

export function updateBookingRules(id: string, payload: UpdateBookingRulesPayload) {
  return send<Branch>("put", `/vendor/branches/${id}/settings`, payload);
}

export function fetchSettings() {
  return getData<VendorSettings>("/vendor/settings", undefined, "تعذر تحميل الإعدادات");
}

export function updateSettings(payload: UpdateVendorSettingsPayload) {
  return send<null>("put", "/vendor/settings", payload);
}
