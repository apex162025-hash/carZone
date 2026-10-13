import "server-only";

import type {
  BranchListItem,
  BusinessStatus,
  StaffListItem,
  SuspendReason,
  WashDetails,
  WashListItem,
  WashOrderSummary,
} from "@/types/washes";
import type { Order } from "@/types/orders";
import { isSameDay, logAudit, now, pushAdminNotification, round2 } from "@/lib/mock-api/db";
import {
  MockApiError,
  countBy,
  matchesSearch,
  ok,
  paginate,
  requireText,
  sortBy,
} from "@/lib/mock-api/http";
import {
  ACTIVE_STATUSES,
  UPCOMING_STATUSES,
  branchName,
  businessName,
  findOrThrow,
  serviceName,
} from "@/lib/mock-api/lookups";
import { route } from "@/lib/mock-api/router";
import type { MockDatabase } from "@/lib/mock-api/schema";

const BUSINESS_STATUSES: BusinessStatus[] = ["pending", "approved", "active", "suspended", "rejected"];

const SUSPEND_REASON_LABELS: Record<SuspendReason, string> = {
  repeated_complaints: "شكاوى متكررة",
  incorrect_information: "بيانات غير صحيحة",
  operational_issue: "مشكلة تشغيلية",
  policy_violation: "مخالفة السياسات",
  owner_request: "بطلب من المالك",
};

function toOrderSummary(db: MockDatabase, o: Order): WashOrderSummary {
  return {
    id: o.id,
    number: o.number,
    branchName: branchName(db, o.branchId),
    serviceName: serviceName(o),
    scheduledAt: o.scheduledAt,
    status: o.status,
    total: o.total,
  };
}

function upcomingOrders(db: MockDatabase, businessId: string) {
  const t = now();
  return db.orders
    .filter(
      (o) =>
        o.businessId === businessId &&
        (UPCOMING_STATUSES as readonly string[]).includes(o.status) &&
        new Date(o.scheduledAt) > t,
    )
    .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
}

function toWashListItem(db: MockDatabase, bizId: string): WashListItem {
  const b = findOrThrow(db.businesses, bizId, "المغسلة");
  const branches = db.branches.filter((br) => br.businessId === b.id);
  const orders = db.orders.filter((o) => o.businessId === b.id);
  const complaints = db.complaints.filter((c) => c.businessId === b.id);
  const paid = orders.filter((o) => o.status === "completed" && o.paymentStatus === "paid");
  const t = now();
  const lastActivityAt = orders
    .filter((o) => new Date(o.scheduledAt) <= t)
    .reduce<string | null>((acc, o) => (!acc || o.scheduledAt > acc ? o.scheduledAt : acc), null);
  return {
    ...b,
    branchesCount: branches.length,
    areas: [...new Set(branches.map((br) => br.area))],
    ordersCount: orders.length,
    completedCount: orders.filter((o) => o.status === "completed").length,
    activeOrders: orders.filter((o) => (ACTIVE_STATUSES as readonly string[]).includes(o.status)).length,
    complaintsCount: complaints.length,
    openComplaints: complaints.filter((c) => c.status !== "resolved" && c.status !== "closed").length,
    gmv: paid.reduce((s, o) => s + o.total, 0),
    lastActivityAt,
  };
}

