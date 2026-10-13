import type { ComponentType } from "react";
import {
  BadgePercent,
  BriefcaseBusiness,
  CalendarCheck2,
  ChartPie,
  FileClock,
  FilePlus2,
  History,
  LayoutDashboard,
  MapPinned,
  MessageSquareWarning,
  Receipt,
  Settings,
  ShieldCheck,
  Star,
  Store,
  Tag,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";

export type NavBadgeKey = "applications" | "complaints";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Live count rendered as a pill (sourced from the dashboard summary). */
  badge?: NavBadgeKey;
  /** Extra path prefixes that should mark this item active. */
  match?: string[];
};

export type AdminNavGroup = {
  title: string | null;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    title: null,
    items: [{ href: "/dashboard", label: "لوحة المؤشرات", icon: LayoutDashboard }],
  },
  {
    title: "المغاسل",
    items: [
      { href: "/washes", label: "كل المغاسل", icon: Store },
      { href: "/applications", label: "طلبات الانضمام", icon: FilePlus2, badge: "applications" },
      { href: "/branches", label: "الفروع", icon: MapPinned },
    ],
  },
  {
    title: "العمليات",
    items: [
      { href: "/orders", label: "الحجوزات والطلبات", icon: CalendarCheck2 },
      { href: "/complaints", label: "الشكاوى", icon: MessageSquareWarning, badge: "complaints" },
      { href: "/reviews", label: "التقييمات", icon: Star },
    ],
  },
  {
    title: "المستخدمون",
    items: [
      { href: "/customers", label: "العملاء", icon: Users },
      { href: "/staff", label: "الملاك والموظفون", icon: BriefcaseBusiness },
    ],
  },
  {
    title: "المالية والتسويق",
    items: [
      { href: "/finance", label: "الملخص المالي", icon: ChartPie },
      { href: "/finance/transactions", label: "المعاملات", icon: Receipt },
      { href: "/finance/commission", label: "العمولات", icon: BadgePercent },
      { href: "/finance/payouts", label: "مدفوعات المغاسل", icon: Wallet },
      { href: "/offers", label: "عروض المنصة", icon: Tag },
    ],
  },
  {
    title: "النظام",
    items: [
      { href: "/admins", label: "المسؤولون", icon: UserCog },
      { href: "/roles", label: "الأدوار والصلاحيات", icon: ShieldCheck },
      { href: "/settings", label: "إعدادات المنصة", icon: Settings },
      { href: "/audit", label: "سجل التدقيق", icon: History },
      { href: "/notifications", label: "الإشعارات", icon: FileClock },
    ],
  },
];

export function isNavActive(pathname: string, item: AdminNavItem): boolean {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  // `/finance` must not light up for `/finance/transactions`.
  if (item.href === "/finance") return path === "/finance";
  if (path === item.href || path.startsWith(`${item.href}/`)) return true;
  return item.match?.some((m) => path.startsWith(m)) ?? false;
}

/** Flattened list for breadcrumbs and the command palette's "Go to" group. */
export const ADMIN_NAV_ITEMS = ADMIN_NAV.flatMap((g) => g.items);
