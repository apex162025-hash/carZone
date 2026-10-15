import "server-only";

import type { Localized } from "@carzen/contracts/common";
import type { Customer, Vehicle } from "@carzen/contracts/customers";
import type { Order, OrderItem, OrderStatus, PaymentMethod } from "@carzen/contracts/orders";
import type {
  AvailabilitySlot,
  CreateOrderPayload,
  CustomerRecognition,
  OrderAction,
  OrderActionPayload,
  PricePreview,
  PrimaryAction,
  VendorOrderListItem,
} from "@carzen/contracts/vendor/operations";
import type { Branch, Staff, WorkingDay } from "@carzen/contracts/washes";
import { isSameDay, logAudit, nid, now, round2 } from "../db";
import { MockApiError } from "../http";
import { effectiveCommissionRate, toOrderListItem } from "../lookups";
import type { VendorActor } from "../router";
import type { MockDatabase } from "../schema";
import { assertNotSuspended } from "./scope";

/** Orders that occupy a bay or a slot. */
export const OCCUPYING: OrderStatus[] = ["pending", "confirmed", "waiting", "in_service"];

// ── Time helpers ─────────────────────────────────────────────

export function dayKey(d: Date | string): string {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

/** "HH:MM" → minutes from midnight; a close time of 00:00 means midnight (1440). */
export function clockToMin(hhmm: string, isClose = false): number {
  const [h, m] = hhmm.split(":").map(Number);
  const v = h * 60 + m;
  return isClose && v === 0 ? 1440 : v;
}

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function hoursFor(branch: Branch, date: Date): WorkingDay {
  return branch.workingHours[date.getDay()] ?? { open: "09:00", close: "21:00", closed: false };
}

export function isOpenAt(branch: Branch, at: Date = now()): boolean {
  if (!branch.active) return false;
  const h = hoursFor(branch, at);
  if (h.closed) return false;
  const m = minutesOfDay(at);
  return m >= clockToMin(h.open) && m < clockToMin(h.close, true);
}

function atMinutes(date: Date, minutes: number): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return d;
}

// ── People ──────────────────────────────────────────────────

/** Employees/managers of a branch whose scheduled shift covers `at` (spec MG-04: on-shift staff). */
export function onShiftAt(db: MockDatabase, branchId: string, at: Date = now()): Staff[] {
  const m = minutesOfDay(at);
  return db.staff.filter(
    (s) =>
      s.branchId === branchId &&
      s.status === "active" &&
      s.role !== "owner" &&
      s.scheduledShifts.some((p) => p.days.includes(at.getDay()) && m >= clockToMin(p.start) && m < clockToMin(p.end, true)),
  );
}

export function staffName(db: MockDatabase, id: string | null): string | null {
  if (!id) return null;
  return db.staff.find((s) => s.id === id)?.name ?? null;
}

// ── Pricing (spec A8.1: price always computed, never typed) ──

export function priceServices(db: MockDatabase, branchId: string, serviceIds: string[]): PricePreview {
  if (!serviceIds.length) throw new MockApiError("اختر خدمة واحدة على الأقل", 422);
  const services = serviceIds.map((id) => {
    const s = db.services.find((x) => x.id === id && x.branchId === branchId);
    if (!s) throw new MockApiError("خدمة غير موجودة في هذا الفرع", 422);
    if (!s.active) throw new MockApiError(`الخدمة «${s.name.ar}» غير مفعلة`, 422);
    return s;
  });
  const primaries = services.filter((s) => s.type === "primary");
  if (primaries.length !== 1) throw new MockApiError("اختر خدمة أساسية واحدة (والإضافات اختيارية)", 422);

  const items: OrderItem[] = services.map((s) => ({ serviceId: s.id, name: s.name, type: s.type, price: s.price, durationMin: s.durationMin }));
  const subtotal = items.reduce((sum, it) => sum + it.price, 0);
  const offer = bestOffer(db, branchId, primaries[0].category, subtotal);

  return {
    items,
    subtotal,
    offerDiscount: offer?.amount ?? 0,
    offerTitle: offer?.title ?? null,
    total: subtotal - (offer?.amount ?? 0),
    durationMin: items.reduce((sum, it) => sum + it.durationMin, 0),
  };
}

