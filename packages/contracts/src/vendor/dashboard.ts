import type { Localized } from "../common";
import type { OrderSource, OrderStatus } from "../orders";

export type VendorPeriod = "today" | "7d" | "30d";

export type VendorKpiKey =
  | "totalOrders"
  | "confirmedBookings"
  | "walkIns"
  | "completed"
  | "cancelled"
  | "noShows"
  | "revenue"
  | "pendingPayments";

export interface VendorKpi {
  key: VendorKpiKey;
  value: number;
  /** % change vs the previous equivalent period. */
  delta: number | null;
  spark: number[];
}

export interface StaffRef {
  id: string;
  name: string;
}

/** "Live branches" card (spec OW-05). */
export interface LiveBranchCard {
  id: string;
  name: Localized;
  area: string;
  isOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
  activeOrders: number;
  waiting: number;
  inService: number;
  paymentPending: number;
  baysBusy: number;
  capacity: number;
  staffOnShift: StaffRef[];
  revenueToday: number;
}

/** "Cars currently inside" row (spec OW-06). */
export interface CarInside {
  orderId: string;
  number: string;
  plate: string;
  status: OrderStatus;
  paymentPending: boolean;
  serviceName: Localized;
  branchName: Localized;
  staffName: string | null;
  since: string;
  /** Minutes in the current state beyond the expected duration. */
  overdueMin: number;
}

export type VendorAlertType =
  | "cash_difference"
  | "payment_pending"
  | "high_cancellation"
  | "no_shift"
  | "no_show"
  | "suspended"
  | "review"
  | "platform";

export interface VendorAlert {
  id: string;
  type: VendorAlertType;
  severity: "info" | "warning" | "danger";
  title: string;
  description: string;
  href: string;
}

export interface SetupStep {
  key: "branch" | "services" | "hours" | "staff" | "live";
  label: string;
  done: boolean;
  href: string;
}

/** Guided setup for newly approved washes (spec OW-03). */
export interface SetupChecklist {
  steps: SetupStep[];
  done: number;
  total: number;
}

export interface VendorDashboard {
  period: VendorPeriod;
  branchId: string;
  generatedAt: string;
  kpis: VendorKpi[];
  liveBranches: LiveBranchCard[];
  carsInside: CarInside[];
  alerts: VendorAlert[];
  charts: {
    revenueByHour: { label: string; value: number }[];
    bySource: { source: OrderSource; value: number }[];
    topServices: { name: Localized; count: number; revenue: number }[];
    byStatus: { status: OrderStatus; value: number }[];
  };
  dailySummary: {
    orders: number;
    revenue: number;
    topService: Localized | null;
    issues: number;
  };
  setup: SetupChecklist | null;
}
