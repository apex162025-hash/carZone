import "server-only";

import type { Order } from "@carzen/contracts/orders";
import type {
  CreateOrderPayload,
  LiveBoard,
  OrderActionPayload,
  ScheduleDay,
  VendorOrderDetails,
  VendorOrderListItem,
} from "@carzen/contracts/vendor/operations";
import { isSameDay, logAudit, nid, now } from "../db";
import { MockApiError, matchesSearch, ok, paginate, requireText, sortBy } from "../http";
import { serviceName } from "../lookups";
import { vroute } from "../router";
import {
  allowedActions,
  availability,
  clockToMin,
  createOrder,
  dayKey,
  hoursFor,
  nextActionFor,
  occupiedAt,
  onShiftAt,
  performAction,
  priceServices,
  recognize,
  toVendorItem,
} from "./engine";
import { assertBranch, findInScope, scopeBranches, singleBranch } from "./scope";

const endOfToday = () => {
  const d = new Date(now());
  d.setHours(23, 59, 59, 999);
  return d;
};

/** Tab predicates for the two list views (spec D4 bookings / D5 orders). */
const TABS: Record<string, (o: Order) => boolean> = {
  // bookings view (app + phone)
  today: (o) => isSameDay(o.scheduledAt, now()),
  upcoming: (o) => new Date(o.scheduledAt) > endOfToday() && ["pending", "confirmed"].includes(o.status),
  completed: (o) => o.status === "completed",
  cancelled: (o) => o.status === "cancelled",
  no_show: (o) => o.status === "no_show",
  // orders view (all sources)
  active: (o) => o.status === "waiting" || o.status === "in_service" || (o.status === "completed" && o.paymentStatus === "pending"),
  waiting: (o) => o.status === "waiting",
  in_service: (o) => o.status === "in_service",
  payment_pending: (o) => o.status === "completed" && o.paymentStatus === "pending",
  paid: (o) => o.status === "completed" && o.paymentStatus !== "pending",
  all: () => true,
};

const BOOKING_TABS = ["today", "upcoming", "completed", "cancelled", "no_show"];
const ORDER_TABS = ["active", "waiting", "in_service", "payment_pending", "paid", "all"];

