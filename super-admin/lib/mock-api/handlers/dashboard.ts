import "server-only";

import type {
  AttentionWash,
  DashboardAlert,
  DashboardKpi,
  DashboardPeriod,
  DashboardSummary,
  KpiKey,
  RevenuePoint,
  TopWash,
} from "@/types/dashboard";
import type { Order } from "@/types/orders";
import { daysAgo, isSameDay, now, round2 } from "@/lib/mock-api/db";
import { ok } from "@/lib/mock-api/http";
import { route } from "@/lib/mock-api/router";
import type { MockDatabase } from "@/lib/mock-api/schema";

const PERIOD_DAYS: Record<DashboardPeriod, number> = { today: 1, "7d": 7, "30d": 30 };

const REACHED: Record<string, Order["status"][]> = {
  confirmed: ["confirmed", "waiting", "in_service", "completed"],
  waiting: ["waiting", "in_service", "completed"],
  in_service: ["in_service", "completed"],
  completed: ["completed"],
};

function ordersInRange(db: MockDatabase, days: number) {
  const from = daysAgo(days - 1);
  const to = new Date(now());
  to.setHours(23, 59, 59, 999);
  return db.orders.filter((o) => {
    const t = new Date(o.scheduledAt);
    return t >= from && t <= to;
  });
}

/** Daily totals for the last `days` days (oldest → newest). */
function dailySeries(db: MockDatabase, days: number, pick: (orders: Order[]) => number) {
  return Array.from({ length: days }, (_, i) => {
    const day = daysAgo(days - 1 - i);
    return pick(db.orders.filter((o) => isSameDay(o.scheduledAt, day)));
  });
}

/**
 * 7-day platform trend ending exactly at today's headline value. The seed is a
 * small sample, so day-over-day ratios from it would be noisy (±150%); a gentle
 * deterministic drift + wobble reads like real platform-scale data.
 */
function trendSeries(final: number, seed: number, drift = 0.012, wobble = 0.045): number[] {
  return Array.from({ length: 7 }, (_, i) => {
    const k = 6 - i;
    if (k === 0) return final;
    const noise = Math.sin((seed + 1) * (i + 1) * 1.7) * wobble;
    return Math.round(final * (1 - drift * k) * (1 + noise));
  });
}

function deltaOf(series: number[]): number | null {
  if (series.length < 2) return null;
  const prev = series[series.length - 2];
  const cur = series[series.length - 1];
  if (!prev) return null;
  return round2(((cur - prev) / prev) * 100);
}

function growthSeries(final: number, dailyGrowth: number) {
  return Array.from({ length: 7 }, (_, i) => Math.round(final / Math.pow(1 + dailyGrowth, 6 - i)));
}

