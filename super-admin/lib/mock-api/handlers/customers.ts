import "server-only";

import type { CustomerDetails, CustomerListItem } from "@/types/customers";
import { daysAgo, logAudit, round2 } from "@/lib/mock-api/db";
import { MockApiError, matchesSearch, ok, paginate, requireText, sortBy } from "@/lib/mock-api/http";
import { findOrThrow, toOrderListItem } from "@/lib/mock-api/lookups";
import { route } from "@/lib/mock-api/router";
import type { MockDatabase } from "@/lib/mock-api/schema";

const HIGH_ACTIVITY_MIN_ORDERS = 6;

function toListItem(db: MockDatabase, id: string): CustomerListItem {
  const c = findOrThrow(db.customers, id, "العميل");
  const vehicles = db.vehicles.filter((v) => v.customerId === c.id);
  const orders = db.orders.filter((o) => o.customerId === c.id);
  const completed = orders.filter((o) => o.status === "completed");
  return {
    ...c,
    vehiclesCount: vehicles.length,
    plates: vehicles.map((v) => v.plate),
    ordersCount: orders.length,
    completedCount: completed.length,
    totalSpent: completed.reduce((s, o) => s + o.total, 0),
  };
}

export const customerRoutes = [
  route("GET", "/admin/customers", ({ db, query }) => {
    const filter = query.get("filter") ?? "all";
    const weekAgo = daysAgo(7).toISOString();
    const all = db.customers.map((c) => toListItem(db, c.id));
    const searched = all.filter((c) =>
      matchesSearch(query, c.name, c.phone.replace(/\s/g, ""), c.phone, ...c.plates),
    );

    const isNew = (c: CustomerListItem) => c.createdAt >= weekAgo;
    const isHigh = (c: CustomerListItem) => c.ordersCount >= HIGH_ACTIVITY_MIN_ORDERS;
    const counts = {
      all: searched.length,
      active: searched.filter((c) => c.status === "active").length,
      suspended: searched.filter((c) => c.status === "suspended").length,
      new: searched.filter(isNew).length,
      high_activity: searched.filter(isHigh).length,
    };

    const filtered = searched.filter((c) => {
      if (filter === "active" || filter === "suspended") return c.status === filter;
      if (filter === "new") return isNew(c);
      if (filter === "high_activity") return isHigh(c);
      return true;
    });
    const sorted = sortBy(
      filtered,
      query,
      {
        name: (c) => c.name,
        ordersCount: (c) => c.ordersCount,
        completedCount: (c) => c.completedCount,
        totalSpent: (c) => c.totalSpent,
        lastActiveAt: (c) => c.lastActiveAt,
        createdAt: (c) => c.createdAt,
      },
      { key: filter === "high_activity" ? "ordersCount" : "lastActiveAt", order: "desc" },
    );
    const { items, pagination } = paginate(sorted, query, 12);
    return ok(items, "OK", { pagination, meta: { counts } });
  }),

  route("GET", "/admin/customers/:id", ({ db, params }) => {
    const customer = findOrThrow(db.customers, params.id, "العميل");
    const orders = db.orders
      .filter((o) => o.customerId === customer.id)
      .sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt))
      .map((o) => toOrderListItem(db, o));
    const reviews = db.reviews.filter((r) => r.customerId === customer.id);
    const completed = orders.filter((o) => o.status === "completed");

    const details: CustomerDetails = {
      customer,
      vehicles: db.vehicles.filter((v) => v.customerId === customer.id),
      orders,
      reviews,
      complaints: db.complaints.filter((c) => c.customerId === customer.id),
      auditLogs: db.auditLogs.filter((a) => a.entityId === customer.id),
      stats: {
        ordersCount: orders.length,
        completedCount: completed.length,
        cancelledCount: orders.filter((o) => o.status === "cancelled").length,
        noShowCount: orders.filter((o) => o.status === "no_show").length,
        totalSpent: completed.reduce((s, o) => s + o.total, 0),
        avgRating: reviews.length ? round2(reviews.reduce((s, r) => s + r.stars, 0) / reviews.length) : null,
      },
    };
    return ok(details);
  }),

  route("POST", "/admin/customers/:id/status", ({ db, params, body, admin }) => {
    const customer = findOrThrow(db.customers, params.id, "العميل");
    const suspended = Boolean(body.suspended);
    if ((customer.status === "suspended") === suspended) {
      throw new MockApiError(suspended ? "الحساب موقوف بالفعل" : "الحساب نشط بالفعل", 409);
    }
    const reason = requireText(body.reason, "reason", "السبب", 5);
    const old = customer.status;
    customer.status = suspended ? "suspended" : "active";
    customer.statusReason = suspended ? reason : null;
    logAudit(db, {
      actorId: admin.id,
      action: suspended ? "suspend_customer" : "reactivate_customer",
      entity: "customers",
      entityId: customer.id,
      oldValue: old,
      newValue: customer.status,
      reason,
    });
    return ok(customer, suspended ? `تم إيقاف حساب ${customer.name}` : `تمت إعادة تفعيل حساب ${customer.name}`);
  }),
];
