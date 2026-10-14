import type { ComponentType } from "react";
import {
  BadgePercent,
  CalendarClock,
  CalendarDays,
  ChartColumnBig,
  ClipboardList,
  History,
  LayoutDashboard,
  MapPinned,
  Radio,
  Settings,
  Sparkles,
  Star,
  UserRoundCog,
  Users,
  Wallet,
  WalletCards,
} from "lucide-react";

import type { VendorRole } from "@carzen/contracts/vendor/auth";

export type NavBadgeKey = "pendingBookings" | "paymentPending" | "shiftsToReview" | "unrepliedReviews";

export type VendorNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: NavBadgeKey;
  /** Hidden for managers (owner-only modules). */
  ownerOnly?: boolean;
};

export type VendorNavGroup = {
  title: string | null;
  items: VendorNavItem[];
};

/** Sidebar order follows spec B2 (wash dashboard). */
export const VENDOR_NAV: VendorNavGroup[] = [
  {
    title: null,
    items: [
      { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
      { href: "/live", label: "التشغيل المباشر", icon: Radio, badge: "paymentPending" },
    ],
  },
  {
    title: "الحجوزات والطلبات",
    items: [
      { href: "/bookings", label: "الحجوزات", icon: CalendarClock, badge: "pendingBookings" },
      { href: "/orders", label: "الطلبات", icon: ClipboardList },
      { href: "/schedule", label: "الجدول والسعة", icon: CalendarDays },
    ],
  },
  {
    title: "الخدمات والتسويق",
    items: [
      { href: "/services", label: "الخدمات والأسعار", icon: Sparkles },
      { href: "/offers", label: "العروض", icon: BadgePercent },
    ],
  },
  {
    title: "الفريق",
    items: [
      { href: "/staff", label: "الموظفون", icon: UserRoundCog },
      { href: "/shifts", label: "الورديات والإغلاق", icon: WalletCards, badge: "shiftsToReview" },
    ],
  },
  {
    title: "العملاء والأداء",
    items: [
      { href: "/customers", label: "العملاء", icon: Users },
      { href: "/reviews", label: "التقييمات", icon: Star, badge: "unrepliedReviews" },
      { href: "/reports", label: "التقارير", icon: ChartColumnBig },
      { href: "/finance", label: "المالية", icon: Wallet },
    ],
  },
  {
    title: "الإدارة",
    items: [
      { href: "/branches", label: "الفروع", icon: MapPinned },
      { href: "/audit", label: "سجل التدقيق", icon: History },
      { href: "/settings", label: "الإعدادات", icon: Settings },
    ],
  },
];

export function navFor(role: VendorRole | undefined): VendorNavGroup[] {
  if (role === "owner") return VENDOR_NAV;
  return VENDOR_NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.ownerOnly) })).filter((g) => g.items.length);
}

export function isNavActive(pathname: string, item: VendorNavItem): boolean {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return path === item.href || path.startsWith(`${item.href}/`);
}

export const VENDOR_NAV_ITEMS = VENDOR_NAV.flatMap((g) => g.items);