function buildKpis(db: MockDatabase): DashboardKpi[] {
  const b = db.baseline;
  const today = now();
  const todaySample = db.orders.filter((o) => isSameDay(o.scheduledAt, today));
  const activeBiz = db.businesses.filter((x) => x.status === "active").length;
  const pendingApps = db.applications.filter((a) => a.status === "pending").length;

  const customers = b.customers + (db.customers.length - 40);
  const activeCustomersNow = db.customers.filter((c) => c.status === "active").length;
  const activeCustomers = Math.round(b.customers * 0.71) + (activeCustomersNow - 39);
  const activeWashes = b.activeWashes + (activeBiz - 8);
  const totalWashes = activeWashes + 14;
  const branches = b.branches + (db.branches.length - 14);

  // Live deltas: anything an admin changes today (e.g. cancelling a booking) moves the headline.
  const cancelledLive = todaySample.filter((o) => o.status === "cancelled").length;
  const bookingsToday = b.bookingsToday;
  const completedToday = b.completedToday;
  const cancelledToday = Math.round(bookingsToday * 0.057) + cancelledLive;

  const bookingsSeries = trendSeries(bookingsToday, 1);
  const completedSeries = trendSeries(completedToday, 2);
  const cancelledSeries = trendSeries(cancelledToday, 3, -0.01, 0.12);
  const gmvSeries = trendSeries(b.gmvToday, 4);
  const revenueRatio = b.platformRevenueToday / b.gmvToday;
  const revenueSeries = gmvSeries.map((v) => Math.round(v * revenueRatio));

  const make = (key: KpiKey, value: number, spark: number[], delta?: number | null): DashboardKpi => ({
    key,
    value,
    spark,
    delta: delta === undefined ? deltaOf(spark) : delta,
  });

  return [
    make("customers", customers, growthSeries(customers, 0.0021)),
    make("activeCustomers", activeCustomers, growthSeries(activeCustomers, 0.0016)),
    make("totalWashes", totalWashes, growthSeries(totalWashes, 0.003)),
    make("activeWashes", activeWashes, growthSeries(activeWashes, 0.004)),
    make("pendingApplications", pendingApps, [2, 3, 1, 2, 4, 3, pendingApps], null),
    make("totalBranches", branches, growthSeries(branches, 0.0035)),
    make("bookingsToday", bookingsToday, bookingsSeries),
    make("completedToday", completedToday, completedSeries),
    make("cancelledToday", cancelledToday, cancelledSeries),
    make("gmvToday", b.gmvToday, gmvSeries),
    make("platformRevenueToday", b.platformRevenueToday, revenueSeries),
  ];
}

function buildFunnel(db: MockDatabase, period: DashboardPeriod) {
  if (period === "today") {
    // Today must reconcile with the KPI cards: created = bookings, completed = completed.
    const b = db.baseline;
    const cancelled = Math.round(b.bookingsToday * 0.057) + db.orders.filter((o) => isSameDay(o.scheduledAt, now()) && o.status === "cancelled").length;
    const noShow = Math.round(b.bookingsToday * 0.021);
    const live = db.orders.filter((o) => isSameDay(o.scheduledAt, now()));
    const inService = live.filter((o) => o.status === "in_service").length * 3;
    const waiting = live.filter((o) => o.status === "waiting").length * 3;
    const pending = Math.max(0, b.bookingsToday - cancelled - noShow - b.completedToday - inService - waiting);
    return {
      steps: [
        { key: "created" as const, value: b.bookingsToday },
        { key: "confirmed" as const, value: b.bookingsToday - cancelled - Math.round(pending * 0.4) },
        { key: "waiting" as const, value: b.completedToday + inService + waiting },
        { key: "in_service" as const, value: b.completedToday + inService },
        { key: "completed" as const, value: b.completedToday },
      ],
      cancelled,
      noShow,
    };
  }

  const sample = ordersInRange(db, PERIOD_DAYS[period]);
  const todaySample = db.orders.filter((o) => isSameDay(o.scheduledAt, now())).length || 1;
  const factor = db.baseline.bookingsToday / todaySample;
  const scale = (n: number) => Math.round(n * factor);

  const reached = (step: keyof typeof REACHED) => sample.filter((o) => REACHED[step].includes(o.status)).length;

  return {
    steps: [
      { key: "created" as const, value: scale(sample.length) },
      { key: "confirmed" as const, value: scale(reached("confirmed")) },
      { key: "waiting" as const, value: scale(reached("waiting")) },
      { key: "in_service" as const, value: scale(reached("in_service")) },
      { key: "completed" as const, value: scale(reached("completed")) },
    ],
    cancelled: scale(sample.filter((o) => o.status === "cancelled").length),
    noShow: scale(sample.filter((o) => o.status === "no_show").length),
  };
}

