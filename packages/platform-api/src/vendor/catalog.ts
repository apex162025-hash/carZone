import "server-only";

import type { Offer } from "@carzen/contracts/offers";
import type { VendorNotificationType } from "@carzen/contracts/vendor/catalog";
import type { VendorBranch, VendorOffer, VendorService, VendorSettings } from "@carzen/contracts/vendor/catalog";
import type { BranchSettings, ServiceType, WorkingDay } from "@carzen/contracts/washes";
import { daysAgo, isSameDay, logAudit, nid, now, pushAdminNotification } from "../db";
import { MockApiError, matchesSearch, ok, requireText } from "../http";
import { branchName } from "../lookups";
import { type VendorActor, vroute } from "../router";
import type { MockDatabase } from "../schema";
import { defaultPermissions } from "../seed";
import { DEFAULT_NOTIFICATION_PREFS, vendorSettingsFor } from "./notify";
import { assertBranch, assertOwner, findInScope, scopeBranches } from "./scope";

const CATEGORIES = ["exterior", "interior", "full", "deep"];

function audit(db: MockDatabase, actor: VendorActor, action: string, entity: string, entityId: string, branchId: string | null, oldValue: unknown, newValue: unknown, reason?: string | null) {
  logAudit(db, { actorType: "staff", actorId: actor.staff.id, action, entity, entityId, branchId, oldValue, newValue, reason: reason ?? null });
}

function canEditServices(db: MockDatabase, actor: VendorActor) {
  return actor.role === "owner" || vendorSettingsFor(db, actor.business.id).managerCanEditServices;
}

function deriveOfferStatus(o: Offer): Offer["status"] {
  if (o.status === "draft" || o.status === "disabled") return o.status;
  const t = now().getTime();
  if (new Date(o.endAt).getTime() < t) return "expired";
  if (new Date(o.startAt).getTime() > t) return "scheduled";
  return "active";
}

function parseServiceBody(body: Record<string, unknown>) {
  const name = (body.name ?? {}) as { ar?: string; en?: string };
  const description = (body.description ?? {}) as { ar?: string; en?: string };
  const nameAr = requireText(name.ar, "name.ar", "اسم الخدمة بالعربية", 2);
  const nameEn = requireText(name.en, "name.en", "اسم الخدمة بالإنجليزية", 2);
  const price = Number(body.price);
  const durationMin = Number(body.durationMin);
  if (Number.isNaN(price) || price < 10 || price > 5000) throw new MockApiError("السعر يجب أن يكون بين 10 و 5000 ج.م", 422, { price: ["قيمة غير صالحة"] });
  if (Number.isNaN(durationMin) || durationMin < 2 || durationMin > 240) throw new MockApiError("المدة بين 2 و 240 دقيقة", 422, { durationMin: ["قيمة غير صالحة"] });
  const type: ServiceType = body.type === "addon" ? "addon" : "primary";
  const category = CATEGORIES.includes(String(body.category)) ? String(body.category) : "exterior";
  return {
    name: { ar: nameAr, en: nameEn },
    description: { ar: String(description.ar ?? "").trim(), en: String(description.en ?? "").trim() },
    price: Math.round(price),
    durationMin: Math.round(durationMin),
    type,
    category,
    active: body.active !== false,
  };
}


