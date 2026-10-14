import type { ListParams } from "@carzen/contracts/common";
import type { VendorPeriod } from "@carzen/contracts/vendor/dashboard";
import type {
  VendorAuditParams,
  VendorCustomerListParams,
  VendorReportParams,
  VendorReviewListParams,
} from "@carzen/contracts/vendor/insights";
import type { VendorOrderListParams } from "@carzen/contracts/vendor/operations";
import type { ShiftListParams, VendorStaffListParams } from "@carzen/contracts/vendor/team";

/**
 * Centralized TanStack Query keys. Every domain has a `*Root` key so a
 * mutation can invalidate all list/detail variants at once. Branch scope is
 * part of every params object, so switching branch never shows stale data.
 */
export const queryKeys = {
  me: ["auth", "me"] as const,

  dashboardRoot: ["dashboard"] as const,
  dashboard: (branchId: string, period: VendorPeriod) => ["dashboard", branchId, period] as const,

  ordersRoot: ["orders"] as const,
  orders: (params: VendorOrderListParams) => ["orders", "list", params] as const,
  order: (id: string) => ["orders", "detail", id] as const,
  live: (branchId: string) => ["orders", "live", branchId] as const,
  pricePreview: (branchId: string, serviceIds: string[]) => ["orders", "price", branchId, serviceIds] as const,
  recognize: (plate: string, phone: string) => ["orders", "recognize", plate, phone] as const,
  availability: (branchId: string, date: string, serviceIds: string[]) => ["orders", "availability", branchId, date, serviceIds] as const,

  scheduleRoot: ["schedule"] as const,
  schedule: (branchId: string, date: string) => ["schedule", branchId, date] as const,

  servicesRoot: ["services"] as const,
  services: (branchId: string) => ["services", branchId] as const,
  offersRoot: ["offers"] as const,
  offers: (branchId: string, status: string) => ["offers", branchId, status] as const,
  branches: ["branches"] as const,
  settings: ["settings"] as const,

  staffRoot: ["staff"] as const,
  staff: (params: VendorStaffListParams) => ["staff", params] as const,
  shiftsRoot: ["shifts"] as const,
  shifts: (params: ShiftListParams) => ["shifts", "list", params] as const,
  shift: (id: string) => ["shifts", "detail", id] as const,
  dayClosing: (branchId: string, date: string) => ["shifts", "day", branchId, date] as const,

  customersRoot: ["customers"] as const,
  customers: (params: VendorCustomerListParams) => ["customers", "list", params] as const,
  customer: (id: string) => ["customers", "detail", id] as const,

  reviewsRoot: ["reviews"] as const,
  reviews: (params: VendorReviewListParams) => ["reviews", params] as const,

  reports: (params: VendorReportParams) => ["reports", params] as const,
  financeRoot: ["finance"] as const,
  finance: (branchId: string, period: VendorPeriod) => ["finance", branchId, period] as const,

  auditRoot: ["audit"] as const,
  audit: (params: VendorAuditParams) => ["audit", params] as const,

  notificationsRoot: ["notifications"] as const,
  notifications: (filter: string, params?: ListParams) => ["notifications", filter, params ?? {}] as const,

  search: (q: string) => ["search", q] as const,
};
