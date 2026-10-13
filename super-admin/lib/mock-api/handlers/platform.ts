import "server-only";

import type { AuditLogListItem } from "@/types/audit";
import type { SearchResult } from "@/types/search";
import type { SettingsSection } from "@/types/settings";
import { logAudit, resetDb } from "@/lib/mock-api/db";
import { MockApiError, matchesSearch, ok, paginate, requireText } from "@/lib/mock-api/http";
import { adminName, businessName, customerName, findOrThrow } from "@/lib/mock-api/lookups";
import { route } from "@/lib/mock-api/router";

const SECTIONS: SettingsSection[] = ["general", "bookingDefaults", "legal", "catalogs"];

export const platformRoutes = [
  // ── Settings ──────────────────────────────────────────────
  route("GET", "/admin/settings", ({ db }) => ok(db.settings)),

  route("PUT", "/admin/settings/:section", ({ db, params, body, admin }) => {
    const section = params.section as SettingsSection;
    if (!SECTIONS.includes(section)) throw new MockApiError("قسم غير معروف", 404);
    const reason = requireText(body.reason, "reason", "سبب التعديل", 5);
    if (!body.value || typeof body.value !== "object") throw new MockApiError("القيمة مطلوبة", 422);

    if (section === "bookingDefaults") {
      const v = body.value as Record<string, unknown>;
      for (const key of ["slotIntervalMin", "leadTimeMin", "maxAdvanceDays", "freeCancelMin", "noShowGraceMin", "reminderMin"]) {
        const n = Number(v[key]);
        if (Number.isNaN(n) || n < 0 || n > 10080) throw new MockApiError("قيمة غير صالحة في إعدادات الحجز", 422, { [key]: ["قيمة غير صالحة"] });
      }
    }
    const old = db.settings[section];
    // Section shapes are validated by the typed client form; keep the mock permissive.
    (db.settings as unknown as Record<string, unknown>)[section] = body.value;
    logAudit(db, { actorId: admin.id, action: "update_settings", entity: "settings", entityId: section, oldValue: old, newValue: body.value, reason });
    return ok(db.settings, "تم حفظ الإعدادات");
  }),

  // ── Audit log (read-only by design) ───────────────────────
  route("GET", "/admin/audit", ({ db, query }) => {
    const actorId = query.get("actorId");
    const action = query.get("action");
    const entity = query.get("entity");
    const actorType = query.get("actorType");
    const list: AuditLogListItem[] = db.auditLogs.map((a) => ({ ...a, actorName: adminName(db, a.actorId) ?? a.actorId }));
    const filtered = list.filter(
      (a) =>
        (!actorId || actorId === "all" || a.actorId === actorId) &&
        (!action || action === "all" || a.action === action) &&
        (!entity || entity === "all" || a.entity === entity) &&
        (!actorType || actorType === "all" || a.actorType === actorType) &&
        matchesSearch(query, a.entityId, a.reason, a.actorName, a.action),
    );
    const sorted = [...filtered].sort((a, b) => +new Date(b.at) - +new Date(a.at));
    const { items, pagination } = paginate(sorted, query, 20);
    return ok(items, "OK", {
      pagination,
      meta: {
        actions: [...new Set(db.auditLogs.map((a) => a.action))].sort(),
        entities: [...new Set(db.auditLogs.map((a) => a.entity))].sort(),
        actors: db.admins.map((a) => ({ id: a.id, name: a.name })),
      },
    });
  }),

  // ── Notifications ─────────────────────────────────────────
  route("GET", "/admin/notifications", ({ db, query }) => {
    const filter = query.get("filter");
    const list = [...db.notifications].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).filter((n) => (filter === "unread" ? !n.read : filter && filter !== "all" ? n.type === filter : true));
    const { items, pagination } = paginate(list, query, 20);
    return ok(items, "OK", { pagination, meta: { unread: db.notifications.filter((n) => !n.read).length } });
  }),

  route("POST", "/admin/notifications/:id/read", ({ db, params }) => {
    const n = findOrThrow(db.notifications, params.id, "الإشعار");
    n.read = true;
    return ok(n);
  }),

  route("POST", "/admin/notifications/read-all", ({ db }) => {
    db.notifications.forEach((n) => {
      n.read = true;
    });
    return ok(null, "تم تعليم كل الإشعارات كمقروءة");
  }),

  // ── Global search (⌘K) ────────────────────────────────────
  route("GET", "/admin/search", ({ db, query }) => {
    const q = query.get("q")?.trim() ?? "";
    if (q.length < 2) return ok({ query: q, results: [] });
    const sq = new URLSearchParams({ search: q });
    const qNorm = q.replace(/[\s-]/g, "").toUpperCase();
    const results: SearchResult[] = [];

    db.customers
      .filter((c) => matchesSearch(sq, c.name, c.phone, c.phone.replace(/\s/g, "")))
      .slice(0, 5)
      .forEach((c) => results.push({ id: c.id, group: "customers", title: c.name, subtitle: c.phone, href: `/customers/${c.id}` }));

    db.vehicles
      .filter((v) => v.plateNormalized.includes(qNorm))
      .slice(0, 5)
      .forEach((v) => results.push({ id: v.id, group: "plates", title: v.plate, subtitle: `${v.make} ${v.model} — ${customerName(db, v.customerId) ?? ""}`, href: `/customers/${v.customerId}` }));

    db.businesses
      .filter((b) => matchesSearch(sq, b.name.ar, b.name.en, b.ownerName))
      .slice(0, 5)
      .forEach((b) => results.push({ id: b.id, group: "washes", title: b.name.ar, subtitle: b.ownerName, href: `/washes/${b.id}` }));

    db.branches
      .filter((b) => matchesSearch(sq, b.name.ar, b.name.en))
      .slice(0, 5)
      .forEach((b) => results.push({ id: b.id, group: "branches", title: b.name.ar, subtitle: businessName(db, b.businessId).ar, href: `/washes/${b.businessId}` }));

    db.orders
      .filter((o) => matchesSearch(sq, o.number, o.code))
      .slice(0, 5)
      .forEach((o) => results.push({ id: o.id, group: "orders", title: o.number, subtitle: `${businessName(db, o.businessId).ar} — ${customerName(db, o.customerId) ?? "عميل مباشر"}`, href: `/orders/${o.id}` }));

    db.complaints
      .filter((c) => matchesSearch(sq, c.ticket))
      .slice(0, 5)
      .forEach((c) => results.push({ id: c.id, group: "complaints", title: c.ticket, subtitle: customerName(db, c.customerId) ?? "", href: `/complaints/${c.id}` }));

    return ok({ query: q, results });
  }),

  // ── Demo utilities ────────────────────────────────────────
  route("POST", "/admin/system/reset", ({ db, admin }) => {
    const sessions = db.sessions;
    const fresh = resetDb();
    // Seeded admin ids are stable, so open sessions stay valid after the reset.
    fresh.sessions = sessions;
    logAudit(fresh, { actorId: admin.id, action: "system.reset", entity: "system", entityId: "database" });
    return ok(null, "تمت إعادة ضبط بيانات العرض");
  }),
];
