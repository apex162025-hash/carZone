import "server-only";

import type { Localized } from "@carzen/contracts/common";
import type { AuditLog } from "@carzen/contracts/audit";
import type { Order, PaymentMethod } from "@carzen/contracts/orders";
import type { VendorPeriod } from "@carzen/contracts/vendor/dashboard";
import type {
  CustomerSegment,
  VendorAuditItem,
  VendorCustomer,
  VendorCustomerDetails,
  VendorFinance,
  VendorReport,
  VendorReportType,
  VendorReview,
  VendorSearchResult,
} from "@carzen/contracts/vendor/insights";
import { daysAgo, isSameDay, logAudit, now, pushAdminNotification, round2 } from "../db";
import { MockApiError, matchesSearch, ok, paginate, requireText, sortBy } from "../http";
import { branchName, effectiveCommissionRate, serviceName } from "../lookups";
import { vroute } from "../router";
import type { MockDatabase } from "../schema";
import { dayKey, hasManualDiscount, staffName, toVendorItem } from "./engine";
import { scopeBranches } from "./scope";

const LOST_AFTER_DAYS = 60;
/** Pseudo actor id: every Carzen admin is shown to washes as one "إدارة كارزن" actor (admin names stay internal). */
const CARZEN_ACTOR = "carzen";
const NEW_WITHIN_DAYS = 30;
const PERIOD_DAYS: Record<VendorPeriod, number> = { today: 1, "7d": 7, "30d": 30 };

function segmentOf(visits: Order[]): CustomerSegment {
  const completed = visits.filter((o) => o.status === "completed");
  const last = completed[0]?.scheduledAt;
  const first = completed[completed.length - 1]?.scheduledAt;
  if (last && (now().getTime() - new Date(last).getTime()) / 86400000 > LOST_AFTER_DAYS) return "lost";
  if (!first || completed.length <= 1 || (now().getTime() - new Date(first).getTime()) / 86400000 <= NEW_WITHIN_DAYS) {
    return completed.length >= 2 ? "returning" : "new";
  }
  return "returning";
}

function favorite(orders: Order[]): { name: Localized; count: number }[] {
  const m = new Map<string, { name: Localized; count: number }>();
  orders
    .filter((o) => o.status === "completed")
    .forEach((o) => {
      const p = o.items.find((i) => i.type === "primary") ?? o.items[0];
      const cur = m.get(p.name.ar) ?? { name: p.name, count: 0 };
      cur.count += 1;
      m.set(p.name.ar, cur);
    });
  return [...m.values()].sort((a, b) => b.count - a.count);
}

function customersOf(db: MockDatabase, branchIds: string[]): VendorCustomer[] {
  const byCustomer = new Map<string, Order[]>();
  db.orders
    .filter((o) => o.customerId && branchIds.includes(o.branchId))
    .forEach((o) => byCustomer.set(o.customerId!, [...(byCustomer.get(o.customerId!) ?? []), o]));
  return [...byCustomer.entries()].map(([id, orders]) => {
    const c = db.customers.find((x) => x.id === id)!;
    const sorted = orders.sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt));
    const completed = sorted.filter((o) => o.status === "completed");
    return {
      id,
      name: c.name,
      phone: c.phone,
      plates: db.vehicles.filter((v) => v.customerId === id).map((v) => v.plate),
      visits: completed.length,
      lastVisitAt: completed[0]?.scheduledAt ?? null,
      firstVisitAt: completed[completed.length - 1]?.scheduledAt ?? null,
      totalSpent: completed.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0),
      segment: segmentOf(sorted),
      favoriteService: favorite(sorted)[0]?.name ?? null,
    };
  });
}

function vendorFacingActor(db: MockDatabase, a: AuditLog): { actorId: string; actorName: string } {
  if (a.actorType === "admin") return { actorId: CARZEN_ACTOR, actorName: "إدارة كارزن" };
  if (a.actorType === "system") return { actorId: a.actorId, actorName: "النظام" };
  return { actorId: a.actorId, actorName: a.actorName ?? staffName(db, a.actorId) ?? a.actorId };
}

