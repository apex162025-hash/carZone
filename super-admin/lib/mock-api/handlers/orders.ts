import "server-only";

import type { OrderDetails, OrderStatus } from "@/types/orders";
import { logAudit, pushAdminNotification } from "@/lib/mock-api/db";
import { MockApiError, countBy, matchesSearch, ok, paginate, requireText, sortBy } from "@/lib/mock-api/http";
import { UPCOMING_STATUSES, findOrThrow, toOrderListItem } from "@/lib/mock-api/lookups";
import { route } from "@/lib/mock-api/router";

const STATUSES: OrderStatus[] = ["pending", "confirmed", "waiting", "in_service", "completed", "cancelled", "no_show"];

export const orderRoutes = [
  route("GET", "/admin/orders", ({ db, query }) => {
    const status = query.get("status");
    const source = query.get("source");
    const payment = query.get("payment");
    const washId = query.get("washId");
    const customerId = query.get("customerId");
    const dateFrom = query.get("dateFrom");
    const dateTo = query.get("dateTo");

    const base = db.orders
      .map((o) => toOrderListItem(db, o))
      .filter((o) => {
        if (source && source !== "all" && o.source !== source) return false;
        if (payment && payment !== "all" && o.paymentStatus !== payment) return false;
        if (washId && washId !== "all" && o.businessId !== washId) return false;
        if (customerId && o.customerId !== customerId) return false;
        if (dateFrom && o.scheduledAt < new Date(`${dateFrom}T00:00:00`).toISOString()) return false;
        if (dateTo && o.scheduledAt > new Date(`${dateTo}T23:59:59`).toISOString()) return false;
        return matchesSearch(query, o.number, o.code, o.plate, o.customerName, o.businessName.ar, o.branchName.ar);
      });

    const counts = countBy(base, STATUSES, (o) => o.status);
    const filtered = status && status !== "all" ? base.filter((o) => o.status === status) : base;
    const sorted = sortBy(
      filtered,
      query,
      {
        scheduledAt: (o) => o.scheduledAt,
        number: (o) => o.number,
        total: (o) => o.total,
        status: (o) => o.status,
        customer: (o) => o.customerName,
      },
      { key: "scheduledAt", order: "desc" },
    );
    const { items, pagination } = paginate(sorted, query, 12);
    return ok(items, "OK", {
      pagination,
      meta: { counts, totalAmount: filtered.reduce((s, o) => s + o.total, 0) },
    });
  }),

  route("GET", "/admin/orders/:id", ({ db, params }) => {
    const order = db.orders.find((o) => o.id === params.id || o.number === params.id);
    if (!order) throw new MockApiError("الحجز غير موجود", 404);
    const details: OrderDetails = {
      order,
      customer: db.customers.find((c) => c.id === order.customerId) ?? null,
      vehicle: db.vehicles.find((v) => v.id === order.vehicleId) ?? null,
      business: db.businesses.find((b) => b.id === order.businessId)!,
      branch: db.branches.find((b) => b.id === order.branchId)!,
      staff: db.staff.find((s) => s.id === order.assignedStaffId) ?? null,
      payment: db.payments.find((p) => p.orderId === order.id) ?? null,
      transaction: db.transactions.find((t) => t.orderId === order.id) ?? null,
      review: db.reviews.find((r) => r.orderId === order.id) ?? null,
      complaint: db.complaints.find((c) => c.orderId === order.id) ?? null,
      auditLogs: db.auditLogs.filter((a) => a.entityId === order.id),
    };
    return ok(details);
  }),

  route("POST", "/admin/orders/:id/cancel", ({ db, params, body, admin }) => {
    const order = findOrThrow(db.orders, params.id, "الحجز");
    if (!(UPCOMING_STATUSES as readonly string[]).includes(order.status)) {
      throw new MockApiError("يمكن إلغاء الحجوزات قيد المراجعة أو المؤكدة فقط", 409);
    }
    const reason = requireText(body.reason, "reason", "سبب الإلغاء", 5);
    const old = order.status;
    const at = new Date().toISOString();
    order.status = "cancelled";
    order.cancel = { reason, byType: "admin", byId: admin.id, at };
    order.timeline.push({ status: "cancelled", at, byType: "admin", byId: admin.id });
    const txn = db.transactions.find((t) => t.orderId === order.id);
    if (txn && txn.status === "pending") {
      db.transactions.splice(db.transactions.indexOf(txn), 1);
    }
    logAudit(db, { actorId: admin.id, action: "cancel_order", entity: "orders", entityId: order.id, branchId: order.branchId, oldValue: old, newValue: "cancelled", reason });
    return ok(order, `تم إلغاء الحجز ${order.number} وإبلاغ العميل والمغسلة`);
  }),

  route("POST", "/admin/orders/:id/flag", ({ db, params, body, admin }) => {
    const order = findOrThrow(db.orders, params.id, "الحجز");
    if (order.flag === "finance_review") {
      throw new MockApiError("الحجز محوّل بالفعل للمراجعة المالية", 409);
    }
    const reason = requireText(body.reason, "reason", "سبب المراجعة", 5);
    order.flag = "finance_review";
    order.notes.push({ text: `تحويل للمراجعة المالية: ${reason}`, at: new Date().toISOString(), authorId: admin.id });
    pushAdminNotification(
      db,
      "finance_flag",
      { ar: `مراجعة مالية للحجز ${order.number}`, en: `Finance review for ${order.number}` },
      { ar: reason, en: reason },
      `/orders/${order.id}`,
    );
    logAudit(db, { actorId: admin.id, action: "flag_order_finance", entity: "orders", entityId: order.id, branchId: order.branchId, newValue: "finance_review", reason });
    return ok(order, "تم تحويل الحجز لفريق المالية");
  }),
];
