import type { ApplicationListParams } from "@/types/applications";
import type { AuditListParams } from "@/types/audit";
import type { ComplaintListParams } from "@/types/complaints";
import type { CustomerListParams } from "@/types/customers";
import type { DashboardPeriod } from "@/types/dashboard";
import type { FinancePeriod, TransactionListParams } from "@/types/finance";
import type { ListParams } from "@/types/common";
import type { OfferListParams } from "@/types/offers";
import type { OrderListParams } from "@/types/orders";
import type { ReviewListParams } from "@/types/reviews";
import type { BranchListParams, StaffListParams, WashListParams } from "@/types/washes";

/**
 * Centralized TanStack Query keys. Every domain has a `*Root` key so mutations
 * can invalidate all of its list/detail variants at once.
 */
export const queryKeys = {
  me: ["auth", "me"] as const,

  dashboardRoot: ["dashboard"] as const,
  dashboard: (period: DashboardPeriod) => ["dashboard", period] as const,

  washesRoot: ["washes"] as const,
  washes: (params: WashListParams) => ["washes", "list", params] as const,
  wash: (id: string) => ["washes", "detail", id] as const,
  washImpact: (id: string) => ["washes", "impact", id] as const,

  branchesRoot: ["branches"] as const,
  branches: (params: BranchListParams) => ["branches", params] as const,

  staffRoot: ["staff"] as const,
  staff: (params: StaffListParams) => ["staff", params] as const,

  applicationsRoot: ["applications"] as const,
  applications: (params: ApplicationListParams) => ["applications", "list", params] as const,
  application: (id: string) => ["applications", "detail", id] as const,

  ordersRoot: ["orders"] as const,
  orders: (params: OrderListParams) => ["orders", "list", params] as const,
  order: (id: string) => ["orders", "detail", id] as const,

  customersRoot: ["customers"] as const,
  customers: (params: CustomerListParams) => ["customers", "list", params] as const,
  customer: (id: string) => ["customers", "detail", id] as const,

  complaintsRoot: ["complaints"] as const,
  complaints: (params: ComplaintListParams) => ["complaints", "list", params] as const,
  complaint: (id: string) => ["complaints", "detail", id] as const,

  reviewsRoot: ["reviews"] as const,
  reviews: (params: ReviewListParams) => ["reviews", params] as const,

  offersRoot: ["offers"] as const,
  offers: (params: OfferListParams) => ["offers", params] as const,

  financeRoot: ["finance"] as const,
  financeOverview: (period: FinancePeriod) => ["finance", "overview", period] as const,
  transactions: (params: TransactionListParams) => ["finance", "transactions", params] as const,
  transaction: (id: string) => ["finance", "transaction", id] as const,
  commission: ["finance", "commission"] as const,
  payouts: (params: ListParams & { status?: string }) => ["finance", "payouts", params] as const,

  admins: ["admins"] as const,
  roles: ["roles"] as const,
  settings: ["settings"] as const,

  auditRoot: ["audit"] as const,
  audit: (params: AuditListParams) => ["audit", params] as const,

  notificationsRoot: ["notifications"] as const,
  notifications: (filter: string) => ["notifications", filter] as const,

  search: (q: string) => ["search", q] as const,
};