export const vendorCatalogRoutes = [
  // ── Services (D8) ───────────────────────────────────────
  vroute("GET", "/vendor/services", ({ db, query, actor }) => {
    const branchIds = scopeBranches(actor, query.get("branchId"));
    const type = query.get("type");
    const from = daysAgo(29);
    const list: VendorService[] = db.services
      .filter((s) => branchIds.includes(s.branchId) && (!type || type === "all" || s.type === type) && matchesSearch(query, s.name.ar, s.name.en))
      .map((s) => {
        const orders = db.orders.filter((o) => o.items.some((i) => i.serviceId === s.id));
        return {
          ...s,
          branchName: branchName(db, s.branchId),
          description: db.serviceDescriptions[s.id] ?? { ar: s.type === "addon" ? "إضافة اختيارية على الخدمة الأساسية." : "خدمة غسيل بمعايير كارزن.", en: "" },
          ordersCount: orders.length,
          revenue30d: orders
            .filter((o) => o.paymentStatus === "paid" && new Date(o.scheduledAt) >= from)
            .reduce((sum, o) => sum + (o.items.find((i) => i.serviceId === s.id)?.price ?? 0), 0),
        };
      })
      .sort((a, b) => a.branchId.localeCompare(b.branchId) || (a.type === b.type ? a.price - b.price : a.type === "primary" ? -1 : 1));
    return ok(list, "OK", { meta: { canEdit: canEditServices(db, actor) } });
  }),

  vroute("POST", "/vendor/services", ({ db, body, actor }) => {
    if (!canEditServices(db, actor)) throw new MockApiError("تعديل الخدمات متاح للمالك فقط (أو لمدير مُصرّح له)", 403);
    const branchId = String(body.branchId ?? "");
    assertBranch(actor, branchId);
    const data = parseServiceBody(body);
    const svc = { id: nid("svc"), branchId, ...data };
    const { description, ...service } = svc;
    db.services.push(service);
    db.serviceDescriptions[svc.id] = description;
    audit(db, actor, "service.create", "services", svc.id, branchId, null, `${data.name.ar} · ${data.price} ج.م · ${data.durationMin} د`);
    return ok(service, `تمت إضافة «${data.name.ar}» — تظهر للعملاء فورًا`);
  }),

  vroute("PATCH", "/vendor/services/:id", ({ db, params, body, actor }) => {
    if (!canEditServices(db, actor)) throw new MockApiError("تعديل الخدمات متاح للمالك فقط (أو لمدير مُصرّح له)", 403);
    const svc = findInScope(actor, db.services, params.id, "الخدمة");
    const data = parseServiceBody(body);
    const before = { name: svc.name.ar, price: svc.price, durationMin: svc.durationMin, active: svc.active };
    const priceChanged = data.price !== svc.price;
    if (!data.active && svc.active && svc.type === "primary") {
      const remaining = db.services.filter((s) => s.branchId === svc.branchId && s.type === "primary" && s.active && s.id !== svc.id).length;
      if (!remaining) throw new MockApiError("لا يمكن إيقاف آخر خدمة أساسية مفعّلة في الفرع", 409);
    }
    Object.assign(svc, { name: data.name, price: data.price, durationMin: data.durationMin, type: data.type, category: data.category, active: data.active });
    db.serviceDescriptions[svc.id] = data.description;
    audit(
      db, actor, priceChanged ? "service.price_change" : "service.update", "services", svc.id, svc.branchId,
      before, { name: svc.name.ar, price: svc.price, durationMin: svc.durationMin, active: svc.active },
      typeof body.reason === "string" ? body.reason : null,
    );
    return ok(svc, priceChanged ? `تم تحديث السعر (${before.price} ← ${svc.price} ج.م) — يُطبق على الطلبات الجديدة فقط` : "تم حفظ الخدمة");
  }),

  // ── Wash offers (D9) ─────────────────────────────────────
  vroute("GET", "/vendor/offers", ({ db, query, actor }) => {
    const branchIds = scopeBranches(actor, query.get("branchId"));
    const status = query.get("status");
    const list: VendorOffer[] = db.offers
      .filter((o) => (o.businessId === actor.business.id || (o.scope === "platform" && o.branchIds.some((b) => branchIds.includes(b)))))
      .map((o) => ({
        id: o.id,
        scope: o.scope,
        businessId: o.businessId,
        branchIds: o.branchIds.filter((b) => actor.branchIds.includes(b)),
        serviceCategories: o.serviceCategories,
        title: o.title,
        description: o.description,
        discountType: o.discountType,
        discountValue: o.discountValue,
        startAt: o.startAt,
        endAt: o.endAt,
        status: deriveOfferStatus(o),
        editable: o.scope === "wash" && o.businessId === actor.business.id,
        redemptions: db.orders.filter((x) => x.offerId === o.id && actor.branchIds.includes(x.branchId)).length,
      }))
      .filter((o) => matchesSearch(query, o.title.ar, o.title.en))
      .sort((a, b) => b.startAt.localeCompare(a.startAt));
    // Counts are computed before the status filter so every tab shows its real total.
    const counts = ["draft", "scheduled", "active", "expired", "disabled"].reduce<Record<string, number>>((acc, s) => ({ ...acc, [s]: list.filter((o) => o.status === s).length }), {});
    const items = !status || status === "all" ? list : list.filter((o) => o.status === status);
    return ok(items, "OK", { meta: { counts } });
  }),

  vroute("POST", "/vendor/offers", ({ db, body, actor }) => {
    assertOwner(actor, "إدارة العروض");
    const data = parseOffer(actor, body);
    const offer: Offer = { id: nid("of"), scope: "wash", businessId: actor.business.id, featured: false, status: body.publish ? "active" : "draft", ...data };
    offer.status = deriveOfferStatus(offer);
    db.offers.unshift(offer);
    audit(db, actor, "offer.create", "offers", offer.id, null, null, `${offer.title.ar} · ${offer.status}`);
    return ok(offer, offer.status === "draft" ? "تم حفظ العرض كمسودة" : "تم نشر العرض — يطبقه التسعير تلقائيًا");
  }),

  vroute("PATCH", "/vendor/offers/:id", ({ db, params, body, actor }) => {
    assertOwner(actor, "إدارة العروض");
    const offer = db.offers.find((o) => o.id === params.id && o.businessId === actor.business.id && o.scope === "wash");
    if (!offer) throw new MockApiError("العرض غير موجود أو غير قابل للتعديل", 404);
    const data = parseOffer(actor, body);
    const before = { title: offer.title.ar, discount: offer.discountValue };
    Object.assign(offer, data);
    if (body.publish && offer.status === "draft") offer.status = "active";
    offer.status = deriveOfferStatus(offer);
    audit(db, actor, "offer.update", "offers", offer.id, null, before, { title: offer.title.ar, discount: offer.discountValue });
    return ok(offer, "تم تحديث العرض");
  }),

  vroute("POST", "/vendor/offers/:id/status", ({ db, params, body, actor }) => {
    assertOwner(actor, "إدارة العروض");
    const offer = db.offers.find((o) => o.id === params.id && o.businessId === actor.business.id && o.scope === "wash");
    if (!offer) throw new MockApiError("العرض غير موجود", 404);
    const enable = Boolean(body.enabled);
    const old = deriveOfferStatus(offer);
    offer.status = enable ? "active" : "disabled";
    offer.status = deriveOfferStatus(offer);
    audit(db, actor, enable ? "offer.enable" : "offer.disable", "offers", offer.id, null, old, offer.status);
    return ok(offer, enable ? "تم تفعيل العرض" : "تم إيقاف العرض");
  }),

  // ── Branches (D16) & booking rules (OW-12) ───────────────
  vroute("GET", "/vendor/branches", ({ db, actor }) => {
    const list: VendorBranch[] = db.branches
      .filter((b) => actor.branchIds.includes(b.id))
      .map((b) => ({
        ...b,
        todayOrders: db.orders.filter((o) => o.branchId === b.id && isSameDay(o.scheduledAt, now())).length,
        upcomingOrders: db.orders.filter((o) => o.branchId === b.id && ["pending", "confirmed"].includes(o.status) && new Date(o.scheduledAt) > now()).length,
        servicesCount: db.services.filter((s) => s.branchId === b.id && s.active).length,
        staffCount: db.staff.filter((s) => s.branchId === b.id && s.role !== "owner" && s.status === "active").length,
      }));
    return ok(list);
  }),

  vroute("PATCH", "/vendor/branches/:id", ({ db, params, body, actor }) => {
    assertOwner(actor, "تعديل بيانات الفرع");
    const target = db.branches.find((b) => b.id === params.id);
    if (!target || !actor.branchIds.includes(target.id)) throw new MockApiError("الفرع غير موجود", 404);
    const reason = requireText(body.reason, "reason", "سبب التعديل", 3);
    const name = (body.name ?? {}) as { ar?: string; en?: string };
    const address = (body.address ?? {}) as { ar?: string; en?: string };
    const capacity = Number(body.capacity);
    if (Number.isNaN(capacity) || capacity < 1 || capacity > 30) throw new MockApiError("السعة بين 1 و 30 مكان", 422, { capacity: ["قيمة غير صالحة"] });
    const hours = Array.isArray(body.workingHours) ? (body.workingHours as WorkingDay[]) : target.workingHours;
    if (hours.length !== 7) throw new MockApiError("ساعات العمل يجب أن تغطي 7 أيام", 422);
    const before = { name: target.name.ar, capacity: target.capacity, active: target.active };
    const deactivating = target.active && body.active === false;

    target.name = { ar: requireText(name.ar, "name.ar", "اسم الفرع", 2), en: String(name.en ?? target.name.en).trim() || target.name.en };
    target.address = { ar: requireText(address.ar, "address.ar", "العنوان", 3), en: String(address.en ?? target.address.en).trim() || target.address.en };
    target.phone = String(body.phone ?? target.phone).trim();
    target.amenities = Array.isArray(body.amenities) ? body.amenities.map(String) : target.amenities;
    target.capacity = Math.round(capacity);
    target.workingHours = hours.map((d) => ({ open: String(d.open), close: String(d.close), closed: Boolean(d.closed) }));
    target.active = body.active !== false;

    audit(db, actor, "branch.update", "branches", target.id, target.id, before, { name: target.name.ar, capacity: target.capacity, active: target.active }, reason);
    if (deactivating) {
      pushAdminNotification(db, "unusual_activity", { ar: "فرع أوقفه المالك", en: "Branch deactivated by owner" }, { ar: `${target.name.ar} — ${reason}`, en: target.name.en }, `/washes/${actor.business.id}`);
      const upcoming = db.orders.filter((o) => o.branchId === target.id && ["pending", "confirmed"].includes(o.status) && new Date(o.scheduledAt) > now()).length;
      return ok(target, upcoming ? `تم إيقاف الفرع — تنبيه: يوجد ${upcoming} حجز قادم لم يُلغ` : "تم إيقاف الفرع وإخفاؤه من تطبيق العميل");
    }
    return ok(target, "تم حفظ بيانات الفرع");
  }),

  vroute("PUT", "/vendor/branches/:id/settings", ({ db, params, body, actor }) => {
    assertOwner(actor, "تعديل قواعد الحجز");
    const target = db.branches.find((b) => b.id === params.id);
    if (!target || !actor.branchIds.includes(target.id)) throw new MockApiError("الفرع غير موجود", 404);
    const reason = requireText(body.reason, "reason", "سبب التعديل", 3);
    const s = (body.settings ?? {}) as Partial<BranchSettings>;
    const num = (v: unknown, min: number, max: number, label: string) => {
      const n = Number(v);
      if (Number.isNaN(n) || n < min || n > max) throw new MockApiError(`${label} بين ${min} و ${max}`, 422);
      return Math.round(n);
    };
    const next: BranchSettings = {
      autoConfirm: Boolean(s.autoConfirm),
      slotIntervalMin: [15, 20, 30, 45, 60].includes(Number(s.slotIntervalMin)) ? Number(s.slotIntervalMin) : 30,
      leadTimeMin: num(s.leadTimeMin, 0, 240, "مهلة الحجز"),
      maxAdvanceDays: num(s.maxAdvanceDays, 1, 30, "أقصى أيام مسبقة"),
      freeCancelMin: num(s.freeCancelMin, 0, 1440, "نافذة الإلغاء المجاني"),
      noShowGraceMin: num(s.noShowGraceMin, 5, 120, "مهلة عدم الحضور"),
      reminderMin: num(s.reminderMin, 5, 1440, "توقيت التذكير"),
    };
    const before = target.settings;
    target.settings = next;
    audit(db, actor, "branch.rules", "branches", target.id, target.id, before, next, reason);
    return ok(target, "تم حفظ قواعد الحجز — تنعكس في تطبيق العميل فورًا");
  }),

  // ── Settings (D19) ───────────────────────────────────────
  vroute("GET", "/vendor/settings", ({ db, actor }) => {
    const s = vendorSettingsFor(db, actor.business.id);
    const data: VendorSettings = {
      business: {
        id: actor.business.id,
        name: actor.business.name,
        ownerName: actor.business.ownerName,
        phone: s.phone,
        email: s.email,
        commissionRate: actor.business.commissionRate ?? db.defaultCommissionPct,
        status: actor.business.status,
      },
      managerCanEditServices: s.managerCanEditServices,
      notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS, ...s.notificationPrefs },
      roleMatrix: (["owner", "manager", "employee"] as const).map((role) => ({
        role,
        permissions: defaultPermissions(role),
        maxDiscountPct: role === "owner" ? 100 : role === "manager" ? 20 : 10,
      })),
    };
    return ok(data);
  }),

  vroute("PUT", "/vendor/settings", ({ db, body, actor }) => {
    assertOwner(actor, "تعديل إعدادات المغسلة");
    const reason = requireText(body.reason, "reason", "سبب التعديل", 3);
    const s = vendorSettingsFor(db, actor.business.id);
    const changes: string[] = [];
    if (body.business && typeof body.business === "object") {
      const b = body.business as { name?: { ar?: string; en?: string }; phone?: string; email?: string };
      const nameAr = requireText(b.name?.ar, "name.ar", "اسم المغسلة", 2);
      const email = String(b.email ?? "").trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new MockApiError("صيغة البريد غير صحيحة", 422, { email: ["صيغة غير صحيحة"] });
      actor.business.name = { ar: nameAr, en: String(b.name?.en ?? "").trim() || actor.business.name.en };
      s.phone = String(b.phone ?? s.phone).trim();
      s.email = email;
      changes.push("business");
    }
    if (typeof body.managerCanEditServices === "boolean") {
      s.managerCanEditServices = body.managerCanEditServices;
      changes.push("managerCanEditServices");
    }
    if (body.notificationPrefs && typeof body.notificationPrefs === "object") {
      s.notificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS, ...(body.notificationPrefs as Record<VendorNotificationType, boolean>) };
      changes.push("notificationPrefs");
    }
    if (!changes.length) throw new MockApiError("لا توجد تغييرات للحفظ", 422);
    audit(db, actor, "settings.update", "settings", actor.business.id, null, null, changes.join(", "), reason);
    return ok(null, "تم حفظ الإعدادات");
  }),
];

