import "server-only";

import type { PaymentMethod } from "@carzen/contracts/orders";
import type { DayClosing, DayClosingSummary, MethodTotals, ShiftClosing, StaffPerformance, VendorStaffMember } from "@carzen/contracts/vendor/team";
import type { ShiftPattern, StaffPermissions, StaffRole } from "@carzen/contracts/washes";
import { daysAgo, logAudit, nid, now, round2 } from "../db";
import { MockApiError, matchesSearch, ok, paginate, requireText, sortBy } from "../http";
import { branchName } from "../lookups";
import { type VendorActor, vroute } from "../router";
import type { MockDatabase } from "../schema";
import { defaultPermissions } from "../seed";
import { clockToMin, dayKey, hasManualDiscount, normalizePhone, onShiftAt, prettyPhone, staffName } from "./engine";
import { assertBranch, assertOwner, scopeBranches, singleBranch } from "./scope";

const PERIOD_DAYS = { today: 1, "7d": 7, "30d": 30 } as const;
const PERMISSION_KEYS: (keyof StaffPermissions)[] = ["confirmBooking", "cancelOrder", "closeShift", "editServices", "refund", "collectPayment", "runService", "manageStaff"];

function audit(db: MockDatabase, actor: VendorActor, action: string, entity: string, entityId: string, branchId: string | null, oldValue: unknown, newValue: unknown, reason?: string | null) {
  logAudit(db, { actorType: "staff", actorId: actor.staff.id, action, entity, entityId, branchId, oldValue, newValue, reason: reason ?? null });
}

function performance(db: MockDatabase, staffId: string, from: Date): StaffPerformance {
  const orders = db.orders.filter((o) => o.assignedStaffId === staffId && o.status === "completed" && new Date(o.scheduledAt) >= from);
  const durations = orders
    .map((o) => {
      const s = o.timeline.find((e) => e.status === "in_service");
      const e = o.timeline.find((x) => x.status === "completed");
      return s && e ? (new Date(e.at).getTime() - new Date(s.at).getTime()) / 60000 : null;
    })
    .filter((d): d is number => d !== null);
  const reviews = db.reviews.filter((r) => r.status === "visible" && orders.some((o) => o.id === r.orderId));
  const discountLogs = db.auditLogs.filter((a) => a.action === "order.discount" && a.actorId === staffId && new Date(a.at) >= from);
  const discounted = orders.filter((o) => hasManualDiscount(o));
  return {
    completed: orders.length,
    serviceValue: orders.reduce((s, o) => s + o.total, 0),
    avgDurationMin: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    expectedDurationMin: orders.length ? Math.round(orders.reduce((s, o) => s + o.durationMin, 0) / orders.length) : null,
    rating: reviews.length ? round2(reviews.reduce((s, r) => s + r.stars, 0) / reviews.length) : null,
    discountsCount: Math.max(discountLogs.length, discounted.length),
    discountsAmount: discounted.reduce((s, o) => s + (o.discount?.amount ?? 0), 0),
  };
}

function parsePermissions(raw: unknown, role: StaffRole): StaffPermissions {
  const base = defaultPermissions(role);
  if (!raw || typeof raw !== "object") return base;
  const out = { ...base };
  for (const k of PERMISSION_KEYS) if (k in (raw as object)) out[k] = Boolean((raw as Record<string, unknown>)[k]);
  return out;
}

function toClosing(db: MockDatabase, s: MockDatabase["shifts"][number]): ShiftClosing {
  return {
    id: s.id,
    staffId: s.staffId,
    staffName: staffName(db, s.staffId) ?? "—",
    branchId: s.branchId,
    branchName: branchName(db, s.branchId),
    scheduledStart: s.scheduledStart,
    scheduledEnd: s.scheduledEnd,
    actualStart: s.actualStart,
    actualEnd: s.actualEnd,
    ordersCompleted: s.ordersCompleted,
    cashPayments: s.cashPayments,
    cardPayments: s.cardPayments,
    expectedCash: s.expectedCash,
    actualCash: s.actualCash,
    difference: s.difference,
    reason: s.reason?.ar ?? null,
    status: s.reviewStatus,
    reviewNote: s.reviewNote,
    reviewedBy: staffName(db, s.reviewedBy),
  };
}

