import { getData, getPaginated, send } from "@/lib/api/request";
import type { Review } from "@carzen/contracts/reviews";
import type { VendorPeriod } from "@carzen/contracts/vendor/dashboard";
import type {
  VendorAuditItem,
  VendorAuditMeta,
  VendorAuditParams,
  VendorCustomer,
  VendorCustomerDetails,
  VendorCustomerListParams,
  VendorFinance,
  VendorNotification,
  VendorReport,
  VendorReportParams,
  VendorReview,
  VendorReviewListMeta,
  VendorReviewListParams,
  VendorSearchResult,
} from "@carzen/contracts/vendor/insights";

export function fetchCustomers(params: VendorCustomerListParams) {
  return getPaginated<VendorCustomer, { counts: Record<string, number> }>("/vendor/customers", params, "تعذر تحميل العملاء");
}

export function fetchCustomer(id: string) {
  return getData<VendorCustomerDetails>(`/vendor/customers/${id}`, undefined, "تعذر تحميل ملف العميل");
}

export function fetchReviews(params: VendorReviewListParams) {
  return getPaginated<VendorReview, VendorReviewListMeta>("/vendor/reviews", params, "تعذر تحميل التقييمات");
}

export function replyToReview(id: string, text: string) {
  return send<Review>("post", `/vendor/reviews/${id}/reply`, { text });
}

export function reportReview(id: string, reason: string) {
  return send<Review>("post", `/vendor/reviews/${id}/report`, { reason });
}

export function fetchReport(params: VendorReportParams) {
  return getData<VendorReport>("/vendor/reports", params, "تعذر تحميل التقرير");
}

export function fetchFinance(branchId: string, period: VendorPeriod) {
  return getData<VendorFinance>("/vendor/finance", { branchId, period }, "تعذر تحميل المالية");
}

export function fetchAudit(params: VendorAuditParams) {
  return getPaginated<VendorAuditItem, VendorAuditMeta>("/vendor/audit", params, "تعذر تحميل سجل التدقيق");
}

export function fetchNotifications(filter: string, page = 1) {
  return getPaginated<VendorNotification, { unread: number }>("/vendor/notifications", { filter, page }, "تعذر تحميل الإشعارات");
}

export function markNotificationRead(id: string) {
  return send<VendorNotification>("post", `/vendor/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return send<null>("post", "/vendor/notifications/read-all");
}

export function globalSearch(q: string) {
  return getData<{ query: string; results: VendorSearchResult[] }>("/vendor/search", { q });
}