export const vendorOperationRoutes = [
  vroute("GET", "/vendor/orders", ({ db, query, actor }) => {
    const branchIds = scopeBranches(actor, query.get("branchId"));
    const view = query.get("view") === "bookings" ? "bookings" : "orders";
    const tabs = view === "bookings" ? BOOKING_TABS : ORDER_TABS;
    const tab = tabs.includes(query.get("tab") ?? "") ? query.get("tab")! : tabs[0];
    const source = query.get("source");
    const staffId = query.get("staffId");
    const date = query.get("date");

    const base = db.orders.filter((o) => {
      if (!branchIds.includes(o.branchId)) return false;
      if (view === "bookings" && o.source === "walk_in") return false;
      if (source && source !== "all" && o.source !== source) return false;
      if (staffId && staffId !== "all" && o.assignedStaffId !== staffId) return false;
      if (date && dayKey(o.scheduledAt) !== date) return false;
      const customer = o.customerId ? db.customers.find((c) => c.id === o.customerId) : null;
      return matchesSearch(query, o.number, o.code, o.plate, customer?.name, customer?.phone, customer?.phone.replace(/\s/g, ""));
    });
    const counts = Object.fromEntries(tabs.map((t) => [t, base.filter(TABS[t]).length]));
    const filtered = base.filter(TABS[tab]);
    const chronological = tab === "today" || tab === "upcoming" || tab === "waiting" || tab === "active";
    const items = sortBy(
      filtered.map((o) => toVendorItem(db, o)),
      query,
      { scheduledAt: (o) => o.scheduledAt, total: (o) => o.total, number: (o) => o.number, status: (o) => o.status },
      { key: "scheduledAt", order: chronological ? "asc" : "desc" },
    );
    const { items: page, pagination } = paginate(items, query, 15);
    return ok(page, "OK", { pagination, meta: { counts, totalAmount: filtered.reduce((s, o) => s + o.total, 0) } });
  }),

  vroute("GET", "/vendor/orders/:id", ({ db, params, actor }) => {
    const order = db.orders.find((o) => o.id === params.id || o.number === params.id);
    if (!order || !actor.branchIds.includes(order.branchId)) throw new MockApiError("الطلب غير موجود", 404);
    const branch = db.branches.find((b) => b.id === order.branchId)!;
    const staff = order.assignedStaffId ? db.staff.find((s) => s.id === order.assignedStaffId) : null;
    const details: VendorOrderDetails = {
      order,
      customer: db.customers.find((c) => c.id === order.customerId) ?? null,
      vehicle: db.vehicles.find((v) => v.id === order.vehicleId) ?? null,
      branch,
      staff: staff ? { id: staff.id, name: staff.name } : null,
      payment: db.payments.find((p) => p.orderId === order.id) ?? null,
      review: db.reviews.find((r) => r.orderId === order.id) ?? null,
      auditLogs: db.auditLogs.filter((a) => a.entityId === order.id),
      noteAuthors: Object.fromEntries(
        order.notes.filter((n) => n.authorId).map((n) => [n.authorId!, db.staff.find((s) => s.id === n.authorId)?.name ?? db.admins.find((a) => a.id === n.authorId)?.name ?? "—"]),
      ),
      availableAddons: db.services.filter((s) => s.branchId === order.branchId && s.type === "addon" && s.active && !order.items.some((i) => i.serviceId === s.id)),
      assignableStaff: db.staff.filter((s) => s.branchId === order.branchId && s.status === "active" && s.role !== "owner").map((s) => ({ id: s.id, name: s.name })),
      allowedActions: allowedActions(db, actor, order),
      nextAction: nextActionFor(order),
      maxDiscountPct: actor.staff.maxDiscountPct,
      locked: Boolean(order.closedInDayId),
    };
    return ok(details);
  }),

  vroute("POST", "/vendor/orders", ({ db, body, actor }) => {
    const payload = body as unknown as CreateOrderPayload;
    if (payload.source !== "phone" && payload.source !== "walk_in") throw new MockApiError("نوع الطلب غير صالح", 422);
    assertBranch(actor, String(payload.branchId ?? ""));
    const order = createOrder(db, actor, { ...payload, serviceIds: Array.isArray(payload.serviceIds) ? payload.serviceIds.map(String) : [] });
    const busy = db.orders.filter((o) => o.branchId === order.branchId && o.status === "in_service").length;
    const capacity = db.branches.find((b) => b.id === order.branchId)!.capacity;
    const wait = order.source === "walk_in" && busy >= capacity ? " — كل الأماكن مشغولة، الانتظار المتوقع ~20 دقيقة" : "";
    return ok(toVendorItem(db, order), `تم إنشاء الطلب ${order.number}${wait}`);
  }),

  vroute("POST", "/vendor/orders/:id/actions", ({ db, params, body, actor }) => {
    const order = findInScope(actor, db.orders, params.id, "الطلب");
    const message = performAction(db, actor, order, body as unknown as OrderActionPayload);
    return ok(toVendorItem(db, order), message);
  }),

  vroute("POST", "/vendor/orders/bulk-confirm", ({ db, body, actor }) => {
    const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
    if (!ids.length) throw new MockApiError("اختر حجزًا واحدًا على الأقل", 422);
    let confirmed = 0;
    for (const id of ids) {
      const order = db.orders.find((o) => o.id === id);
      if (!order || !actor.branchIds.includes(order.branchId) || order.status !== "pending") continue;
      performAction(db, actor, order, { action: "confirm" });
      confirmed += 1;
    }
    if (!confirmed) throw new MockApiError("لا توجد حجوزات بانتظار التأكيد ضمن الاختيار", 409);
    return ok({ confirmed }, `تم تأكيد ${confirmed} حجز`);
  }),

  vroute("GET", "/vendor/price-preview", ({ db, query, actor }) => {
    const branchId = singleBranch(actor, query.get("branchId"));
    const ids = (query.get("serviceIds") ?? "").split(",").filter(Boolean);
    return ok(priceServices(db, branchId, ids));
  }),

  vroute("GET", "/vendor/recognize", ({ db, query, actor }) => ok(recognize(db, actor.business.id, query.get("plate"), query.get("phone")))),

  vroute("GET", "/vendor/availability", ({ db, query, actor }) => {
    const branchId = singleBranch(actor, query.get("branchId"));
    const branch = db.branches.find((b) => b.id === branchId)!;
    const ids = (query.get("serviceIds") ?? "").split(",").filter(Boolean);
    const duration = ids.length ? priceServices(db, branchId, ids).durationMin : 30;
    const date = query.get("date") ? new Date(`${query.get("date")}T12:00:00`) : now();
    return ok(availability(db, branch, date, duration));
  }),

  vroute("GET", "/vendor/live", ({ db, query, actor }) => {
    const branchIds = scopeBranches(actor, query.get("branchId"));
    const orders = db.orders.filter((o) => branchIds.includes(o.branchId));
    const map = (list: Order[]): VendorOrderListItem[] => list.map((o) => toVendorItem(db, o));
    const today = orders.filter((o) => isSameDay(o.scheduledAt, now()));
    const board: LiveBoard = {
      branchId: query.get("branchId") ?? "all",
      generatedAt: now().toISOString(),
      columns: {
        upcoming: map(today.filter((o) => o.status === "pending" || o.status === "confirmed").sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))),
        waiting: map(orders.filter((o) => o.status === "waiting").sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))),
        in_service: map(orders.filter((o) => o.status === "in_service")),
        payment_pending: map(orders.filter((o) => o.status === "completed" && o.paymentStatus === "pending")),
        done: map(today.filter((o) => o.status === "completed" && o.paymentStatus !== "pending").sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)).slice(0, 12)),
      },
      bays: {
        busy: orders.filter((o) => o.status === "in_service").length,
        capacity: db.branches.filter((b) => branchIds.includes(b.id)).reduce((s, b) => s + b.capacity, 0),
      },
      staffOnShift: branchIds.flatMap((id) => onShiftAt(db, id)).map((s) => ({ id: s.id, name: s.name })),
    };
    return ok(board);
  }),

  vroute("GET", "/vendor/schedule", ({ db, query, actor }) => {
    const branchId = singleBranch(actor, query.get("branchId"));
    const branch = db.branches.find((b) => b.id === branchId)!;
    const date = query.get("date") ? new Date(`${query.get("date")}T12:00:00`) : now();
    const hours = hoursFor(branch, date);
    const step = branch.settings.slotIntervalMin || 30;
    const slots: ScheduleDay["slots"] = [];
    if (!hours.closed) {
      for (let m = clockToMin(hours.open); m < clockToMin(hours.close, true); m += step) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        start.setMinutes(m);
        const end = new Date(start.getTime() + step * 60000);
        const orders = occupiedAt(db, branchId, start, end);
        slots.push({
          start: start.toISOString(),
          occupied: orders.length,
          capacity: branch.capacity,
          blocked: branch.blockedSlots.find((b) => new Date(b.start) < end && new Date(b.end) > start) ?? null,
          past: end.getTime() <= now().getTime(),
          orders: orders.map((o) => ({ id: o.id, number: o.number, plate: o.plate, status: o.status, serviceName: serviceName(o) })),
        });
      }
    }
    const day: ScheduleDay = {
      branchId,
      date: dayKey(date),
      capacity: branch.capacity,
      slotIntervalMin: step,
      hours,
      slots,
      blocks: branch.blockedSlots.filter((b) => dayKey(b.start) === dayKey(date)),
    };
    return ok(day);
  }),

  vroute("POST", "/vendor/schedule/blocks", ({ db, body, actor }) => {
    const branchId = String(body.branchId ?? "");
    assertBranch(actor, branchId);
    const branch = db.branches.find((b) => b.id === branchId)!;
    const reason = requireText(body.reason, "reason", "سبب الحجب");
    const start = new Date(String(body.start));
    const end = new Date(String(body.end));
    if (Number.isNaN(+start) || Number.isNaN(+end) || end <= start) throw new MockApiError("نهاية الفترة يجب أن تكون بعد بدايتها", 422);
    const affected = occupiedAt(db, branchId, start, end).length;
    const block = { id: nid("blk"), start: start.toISOString(), end: end.toISOString(), reason, createdBy: actor.staff.id };
    branch.blockedSlots.push(block);
    logAudit(db, { actorType: "staff", actorId: actor.staff.id, action: "slot.block", entity: "branches", entityId: branchId, branchId, newValue: `${block.start} → ${block.end}`, reason });
    return ok(block, affected ? `تم حجب الفترة — يوجد ${affected} حجز قائم فيها لم يتأثر` : "تم حجب الفترة واختفت من تطبيق العميل");
  }),

  vroute("DELETE", "/vendor/schedule/blocks/:id", ({ db, params, actor }) => {
    const branch = db.branches.find((b) => actor.branchIds.includes(b.id) && b.blockedSlots.some((s) => s.id === params.id));
    if (!branch) throw new MockApiError("الفترة المحجوبة غير موجودة", 404);
    const block = branch.blockedSlots.find((s) => s.id === params.id)!;
    branch.blockedSlots = branch.blockedSlots.filter((s) => s.id !== params.id);
    logAudit(db, { actorType: "staff", actorId: actor.staff.id, action: "slot.unblock", entity: "branches", entityId: branch.id, branchId: branch.id, oldValue: `${block.start} → ${block.end}` });
    return ok(null, "تم إلغاء الحجب وعادت الفترة متاحة للحجز");
  }),
];
