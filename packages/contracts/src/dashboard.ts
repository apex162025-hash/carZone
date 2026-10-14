import type { Localized } from "./common";

export type DashboardPeriod = "today" | "7d" | "30d";

export type KpiKey =
  | "customers"
  | "activeCustomers"
  | "totalWashes"
  | "activeWashes"
  | "pendingApplications"
  | "totalBranches"
  | "bookingsToday"
  | "completedToday"
  | "cancelledToday"
  | "gmvToday"
  | "platformRevenueToday";

export interface DashboardKpi {
  key: KpiKey;
  value: number;
  /** Percentage change vs the previous day (null when not meaningful). */
  delta: number | null;
  spark: number[];
}

export interface FunnelStep {
  key: "created" | "confirmed" | "waiting" | "in_service" | "completed";
  value: number;
}

export interface DashboardFunnel {
  steps: FunnelStep[];
  cancelled: number;
  noShow: number;
}

export type AlertSeverity = "info" | "warning" | "danger";

export type AlertType =
  | "applications"
  | "complaint_spike"
  | "discrepancy"
  | "cancellation_rate"
  | "shift_difference"
  | "reported_review";

export interface DashboardAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  href: string;
  count: number;
}

export interface RevenuePoint {
  label: string;
  gmv: number;
  commission: number;
}

export interface TopWash {
  id: string;
  name: Localized;
  area: string;
  rating: number;
  completed: number;
  gmv: number;
}

export interface AttentionWash {
  id: string;
  name: Localized;
  issue: "complaints" | "rating" | "cancellations";
  value: number;
}

export interface DashboardSummary {
  period: DashboardPeriod;
  generatedAt: string;
  kpis: DashboardKpi[];
  funnel: DashboardFunnel;
  revenue: RevenuePoint[];
  revenueTotals: { gmv: number; commission: number };
  alerts: DashboardAlert[];
  topWashes: TopWash[];
  needsAttention: AttentionWash[];
  health: {
    activeUsers: number;
    activeWashes: number;
    activeBranches: number;
    bookingsToday: number;
  };
}