const METHODS: PaymentMethod[] = ["cash", "card", "online"];

function methodTotals(values: Partial<Record<PaymentMethod, number>>): MethodTotals {
  const t = { cash: values.cash ?? 0, card: values.card ?? 0, online: values.online ?? 0 };
  return { ...t, total: t.cash + t.card + t.online };
}

export const vendorTeamRoutes = [
  // ── Employees (D10 / OW-11 / OW-17) ──────────────────────
  vroute("GET", "/vendor/staff", ({ db, query, actor }) => {
    const branchIds = scopeBranches(actor, query.get("branchId"));
    const role = query.get("role");
    const period = (query.get("period") as keyof typeof PERIOD_DAYS) ?? "30d";
    const from = daysAgo((PERIOD_DAYS[period] ?? 30) - 1);
    const onShift = new Set(branchIds.flatMap((id) => onShiftAt(db, id)).map((s) => s.id));
    const list: VendorStaffMember[] = db.staff
      .filter((s) => s.businessId === actor.business.id && (branchIds.includes(s.branchId) || s.role === "owner"))
      .filter((s) => (actor.role === "owner" || s.role !== "owner") && (!role || role === "all" || s.role === role))
      .filter((s) => matchesSearch(query, s.name, s.phone, s.phone.replace(/\s/g, "")))
      .map((s) => ({ ...s, branchName: branchName(db, s.branchId), onShiftNow: onShift.has(s.id), performance: performance(db, s.id, from) }));
    const sorted = sortBy(
      list,
      query,
      {
        name: (s) => s.name,
        completed: (s) => s.performance.completed,
        serviceValue: (s) => s.performance.serviceValue,
        rating: (s) => s.performance.rating,
        avgDuration: (s) => s.performance.avgDurationMin,
        discounts: (s) => s.performance.discountsAmount,
      },
      { key: "completed", order: "desc" },
    );
    const counts = { all: list.length, owner: list.filter((s) => s.role === "owner").length, manager: list.filter((s) => s.role === "manager").length, employee: list.filter((s) => s.role === "employee").length };
    return ok(sorted, "OK", { meta: { counts, onShift: onShift.size } });
  }),

  vroute("POST", "/vendor/staff", ({ db, body, actor }) => {
    if (!actor.staff.permissions.manageStaff) throw new MockApiError("ليس لديك صلاحية إدارة الموظفين", 403);
    const branchId = String(body.branchId ?? "");
    assertBranch(actor, branchId);
    const role: StaffRole = body.role === "manager" ? "manager" : "employee";
    if (role === "manager") assertOwner(actor, "إضافة مدير فرع");
    const name = requireText(body.name, "name", "الاسم", 3);
    const phone = normalizePhone(String(body.phone ?? ""));
    if (phone.length !== 10) throw new MockApiError("رقم موبايل غير صحيح", 422, { phone: ["رقم غير صحيح"] });
    if (db.staff.some((s) => normalizePhone(s.phone) === phone)) throw new MockApiError("هذا الرقم مسجل لحساب آخر", 409, { phone: ["مسجل بالفعل"] });
    const maxDiscountPct = Math.min(Number(body.maxDiscountPct ?? 10), actor.role === "owner" ? 50 : actor.staff.maxDiscountPct);
    const member = {
      id: nid("st"),
      businessId: actor.business.id,
      branchId,
      name,
      phone: prettyPhone(phone),
      role,
      status: "active" as const,
      maxDiscountPct: Number.isNaN(maxDiscountPct) ? 10 : maxDiscountPct,
      permissions: parsePermissions(body.permissions, role),
      scheduledShifts: [{ start: "09:00", end: "17:00", days: [0, 1, 2, 3, 4, 5, 6] }],
      joinedAt: now().toISOString(),
    };
    db.staff.push(member);
    db.staffPasswords[member.id] = "demo1234";
    audit(db, actor, "staff.create", "staff", member.id, branchId, null, `${name} · ${role}`);
    return ok(member, `تمت إضافة ${name} — كلمة المرور المؤقتة demo1234`);
  }),

  vroute("PATCH", "/vendor/staff/:id", ({ db, params, body, actor }) => {
    const member = db.staff.find((s) => s.id === params.id && s.businessId === actor.business.id);
    if (!member || (!actor.branchIds.includes(member.branchId) && member.role !== "owner")) throw new MockApiError("الموظف غير موجود", 404);
    if (member.role === "owner") throw new MockApiError("لا يمكن تعديل حساب المالك من هنا", 403);
    // MG-09: managers can't change roles, discount limits or move staff to other branches.
    assertOwner(actor, "تعديل الدور وحد الخصم والصلاحيات");
    const reason = requireText(body.reason, "reason", "سبب التعديل", 3);
    const before = { role: member.role, branchId: member.branchId, maxDiscountPct: member.maxDiscountPct, permissions: member.permissions };
    if (body.name) member.name = requireText(body.name, "name", "الاسم", 3);
    if (body.role === "manager" || body.role === "employee") member.role = body.role;
    if (body.branchId) {
      assertBranch(actor, String(body.branchId));
      member.branchId = String(body.branchId);
    }
    if (body.maxDiscountPct !== undefined) {
      const pct = Number(body.maxDiscountPct);
      if (Number.isNaN(pct) || pct < 0 || pct > 50) throw new MockApiError("حد الخصم بين 0 و 50٪", 422, { maxDiscountPct: ["قيمة غير صالحة"] });
      member.maxDiscountPct = pct;
    }
    if (body.permissions) member.permissions = parsePermissions(body.permissions, member.role);
    audit(db, actor, "staff.update", "staff", member.id, member.branchId, before, { role: member.role, branchId: member.branchId, maxDiscountPct: member.maxDiscountPct, permissions: member.permissions }, reason);
    return ok(member, `تم تحديث بيانات ${member.name}`);
  }),

  vroute("POST", "/vendor/staff/:id/status", ({ db, params, body, actor }) => {
    if (!actor.staff.permissions.manageStaff) throw new MockApiError("ليس لديك صلاحية إدارة الموظفين", 403);
    const member = db.staff.find((s) => s.id === params.id && s.businessId === actor.business.id);
    if (!member || !actor.branchIds.includes(member.branchId) || member.role === "owner") throw new MockApiError("الموظف غير موجود", 404);
    if (member.id === actor.staff.id) throw new MockApiError("لا يمكنك إيقاف حسابك", 409);
    if (member.role === "manager") assertOwner(actor, "إيقاف مدير فرع");
    const active = Boolean(body.active);
    const reason = requireText(body.reason, "reason", "السبب", 3);
    const old = member.status;
    member.status = active ? "active" : "suspended";
    if (!active) for (const [tok, id] of Object.entries(db.vendorSessions)) if (id === member.id) delete db.vendorSessions[tok];
    audit(db, actor, "staff.status", "staff", member.id, member.branchId, old, member.status, reason);
    return ok(member, active ? `تم تفعيل حساب ${member.name}` : `تم إيقاف ${member.name} — لن يستطيع تسجيل الدخول`);
  }),

  vroute("PUT", "/vendor/staff/:id/schedule", ({ db, params, body, actor }) => {
    if (!actor.staff.permissions.manageStaff) throw new MockApiError("ليس لديك صلاحية إدارة الورديات", 403);
    const member = db.staff.find((s) => s.id === params.id && s.businessId === actor.business.id);
    if (!member || !actor.branchIds.includes(member.branchId) || member.role === "owner") throw new MockApiError("الموظف غير موجود", 404);
    const shifts = Array.isArray(body.shifts) ? (body.shifts as ShiftPattern[]) : [];
    for (const p of shifts) {
      if (!/^\d{2}:\d{2}$/.test(p.start) || !/^\d{2}:\d{2}$/.test(p.end)) throw new MockApiError("صيغة الوقت غير صحيحة", 422);
      if (clockToMin(p.end, true) <= clockToMin(p.start)) throw new MockApiError("نهاية الوردية يجب أن تكون بعد بدايتها", 422);
      if (!Array.isArray(p.days) || !p.days.every((d) => d >= 0 && d <= 6)) throw new MockApiError("أيام غير صالحة", 422);
    }
    const before = member.scheduledShifts;
    member.scheduledShifts = shifts.map((p) => ({ start: p.start, end: p.end, days: [...new Set(p.days)].sort() }));
    audit(db, actor, "staff.schedule", "staff", member.id, member.branchId, before, member.scheduledShifts);
    return ok(member, `تم تحديث جدول ${member.name}`);
  }),

  // ── Shift closings (D11 / MG-07 / OW-15) ─────────────────
  vroute("GET", "/vendor/shifts", ({ db, query, actor }) => {
    const branchIds = scopeBranches(actor, query.get("branchId"));
    const filter = query.get("filter") ?? "all";
    const base = db.shifts.filter((s) => branchIds.includes(s.branchId)).map((s) => toClosing(db, s));
    const counts = {
      all: base.length,
      difference: base.filter((s) => (s.difference ?? 0) !== 0).length,
      open: base.filter((s) => s.status === "open").length,
      submitted: base.filter((s) => s.status === "submitted").length,
      reviewed: base.filter((s) => s.status === "reviewed").length,
      flagged: base.filter((s) => s.status === "flagged").length,
    };
    const filtered = base.filter((s) => (filter === "all" ? true : filter === "difference" ? (s.difference ?? 0) !== 0 : s.status === filter));
    const sorted = [...filtered].sort((a, b) => (a.status === "submitted" ? -1 : 0) - (b.status === "submitted" ? -1 : 0) || b.scheduledStart.localeCompare(a.scheduledStart));
    const { items, pagination } = paginate(sorted, query, 15);
    return ok(items, "OK", {
      pagination,
      meta: {
        counts,
        totals: {
          expected: filtered.reduce((s, x) => s + x.expectedCash, 0),
          difference: filtered.reduce((s, x) => s + (x.difference ?? 0), 0),
        },
      },
    });
  }),

  vroute("GET", "/vendor/shifts/:id", ({ db, params, actor }) => {
    const shift = db.shifts.find((s) => s.id === params.id);
    if (!shift || !actor.branchIds.includes(shift.branchId)) throw new MockApiError("الوردية غير موجودة", 404);
    const start = new Date(shift.actualStart ?? shift.scheduledStart).getTime();
    const end = new Date(shift.actualEnd ?? now()).getTime();
    const orders = db.orders.filter((o) => {
      const t = new Date(o.scheduledAt).getTime();
      return o.assignedStaffId === shift.staffId && o.status === "completed" && t >= start - 3600000 && t <= end;
    });
    return ok({
      shift: toClosing(db, shift),
      orders: orders.map((o) => ({ id: o.id, number: o.number, plate: o.plate, total: o.total, method: o.paymentMethod, paid: o.paymentStatus === "paid", at: o.scheduledAt })),
      auditLogs: db.auditLogs.filter((a) => a.entityId === shift.id),
    });
  }),

  vroute("POST", "/vendor/shifts/:id/review", ({ db, params, body, actor }) => {
    if (!actor.staff.permissions.closeShift) throw new MockApiError("ليس لديك صلاحية مراجعة الورديات", 403);
    const shift = db.shifts.find((s) => s.id === params.id);
    if (!shift || !actor.branchIds.includes(shift.branchId)) throw new MockApiError("الوردية غير موجودة", 404);
    if (shift.reviewStatus === "open") throw new MockApiError("الوردية ما زالت مفتوحة — لا يمكن مراجعتها قبل الإغلاق", 409);
    const status = body.status === "flagged" ? "flagged" : "reviewed";
    const note = requireText(body.note, "note", "ملاحظة المراجعة", 3);
    const old = shift.reviewStatus;
    shift.reviewStatus = status;
    shift.reviewNote = note;
    shift.reviewedBy = actor.staff.id;
    logAudit(db, { actorType: "staff", actorId: actor.staff.id, action: status === "flagged" ? "shift.flag" : "shift.review", entity: "shifts", entityId: shift.id, branchId: shift.branchId, oldValue: old, newValue: status, reason: note });
    return ok(toClosing(db, shift), status === "flagged" ? "تم تمييز الوردية للمتابعة" : "تمت مراجعة الوردية");
  }),

  // ── End-of-day reconciliation (MG-08) ────────────────────
  vroute("GET", "/vendor/day-closing", ({ db, query, actor }) => {
    const branchId = singleBranch(actor, query.get("branchId"));
    const date = query.get("date") ?? dayKey(now());
    const dayOrders = db.orders.filter((o) => o.branchId === branchId && dayKey(o.scheduledAt) === date);
    const completed = dayOrders.filter((o) => o.status === "completed");
    const paid = completed.filter((o) => o.paymentStatus === "paid");
    const expected = methodTotals(Object.fromEntries(METHODS.map((m) => [m, paid.filter((o) => o.paymentMethod === m).reduce((s, o) => s + o.total, 0)])));
    const summary: DayClosingSummary = {
      branchId,
      branchName: branchName(db, branchId),
      date,
      closing: db.dayClosings.find((c) => c.branchId === branchId && c.date === date) ?? null,
      completedOrders: completed.length,
      expected,
      inServiceOrders: dayOrders.filter((o) => o.status === "in_service" || o.status === "waiting").length,
      unpaidOrders: completed.filter((o) => o.paymentStatus === "pending").length,
      orders: completed.map((o) => ({ id: o.id, number: o.number, plate: o.plate, total: o.total, method: o.paymentMethod, paid: o.paymentStatus === "paid" })),
      history: db.dayClosings.filter((c) => c.branchId === branchId).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    };
    return ok(summary);
  }),

  vroute("POST", "/vendor/day-closing", ({ db, body, actor }) => {
    if (!actor.staff.permissions.closeShift) throw new MockApiError("ليس لديك صلاحية إغلاق اليوم", 403);
    const branchId = String(body.branchId ?? "");
    assertBranch(actor, branchId);
    const date = String(body.date ?? dayKey(now()));
    if (db.dayClosings.some((c) => c.branchId === branchId && c.date === date)) throw new MockApiError("تم إغلاق هذا اليوم مسبقًا", 409);
    const dayOrders = db.orders.filter((o) => o.branchId === branchId && dayKey(o.scheduledAt) === date);
    const blocking = dayOrders.filter((o) => o.status === "in_service" || o.status === "waiting" || (o.status === "completed" && o.paymentStatus === "pending"));
    if (blocking.length) {
      throw new MockApiError(`لا يمكن الإغلاق: ${blocking.length} طلب ما زال قيد التنفيذ أو بدون دفع (${blocking.map((o) => o.number).slice(0, 4).join("، ")})`, 409);
    }
    const paid = dayOrders.filter((o) => o.status === "completed" && o.paymentStatus === "paid");
    const expected = methodTotals(Object.fromEntries(METHODS.map((m) => [m, paid.filter((o) => o.paymentMethod === m).reduce((s, o) => s + o.total, 0)])));
    const rawActual = (body.actual ?? {}) as Record<string, unknown>;
    const actual = methodTotals(Object.fromEntries(METHODS.map((m) => [m, Math.max(0, Number(rawActual[m] ?? 0) || 0)])));
    const difference = round2(actual.total - expected.total);
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (difference !== 0 && reason.length < 3) throw new MockApiError("يوجد فرق — اكتب سبب الفرق قبل الإغلاق", 422, { reason: ["مطلوب عند وجود فرق"] });

    const closing: DayClosing = {
      id: nid("dc"),
      branchId,
      date,
      expected,
      actual,
      difference,
      reason: reason || null,
      ordersLocked: paid.length,
      closedBy: actor.staff.id,
      closedByName: actor.staff.name,
      closedAt: now().toISOString(),
    };
    db.dayClosings.push(closing);
    paid.forEach((o) => {
      o.closedInDayId = closing.id;
    });
    logAudit(db, { actorType: "staff", actorId: actor.staff.id, action: "day.close", entity: "branches", entityId: branchId, branchId, oldValue: expected.total, newValue: actual.total, reason: reason || null });
    return ok(closing, difference ? `تم إغلاق اليوم بفرق ${difference} ج.م — تم قفل ${paid.length} طلب` : `تم إغلاق اليوم وقفل ${paid.length} طلب`);
  }),
];
