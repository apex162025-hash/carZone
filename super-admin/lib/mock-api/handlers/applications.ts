import "server-only";

import type { ApplicationStatus } from "@/types/applications";
import { logAudit, nid, pushAdminNotification } from "@/lib/mock-api/db";
import { MockApiError, countBy, matchesSearch, ok, paginate, requireText, sortBy } from "@/lib/mock-api/http";
import { findOrThrow } from "@/lib/mock-api/lookups";
import { route } from "@/lib/mock-api/router";

const STATUSES: ApplicationStatus[] = ["pending", "needs_changes", "approved", "rejected"];

const CATEGORY_BY_NAME: Record<string, string> = {
  "غسيل خارجي": "exterior",
  "غسيل داخلي": "interior",
  "غسيل داخلي وخارجي": "full",
  "تنظيف عميق (بخار)": "deep",
};

export const applicationRoutes = [
  route("GET", "/admin/applications", ({ db, query }) => {
    const status = query.get("status");
    const searched = db.applications.filter((a) => matchesSearch(query, a.businessName, a.ownerName, a.phone, a.email));
    const counts = countBy(searched, STATUSES, (a) => a.status);
    const filtered = status && status !== "all" ? searched.filter((a) => a.status === status) : searched;
    // Review queue is FIFO: oldest submission first.
    const sorted = sortBy(filtered, query, { submittedAt: (a) => a.submittedAt, name: (a) => a.businessName }, { key: "submittedAt", order: "asc" });
    const { items, pagination } = paginate(sorted, query, 20);

    const approvedBiz = db.businesses.filter((b) => b.status === "approved").length;
    const pipeline = {
      submitted: db.applications.length,
      pendingReview: counts.pending + counts.needs_changes,
      approved: counts.approved,
      onboarding: approvedBiz,
      active: db.businesses.filter((b) => b.status === "active").length,
    };
    return ok(items, "OK", { pagination, meta: { counts, pipeline } });
  }),

  route("GET", "/admin/applications/:id", ({ db, params }) => ok(findOrThrow(db.applications, params.id, "الطلب"))),

  route("POST", "/admin/applications/:id/approve", ({ db, params, body, admin }) => {
    const app = findOrThrow(db.applications, params.id, "الطلب");
    if (app.status === "approved" || app.status === "rejected") {
      throw new MockApiError("تم اتخاذ قرار في هذا الطلب مسبقًا", 409);
    }
    const checklist = Array.isArray(body.checklist) ? body.checklist.map(String) : [];
    if (checklist.length < 6) {
      throw new MockApiError("أكمل قائمة التحقق قبل الموافقة", 422);
    }
    const activate = body.activateImmediately !== false;
    const note = typeof body.note === "string" ? body.note.trim() : "";

    const bizId = nid("biz");
    const branchId = nid("br");
    const ownerId = `st_owner_${bizId}`;

    db.businesses.push({
      id: bizId,
      name: { ar: app.businessName, en: app.businessName },
      ownerId,
      ownerName: app.ownerName,
      status: activate ? "active" : "approved",
      statusReason: null,
      commissionRate: null,
      rating: 0,
      createdAt: new Date().toISOString(),
    });
    db.branches.push({
      id: branchId,
      businessId: bizId,
      name: { ar: app.businessName, en: app.businessName },
      area: app.area,
      address: { ar: app.address, en: app.address },
      lat: app.lat,
      lng: app.lng,
      phone: app.phone,
      amenities: ["waiting", "card"],
      capacity: app.capacity,
      active: true,
      featured: false,
      workingHours: app.workingHours,
      settings: { ...db.settings.bookingDefaults },
      rating: 0,
      reviewCount: 0,
    });
    app.services.forEach((s, i) => {
      db.services.push({
        id: `svc_${branchId}_${i}`,
        branchId,
        type: "primary",
        category: CATEGORY_BY_NAME[s.name] ?? "exterior",
        name: { ar: s.name, en: s.name },
        price: s.price,
        durationMin: s.durationMin,
        active: true,
      });
    });
    db.staff.push({
      id: ownerId,
      businessId: bizId,
      branchId,
      name: app.ownerName,
      phone: app.phone,
      role: "owner",
      status: "active",
      maxDiscountPct: 100,
    });

    const old = app.status;
    app.status = "approved";
    app.reviewNote = note || null;
    app.reviewedAt = new Date().toISOString();
    app.businessId = bizId;

    logAudit(db, {
      actorId: admin.id,
      action: "approve_application",
      entity: "applications",
      entityId: app.id,
      oldValue: old,
      newValue: activate ? "approved → active" : "approved",
      reason: note || `تمت الموافقة وإنشاء المغسلة ${app.businessName}`,
    });
    pushAdminNotification(
      db,
      "application",
      { ar: "تمت الموافقة على مغسلة جديدة", en: "New wash approved" },
      { ar: `${app.businessName} أصبحت ${activate ? "نشطة وتظهر للعملاء" : "معتمدة بانتظار الإعداد"}.`, en: `${app.businessName} approved.` },
      `/washes/${bizId}`,
    );
    return ok({ application: app, businessId: bizId }, `تمت الموافقة على ${app.businessName}`);
  }),

  route("POST", "/admin/applications/:id/reject", ({ db, params, body, admin }) => {
    const app = findOrThrow(db.applications, params.id, "الطلب");
    if (app.status === "approved" || app.status === "rejected") {
      throw new MockApiError("تم اتخاذ قرار في هذا الطلب مسبقًا", 409);
    }
    const reason = requireText(body.reason, "reason", "سبب الرفض", 5);
    const old = app.status;
    app.status = "rejected";
    app.reviewNote = reason;
    app.reviewedAt = new Date().toISOString();
    logAudit(db, { actorId: admin.id, action: "reject_application", entity: "applications", entityId: app.id, oldValue: old, newValue: "rejected", reason });
    return ok(app, "تم رفض الطلب وإبلاغ المالك بالسبب");
  }),

  route("POST", "/admin/applications/:id/request-changes", ({ db, params, body, admin }) => {
    const app = findOrThrow(db.applications, params.id, "الطلب");
    if (app.status !== "pending") {
      throw new MockApiError("يمكن طلب التعديل على الطلبات قيد المراجعة فقط", 409);
    }
    const note = requireText(body.note, "note", "المطلوب تعديله", 5);
    app.status = "needs_changes";
    app.reviewNote = note;
    app.reviewedAt = new Date().toISOString();
    logAudit(db, { actorId: admin.id, action: "request_changes_application", entity: "applications", entityId: app.id, oldValue: "pending", newValue: "needs_changes", reason: note });
    return ok(app, "تم إرسال طلب التعديل للمالك");
  }),
];
