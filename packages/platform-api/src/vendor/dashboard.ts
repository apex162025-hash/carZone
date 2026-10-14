import "server-only";

import type { Order } from "@carzen/contracts/orders";
import type {
  CarInside,
  LiveBranchCard,
  SetupChecklist,
  VendorAlert,
  VendorDashboard,
  VendorKpi,
  VendorKpiKey,
  VendorPeriod,
} from "@carzen/contracts/vendor/dashboard";
import { daysAgo, isSameDay, now, round2 } from "../db";
import { ok } from "../http";
import { branchName, serviceName } from "../lookups";
import { type VendorActor, vroute } from "../router";
import type { MockDatabase } from "../schema";
import { hoursFor, isOpenAt, onShiftAt, overdueMinutes, staffName } from "./engine";
import { scopeBranches } from "./scope";

const DAYS: Record<VendorPeriod, number> = { today: 1, "7d": 7, "30d": 30 };

const paidRevenue = (os: Order[]) => os.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0);

function inRange(orders: Order[], from: Date, to: Date) {
  return orders.filter((o) => {
    const t = new Date(o.scheduledAt).getTime();
    return t >= from.getTime() && t <= to.getTime();
  });
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function kpiValues(os: Order[]): Record<VendorKpiKey, number> {
  const bookings = os.filter((o) => o.source !== "walk_in");
  return {
    totalOrders: os.filter((o) => o.status !== "cancelled").length,
    confirmedBookings: bookings.filter((o) => !["pending", "cancelled", "no_show"].includes(o.status)).length,
    walkIns: os.filter((o) => o.source === "walk_in").length,
    completed: os.filter((o) => o.status === "completed").length,
    cancelled: os.filter((o) => o.status === "cancelled").length,
    noShows: os.filter((o) => o.status === "no_show").length,
    revenue: paidRevenue(os),
    pendingPayments: os.filter((o) => o.status === "completed" && o.paymentStatus === "pending").length,
  };
}

/** End of a past day, clipped to the current time-of-day — for "vs. same time yesterday". */
function sameTimeOn(day: Date) {
  const t = now();
  const d = new Date(day);
  d.setHours(t.getHours(), t.getMinutes(), 59, 999);
  return d;
}

function buildKpis(scoped: Order[], period: VendorPeriod): VendorKpi[] {
  const n = DAYS[period];
  const today = now();
  // "Today" is a partial day, so it is compared with the same hours of each earlier day.
  const until = (day: Date) => (period === "today" ? sameTimeOn(day) : endOfDay(day));
  const cur = inRange(scoped, daysAgo(n - 1), endOfDay(today));
  const prev = inRange(scoped, daysAgo(2 * n - 1), until(daysAgo(n)));
  const curV = kpiValues(cur);
  const prevV = kpiValues(prev);
  // Sparklines: 7 buckets of the period length (days for today/7d, ~4-day buckets for 30d).
  const bucket = period === "30d" ? 4 : 1;
  const sparks = Array.from({ length: 7 }, (_, i) => {
    const endOffset = (6 - i) * bucket;
    const from = daysAgo(endOffset + bucket - 1);
    return kpiValues(inRange(scoped, from, endOffset === 0 ? endOfDay(today) : until(daysAgo(endOffset))));
  });
  return (Object.keys(curV) as VendorKpiKey[]).map((key) => ({
    key,
    value: curV[key],
    delta: prevV[key] ? round2(((curV[key] - prevV[key]) / prevV[key]) * 100) : null,
    spark: sparks.map((s) => s[key]),
  }));
}

function liveBranch(db: MockDatabase, branchId: string): LiveBranchCard {
  const b = db.branches.find((x) => x.id === branchId)!;
  const today = db.orders.filter((o) => o.branchId === branchId && isSameDay(o.scheduledAt, now()));
  const h = hoursFor(b, now());
  return {
    id: b.id,
    name: b.name,
    area: b.area,
    isOpen: isOpenAt(b),
    opensAt: h.closed ? null : h.open,
    closesAt: h.closed ? null : h.close,
    activeOrders: today.filter((o) => ["pending", "confirmed", "waiting", "in_service"].includes(o.status)).length,
    waiting: today.filter((o) => o.status === "waiting").length,
    inService: today.filter((o) => o.status === "in_service").length,
    paymentPending: today.filter((o) => o.status === "completed" && o.paymentStatus === "pending").length,
    baysBusy: db.orders.filter((o) => o.branchId === branchId && o.status === "in_service").length,
    capacity: b.capacity,
    staffOnShift: onShiftAt(db, branchId).map((s) => ({ id: s.id, name: s.name })),
    revenueToday: paidRevenue(today),
  };
}

function carsInside(db: MockDatabase, branchIds: string[]): CarInside[] {
  return db.orders
    .filter(
      (o) =>
        branchIds.includes(o.branchId) &&
        (o.status === "waiting" || o.status === "in_service" || (o.status === "completed" && o.paymentStatus === "pending" && isSameDay(o.scheduledAt, now()))),
    )
    .map((o) => {
      const since = [...o.timeline].reverse().find((e) => e.status === o.status)?.at ?? o.scheduledAt;
      return {
        orderId: o.id,
        number: o.number,
        plate: o.plate,
        status: o.status,
        paymentPending: o.status === "completed",
        serviceName: serviceName(o),
        branchName: branchName(db, o.branchId),
        staffName: staffName(db, o.assignedStaffId),
        since,
        overdueMin: overdueMinutes(o),
      };
    })
    .sort((a, b) => ["in_service", "waiting", "completed"].indexOf(a.status) - ["in_service", "waiting", "completed"].indexOf(b.status));
}

function alerts(db: MockDatabase, actor: VendorActor, branchIds: string[], scoped: Order[]): VendorAlert[] {
  const out: VendorAlert[] = [];
  if (actor.business.status === "suspended") {
    out.push({
      id: "suspended",
      type: "suspended",
      severity: "danger",
      title: "المغسلة معلّقة من إدارة كارزن",
      description: actor.business.statusReason ?? "لا تظهر للعملاء حاليًا ولا تستقبل حجوزات جديدة.",
      href: "/notifications",
    });
  }
  for (const s of db.shifts.filter((x) => branchIds.includes(x.branchId) && x.reviewStatus === "submitted" && (x.difference ?? 0) !== 0)) {
    out.push({
      id: `cash_${s.id}`,
      type: "cash_difference",
      severity: "danger",
      title: `فرق نقدية ${s.difference! > 0 ? "+" : ""}${s.difference} ج.م`,
      description: `وردية ${staffName(db, s.staffId)} — ${branchName(db, s.branchId).ar}`,
      href: `/shifts?filter=difference`,
    });
  }
  const late = scoped.filter((o) => o.status === "completed" && o.paymentStatus === "pending" && overdueMinutes(o) > 30);
  if (late.length) {
    out.push({
      id: "pay_pending",
      type: "payment_pending",
      severity: "warning",
      title: `${late.length} طلب مكتمل بدون دفع لأكثر من 30 دقيقة`,
      description: late.map((o) => o.number).slice(0, 3).join("، "),
      href: "/orders?tab=payment_pending",
    });
  }
  for (const id of branchIds) {
    const b = db.branches.find((x) => x.id === id)!;
    if (isOpenAt(b) && onShiftAt(db, id).length === 0) {
      out.push({
        id: `noshift_${id}`,
        type: "no_shift",
        severity: "warning",
        title: `لا يوجد موظف في وردية — ${b.name.ar}`,
        description: "الفرع مفتوح الآن بدون أي موظف مسجل في وردية.",
        href: "/staff",
      });
    }
  }
  const last7 = inRange(scoped, daysAgo(6), endOfDay(now()));
  const cancelRate = last7.length >= 10 ? last7.filter((o) => o.status === "cancelled").length / last7.length : 0;
  if (cancelRate >= 0.15) {
    out.push({
      id: "cancel_rate",
      type: "high_cancellation",
      severity: "warning",
      title: `نسبة إلغاء مرتفعة ${Math.round(cancelRate * 100)}٪`,
      description: "خلال آخر 7 أيام — راجع أسباب الإلغاء في الحجوزات.",
      href: "/bookings?tab=cancelled",
    });
  }
  const noShows = scoped.filter((o) => o.status === "no_show" && isSameDay(o.scheduledAt, now())).length;
  if (noShows) {
    out.push({ id: "noshow", type: "no_show", severity: "info", title: `${noShows} عدم حضور اليوم`, description: "تم تحرير مواعيدهم.", href: "/bookings?tab=no_show" });
  }
  const lowUnreplied = db.reviews.filter((r) => branchIds.includes(r.branchId) && r.status === "visible" && r.stars <= 2 && !r.reply).length;
  if (lowUnreplied) {
    out.push({ id: "reviews", type: "review", severity: "info", title: `${lowUnreplied} تقييم منخفض بدون رد`, description: "الرد السريع يحسن صورة المغسلة.", href: "/reviews?replied=no" });
  }
  return out;
}

function setupChecklist(db: MockDatabase, actor: VendorActor): SetupChecklist | null {
  const ageDays = (now().getTime() - new Date(actor.business.createdAt).getTime()) / 86400000;
  if (actor.business.status !== "approved" && ageDays > 30) return null;
  const branches = db.branches.filter((b) => b.businessId === actor.business.id);
  const branchIds = branches.map((b) => b.id);
  const steps = [
    { key: "branch" as const, label: "راجع بيانات الفرع والعنوان", done: branches.every((b) => Boolean(b.phone && b.address.ar)), href: "/branches" },
    { key: "services" as const, label: "راجع الخدمات والأسعار", done: db.services.filter((s) => branchIds.includes(s.branchId) && s.active).length >= 2, href: "/services" },
    { key: "hours" as const, label: "اضبط ساعات العمل والسعة", done: db.auditLogs.some((a) => a.action === "branch.update" && a.branchId && branchIds.includes(a.branchId)), href: "/branches" },
    { key: "staff" as const, label: "أضف أول موظف", done: db.staff.some((s) => s.businessId === actor.business.id && s.role !== "owner"), href: "/staff" },
    { key: "live" as const, label: "فعّل المغسلة للعملاء", done: actor.business.status === "active" && branches.some((b) => b.active), href: "/settings" },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length && ageDays > 7) return null;
  return { steps, done, total: steps.length };
}

export const vendorDashboardRoutes = [
  vroute("GET", "/vendor/dashboard", ({ db, query, actor }) => {
    const raw = query.get("period");
    const period: VendorPeriod = raw === "7d" || raw === "30d" ? raw : "today";
    const branchIds = scopeBranches(actor, query.get("branchId"));
    const scoped = db.orders.filter((o) => branchIds.includes(o.branchId));
    const n = DAYS[period];
    const periodOrders = inRange(scoped, daysAgo(n - 1), endOfDay(now()));
    const today = scoped.filter((o) => isSameDay(o.scheduledAt, now()));

    let revenueChart: { label: string; value: number }[];
    if (period === "today") {
      const hours = Array.from({ length: Math.max(1, now().getHours() - 7) }, (_, i) => 8 + i);
      revenueChart = hours.map((h) => ({
        label: `${h % 12 || 12}${h >= 12 ? "م" : "ص"}`,
        value: paidRevenue(today.filter((o) => new Date(o.scheduledAt).getHours() === h)),
      }));
    } else {
      revenueChart = Array.from({ length: n }, (_, i) => {
        const d = daysAgo(n - 1 - i);
        return { label: `${d.getDate()}/${d.getMonth() + 1}`, value: paidRevenue(scoped.filter((o) => isSameDay(o.scheduledAt, d))) };
      });
    }

    const svcCount = new Map<string, { name: Order["items"][number]["name"]; count: number; revenue: number }>();
    periodOrders
      .filter((o) => o.status !== "cancelled")
      .forEach((o) => {
        const p = o.items.find((i) => i.type === "primary") ?? o.items[0];
        const key = p.name.ar;
        const cur = svcCount.get(key) ?? { name: p.name, count: 0, revenue: 0 };
        cur.count += 1;
        cur.revenue += o.paymentStatus === "paid" ? o.total : 0;
        svcCount.set(key, cur);
      });
    const topServices = [...svcCount.values()].sort((a, b) => b.count - a.count).slice(0, 5);
    const alertList = alerts(db, actor, branchIds, scoped);

    const data: VendorDashboard = {
      period,
      branchId: query.get("branchId") ?? "all",
      generatedAt: now().toISOString(),
      kpis: buildKpis(scoped, period),
      liveBranches: branchIds.map((id) => liveBranch(db, id)),
      carsInside: carsInside(db, branchIds),
      alerts: alertList,
      charts: {
        revenueByHour: revenueChart,
        bySource: (["app", "walk_in", "phone"] as const).map((source) => ({ source, value: periodOrders.filter((o) => o.source === source).length })),
        topServices,
        byStatus: (["pending", "confirmed", "waiting", "in_service", "completed", "cancelled", "no_show"] as const)
          .map((status) => ({ status, value: periodOrders.filter((o) => o.status === status).length }))
          .filter((x) => x.value > 0),
      },
      dailySummary: {
        orders: today.filter((o) => o.status !== "cancelled").length,
        revenue: paidRevenue(today),
        topService: topServices[0]?.name ?? null,
        issues: alertList.length,
      },
      setup: setupChecklist(db, actor),
    };
    return ok(data);
  }),
];