function buildRevenue(db: MockDatabase, period: DashboardPeriod): RevenuePoint[] {
  const paid = (os: Order[]) =>
    os.filter((o) => o.status === "completed" && o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0);
  const todaySampleGmv = paid(db.orders.filter((o) => isSameDay(o.scheduledAt, now()))) || 1;
  const factor = db.baseline.gmvToday / todaySampleGmv;
  const ratio = db.baseline.platformRevenueToday / db.baseline.gmvToday;

  if (period === "today") {
    // Intraday demand curve for a Cairo wash: late-morning ramp, lunch peak, dip, evening rise.
    const WEIGHTS: Record<number, number> = { 8: 0.4, 9: 0.8, 10: 1.1, 11: 1.4, 12: 1.6, 13: 1.5, 14: 1.2, 15: 1.0, 16: 1.1, 17: 1.4, 18: 1.6, 19: 1.5, 20: 1.2, 21: 0.8, 22: 0.5, 23: 0.3 };
    const hours = Array.from({ length: now().getHours() - 7 }, (_, i) => 8 + i);
    const total = hours.reduce((s, h) => s + (WEIGHTS[h] ?? 0.5), 0);
    const points = hours.map((h) => {
      const gmv = Math.round((db.baseline.gmvToday * (WEIGHTS[h] ?? 0.5)) / total);
      return { label: `${h % 12 || 12}${h >= 12 ? "م" : "ص"}`, gmv, commission: Math.round(gmv * ratio) };
    });
    // Rounding drift goes to the latest hour so totals match the KPI card exactly.
    const drift = db.baseline.gmvToday - points.reduce((s, p) => s + p.gmv, 0);
    points[points.length - 1].gmv += drift;
    points[points.length - 1].commission = Math.round(points[points.length - 1].gmv * ratio);
    const commissionDrift = db.baseline.platformRevenueToday - points.reduce((s, p) => s + p.commission, 0);
    points[points.length - 1].commission += commissionDrift;
    return points;
  }

  const days = PERIOD_DAYS[period];
  const raw = dailySeries(db, days, paid);
  // Older days in the sample are sparse; smooth towards a realistic platform curve.
  return raw.map((v, i) => {
    const day = daysAgo(days - 1 - i);
    const wobble = 0.82 + ((i * 37) % 23) / 60;
    const gmv = Math.round(Math.max(v * factor, db.baseline.gmvToday * wobble * (day.getDay() === 5 ? 1.18 : 1)));
    return {
      label: `${day.getDate()}/${day.getMonth() + 1}`,
      gmv,
      commission: Math.round(gmv * ratio),
    };
  });
}

function buildAlerts(db: MockDatabase): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  const pendingApps = db.applications.filter((a) => a.status === "pending").length;
  if (pendingApps > 0) {
    alerts.push({
      id: "alert_apps",
      type: "applications",
      severity: "warning",
      title: `${pendingApps} طلبات انضمام بانتظار المراجعة`,
      description: "أقدم طلب ينتظر منذ أكثر من يومين.",
      href: "/applications",
      count: pendingApps,
    });
  }

  const open = db.complaints.filter((c) => c.status !== "closed" && c.status !== "resolved");
  const byBiz = new Map<string, number>();
  open.forEach((c) => byBiz.set(c.businessId, (byBiz.get(c.businessId) ?? 0) + 1));
  for (const [bizId, count] of byBiz) {
    if (count < 3) continue;
    const biz = db.businesses.find((b) => b.id === bizId);
    alerts.push({
      id: `alert_comp_${bizId}`,
      type: "complaint_spike",
      severity: "danger",
      title: `معدل شكاوى مرتفع: ${biz?.name.ar ?? bizId}`,
      description: `${count} شكاوى مفتوحة — راجع المغسلة واتخذ إجراء.`,
      href: `/washes/${bizId}`,
      count,
    });
  }

  const disc = db.transactions.filter((t) => t.flag === "discrepancy").length;
  if (disc > 0) {
    alerts.push({
      id: "alert_disc",
      type: "discrepancy",
      severity: "warning",
      title: `${disc} معاملة بها فرق في التحصيل`,
      description: "المبلغ المحصل لا يطابق إجمالي الطلب.",
      href: "/finance/transactions?filter=discrepancy",
      count: disc,
    });
  }

  const shift = db.shifts.find((s) => (s.difference ?? 0) < 0 && s.reviewStatus === "open");
  if (shift) {
    alerts.push({
      id: "alert_shift",
      type: "shift_difference",
      severity: "info",
      title: `عجز ${Math.abs(shift.difference ?? 0)} ج.م في وردية`,
      description: `${db.staff.find((s) => s.id === shift.staffId)?.name ?? ""} — كارزن ووش مدينة نصر`,
      href: "/washes/biz_carzen",
      count: 1,
    });
  }

  const reported = db.reviews.filter((r) => r.reportedByWash && r.status === "visible").length;
  if (reported > 0) {
    alerts.push({
      id: "alert_reviews",
      type: "reported_review",
      severity: "info",
      title: `${reported} تقييم أبلغت عنه المغاسل`,
      description: "راجع التقييمات المبلغ عنها وقرر إخفاءها أو إبقاءها.",
      href: "/reviews?filter=reported",
      count: reported,
    });
  }

  return alerts;
}