function money(n: number) {
  return Math.round(n);
}

function buildReport(db: MockDatabase, branchIds: string[], type: VendorReportType, from: Date, to: Date): VendorReport {
  const orders = db.orders.filter((o) => {
    const t = new Date(o.scheduledAt).getTime();
    return branchIds.includes(o.branchId) && t >= from.getTime() && t <= to.getTime();
  });
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000));
  const dayList = Array.from({ length: days }, (_, i) => {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    return d;
  });
  const paid = orders.filter((o) => o.paymentStatus === "paid");
  const base = { type, from: from.toISOString(), to: to.toISOString() };

  switch (type) {
    case "orders": {
      const rows = dayList.map((d) => {
        const day = orders.filter((o) => isSameDay(o.scheduledAt, d));
        return {
          date: `${d.getDate()}/${d.getMonth() + 1}`,
          total: day.length,
          completed: day.filter((o) => o.status === "completed").length,
          cancelled: day.filter((o) => o.status === "cancelled").length,
          noShow: day.filter((o) => o.status === "no_show").length,
          rate: day.length ? round2((day.filter((o) => o.status === "completed").length / day.length) * 100) : 0,
        };
      });
      return {
        ...base,
        chart: rows.map((r) => ({ label: r.date, value: r.total })),
        chartKind: "bar",
        valueFormat: "number",
        columns: [
          { key: "date", label: "اليوم", format: "text" },
          { key: "total", label: "الطلبات", align: "end", format: "number" },
          { key: "completed", label: "مكتملة", align: "end", format: "number" },
          { key: "cancelled", label: "ملغاة", align: "end", format: "number" },
          { key: "noShow", label: "لم يحضر", align: "end", format: "number" },
          { key: "rate", label: "معدل الإكمال", align: "end", format: "percent" },
        ],
        rows,
        summary: [
          { label: "إجمالي الطلبات", value: orders.length, format: "number" },
          { label: "مكتملة", value: orders.filter((o) => o.status === "completed").length, format: "number" },
          { label: "معدل الإكمال", value: orders.length ? round2((orders.filter((o) => o.status === "completed").length / orders.length) * 100) : 0, format: "percent" },
          { label: "ملغاة + لم يحضر", value: orders.filter((o) => o.status === "cancelled" || o.status === "no_show").length, format: "number" },
        ],
      };
    }
    case "revenue": {
      const rows = dayList.map((d) => {
        const day = paid.filter((o) => isSameDay(o.scheduledAt, d));
        const gross = day.reduce((s, o) => s + o.total, 0);
        const commission = day.reduce((s, o) => s + (o.total * effectiveCommissionRate(db, o.businessId)) / 100, 0);
        return { date: `${d.getDate()}/${d.getMonth() + 1}`, orders: day.length, gross, commission: money(commission), net: money(gross - commission) };
      });
      const gross = rows.reduce((s, r) => s + r.gross, 0);
      const commission = rows.reduce((s, r) => s + r.commission, 0);
      return {
        ...base,
        chart: rows.map((r) => ({ label: r.date, value: r.gross })),
        chartKind: "line",
        valueFormat: "money",
        columns: [
          { key: "date", label: "اليوم", format: "text" },
          { key: "orders", label: "طلبات مدفوعة", align: "end", format: "number" },
          { key: "gross", label: "الإيراد", align: "end", format: "money" },
          { key: "commission", label: "عمولة كارزن", align: "end", format: "money" },
          { key: "net", label: "الصافي", align: "end", format: "money" },
        ],
        rows,
        summary: [
          { label: "الإيراد", value: gross, format: "money" },
          { label: "عمولة كارزن", value: commission, format: "money" },
          { label: "صافي المغسلة", value: gross - commission, format: "money" },
          { label: "متوسط التذكرة", value: paid.length ? money(gross / paid.length) : 0, format: "money" },
        ],
      };
    }
    case "services": {
      const m = new Map<string, { name: string; count: number; revenue: number }>();
      orders
        .filter((o) => o.status !== "cancelled")
        .forEach((o) =>
          o.items.forEach((it) => {
            const cur = m.get(it.name.ar) ?? { name: it.name.ar, count: 0, revenue: 0 };
            cur.count += 1;
            cur.revenue += o.paymentStatus === "paid" ? it.price : 0;
            m.set(it.name.ar, cur);
          }),
        );
      const rows = [...m.values()].sort((a, b) => b.count - a.count);
      const total = rows.reduce((s, r) => s + r.count, 0) || 1;
      return {
        ...base,
        chart: rows.slice(0, 8).map((r) => ({ label: r.name, value: r.count })),
        chartKind: "bar",
        valueFormat: "number",
        columns: [
          { key: "name", label: "الخدمة", format: "text" },
          { key: "count", label: "مرات الطلب", align: "end", format: "number" },
          { key: "share", label: "النسبة", align: "end", format: "percent" },
          { key: "revenue", label: "الإيراد", align: "end", format: "money" },
        ],
        rows: rows.map((r) => ({ ...r, share: round2((r.count / total) * 100) })),
        summary: [
          { label: "الأكثر طلبًا", value: rows[0]?.count ?? 0, format: "number" },
          { label: "عدد الخدمات المطلوبة", value: rows.length, format: "number" },
          { label: "إيراد الخدمات", value: rows.reduce((s, r) => s + r.revenue, 0), format: "money" },
        ],
      };
    }
    case "source": {
      const labels = { app: "التطبيق", walk_in: "حضور مباشر", phone: "هاتفي" } as const;
      const rows = (["app", "walk_in", "phone"] as const).map((src) => {
        const list = orders.filter((o) => o.source === src);
        return {
          source: labels[src],
          orders: list.length,
          completed: list.filter((o) => o.status === "completed").length,
          revenue: list.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0),
          share: orders.length ? round2((list.length / orders.length) * 100) : 0,
        };
      });
      return {
        ...base,
        chart: rows.map((r) => ({ label: r.source, value: r.orders })),
        chartKind: "donut",
        valueFormat: "number",
        columns: [
          { key: "source", label: "المصدر", format: "text" },
          { key: "orders", label: "الطلبات", align: "end", format: "number" },
          { key: "share", label: "النسبة", align: "end", format: "percent" },
          { key: "completed", label: "مكتملة", align: "end", format: "number" },
          { key: "revenue", label: "الإيراد", align: "end", format: "money" },
        ],
        rows,
        summary: rows.map((r) => ({ label: r.source, value: r.share, format: "percent" as const })),
      };
    }
    case "employees": {
      const staff = db.staff.filter((s) => branchIds.includes(s.branchId) && s.role !== "owner");
      const rows = staff
        .map((s) => {
          const done = orders.filter((o) => o.assignedStaffId === s.id && o.status === "completed");
          const reviews = db.reviews.filter((r) => r.status === "visible" && done.some((o) => o.id === r.orderId));
          return {
            name: s.name,
            branch: branchName(db, s.branchId).ar,
            completed: done.length,
            value: done.reduce((sum, o) => sum + o.total, 0),
            rating: reviews.length ? round2(reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length) : 0,
          };
        })
        .sort((a, b) => b.completed - a.completed);
      return {
        ...base,
        chart: rows.map((r) => ({ label: r.name, value: r.completed })),
        chartKind: "bar",
        valueFormat: "number",
        columns: [
          { key: "name", label: "الموظف", format: "text" },
          { key: "branch", label: "الفرع", format: "text" },
          { key: "completed", label: "طلبات مكتملة", align: "end", format: "number" },
          { key: "value", label: "قيمة الخدمات", align: "end", format: "money" },
          { key: "rating", label: "متوسط التقييم", align: "end", format: "number" },
        ],
        rows,
        summary: [
          { label: "عدد الموظفين", value: rows.length, format: "number" },
          { label: "إجمالي المكتمل", value: rows.reduce((s, r) => s + r.completed, 0), format: "number" },
        ],
      };
    }
  }
}