function bestOffer(db: MockDatabase, branchId: string, category: string, subtotal: number) {
  const t = now().getTime();
  let best: { id: string; amount: number; title: Localized } | null = null;
  for (const o of db.offers) {
    if (o.status === "draft" || o.status === "disabled") continue;
    if (new Date(o.startAt).getTime() > t || new Date(o.endAt).getTime() < t) continue;
    if (!o.branchIds.includes(branchId)) continue;
    if (o.serviceCategories.length && !o.serviceCategories.includes(category)) continue;
    const amount = Math.min(subtotal, o.discountType === "percent" ? Math.round((subtotal * o.discountValue) / 100) : o.discountValue);
    if (!best || amount > best.amount) best = { id: o.id, amount, title: o.title };
  }
  return best;
}

// ── Availability (spec A8.2) ────────────────────────────────

export function occupiedAt(db: MockDatabase, branchId: string, start: Date, end: Date, excludeId?: string): Order[] {
  return db.orders.filter((o) => {
    if (o.branchId !== branchId || o.id === excludeId || !OCCUPYING.includes(o.status)) return false;
    const s = new Date(o.scheduledAt).getTime();
    const e = s + o.durationMin * 60000;
    return s < end.getTime() && e > start.getTime();
  });
}

export function availability(db: MockDatabase, branch: Branch, date: Date, durationMin: number): AvailabilitySlot[] {
  const h = hoursFor(branch, date);
  if (h.closed || !branch.active) return [];
  const step = branch.settings.slotIntervalMin || 30;
  const open = clockToMin(h.open);
  const close = clockToMin(h.close, true);
  const earliest = now().getTime() + branch.settings.leadTimeMin * 60000;
  const slots: AvailabilitySlot[] = [];
  for (let m = open; m + durationMin <= close; m += step) {
    const start = atMinutes(date, m);
    const end = new Date(start.getTime() + durationMin * 60000);
    const occupied = occupiedAt(db, branch.id, start, end).length;
    const blocked = branch.blockedSlots.some((b) => new Date(b.start) < end && new Date(b.end) > start);
    slots.push({
      start: start.toISOString(),
      free: Math.max(0, branch.capacity - occupied),
      capacity: branch.capacity,
      blocked,
      past: start.getTime() < earliest,
    });
  }
  return slots;
}

// ── List mapping ────────────────────────────────────────────

export function nextActionFor(o: Order): PrimaryAction | null {
  switch (o.status) {
    case "pending":
      return "confirm";
    case "confirmed":
      return "check_in";
    case "waiting":
      return "start";
    case "in_service":
      return "complete";
    case "completed":
      return o.paymentStatus === "pending" ? "collect_payment" : null;
    default:
      return null;
  }
}

/** Minutes an order is running late for its current step (0 when on time). */
export function overdueMinutes(o: Order, at: Date = now()): number {
  const t = at.getTime();
  if (o.status === "in_service") {
    const started = [...o.timeline].reverse().find((e) => e.status === "in_service");
    const startedAt = started ? new Date(started.at).getTime() : new Date(o.scheduledAt).getTime();
    return Math.max(0, Math.round((t - startedAt) / 60000 - o.durationMin));
  }
  if (o.status === "confirmed" || o.status === "pending") {
    return Math.max(0, Math.round((t - new Date(o.scheduledAt).getTime()) / 60000));
  }
  if (o.status === "completed" && o.paymentStatus === "pending") {
    const done = [...o.timeline].reverse().find((e) => e.status === "completed");
    return done ? Math.max(0, Math.round((t - new Date(done.at).getTime()) / 60000)) : 0;
  }
  return 0;
}

