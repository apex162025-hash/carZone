import type { ComponentType } from "react";
import {
  Ban,
  Banknote,
  CalendarCheck2,
  CircleCheckBig,
  FilePlus2,
  Landmark,
  MapPinned,
  Store,
  StoreIcon,
  UserCheck,
  Users,
} from "lucide-react";

import { formatMoney, formatNumber } from "@/lib/format";
import type { KpiKey } from "@/types/dashboard";

export type KpiConfig = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
  format: (v: number) => string;
  /** A rise is bad (cancellations). */
  invert?: boolean;
  color?: string;
};

export const KPI_CONFIG: Record<KpiKey, KpiConfig> = {
  gmvToday: { label: "إجمالي المبيعات اليوم (GMV)", icon: Banknote, href: "/finance", format: (v) => formatMoney(v), color: "var(--chart-1)" },
  platformRevenueToday: { label: "إيراد المنصة اليوم", icon: Landmark, href: "/finance", format: (v) => formatMoney(v), color: "var(--chart-2)" },
  bookingsToday: { label: "حجوزات اليوم", icon: CalendarCheck2, href: "/orders", format: (v) => formatNumber(v), color: "var(--chart-1)" },
  completedToday: { label: "مكتملة اليوم", icon: CircleCheckBig, href: "/orders?status=completed", format: (v) => formatNumber(v), color: "var(--success)" },
  cancelledToday: { label: "ملغاة اليوم", icon: Ban, href: "/orders?status=cancelled", format: (v) => formatNumber(v), invert: true, color: "var(--destructive)" },
  pendingApplications: { label: "طلبات انضمام معلّقة", icon: FilePlus2, href: "/applications", format: (v) => formatNumber(v), color: "var(--warning)" },
  customers: { label: "إجمالي العملاء", icon: Users, href: "/customers", format: (v) => formatNumber(v) },
  activeCustomers: { label: "العملاء النشطون", icon: UserCheck, href: "/customers?filter=active", format: (v) => formatNumber(v) },
  totalWashes: { label: "إجمالي المغاسل", icon: StoreIcon, href: "/washes", format: (v) => formatNumber(v) },
  activeWashes: { label: "المغاسل النشطة", icon: Store, href: "/washes?status=active", format: (v) => formatNumber(v) },
  totalBranches: { label: "إجمالي الفروع", icon: MapPinned, href: "/branches", format: (v) => formatNumber(v) },
};

/** Headline row (large) then the secondary grid. */
export const HEADLINE_KPIS: KpiKey[] = ["gmvToday", "platformRevenueToday", "bookingsToday", "completedToday"];
export const SECONDARY_KPIS: KpiKey[] = [
  "pendingApplications",
  "cancelledToday",
  "customers",
  "activeCustomers",
  "activeWashes",
  "totalWashes",
  "totalBranches",
];
