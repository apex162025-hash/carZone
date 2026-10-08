import { get, mutate, now, nid } from "../db.js";
import { write } from "../net.js";
import { computeQuote } from "./pricing.js";
import { slotStarts, occupancy } from "./availability.js";
import { can } from "./permissions.js";

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class DomainError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function prefs() {
  try {
    return { reminders: true, offers: true, ...JSON.parse(localStorage.getItem("carzen_notif_prefs") || "{}") };
  } catch {
    return { reminders: true, offers: true };
  }
}

function audit(draft, entry) {
  draft.auditLogs.push({
    id: nid("aud"),
    actorType: entry.actorType,
    actorId: entry.actorId,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    branchId: entry.branchId || null,
    oldValue: entry.oldValue ?? null,
    newValue: entry.newValue ?? null,
    reason: entry.reason ?? null,
    at: now().toISOString(),
  });
}

function notify(draft, audience, userId, type, title, body, link) {
  if (type === "reminder" && prefs().reminders === false) return;
  if (type === "offer" && prefs().offers === false) return;
  draft.notifications.unshift({
    id: nid("ntf"),
    audience, userId, type, title, body, link,
    read: false,
    createdAt: now().toISOString(),
  });
}

const COPY = {
  created: [{ ar: "تم إنشاء الحجز", en: "Booking created" }, { ar: "طلبك بانتظار مراجعة المغسلة.", en: "The wash is reviewing your request." }],
  confirmed: [{ ar: "تم تأكيد حجزك", en: "Your booking is confirmed" }, { ar: "أظهر رمز الوصول عند الوصول.", en: "Show your check-in code on arrival." }],
  waiting: [{ ar: "تم تسجيل وصولك", en: "Arrival recorded" }, { ar: "سيارتك في الانتظار.", en: "Your car is in the queue." }],
  in_service: [{ ar: "بدأ تنفيذ الخدمة", en: "Service started" }, { ar: "الفريق يعمل على سيارتك الآن.", en: "The team is working on your car." }],
  completed: [{ ar: "اكتملت الخدمة", en: "Service completed" }, { ar: "قيّم الزيارة عندما تكون جاهزًا.", en: "Rate the visit when you are ready." }],
  cancelled: [{ ar: "تم إلغاء الحجز", en: "Booking cancelled" }, { ar: "تم تحرير الموعد.", en: "The slot has been released." }],
  reminder: [{ ar: "تذكير بموعد الغسيل", en: "Wash reminder" }, { ar: "موعدك اقترب.", en: "Your slot is coming up." }],
  rescheduled: [{ ar: "تم تغيير موعد الحجز", en: "Booking rescheduled" }, { ar: "تم تحديث الموعد ورقم الحجز كما هو.", en: "The time changed. Your booking number is the same." }],
  review: [{ ar: "قيّم زيارتك", en: "Rate your visit" }, { ar: "شاركنا رأيك في الخدمة.", en: "Tell us how the wash went." }],
};

function pushStatus(draft, order, type) {
  if (!order.customerId) return;
  const [title, body] = COPY[type];
  notify(draft, "customer", order.customerId, type === "completed" ? "review_reminder" : type, title, body, `#/booking/${order.id}`);
  notify(draft, "staff", "st_samir", type, title, body, `#/orders/${order.id}`);
  const owner = draft.staff.find((s) => s.businessId === order.businessId && s.role === "owner");
  if (owner) notify(draft, "owner", owner.id, type, title, body, `#/orders/${order.id}`);
}