export function toVendorItem(db: MockDatabase, o: Order): VendorOrderListItem {
  const vehicle = o.vehicleId ? db.vehicles.find((v) => v.id === o.vehicleId) : null;
  return {
    ...toOrderListItem(db, o),
    staffName: staffName(db, o.assignedStaffId),
    vehicleLabel: vehicle ? `${vehicle.make} ${vehicle.model}` : null,
    nextAction: nextActionFor(o),
    overdueMin: overdueMinutes(o),
    locked: Boolean(o.closedInDayId),
  };
}

// ── Permissions per action ──────────────────────────────────

export function allowedActions(db: MockDatabase, actor: VendorActor, o: Order): OrderAction[] {
  if (o.closedInDayId) return ["note"];
  const p = actor.staff.permissions;
  const out: OrderAction[] = ["note"];
  const add = (cond: boolean, ...a: OrderAction[]) => cond && out.push(...a);
  const unpaid = o.paymentStatus === "pending";
  const grace = db.branches.find((b) => b.id === o.branchId)?.settings.noShowGraceMin ?? 15;
  const graceOver = new Date(o.scheduledAt).getTime() + grace * 60000 < now().getTime();

  switch (o.status) {
    case "pending":
      add(p.confirmBooking, "confirm");
      add(p.cancelOrder, "cancel");
      add(true, "assign", "discount");
      break;
    case "confirmed":
      add(isSameDay(o.scheduledAt, now()), "check_in");
      add(graceOver, "no_show");
      add(p.cancelOrder, "cancel");
      add(true, "assign", "discount");
      break;
    case "waiting":
      add(p.runService, "start");
      add(p.cancelOrder, "cancel");
      add(true, "assign", "add_service", "discount");
      break;
    case "in_service":
      add(p.runService, "complete");
      add(true, "assign", "add_service", "discount");
      break;
    case "completed":
      add(unpaid && p.collectPayment, "collect_payment");
      add(unpaid, "discount");
      add(o.paymentStatus === "paid" && p.refund, "refund");
      break;
    default:
      break;
  }
  return out;
}

// ── Money bookkeeping ───────────────────────────────────────

function recomputeTotals(db: MockDatabase, o: Order) {
  o.subtotal = o.items.reduce((s, it) => s + it.price, 0);
  o.durationMin = o.items.reduce((s, it) => s + it.durationMin, 0);
  if (o.discount && o.discount.pct > 0) o.discount.amount = Math.round((o.subtotal * o.discount.pct) / 100);
  o.total = Math.max(0, o.subtotal - (o.discount?.amount ?? 0));
  const txn = db.transactions.find((t) => t.orderId === o.id);
  if (txn && txn.status === "pending") {
    txn.gross = o.total;
    txn.commission = round2((o.total * txn.commissionRate) / 100);
    txn.netToWash = round2(o.total - txn.commission);
  }
}

function addTransaction(db: MockDatabase, o: Order) {
  const rate = effectiveCommissionRate(db, o.businessId);
  const commission = round2((o.total * rate) / 100);
  db.transactions.push({
    id: `txn_${o.id}`,
    orderId: o.id,
    businessId: o.businessId,
    gross: o.total,
    commissionRate: rate,
    commission,
    netToWash: round2(o.total - commission),
    date: o.scheduledAt,
    status: "pending",
    flag: null,
    reviewNote: null,
  });
}

function dropPendingTransaction(db: MockDatabase, o: Order) {
  const i = db.transactions.findIndex((t) => t.orderId === o.id && t.status === "pending");
  if (i >= 0) db.transactions.splice(i, 1);
}

function pushTimeline(o: Order, status: OrderStatus, actor: VendorActor) {
  o.timeline.push({ status, at: now().toISOString(), byType: "staff", byId: actor.staff.id });
}

function audit(db: MockDatabase, actor: VendorActor, o: Order, action: string, oldValue: unknown, newValue: unknown, reason?: string | null) {
  logAudit(db, {
    actorType: "staff",
    actorId: actor.staff.id,
    action,
    entity: "orders",
    entityId: o.id,
    branchId: o.branchId,
    oldValue,
    newValue,
    reason: reason ?? null,
  });
}

