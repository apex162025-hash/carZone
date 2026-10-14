import type { AuditLog } from "../audit";
import type { ListParams, Localized } from "../common";
import type { Customer, Vehicle } from "../customers";
import type { Payout } from "../finance";
import type { PaymentMethod } from "../orders";
import type { Review } from "../reviews";
import type { VendorNotificationType } from "./catalog";
import type { VendorPeriod } from "./dashboard";
import type { VendorOrderListItem } from "./operations";

// ── Customers (CRM) ────────────────────────────────────────

export type CustomerSegment = "new" | "returning" | "lost";

export interface VendorCustomer {
  id: string;
  name: string;
  phone: string;
  plates: string[];
  visits: number;
  lastVisitAt: string | null;
  firstVisitAt: string | null;
  totalSpent: number;
  segment: CustomerSegment;
  favoriteService: Localized | null;
}

export interface VendorCustomerListParams extends ListParams {
  branchId: string;
  segment?: CustomerSegment | "all";
}

export interface VendorCustomerDetails {
  customer: Customer;
  vehicles: Vehicle[];
  orders: VendorOrderListItem[];
  favoriteServices: { name: Localized; count: number }[];
  reviews: Review[];
  stats: {
    visits: number;
    totalSpent: number;
    avgTicket: number;
    noShows: number;
    cancellations: number;
    segment: CustomerSegment;
  };
}

// ── Reviews ────────────────────────────────────────────────

export interface VendorReview extends Review {
  customerName: string;
  branchName: Localized;
  serviceName: Localized;
  orderNumber: string | null;
}

export interface VendorReviewListParams extends ListParams {
  branchId: string;
  stars?: number | "all";
  replied?: "all" | "yes" | "no";
}

export type VendorReviewListMeta = {
  average: number;
  count: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
  unreplied: number;
  reported: number;
};

// ── Reports ────────────────────────────────────────────────

export type VendorReportType = "orders" | "revenue" | "services" | "source" | "employees";

export interface VendorReportParams {
  branchId: string;
  type: VendorReportType;
  from: string;
  to: string;
}

export interface VendorReport {
  type: VendorReportType;
  from: string;
  to: string;
  /** Single-series chart data (never dual axis). */
  chart: { label: string; value: number }[];
  chartKind: "bar" | "line" | "donut";
  valueFormat: "number" | "money";
  columns: { key: string; label: string; align?: "start" | "end"; format?: "number" | "money" | "percent" | "text" }[];
  rows: Record<string, string | number>[];
  summary: { label: string; value: number; format: "number" | "money" | "percent" }[];
}

// ── Financials ─────────────────────────────────────────────

export interface VendorFinance {
  period: VendorPeriod;
  revenue: number;
  commissionRate: number;
  commission: number;
  net: number;
  refunds: number;
  discounts: number;
  paidOrders: number;
  pendingPayments: { count: number; amount: number; orders: VendorOrderListItem[] };
  byDay: { label: string; date: string; revenue: number }[];
  byMethod: { method: PaymentMethod; amount: number; count: number }[];
  byBranch: { branchId: string; name: Localized; revenue: number; orders: number }[];
  discountsByStaff: { staffId: string; name: string; count: number; amount: number }[];
  payouts: Payout[];
}

// ── Audit & notifications ──────────────────────────────────

export interface VendorAuditParams extends ListParams {
  branchId: string;
  actorId?: string;
  action?: string;
  from?: string;
  to?: string;
}

export interface VendorAuditItem extends AuditLog {
  actorName: string;
  branchName: Localized | null;
}

export type VendorAuditMeta = {
  actions: string[];
  actors: { id: string; name: string }[];
};

export interface VendorNotification {
  id: string;
  businessId: string;
  branchId: string | null;
  type: VendorNotificationType;
  title: Localized;
  body: Localized;
  href: string;
  read: boolean;
  createdAt: string;
}

// ── Global search ──────────────────────────────────────────

export interface VendorSearchResult {
  id: string;
  group: "orders" | "customers" | "plates";
  title: string;
  subtitle: string;
  href: string;
}
