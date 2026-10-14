import type { ComponentType } from "react";
import { Ban, Banknote, CalendarCheck2, CircleCheckBig, ClipboardList, Footprints, HandCoins, UserX } from "lucide-react";

import { formatMoney, formatNumber } from "@carzen/ui/lib/format";
import type { VendorKpiKey } from "@carzen/contracts/vendor/dashboard";

export type KpiConfig = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
  format: (v: number) => string;
  /** A rise is bad (cancellations, no-shows, unpaid). */
  invert?: boolean;
  color: string;
};

/** Spec OW-04 KPI set, in reading order. */
export const KPI_ORDER: VendorKpiKey[] = ["revenue", "totalOrders", "completed", "pendingPayments", "confirmedBookings", "walkIns", "cancelled", "noShows"];

export const KPI_CONFIG: Record<VendorKpiKey, KpiConfig> = {
  revenue: { label: "الإيراد المحصّل", icon: Banknote, href: "/finance", format: (v) => formatMoney(v), color: "var(--chart-1)" },
  totalOrders: { label: "إجمالي الطلبات", icon: ClipboardList, href: "/orders?tab=all", format: (v) => formatNumber(v), color: "var(--chart-1)" },
  completed: { label: "مكتملة", icon: CircleCheckBig, href: "/orders?tab=paid", format: (v) => formatNumber(v), color: "var(--success)" },
  pendingPayments: { label: "بانتظار الدفع", icon: HandCoins, href: "/orders?tab=payment_pending", format: (v) => formatNumber(v), invert: true, color: "var(--warning)" },
  confirmedBookings: { label: "حجوزات مؤكدة", icon: CalendarCheck2, href: "/bookings", format: (v) => formatNumber(v), color: "var(--st-confirmed)" },
  walkIns: { label: "حضور مباشر", icon: Footprints, href: "/orders?source=walk_in&tab=all", format: (v) => formatNumber(v), color: "var(--chart-2)" },
  cancelled: { label: "ملغاة", icon: Ban, href: "/bookings?tab=cancelled", format: (v) => formatNumber(v), invert: true, color: "var(--destructive)" },
  noShows: { label: "لم يحضر", icon: UserX, href: "/bookings?tab=no_show", format: (v) => formatNumber(v), invert: true, color: "var(--muted-foreground)" },
};