function requireReason(value: unknown, label = "السبب"): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length < 3) throw new MockApiError(`${label} مطلوب`, 422, { reason: [`${label} مطلوب`] });
  return text;
}

// ── State machine ───────────────────────────────────────────

const PAYMENT_LABEL: Record<PaymentMethod, string> = { cash: "نقدي", card: "بطاقة", online: "أونلاين" };

export function performAction(db: MockDatabase, actor: VendorActor, o: Order, payload: OrderActionPayload): string {
  const branch = db.branches.find((b) => b.id === o.branchId)!;
  const allowed = allowedActions(db, actor, o);
  if (!allowed.includes(payload.action)) {
    if (o.closedInDayId) throw new MockApiError("الطلب مقفل بإغلاق اليوم — لا يمكن تعديله", 423);
    throw new MockApiError("هذا الإجراء غير متاح لحالة الطلب الحالية أو لصلاحياتك", 409);
  }

  const from = o.status;
  switch (payload.action) {
    case "confirm": {
      o.status = "confirmed";
      pushTimeline(o, "confirmed", actor);
      audit(db, actor, o, "order.confirm", from, "confirmed");
      return `تم تأكيد الحجز ${o.number} وإبلاغ العميل`;
    }
    case "check_in": {
      o.status = "waiting";
      pushTimeline(o, "waiting", actor);
      audit(db, actor, o, "order.check_in", from, "waiting");
      return `تم تسجيل وصول ${o.plate || o.number}`;
    }
    case "start": {
      const staffId = payload.staffId ?? o.assignedStaffId;
      if (!staffId) throw new MockApiError("اختر الموظف المسؤول عن الخدمة", 422, { staffId: ["مطلوب"] });
      assertAssignable(db, o.branchId, staffId);
      const busy = db.orders.filter((x) => x.branchId === o.branchId && x.status === "in_service").length;
      if (busy >= branch.capacity) throw new MockApiError(`كل الأماكن مشغولة (${busy}/${branch.capacity}) — انتظر حتى يفرغ مكان`, 409);
      o.assignedStaffId = staffId;
      o.status = "in_service";
      pushTimeline(o, "in_service", actor);
      audit(db, actor, o, "order.start", from, `in_service · ${staffName(db, staffId)}`);
      return `بدأت الخدمة — ${staffName(db, staffId)}`;
    }
    case "complete": {
      o.status = "completed";
      pushTimeline(o, "completed", actor);
      audit(db, actor, o, "order.complete", from, "completed");
      return `اكتملت الخدمة — بانتظار الدفع ${o.total} ج.م`;
    }
    case "collect_payment": {
      const method = payload.method;
      if (method !== "cash" && method !== "card") throw new MockApiError("اختر طريقة الدفع", 422);
      if (method === "cash") {
        const received = Number(payload.amountReceived ?? o.total);
        if (Number.isNaN(received) || received < o.total) throw new MockApiError(`المبلغ المستلم أقل من الإجمالي (${o.total} ج.م)`, 422);
      }
      o.paymentStatus = "paid";
      o.paymentMethod = method;
      db.payments.push({
        id: nid("pay"),
        orderId: o.id,
        amount: o.total,
        method,
        collectedBy: actor.staff.id,
        collectedAt: now().toISOString(),
        status: "paid",
      });
      const txn = db.transactions.find((t) => t.orderId === o.id);
      if (txn) txn.status = "paid";
      audit(db, actor, o, "order.payment", "pending", `paid · ${PAYMENT_LABEL[method]} · ${o.total}`);
      const change = method === "cash" ? Number(payload.amountReceived ?? o.total) - o.total : 0;
      return change > 0 ? `تم التحصيل — الباقي للعميل ${change} ج.م` : "تم تحصيل المبلغ بنجاح";
    }
    case "cancel": {
      const reason = requireReason(payload.reason, "سبب الإلغاء");
      o.status = "cancelled";
      o.cancel = { reason, byType: "staff", byId: actor.staff.id, at: now().toISOString() };
      pushTimeline(o, "cancelled", actor);
      dropPendingTransaction(db, o);
      audit(db, actor, o, "order.cancel", from, "cancelled", reason);
      return `تم إلغاء الطلب ${o.number} وإبلاغ العميل`;
    }
    case "no_show": {
      o.status = "no_show";
      pushTimeline(o, "no_show", actor);
      dropPendingTransaction(db, o);
      audit(db, actor, o, "order.no_show", from, "no_show");
      return "تم تسجيل عدم الحضور وتحرير الموعد";
    }
    case "assign": {
      const staffId = payload.staffId ?? "";
      assertAssignable(db, o.branchId, staffId);
      const old = staffName(db, o.assignedStaffId);
      o.assignedStaffId = staffId;
      audit(db, actor, o, "order.assign", old, staffName(db, staffId));
      return `تم تعيين ${staffName(db, staffId)}`;
    }
    case "add_service": {
      const svc = db.services.find((s) => s.id === payload.serviceId && s.branchId === o.branchId && s.type === "addon" && s.active);
      if (!svc) throw new MockApiError("الإضافة غير متاحة في هذا الفرع", 422);
      if (o.items.some((it) => it.serviceId === svc.id)) throw new MockApiError("الإضافة موجودة بالفعل على الطلب", 409);
      const oldTotal = o.total;
      o.items.push({ serviceId: svc.id, name: svc.name, type: "addon", price: svc.price, durationMin: svc.durationMin });
      recomputeTotals(db, o);
      audit(db, actor, o, "order.add_service", oldTotal, `${o.total} (+${svc.name.ar})`);
      return `تمت إضافة ${svc.name.ar} — الإجمالي ${o.total} ج.م`;
    }
    case "discount": {
      const reason = requireReason(payload.reason, "سبب الخصم");
      const value = Number(payload.discountValue);
      if (Number.isNaN(value) || value <= 0) throw new MockApiError("قيمة الخصم غير صالحة", 422);
      const pct = payload.discountType === "fixed" ? (value / o.subtotal) * 100 : value;
      if (pct > actor.staff.maxDiscountPct) {
        throw new MockApiError(`الحد الأقصى لخصمك ${actor.staff.maxDiscountPct}٪ — هذا الخصم ${Math.round(pct)}٪`, 403);
      }
      const old = o.total;
      const manual = payload.discountType === "fixed" ? Math.min(value, o.subtotal) : Math.round((o.subtotal * value) / 100);
      // A manual discount stacks on an applied offer (it never replaces it); a new manual discount replaces an older manual one.
      const offerPart = o.discount?.reason.startsWith("عرض") ? o.discount : null;
      o.discount = offerPart
        ? { amount: Math.min(o.subtotal, offerPart.amount + manual), pct: 0, reason: `${offerPart.reason} + ${reason}` }
        : { amount: manual, pct: payload.discountType === "fixed" ? 0 : value, reason };
      recomputeTotals(db, o);
      audit(db, actor, o, "order.discount", old, o.total, reason);
      return `تم تطبيق الخصم — الإجمالي الآن ${o.total} ج.م`;
    }
    case "note": {
      const text = typeof payload.text === "string" ? payload.text.trim() : "";
      if (text.length < 2) throw new MockApiError("اكتب الملاحظة", 422);
      o.notes.push({ text, at: now().toISOString(), authorId: actor.staff.id });
      audit(db, actor, o, "order.note", null, text);
      return "تمت إضافة الملاحظة";
    }
    case "refund": {
      const reason = requireReason(payload.reason, "سبب الاسترداد");
      o.paymentStatus = "refunded";
      const pay = db.payments.find((p) => p.orderId === o.id && p.status === "paid");
      if (pay) pay.status = "refunded";
      const txn = db.transactions.find((t) => t.orderId === o.id);
      if (txn) txn.status = "refunded";
      audit(db, actor, o, "order.refund", "paid", "refunded", reason);
      return `تم استرداد ${o.total} ج.م للعميل`;
    }
  }
}