function buildTopWashes(db: MockDatabase, period: DashboardPeriod): TopWash[] {
  const sample = ordersInRange(db, Math.max(PERIOD_DAYS[period], 7)).filter((o) => o.status === "completed");
  return db.businesses
    .filter((b) => b.status === "active")
    .map((b) => {
      const orders = sample.filter((o) => o.businessId === b.id);
      const branch = db.branches.find((br) => br.businessId === b.id);
      return {
        id: b.id,
        name: b.name,
        area: branch?.area ?? "",
        rating: b.rating,
        completed: orders.length,
        gmv: orders.reduce((s, o) => s + o.total, 0),
      };
    })
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, 5);
}

function buildAttention(db: MockDatabase): AttentionWash[] {
  const out: AttentionWash[] = [];
  const last30 = ordersInRange(db, 30);
  for (const b of db.businesses.filter((x) => x.status === "active")) {
    const openComplaints = db.complaints.filter(
      (c) => c.businessId === b.id && c.status !== "resolved" && c.status !== "closed",
    ).length;
    if (openComplaints >= 2) out.push({ id: b.id, name: b.name, issue: "complaints", value: openComplaints });
    else if (b.rating > 0 && b.rating < 4.2) out.push({ id: b.id, name: b.name, issue: "rating", value: b.rating });
    else {
      const orders = last30.filter((o) => o.businessId === b.id);
      const cancelled = orders.filter((o) => o.status === "cancelled").length;
      const rate = orders.length >= 8 ? (cancelled / orders.length) * 100 : 0;
      if (rate >= 15) out.push({ id: b.id, name: b.name, issue: "cancellations", value: round2(rate) });
    }
  }
  return out.slice(0, 5);
}

export const dashboardRoutes = [
  route("GET", "/admin/dashboard", ({ db, query }) => {
    const raw = query.get("period");
    const period: DashboardPeriod = raw === "7d" || raw === "30d" ? raw : "today";
    const kpis = buildKpis(db);
    const revenue = buildRevenue(db, period);
    const kpi = (k: KpiKey) => kpis.find((x) => x.key === k)?.value ?? 0;

    const summary: DashboardSummary = {
      period,
      generatedAt: new Date().toISOString(),
      kpis,
      funnel: buildFunnel(db, period),
      revenue,
      revenueTotals: {
        gmv: revenue.reduce((s, p) => s + p.gmv, 0),
        commission: revenue.reduce((s, p) => s + p.commission, 0),
      },
      alerts: buildAlerts(db),
      topWashes: buildTopWashes(db, period),
      needsAttention: buildAttention(db),
      health: {
        activeUsers: kpi("activeCustomers"),
        activeWashes: kpi("activeWashes"),
        activeBranches: kpi("totalBranches") - 9,
        bookingsToday: kpi("bookingsToday"),
      },
    };
    return ok(summary);
  }),
];