export const washRoutes = [
  route("GET", "/admin/washes", ({ db, query }) => {
    const status = query.get("status");
    const area = query.get("area");

    const all = db.businesses.map((b) => toWashListItem(db, b.id));
    const searched = all.filter(
      (w) =>
        matchesSearch(query, w.name.ar, w.name.en, w.ownerName) &&
        (!area || area === "all" || w.areas.includes(area)),
    );
    const counts = countBy(searched, BUSINESS_STATUSES, (w) => w.status);
    const filtered = status && status !== "all" ? searched.filter((w) => w.status === status) : searched;

    const sorted = sortBy(
      filtered,
      query,
      {
        name: (w) => w.name.ar,
        createdAt: (w) => w.createdAt,
        rating: (w) => w.rating,
        ordersCount: (w) => w.ordersCount,
        branchesCount: (w) => w.branchesCount,
        gmv: (w) => w.gmv,
        complaintsCount: (w) => w.openComplaints,
        lastActivityAt: (w) => w.lastActivityAt,
      },
      { key: "gmv", order: "desc" },
    );
    const { items, pagination } = paginate(sorted, query);
    return ok(items, "OK", { pagination, meta: { counts } });
  }),

  route("GET", "/admin/washes/:id", ({ db, params }) => {
    const business = findOrThrow(db.businesses, params.id, "المغسلة");
    const branches = db.branches.filter((b) => b.businessId === business.id);
    const branchIds = new Set(branches.map((b) => b.id));
    const orders = db.orders.filter((o) => o.businessId === business.id);
    const transactions = db.transactions.filter((t) => t.businessId === business.id);
    const pendingPayout = db.payouts
      .filter((p) => p.businessId === business.id && p.status === "due")
      .reduce((s, p) => s + p.amountDue - p.amountPaid, 0);
    const gross = transactions.reduce((s, t) => s + t.gross, 0);
    const commission = transactions.reduce((s, t) => s + t.commission, 0);

    const details: WashDetails = {
      business,
      branches: branches.map((b) => ({
        ...b,
        todayOrders: orders.filter((o) => o.branchId === b.id && isSameDay(o.scheduledAt, now())).length,
        servicesCount: db.services.filter((s) => s.branchId === b.id).length,
      })),
      services: db.services.filter((s) => branchIds.has(s.branchId)),
      staff: db.staff.filter((s) => s.businessId === business.id),
      bookingStats: {
        total: orders.length,
        completed: orders.filter((o) => o.status === "completed").length,
        cancelled: orders.filter((o) => o.status === "cancelled").length,
        noShow: orders.filter((o) => o.status === "no_show").length,
        upcoming: upcomingOrders(db, business.id).length,
      },
      recentOrders: [...orders]
        .sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt))
        .slice(0, 12)
        .map((o) => toOrderSummary(db, o)),
      reviews: db.reviews
        .filter((r) => r.businessId === business.id)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 12),
      complaints: db.complaints.filter((c) => c.businessId === business.id),
      transactions: [...transactions].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 15),
      financials: {
        gross,
        commission: round2(commission),
        netToWash: round2(gross - commission),
        pendingPayout,
        effectiveRate: business.commissionRate ?? db.defaultCommissionPct,
      },
      auditLogs: db.auditLogs
        .filter((a) => a.entityId === business.id || (a.branchId !== null && branchIds.has(a.branchId)))
        .slice(0, 30),
    };
    return ok(details);
  }),

  route("GET", "/admin/washes/:id/impact", ({ db, params }) => {
    const business = findOrThrow(db.businesses, params.id, "المغسلة");
    return ok({
      upcomingOrders: upcomingOrders(db, business.id).map((o) => toOrderSummary(db, o)),
      activeBranches: db.branches.filter((b) => b.businessId === business.id && b.active).length,
    });
  }),

  route("POST", "/admin/washes/:id/suspend", ({ db, params, body, admin }) => {
    const business = findOrThrow(db.businesses, params.id, "المغسلة");
    if (business.status !== "active") {
      throw new MockApiError("يمكن تعليق المغاسل النشطة فقط", 409);
    }
    const reason = String(body.reason ?? "") as SuspendReason;
    if (!SUSPEND_REASON_LABELS[reason]) throw new MockApiError("اختر سبب التعليق", 422);
    const note = requireText(body.note, "note", "ملاحظة التعليق");
    const cancelUpcoming = Boolean(body.cancelUpcoming);

    const old = business.status;
    business.status = "suspended";
    business.statusReason = `${SUSPEND_REASON_LABELS[reason]} — ${note}`;

    let cancelled = 0;
    if (cancelUpcoming) {
      for (const o of upcomingOrders(db, business.id)) {
        o.status = "cancelled";
        o.cancel = { reason: "تعليق المغسلة من إدارة المنصة", byType: "admin", byId: admin.id, at: new Date().toISOString() };
        o.timeline.push({ status: "cancelled", at: new Date().toISOString(), byType: "admin", byId: admin.id });
        cancelled += 1;
      }
    }

    logAudit(db, {
      actorId: admin.id,
      action: "suspend_wash",
      entity: "businesses",
      entityId: business.id,
      oldValue: old,
      newValue: "suspended",
      reason: `${SUSPEND_REASON_LABELS[reason]}: ${note}${cancelled ? ` (ألغي ${cancelled} حجز قادم)` : ""}`,
    });
    return ok(business, `تم تعليق ${business.name.ar}${cancelled ? ` وإلغاء ${cancelled} حجز` : ""}`);
  }),

  route("POST", "/admin/washes/:id/reactivate", ({ db, params, body, admin }) => {
    const business = findOrThrow(db.businesses, params.id, "المغسلة");
    if (business.status !== "suspended") {
      throw new MockApiError("المغسلة ليست معلّقة", 409);
    }
    const note = requireText(body.note, "note", "ملاحظة إعادة التفعيل");
    const old = business.status;
    business.status = "active";
    business.statusReason = null;
    logAudit(db, {
      actorId: admin.id,
      action: "reactivate_wash",
      entity: "businesses",
      entityId: business.id,
      oldValue: old,
      newValue: "active",
      reason: note,
    });
    return ok(business, `تمت إعادة تفعيل ${business.name.ar}`);
  }),

  route("PATCH", "/admin/washes/:id", ({ db, params, body, admin }) => {
    const business = findOrThrow(db.businesses, params.id, "المغسلة");
    const reason = requireText(body.reason, "reason", "سبب التعديل", 5);
    const patch = (body.patch ?? {}) as Partial<typeof business>;
    const before = { name: business.name, ownerName: business.ownerName, commissionRate: business.commissionRate };

    if (patch.name) business.name = { ar: String(patch.name.ar).trim(), en: String(patch.name.en).trim() };
    if (patch.ownerName) business.ownerName = String(patch.ownerName).trim();
    if (patch.commissionRate !== undefined) {
      const rate = patch.commissionRate === null ? null : Number(patch.commissionRate);
      if (rate !== null && (Number.isNaN(rate) || rate < 0 || rate > 30)) {
        throw new MockApiError("نسبة العمولة يجب أن تكون بين 0 و 30٪", 422);
      }
      business.commissionRate = rate;
    }

    logAudit(db, {
      actorId: admin.id,
      action: "edit_business_data",
      entity: "businesses",
      entityId: business.id,
      oldValue: before,
      newValue: { name: business.name, ownerName: business.ownerName, commissionRate: business.commissionRate },
      reason,
    });
    return ok(business, "تم حفظ التعديلات وتسجيلها في سجل التدقيق");
  }),

  route("GET", "/admin/branches", ({ db, query }) => {
    const area = query.get("area");
    const status = query.get("status");
    const list: BranchListItem[] = db.branches.map((b) => {
      const biz = db.businesses.find((x) => x.id === b.businessId)!;
      return {
        ...b,
        businessName: biz.name,
        businessStatus: biz.status,
        todayOrders: db.orders.filter((o) => o.branchId === b.id && isSameDay(o.scheduledAt, now())).length,
      };
    });
    const filtered = list.filter(
      (b) =>
        matchesSearch(query, b.name.ar, b.name.en, b.businessName.ar) &&
        (!area || area === "all" || b.area === area) &&
        (!status || status === "all" || (status === "active" ? b.active : !b.active)),
    );
    const sorted = sortBy(
      filtered,
      query,
      {
        name: (b) => b.name.ar,
        capacity: (b) => b.capacity,
        rating: (b) => b.rating,
        todayOrders: (b) => b.todayOrders,
      },
      { key: "todayOrders", order: "desc" },
    );
    const { items, pagination } = paginate(sorted, query, 20);
    return ok(items, "OK", {
      pagination,
      meta: { counts: { all: list.length, active: list.filter((b) => b.active).length, inactive: list.filter((b) => !b.active).length } },
    });
  }),

  route("POST", "/admin/branches/:id/toggle", ({ db, params, body, admin }) => {
    const branch = findOrThrow(db.branches, params.id, "الفرع");
    const active = Boolean(body.active);
    const reason = requireText(body.reason, "reason", "السبب");
    const old = branch.active;
    branch.active = active;
    logAudit(db, {
      actorId: admin.id,
      action: active ? "activate_branch" : "deactivate_branch",
      entity: "branches",
      entityId: branch.id,
      branchId: branch.id,
      oldValue: old ? "active" : "inactive",
      newValue: active ? "active" : "inactive",
      reason,
    });
    return ok(branch, active ? "تم تفعيل الفرع" : "تم إيقاف الفرع");
  }),

  route("GET", "/admin/staff", ({ db, query }) => {
    const role = query.get("role");
    const list: StaffListItem[] = db.staff.map((s) => ({
      ...s,
      businessName: businessName(db, s.businessId),
      branchName: s.branchId ? branchName(db, s.branchId) : null,
      businessStatus: db.businesses.find((b) => b.id === s.businessId)?.status ?? "active",
    }));
    const searched = list.filter((s) => matchesSearch(query, s.name, s.phone, s.businessName.ar, s.businessName.en));
    const counts = countBy(searched, ["owner", "manager", "employee"] as const, (s) => s.role);
    const filtered = role && role !== "all" ? searched.filter((s) => s.role === role) : searched;
    const sorted = sortBy(filtered, query, { name: (s) => s.name, role: (s) => s.role, business: (s) => s.businessName.ar }, { key: "business", order: "asc" });
    const { items, pagination } = paginate(sorted, query, 15);
    return ok(items, "OK", { pagination, meta: { counts } });
  }),

  route("POST", "/admin/staff/:id/status", ({ db, params, body, admin }) => {
    const member = findOrThrow(db.staff, params.id, "الموظف");
    const suspended = Boolean(body.suspended);
    const reason = requireText(body.reason, "reason", "السبب");
    const old = member.status;
    member.status = suspended ? "suspended" : "active";
    logAudit(db, {
      actorId: admin.id,
      action: suspended ? "suspend_staff" : "reactivate_staff",
      entity: "staff",
      entityId: member.id,
      oldValue: old,
      newValue: member.status,
      reason,
    });
    if (suspended && member.role === "owner") {
      pushAdminNotification(
        db,
        "unusual_activity",
        { ar: "تم إيقاف حساب مالك", en: "Owner account suspended" },
        { ar: `${member.name} — ${businessName(db, member.businessId).ar}`, en: member.name },
        `/washes/${member.businessId}`,
      );
    }
    return ok(member, suspended ? "تم إيقاف الحساب" : "تمت إعادة تفعيل الحساب");
  }),
];