function assertAssignable(db: MockDatabase, branchId: string, staffId: string) {
  const s = db.staff.find((x) => x.id === staffId);
  if (!s || s.branchId !== branchId || s.status !== "active" || s.role === "owner") {
    throw new MockApiError("الموظف غير متاح في هذا الفرع", 422);
  }
}

// ── Creation & recognition ──────────────────────────────────

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function nextNumber(db: MockDatabase, source: Order["source"]): string {
  const base = source === "app" ? 10000 : source === "walk_in" ? 20000 : 30000;
  // Only this source's numbers: seeded history of another source may sit in this range.
  const max = db.orders
    .filter((o) => o.source === source)
    .map((o) => Number(o.number.replace("CZ-", "")))
    .filter((n) => n >= base && n < base + 10000)
    .reduce((a, b) => Math.max(a, b), base);
  return `CZ-${String(max + 1).padStart(5, "0")}`;
}

function nextCode(db: MockDatabase): string {
  const used = new Set(db.orders.map((o) => o.code));
  let c = "";
  do {
    c = Array.from({ length: 5 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("");
  } while (used.has(c));
  return c;
}

export function normalizePlate(p: string): string {
  return p.replace(/[\s-]/g, "").toUpperCase();
}

export function normalizePhone(p: string): string {
  const digits = p.replace(/\D/g, "");
  return digits.slice(-10);
}

export function prettyPhone(p: string): string {
  const d = normalizePhone(p);
  return `+20 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

export function recognize(db: MockDatabase, businessId: string, plate?: string | null, phone?: string | null): CustomerRecognition {
  let vehicle: Vehicle | null = null;
  let customer: Customer | null = null;
  if (plate && normalizePlate(plate).length >= 3) {
    vehicle = db.vehicles.find((v) => v.plateNormalized === normalizePlate(plate)) ?? null;
    if (vehicle) customer = db.customers.find((c) => c.id === vehicle!.customerId) ?? null;
  }
  if (!customer && phone && normalizePhone(phone).length >= 10) {
    customer = db.customers.find((c) => normalizePhone(c.phone) === normalizePhone(phone)) ?? null;
    if (customer && !vehicle) vehicle = db.vehicles.find((v) => v.customerId === customer!.id && v.isDefault) ?? null;
  }
  if (!customer) return { customer: null, vehicle, visits: 0, lastVisitAt: null, usualServiceId: null, usualServiceName: null };

  const visits = db.orders
    .filter((o) => o.customerId === customer!.id && o.businessId === businessId && o.status === "completed")
    .sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt));
  const freq = new Map<string, number>();
  visits.forEach((o) => {
    const p = o.items.find((i) => i.type === "primary");
    if (p) freq.set(p.serviceId, (freq.get(p.serviceId) ?? 0) + 1);
  });
  const usual = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const usualSvc = usual ? db.services.find((s) => s.id === usual) : null;
  return {
    customer,
    vehicle,
    visits: visits.length,
    lastVisitAt: visits[0]?.scheduledAt ?? null,
    usualServiceId: usual,
    usualServiceName: usualSvc?.name ?? null,
  };
}

export function createOrder(db: MockDatabase, actor: VendorActor, payload: CreateOrderPayload): Order {
  assertNotSuspended(actor);
  const branch = db.branches.find((b) => b.id === payload.branchId)!;
  if (!branch.active) throw new MockApiError("الفرع متوقف — فعّله أولًا لاستقبال الطلبات", 409);
  const plate = normalizePlate(payload.plate ?? "");
  if (plate.length < 3) throw new MockApiError("رقم اللوحة مطلوب", 422, { plate: ["مطلوب"] });

  const price = priceServices(db, branch.id, payload.serviceIds);
  const isPhone = payload.source === "phone";
  let scheduledAt = now();
  if (isPhone) {
    if (!payload.scheduledAt) throw new MockApiError("اختر موعد الحجز", 422, { scheduledAt: ["مطلوب"] });
    scheduledAt = new Date(payload.scheduledAt);
    const slot = availability(db, branch, scheduledAt, price.durationMin).find((s) => s.start === scheduledAt.toISOString());
    if (!slot || slot.past || slot.blocked || slot.free <= 0) throw new MockApiError("هذا الموعد لم يعد متاحًا — اختر موعدًا آخر", 409);
  }

  // Customer & vehicle: reuse when recognized, create otherwise (phone is optional for walk-ins).
  const rec = recognize(db, actor.business.id, plate, payload.customerPhone);
  let customer = rec.customer;
  if (!customer && payload.customerPhone && normalizePhone(payload.customerPhone).length === 10) {
    customer = {
      id: nid("cu"),
      name: payload.customerName?.trim() || "عميل جديد",
      phone: prettyPhone(payload.customerPhone),
      status: "active",
      statusReason: null,
      createdAt: now().toISOString(),
      lastActiveAt: now().toISOString(),
    };
    db.customers.push(customer);
  }
  if (isPhone && !customer) throw new MockApiError("رقم موبايل العميل مطلوب للحجز الهاتفي", 422, { customerPhone: ["مطلوب"] });
  let vehicle = rec.vehicle;
  if (!vehicle && customer) {
    vehicle = {
      id: nid("ve"),
      customerId: customer.id,
      make: payload.vehicleMake?.trim() || "—",
      model: payload.vehicleModel?.trim() || "",
      year: null,
      color: payload.vehicleColor || "silver",
      plate,
      plateNormalized: plate,
      isDefault: !db.vehicles.some((v) => v.customerId === customer!.id),
    };
    db.vehicles.push(vehicle);
  }

  const status: OrderStatus = isPhone ? "confirmed" : "waiting";
  const offerId = price.offerDiscount ? db.offers.find((o) => o.title.ar === price.offerTitle?.ar)?.id ?? null : null;
  const order: Order = {
    id: nid("ord"),
    number: nextNumber(db, payload.source),
    code: nextCode(db),
    source: payload.source,
    customerId: customer?.id ?? null,
    vehicleId: vehicle?.id ?? null,
    plate,
    businessId: actor.business.id,
    branchId: branch.id,
    items: price.items,
    subtotal: price.subtotal,
    discount: price.offerDiscount ? { amount: price.offerDiscount, pct: 0, reason: `عرض: ${price.offerTitle?.ar ?? ""}` } : null,
    offerId,
    total: price.total,
    durationMin: price.durationMin,
    scheduledAt: scheduledAt.toISOString(),
    status,
    paymentStatus: "pending",
    paymentMethod: null,
    assignedStaffId: null,
    timeline: [{ status, at: now().toISOString(), byType: "staff", byId: actor.staff.id }],
    notes: payload.notes?.trim() ? [{ text: payload.notes.trim(), at: now().toISOString(), authorId: actor.staff.id }] : [],
    cancel: null,
    flag: null,
    createdAt: now().toISOString(),
    closedInDayId: null,
  };
  db.orders.push(order);
  addTransaction(db, order);
  if (customer) customer.lastActiveAt = now().toISOString();
  logAudit(db, {
    actorType: "staff",
    actorId: actor.staff.id,
    action: "order.create",
    entity: "orders",
    entityId: order.id,
    branchId: branch.id,
    newValue: `${order.number} · ${isPhone ? "حجز هاتفي" : "حضور مباشر"} · ${order.total} ج.م`,
  });
  return order;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "بانتظار التأكيد",
  confirmed: "مؤكد",
  waiting: "في الانتظار",
  in_service: "جارٍ التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغي",
  no_show: "لم يحضر",
};

/** True when staff applied a manual discount (alone or stacked on an offer). */
export function hasManualDiscount(o: Order): boolean {
  if (!o.discount) return false;
  return !o.discount.reason.startsWith("عرض") || o.discount.reason.includes(" + ");
}