function parseOffer(actor: VendorActor, body: Record<string, unknown>) {
  const title = (body.title ?? {}) as { ar?: string; en?: string };
  const description = (body.description ?? {}) as { ar?: string; en?: string };
  const discountType = body.discountType === "fixed" ? "fixed" : "percent";
  const discountValue = Number(body.discountValue);
  if (Number.isNaN(discountValue) || discountValue <= 0) throw new MockApiError("قيمة الخصم غير صالحة", 422);
  if (discountType === "percent" && discountValue > 50) throw new MockApiError("الحد الأقصى للخصم ٥٠٪", 422);
  const startAt = new Date(String(body.startAt));
  const endAt = new Date(String(body.endAt));
  if (Number.isNaN(+startAt) || Number.isNaN(+endAt) || endAt <= startAt) throw new MockApiError("تاريخ النهاية يجب أن يكون بعد البداية", 422);
  const branchIds = Array.isArray(body.branchIds) ? body.branchIds.map(String).filter((b) => actor.branchIds.includes(b)) : [];
  if (!branchIds.length) throw new MockApiError("اختر فرعًا واحدًا على الأقل", 422);
  return {
    title: { ar: requireText(title.ar, "title.ar", "عنوان العرض", 3), en: String(title.en ?? "").trim() || String(title.ar) },
    description: { ar: String(description.ar ?? "").trim(), en: String(description.en ?? "").trim() },
    discountType: discountType as Offer["discountType"],
    discountValue,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    branchIds,
    serviceCategories: Array.isArray(body.serviceCategories) ? body.serviceCategories.map(String).filter((c) => CATEGORIES.includes(c)) : [],
  };
}