function takeCode(draft) {
  const next = draft.counters.bookingCodes.shift();
  if (next) return next;
  const used = new Set(draft.orders.map((o) => o.code));
  let code = "";
  do {
    code = Array.from({ length: 5 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("");
  } while (used.has(code));
  return code;
}

function takeAppNumber(draft) {
  const current = draft.counters.nextAppBooking;
  const n = Number(current.split("-")[1]) + 1;
  draft.counters.nextAppBooking = `CZ-${String(n).padStart(5, "0")}`;
  return current;
}

function staffActor(draft, staffId) {
  const staff = draft.staff.find((s) => s.id === staffId);
  if (!staff) return null;
  return { type: "staff", ...staff };
}

export async function createAppBooking({ branchId, serviceId, addonIds, vehicleId, scheduledAt, note, customerId }) {
  return write(() => mutate((draft) => {
    if (typeof localStorage !== "undefined" && localStorage.getItem("carzen_force_slot") === "1") {
      localStorage.removeItem("carzen_force_slot");
      throw new DomainError("slot_taken");
    }
    const customer = draft.customers.find((c) => c.id === customerId);
    if (!customer || customer.status !== "active") throw new DomainError("customer");
    const vehicle = draft.vehicles.find((v) => v.id === vehicleId && v.customerId === customerId);
    if (!vehicle) throw new DomainError("vehicle");
    const branch = draft.branches.find((b) => b.id === branchId);
    const quote = computeQuote(draft, { branchId, serviceId, addonIds }, now());
    const start = new Date(scheduledAt);
    const slots = slotStarts(draft, branch, start, quote.durationMin, now());
    if (!slots.some((s) => new Date(s.start).getTime() === start.getTime())) throw new DomainError("slot_taken");
    const status = branch.settings.autoConfirm ? "confirmed" : "pending";
    const order = {
      id: nid("ord"),
      number: takeAppNumber(draft),
      code: takeCode(draft),
      source: "app",
      customerId,
      vehicleId,
      plate: vehicle.plate,
      businessId: branch.businessId,
      branchId,
      items: quote.items,
      subtotal: quote.subtotal,
      discount: quote.discount ? { amount: quote.discount, pct: quote.offer?.discountType === "percent" ? quote.offer.discountValue : null, reason: "offer", byStaffId: null } : null,
      offerId: quote.offerId,
      total: quote.total,
      durationMin: quote.durationMin,
      scheduledAt: start.toISOString(),
      status,
      paymentStatus: "pending",
      paymentMethod: null,
      assignedStaffId: null,
      timeline: [{ status, at: now().toISOString(), byType: "customer", byId: customerId }],
      notes: note ? [{ text: note, byType: "customer", byId: customerId, at: now().toISOString() }] : [],
      cancel: null,
      closedInShiftId: null,
      createdAt: now().toISOString(),
      reminderSent: false,
      createdAfterSeed: true,
    };
    draft.orders.push(order);
    const rate = draft.businesses.find((b) => b.id === branch.businessId)?.commissionRate || 7;
    draft.transactions.push({
      id: nid("txn"), orderId: order.id, businessId: branch.businessId,
      gross: order.total, commissionRate: rate, commission: Math.round(order.total * rate) / 100,
      netToWash: Math.round((order.total - order.total * rate / 100) * 100) / 100,
      date: order.createdAt, status: "pending", flag: null,
    });
    audit(draft, { actorType: "customer", actorId: customerId, action: "order.create", entity: "order", entityId: order.id, branchId, oldValue: null, newValue: status });
    pushStatus(draft, order, "created");
    if (status === "confirmed") pushStatus(draft, order, "confirmed");
    return order;
  }));
}

export async function cancelBooking(orderId, customerId, reason) {
  return write(() => mutate((draft) => {
    const order = draft.orders.find((o) => o.id === orderId && o.customerId === customerId);
    if (!order || !["pending", "confirmed"].includes(order.status)) throw new DomainError("cancel");
    const branch = draft.branches.find((b) => b.id === order.branchId);
    const late = now().getTime() > new Date(order.scheduledAt).getTime() - branch.settings.freeCancelMin * 60000;
    const prev = order.status;
    order.status = "cancelled";
    order.cancel = { reason, byType: "customer", byId: customerId, at: now().toISOString(), late };
    order.timeline.push({ status: "cancelled", at: now().toISOString(), byType: "customer", byId: customerId });
    const txn = draft.transactions.find((t) => t.orderId === order.id && t.status === "pending");
    if (txn) draft.transactions = draft.transactions.filter((t) => t !== txn);
    audit(draft, { actorType: "customer", actorId: customerId, action: "order.cancel", entity: "order", entityId: order.id, branchId: order.branchId, oldValue: prev, newValue: "cancelled", reason });
    pushStatus(draft, order, "cancelled");
    return order;
  }));
}

export function canReschedule(order, branch, when = now()) {
  if (!order || !["pending", "confirmed"].includes(order.status)) return false;
  return when.getTime() <= new Date(order.scheduledAt).getTime() - branch.settings.freeCancelMin * 60000;
}

export async function rescheduleBooking(orderId, customerId, scheduledAt) {
  return write(() => mutate((draft) => {
    const order = draft.orders.find((o) => o.id === orderId && o.customerId === customerId);
    const branch = draft.branches.find((b) => b.id === order?.branchId);
    if (!canReschedule(order, branch, now())) throw new DomainError("reschedule");
    const start = new Date(scheduledAt);
    const slots = slotStarts(draft, branch, start, order.durationMin, now());
    if (!slots.some((s) => new Date(s.start).getTime() === start.getTime())) throw new DomainError("slot_taken");
    const prev = order.scheduledAt;
    order.scheduledAt = start.toISOString();
    order.reminderSent = false;
    order.timeline.push({ status: "rescheduled", at: now().toISOString(), byType: "customer", byId: customerId });
    audit(draft, { actorType: "customer", actorId: customerId, action: "order.reschedule", entity: "order", entityId: order.id, branchId: order.branchId, oldValue: prev, newValue: order.scheduledAt });
    pushStatus(draft, order, "rescheduled");
    return order;
  }));
}

export async function advanceOrder(orderId, staffId = "st_samir") {
  return write(() => mutate((draft) => {
    const order = draft.orders.find((o) => o.id === orderId);
    if (!order) throw new DomainError("missing");
    const actor = staffActor(draft, staffId);
    const branch = draft.branches.find((b) => b.id === order.branchId);
    const prev = order.status;
    if (order.status === "pending") {
      if (!can(actor, "confirm_booking", { branchId: order.branchId })) throw new DomainError("forbidden");
      order.status = "confirmed";
    } else if (order.status === "confirmed") {
      if (!can(actor, "run_service", { branchId: order.branchId })) throw new DomainError("forbidden");
      order.status = "waiting";
    } else if (order.status === "waiting") {
      if (!can(actor, "run_service", { branchId: order.branchId })) throw new DomainError("forbidden");
      const busy = draft.orders.filter((o) => o.branchId === order.branchId && o.status === "in_service").length;
      if (busy >= branch.capacity) throw new DomainError("no_bay");
      order.status = "in_service";
      order.assignedStaffId = staffId;
    } else if (order.status === "in_service") {
      if (!can(actor, "run_service", { branchId: order.branchId })) throw new DomainError("forbidden");
      order.status = "completed";
    } else if (order.status === "completed" && order.paymentStatus === "pending") {
      if (!can(actor, "collect_payment", { branchId: order.branchId })) throw new DomainError("forbidden");
      order.paymentStatus = "paid";
      order.paymentMethod = "cash";
      draft.payments.push({
        id: nid("pay"), orderId: order.id, amount: order.total, method: "cash",
        collectedBy: staffId, collectedAt: now().toISOString(), status: "paid",
      });
      const txn = draft.transactions.find((t) => t.orderId === order.id);
      if (txn) txn.status = "paid";
      audit(draft, { actorType: "staff", actorId: staffId, action: "payment.collect", entity: "order", entityId: order.id, branchId: order.branchId, oldValue: "pending", newValue: "paid" });
      return order;
    } else {
      throw new DomainError("nothing");
    }
    order.timeline.push({ status: order.status, at: now().toISOString(), byType: "staff", byId: staffId });
    audit(draft, { actorType: "staff", actorId: staffId, action: "order.status", entity: "order", entityId: order.id, branchId: order.branchId, oldValue: prev, newValue: order.status });
    pushStatus(draft, order, order.status);
    return order;
  }));
}

export async function simulateAppBooking() {
  const db = get();
  const ahmed = db.customers.find((c) => c.id === "cu_ahmed");
  const branch = db.branches.find((b) => b.id === "br_nasr");
  const service = db.services.find((s) => s.id === "svc_br_nasr_full");
  const slots = slotStarts(db, branch, now(), service.durationMin, now());
  const five = slots.find((s) => {
    const d = new Date(s.start);
    return d.getHours() === 17 && d.getMinutes() === 0;
  });
  const slot = five || slots[0];
  if (!slot) throw new DomainError("slot_taken");
  return createAppBooking({
    branchId: branch.id,
    serviceId: service.id,
    addonIds: [],
    vehicleId: "ve_corolla",
    scheduledAt: slot.start,
    customerId: ahmed.id,
  });
}

export function processReminders() {
  const db = get();
  const t = now().getTime();
  const due = db.orders.filter((o) => {
    if (!["pending", "confirmed"].includes(o.status) || o.reminderSent || !o.customerId) return false;
    const branch = db.branches.find((b) => b.id === o.branchId);
    const at = new Date(o.scheduledAt).getTime() - (branch?.settings.reminderMin || 45) * 60000;
    return t >= at && t < new Date(o.scheduledAt).getTime();
  });
  if (!due.length) return;
  mutate((draft) => {
    for (const id of due.map((o) => o.id)) {
      const order = draft.orders.find((o) => o.id === id);
      if (!order || order.reminderSent) continue;
      order.reminderSent = true;
      const [title, body] = COPY.reminder;
      notify(draft, "customer", order.customerId, "reminder", title, body, `#/booking/${order.id}`);
    }
  });
}

export async function submitReview({ orderId, customerId, stars, tags, comment }) {
  return write(() => mutate((draft) => {
    const order = draft.orders.find((o) => o.id === orderId && o.customerId === customerId);
    if (!order || order.status !== "completed") throw new DomainError("review");
    if (draft.reviews.some((r) => r.orderId === orderId)) throw new DomainError("duplicate");
    if (!stars || stars < 1 || stars > 5) throw new DomainError("stars");
    const review = {
      id: nid("rv"), orderId, customerId, businessId: order.businessId, branchId: order.branchId,
      serviceId: order.items.find((i) => i.type === "primary")?.serviceId || order.items[0].serviceId,
      stars, tags: tags || [], comment: String(comment || "").slice(0, 500),
      reply: null, status: "visible", hiddenReason: null, reportedByWash: false,
      createdAt: now().toISOString(),
    };
    draft.reviews.push(review);
    for (const b of draft.branches) {
      const rs = draft.reviews.filter((r) => r.branchId === b.id && r.status === "visible");
      b.reviewCount = rs.length;
      b.rating = rs.length ? Math.round((rs.reduce((s, r) => s + r.stars, 0) / rs.length) * 10) / 10 : 0;
    }
    audit(draft, { actorType: "customer", actorId: customerId, action: "review.create", entity: "review", entityId: review.id, branchId: order.branchId, oldValue: null, newValue: stars });
    return review;
  }));
}

export async function submitComplaint({ orderId, customerId, category, description }) {
  return write(() => mutate((draft) => {
    const order = draft.orders.find((o) => o.id === orderId && o.customerId === customerId);
    if (!order || !["completed", "cancelled", "no_show"].includes(order.status)) throw new DomainError("complaint");
    if (!category || String(description || "").trim().length < 20) throw new DomainError("description");
    const ticket = draft.counters.nextTicket;
    draft.counters.nextTicket += 1;
    const row = {
      id: `cp_${ticket}`,
      customerId, businessId: order.businessId, branchId: order.branchId, orderId,
      category, description: description.trim(), status: "open",
      assignedAdminId: null, notes: [], resolution: null, createdAt: now().toISOString(), ticket,
    };
    draft.complaints.push(row);
    notify(draft, "admin", "au_mona", "complaint", { ar: "بلاغ جديد", en: "New report" }, { ar: description.trim().slice(0, 80), en: description.trim().slice(0, 80) }, `#/complaints/${row.id}`);
    audit(draft, { actorType: "customer", actorId: customerId, action: "complaint.create", entity: "complaint", entityId: row.id, branchId: order.branchId, oldValue: null, newValue: "open" });
    return row;
  }));
}

void occupancy;