export const vendorInsightRoutes = [
  // ── Customers / CRM (D12 / OW-19) ────────────────────────
  vroute("GET", "/vendor/customers", ({ db, query, actor }) => {
    const branchIds = scopeBranches(actor, query.get("branchId"));
    const segment = query.get("segment");
    const all = customersOf(db, branchIds).filter((c) => matchesSearch(query, c.name, c.phone, c.phone.replace(/\s/g, ""), ...c.plates));
    const counts = { all: all.length, new: all.filter((c) => c.segment === "new").length, returning: all.filter((c) => c.segment === "returning").length, lost: all.filter((c) => c.segment === "lost").length };
    const filtered = segment && segment !== "all" ? all.filter((c) => c.segment === segment) : all;
    const sorted = sortBy(filtered, query, { name: (c) => c.name, visits: (c) => c.visits, totalSpent: (c) => c.totalSpent, lastVisitAt: (c) => c.lastVisitAt }, { key: "lastVisitAt", order: "desc" });
    const { items, pagination } = paginate(sorted, query, 15);
    return ok(items, "OK", { pagination, meta: { counts } });
  }),

  vroute("GET", "/vendor/customers/:id", ({ db, params, actor }) => {
    const orders = db.orders
      .filter((o) => o.customerId === params.id && actor.branchIds.includes(o.branchId))
      .sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt));
    const customer = db.customers.find((c) => c.id === params.id);
    if (!customer || !orders.length) throw new MockApiError("العميل غير موجود ضمن عملاء مغسلتك", 404);
    const completed = orders.filter((o) => o.status === "completed");
    const spent = completed.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0);
    const details: VendorCustomerDetails = {
      customer,
      vehicles: db.vehicles.filter((v) => v.customerId === customer.id),
      orders: orders.map((o) => toVendorItem(db, o)),
      favoriteServices: favorite(orders),
      reviews: db.reviews.filter((r) => r.customerId === customer.id && actor.branchIds.includes(r.branchId)),
      stats: {
        visits: completed.length,
        totalSpent: spent,
        avgTicket: completed.length ? Math.round(spent / completed.length) : 0,
        noShows: orders.filter((o) => o.status === "no_show").length,
        cancellations: orders.filter((o) => o.status === "cancelled").length,
        segment: segmentOf(orders),
      },
    };
    return ok(details);
  }),

  // ── Reviews (D13 / OW-20) ────────────────────────────────
  vroute("GET", "/vendor/reviews", ({ db, query, actor }) => {
    const branchIds = scopeBranches(actor, query.get("branchId"));
    const stars = query.get("stars");
    const replied = query.get("replied");
    const visible = db.reviews.filter((r) => branchIds.includes(r.branchId) && r.status === "visible");
    const list: VendorReview[] = visible
      .filter((r) => (!stars || stars === "all" || r.stars === Number(stars)) && (!replied || replied === "all" || (replied === "yes" ? Boolean(r.reply) : !r.reply)))
      .map((r) => ({
        ...r,
        customerName: db.customers.find((c) => c.id === r.customerId)?.name ?? "—",
        branchName: branchName(db, r.branchId),
        serviceName: db.services.find((s) => s.id === r.serviceId)?.name ?? { ar: "—", en: "—" },
        orderNumber: db.orders.find((o) => o.id === r.orderId)?.number ?? null,
      }))
      .filter((r) => matchesSearch(query, r.comment.ar, r.customerName, r.orderNumber));
    const sorted = sortBy(list, query, { createdAt: (r) => r.createdAt, stars: (r) => r.stars }, { key: "createdAt", order: "desc" });
    const { items, pagination } = paginate(sorted, query, 10);
    const dist = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } as Record<"1" | "2" | "3" | "4" | "5", number>;
    visible.forEach((r) => (dist[String(r.stars) as keyof typeof dist] += 1));
    return ok(items, "OK", {
      pagination,
      meta: {
        average: visible.length ? round2(visible.reduce((s, r) => s + r.stars, 0) / visible.length) : 0,
        count: visible.length,
        distribution: dist,
        unreplied: visible.filter((r) => !r.reply).length,
        reported: visible.filter((r) => r.reportedByWash).length,
      },
    });
  }),

  vroute("POST", "/vendor/reviews/:id/reply", ({ db, params, body, actor }) => {
    const review = db.reviews.find((r) => r.id === params.id && actor.branchIds.includes(r.branchId) && r.status === "visible");
    if (!review) throw new MockApiError("التقييم غير موجود", 404);
    if (review.reply) throw new MockApiError("تم الرد على هذا التقييم مسبقًا (رد واحد لكل تقييم)", 409);
    const text = requireText(body.text, "text", "نص الرد", 5);
    if (text.length > 400) throw new MockApiError("الرد طويل جدًا (400 حرف كحد أقصى)", 422);
    review.reply = text;
    review.replyAt = now().toISOString();
    logAudit(db, { actorType: "staff", actorId: actor.staff.id, action: "review.reply", entity: "reviews", entityId: review.id, branchId: review.branchId, newValue: text });
    return ok(review, "تم نشر الرد — يظهر للعملاء في التطبيق");
  }),

  vroute("POST", "/vendor/reviews/:id/report", ({ db, params, body, actor }) => {
    const review = db.reviews.find((r) => r.id === params.id && actor.branchIds.includes(r.branchId) && r.status === "visible");
    if (!review) throw new MockApiError("التقييم غير موجود", 404);
    if (review.reportedByWash) throw new MockApiError("تم إبلاغ كارزن عن هذا التقييم مسبقًا", 409);
    const reason = requireText(body.reason, "reason", "سبب الإبلاغ", 5);
    review.reportedByWash = true;
    review.reportReason = reason;
    logAudit(db, { actorType: "staff", actorId: actor.staff.id, action: "review.report", entity: "reviews", entityId: review.id, branchId: review.branchId, newValue: "reported", reason });
    // Lands in the super admin's moderation queue (Reviews → "أبلغت عنه المغسلة").
    pushAdminNotification(
      db,
      "critical_review",
      { ar: `${actor.business.name.ar} أبلغت عن تقييم`, en: `${actor.business.name.en} reported a review` },
      { ar: `تقييم ${review.stars} نجوم — السبب: ${reason}`, en: `${review.stars}-star review — ${reason}` },
      "/reviews?filter=reported",
    );
    return ok(review, "تم إبلاغ فريق كارزن للمراجعة");
  }),

  // ── Reports (D14 / OW-18) ────────────────────────────────
  vroute("GET", "/vendor/reports", ({ db, query, actor }) => {
    const branchIds = scopeBranches(actor, query.get("branchId"));
    const type = (["orders", "revenue", "services", "source", "employees"] as const).find((t) => t === query.get("type")) ?? "orders";
    const to = query.get("to") ? new Date(`${query.get("to")}T23:59:59`) : (() => { const d = new Date(now()); d.setHours(23, 59, 59, 999); return d; })();
    const from = query.get("from") ? new Date(`${query.get("from")}T00:00:00`) : daysAgo(13);
    if (to <= from) throw new MockApiError("تاريخ النهاية يجب أن يكون بعد البداية", 422);
    if ((to.getTime() - from.getTime()) / 86400000 > 92) throw new MockApiError("أقصى مدى للتقرير 3 شهور", 422);
    return ok(buildReport(db, branchIds, type, from, to));
  }),

  // ── Financials (D15 / OW-14) ─────────────────────────────
  vroute("GET", "/vendor/finance", ({ db, query, actor }) => {
    const branchIds = scopeBranches(actor, query.get("branchId"));
    const raw = query.get("period");
    const period: VendorPeriod = raw === "today" || raw === "7d" ? raw : "30d";
    const n = PERIOD_DAYS[period];
    const from = daysAgo(n - 1);
    const scoped = db.orders.filter((o) => branchIds.includes(o.branchId));
    const inRange = scoped.filter((o) => new Date(o.scheduledAt) >= from && new Date(o.scheduledAt) <= new Date(now().getTime() + 86400000));
    const paid = inRange.filter((o) => o.paymentStatus === "paid");
    const revenue = paid.reduce((s, o) => s + o.total, 0);
    const rate = effectiveCommissionRate(db, actor.business.id);
    const commission = round2((revenue * rate) / 100);
    const pending = scoped.filter((o) => o.status === "completed" && o.paymentStatus === "pending");
    const discounted = inRange.filter((o) => hasManualDiscount(o) && o.status !== "cancelled");
    const byStaff = new Map<string, { staffId: string; name: string; count: number; amount: number }>();
    discounted.forEach((o) => {
      const log = db.auditLogs.find((a) => a.action === "order.discount" && a.entityId === o.id);
      const id = log?.actorId ?? o.assignedStaffId ?? "unknown";
      const cur = byStaff.get(id) ?? { staffId: id, name: staffName(db, id) ?? "—", count: 0, amount: 0 };
      cur.count += 1;
      cur.amount += o.discount!.amount;
      byStaff.set(id, cur);
    });
    const finance: VendorFinance = {
      period,
      revenue,
      commissionRate: rate,
      commission,
      net: round2(revenue - commission),
      refunds: inRange.filter((o) => o.paymentStatus === "refunded").reduce((s, o) => s + o.total, 0),
      discounts: discounted.reduce((s, o) => s + (o.discount?.amount ?? 0), 0),
      paidOrders: paid.length,
      pendingPayments: { count: pending.length, amount: pending.reduce((s, o) => s + o.total, 0), orders: pending.map((o) => toVendorItem(db, o)) },
      byDay: Array.from({ length: n }, (_, i) => {
        const d = daysAgo(n - 1 - i);
        return { label: `${d.getDate()}/${d.getMonth() + 1}`, date: dayKey(d), revenue: paid.filter((o) => isSameDay(o.scheduledAt, d)).reduce((s, o) => s + o.total, 0) };
      }),
      byMethod: (["cash", "card", "online"] as PaymentMethod[]).map((method) => {
        const list = paid.filter((o) => o.paymentMethod === method);
        return { method, amount: list.reduce((s, o) => s + o.total, 0), count: list.length };
      }),
      byBranch: branchIds.map((id) => {
        const list = paid.filter((o) => o.branchId === id);
        return { branchId: id, name: branchName(db, id), revenue: list.reduce((s, o) => s + o.total, 0), orders: list.length };
      }),
      discountsByStaff: [...byStaff.values()].sort((a, b) => b.amount - a.amount),
      payouts: db.payouts.filter((p) => p.businessId === actor.business.id).sort((a, b) => b.periodEnd.localeCompare(a.periodEnd)),
    };
    return ok(finance);
  }),

  // ── Audit log (D17 / OW-16) ──────────────────────────────
  vroute("GET", "/vendor/audit", ({ db, query, actor }) => {
    const branchIds = scopeBranches(actor, query.get("branchId"));
    const orderIds = new Set(db.orders.filter((o) => branchIds.includes(o.branchId)).map((o) => o.id));
    const staffIds = new Set(db.staff.filter((s) => s.businessId === actor.business.id).map((s) => s.id));
    const actorId = query.get("actorId");
    const action = query.get("action");
    const from = query.get("from");
    const to = query.get("to");
    const relevant = db.auditLogs.filter(
      (a) =>
        (a.branchId !== null && branchIds.includes(a.branchId)) ||
        orderIds.has(a.entityId) ||
        a.entityId === actor.business.id ||
        (a.actorType === "staff" && staffIds.has(a.actorId) && actor.role === "owner"),
    );
    const list: VendorAuditItem[] = relevant
      .filter(
        (a) =>
          (!actorId || actorId === "all" || (actorId === CARZEN_ACTOR ? a.actorType === "admin" : a.actorId === actorId)) &&
          (!action || action === "all" || a.action === action) &&
          (!from || a.at >= new Date(`${from}T00:00:00`).toISOString()) &&
          (!to || a.at <= new Date(`${to}T23:59:59`).toISOString()),
      )
      .map((a) => ({
        ...a,
        ...vendorFacingActor(db, a),
        branchName: a.branchId ? branchName(db, a.branchId) : null,
      }))
      .filter((a) => matchesSearch(query, a.entityId, a.reason, a.actorName, a.newValue))
      .sort((a, b) => b.at.localeCompare(a.at));
    const { items, pagination } = paginate(list, query, 20);
    const actors = new Map<string, string>();
    relevant.forEach((a) => {
      const v = vendorFacingActor(db, a);
      actors.set(v.actorId, v.actorName);
    });
    return ok(items, "OK", {
      pagination,
      meta: { actions: [...new Set(relevant.map((a) => a.action))].sort(), actors: [...actors.entries()].map(([id, name]) => ({ id, name })) },
    });
  }),

  // ── Notifications (D18 / OW-21) ──────────────────────────
  vroute("GET", "/vendor/notifications", ({ db, query, actor }) => {
    const filter = query.get("filter");
    const mine = db.vendorNotifications
      .filter((n) => n.businessId === actor.business.id && (n.branchId === null || actor.branchIds.includes(n.branchId)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const list = mine.filter((n) => (filter === "unread" ? !n.read : filter && filter !== "all" ? n.type === filter : true));
    const { items, pagination } = paginate(list, query, 20);
    return ok(items, "OK", { pagination, meta: { unread: mine.filter((n) => !n.read).length } });
  }),

  vroute("POST", "/vendor/notifications/:id/read", ({ db, params, actor }) => {
    const n = db.vendorNotifications.find((x) => x.id === params.id && x.businessId === actor.business.id);
    if (!n) throw new MockApiError("الإشعار غير موجود", 404);
    n.read = true;
    return ok(n);
  }),

  vroute("POST", "/vendor/notifications/read-all", ({ db, actor }) => {
    db.vendorNotifications.filter((n) => n.businessId === actor.business.id && (n.branchId === null || actor.branchIds.includes(n.branchId))).forEach((n) => (n.read = true));
    return ok(null, "تم تعليم كل الإشعارات كمقروءة");
  }),

  // ── Global search (plate / phone / order number) ─────────
  vroute("GET", "/vendor/search", ({ db, query, actor }) => {
    const q = query.get("q")?.trim() ?? "";
    if (q.length < 2) return ok({ query: q, results: [] as VendorSearchResult[] });
    const sq = new URLSearchParams({ search: q });
    const plateQ = q.replace(/[\s-]/g, "").toUpperCase();
    const results: VendorSearchResult[] = [];
    const orders = db.orders.filter((o) => actor.branchIds.includes(o.branchId));
    orders
      .filter((o) => matchesSearch(sq, o.number, o.code))
      .slice(0, 5)
      .forEach((o) => results.push({ id: o.id, group: "orders", title: o.number, subtitle: `${o.plate} · ${serviceName(o).ar}`, href: `/orders/${o.id}` }));
    const plates = new Map<string, { id: string; title: string; subtitle: string; href: string }>();
    orders
      .filter((o) => o.plate && o.plate.includes(plateQ))
      .forEach((o) => plates.set(o.plate, { id: o.id, title: o.plate, subtitle: `آخر طلب ${o.number}`, href: o.customerId ? `/customers/${o.customerId}` : `/orders/${o.id}` }));
    [...plates.values()].slice(0, 5).forEach((p) => results.push({ ...p, group: "plates" }));
    customersOf(db, actor.branchIds)
      .filter((c) => matchesSearch(sq, c.name, c.phone, c.phone.replace(/\s/g, "")))
      .slice(0, 5)
      .forEach((c) => results.push({ id: c.id, group: "customers", title: c.name, subtitle: c.phone, href: `/customers/${c.id}` }));
    return ok({ query: q, results });
  }),
];
