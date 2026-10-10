import { get, mutate, now, nid } from "../db.js";
import { write, read } from "../net.js";
import { computeQuote } from "./pricing.js";
import { slotStarts } from "./availability.js";
import { can } from "./permissions.js";
import { normalizePlate } from "../format.js";

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class WashDomainError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

function audit(draft, entry) {
  draft.auditLogs.unshift({
    id: nid("aud"),
    actorType: entry.actorType || "staff",
    actorId: entry.actorId || "st_samir",
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
  draft.notifications.unshift({
    id: nid("ntf"),
    audience,
    userId,
    type,
    title: typeof title === "string" ? { ar: title, en: title } : title,
    body: typeof body === "string" ? { ar: body, en: body } : body,
    link,
    read: false,
    createdAt: now().toISOString(),
  });
}

function staffActor(draft, staffId) {
  const staff = draft.staff.find((s) => s.id === staffId);
  if (!staff) return null;
  return { type: "staff", ...staff };
}

function generateBookingCode(draft) {
  const next = draft.counters?.bookingCodes?.shift();
  if (next) return next;
  const used = new Set(draft.orders.map((o) => o.code));
  let code = "";
  do {
    code = Array.from({ length: 5 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("");
  } while (used.has(code));
  return code;
}

function takeWalkInNumber(draft) {
  const cur = draft.counters?.nextWalkIn || "CZ-20045";
  const num = Number(cur.split("-")[1]) + 1;
  draft.counters.nextWalkIn = `CZ-${String(num).padStart(5, "0")}`;
  return cur;
}

function takePhoneNumber(draft) {
  const cur = draft.counters?.nextPhone || "CZ-30023";
  const num = Number(cur.split("-")[1]) + 1;
  draft.counters.nextPhone = `CZ-${String(num).padStart(5, "0")}`;
  return cur;
}

/**
 * Customer / vehicle recognition.
 * Matches plate, phone, or name against seeded customers and past orders.
 */
export function findCustomerOrVehicle(query, branchId = "br_nasr") {
  if (!query || String(query).trim().length < 2) return null;
  const db = get();
  const rawQ = String(query).trim();
  const normPlate = normalizePlate(rawQ);
  const cleanPhone = rawQ.replace(/[\s-+]/g, "");

  // Match vehicle by plate
  let vehicle = db.vehicles.find((v) => normalizePlate(v.plate) === normPlate);
  let customer = null;

  if (vehicle) {
    customer = db.customers.find((c) => c.id === vehicle.customerId);
  } else {
    // Try matching customer by phone
    customer = db.customers.find((c) => {
      const p = c.phone.replace(/[\s-+]/g, "");
      return p.includes(cleanPhone) || (cleanPhone.length >= 8 && p.endsWith(cleanPhone));
    });
    if (!customer) {
      // Try matching customer by name
      customer = db.customers.find((c) => c.name.toLowerCase().includes(rawQ.toLowerCase()));
    }
    if (customer) {
      vehicle = db.vehicles.find((v) => v.customerId === customer.id && v.isDefault) ||
                db.vehicles.find((v) => v.customerId === customer.id) || null;
    }
  }

  if (!customer && !vehicle) return null;

  // Calculate visits & usual service
  const custId = customer?.id || vehicle?.customerId;
  const visits = db.orders.filter((o) => {
    return (o.customerId === custId || (vehicle && normalizePlate(o.plate) === normalizePlate(vehicle.plate))) &&
           o.status === "completed";
  });

  const branchVisits = branchId ? visits.filter((o) => o.branchId === branchId) : visits;
  const count = branchVisits.length || visits.length;

  let lastVisit = null;
  if (branchVisits.length > 0) {
    const sorted = [...branchVisits].sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
    lastVisit = sorted[0].scheduledAt;
  }

  // Count service frequencies to find usual service
  const serviceCounts = {};
  branchVisits.forEach((o) => {
    const prim = o.items.find((it) => it.type === "primary") || o.items[0];
    if (prim) {
      serviceCounts[prim.serviceId] = (serviceCounts[prim.serviceId] || 0) + 1;
    }
  });

  let usualServiceId = null;
  let maxC = 0;
  for (const [svcId, c] of Object.entries(serviceCounts)) {
    if (c > maxC) {
      maxC = c;
      usualServiceId = svcId;
    }
  }

  // Fallback for Ahmed Hassan demo record
  if (custId === "cu_ahmed") {
    usualServiceId = "svc_br_nasr_full";
  }

  const usualService = usualServiceId ? db.services.find((s) => s.id === usualServiceId) : null;

  return {
    customer,
    vehicle,
    plate: vehicle?.plate || normPlate,
    previousVisitsCount: count,
    lastVisitDate: lastVisit || (custId === "cu_ahmed" ? new Date(now().getTime() - 14 * 86400000).toISOString() : null),
    usualService,
    usualServiceId: usualService?.id || null,
  };
}

/**
 * Register a new walk-in order (status = waiting).
 */
export async function createWalkInOrder({
  branchId,
  serviceId,
  addonIds = [],
  plate,
  phone = "",
  name = "",
  customerId = null,
  vehicleId = null,
  staffId = "st_samir",
  notes = "",
}) {
  return write(() => mutate((draft) => {
    const branch = draft.branches.find((b) => b.id === branchId);
    if (!branch) throw new WashDomainError("branch_not_found");

    const normPlate = normalizePlate(plate);
    if (!normPlate) throw new WashDomainError("plate_required");
    if (!serviceId) throw new WashDomainError("service_required");

    // If existing customer recognized or supplied
    let cust = customerId ? draft.customers.find((c) => c.id === customerId) : null;
    if (!cust && phone) {
      cust = draft.customers.find((c) => c.phone.replace(/[\s-+]/g, "").includes(phone.replace(/[\s-+]/g, "")));
    }

    const quote = computeQuote(draft, { branchId, serviceId, addonIds, source: "walk_in" }, now());
    const orderNumber = takeWalkInNumber(draft);
    const code = generateBookingCode(draft);

    const order = {
      id: nid("ord"),
      number: orderNumber,
      code,
      source: "walk_in",
      customerId: cust?.id || null,
      vehicleId: vehicleId || null,
      plate: normPlate,
      customerName: name || cust?.name || "",
      customerPhone: phone || cust?.phone || "",
      businessId: branch.businessId,
      branchId,
      items: quote.items,
      subtotal: quote.subtotal,
      discount: quote.discount ? { amount: quote.discount, pct: null, reason: "offer", byStaffId: null } : null,
      offerId: quote.offerId || null,
      total: quote.total,
      durationMin: quote.durationMin,
      scheduledAt: now().toISOString(),
      status: "waiting",
      paymentStatus: "pending",
      paymentMethod: null,
      assignedStaffId: staffId,
      timeline: [
        { status: "waiting", at: now().toISOString(), byType: "staff", byId: staffId },
      ],
      notes: notes ? [{ text: notes, byType: "staff", byId: staffId, at: now().toISOString() }] : [],
      cancel: null,
      closedInShiftId: null,
      createdAt: now().toISOString(),
      createdAfterSeed: true,
    };

    draft.orders.push(order);

    const rate = draft.businesses.find((b) => b.id === branch.businessId)?.commissionRate || 7;
    draft.transactions.push({
      id: nid("txn"),
      orderId: order.id,
      businessId: branch.businessId,
      gross: order.total,
      commissionRate: rate,
      commission: Math.round(order.total * rate) / 100,
      netToWash: Math.round((order.total - (order.total * rate) / 100) * 100) / 100,
      date: order.createdAt,
      status: "pending",
      flag: null,
    });

    audit(draft, {
      actorType: "staff",
      actorId: staffId,
      action: "order.create_walkin",
      entity: "order",
      entityId: order.id,
      branchId,
      oldValue: null,
      newValue: "waiting",
    });

    notify(draft, "staff", staffId, "walk_in", { ar: "سيارة جديدة", en: "New walk-in" }, { ar: `طلب جديد ${order.number}`, en: `Order ${order.number}` }, `#/order/${order.id}`);

    return order;
  }));
}

/**
 * Register manual phone booking.
 */
export async function createPhoneBooking({
  branchId,
  serviceId,
  addonIds = [],
  plate,
  phone,
  name,
  scheduledAt,
  note = "",
  staffId = "st_samir",
}) {
  return write(() => mutate((draft) => {
    const branch = draft.branches.find((b) => b.id === branchId);
    if (!branch) throw new WashDomainError("branch_not_found");
    if (!phone) throw new WashDomainError("phone_required");
    if (!serviceId) throw new WashDomainError("service_required");
    if (!scheduledAt) throw new WashDomainError("slot_required");

    const normPlate = normalizePlate(plate);
    const quote = computeQuote(draft, { branchId, serviceId, addonIds, source: "phone" }, now());
    const start = new Date(scheduledAt);

    // Validate slot availability
    const slots = slotStarts(draft, branch, start, quote.durationMin, now());
    if (!slots.some((s) => new Date(s.start).getTime() === start.getTime())) {
      throw new WashDomainError("slot_taken", "The selected time slot is no longer available.");
    }

    let cust = draft.customers.find((c) => c.phone.replace(/[\s-+]/g, "").includes(phone.replace(/[\s-+]/g, "")));

    const orderNumber = takePhoneNumber(draft);
    const code = generateBookingCode(draft);

    const order = {
      id: nid("ord"),
      number: orderNumber,
      code,
      source: "phone",
      customerId: cust?.id || null,
      vehicleId: null,
      plate: normPlate,
      customerName: name || cust?.name || "",
      customerPhone: phone,
      businessId: branch.businessId,
      branchId,
      items: quote.items,
      subtotal: quote.subtotal,
      discount: null,
      offerId: null,
      total: quote.total,
      durationMin: quote.durationMin,
      scheduledAt: start.toISOString(),
      status: "confirmed",
      paymentStatus: "pending",
      paymentMethod: null,
      assignedStaffId: staffId,
      timeline: [
        { status: "confirmed", at: now().toISOString(), byType: "staff", byId: staffId },
      ],
      notes: note ? [{ text: note, byType: "staff", byId: staffId, at: now().toISOString() }] : [],
      cancel: null,
      closedInShiftId: null,
      createdAt: now().toISOString(),
      createdAfterSeed: true,
    };

    draft.orders.push(order);

    const rate = draft.businesses.find((b) => b.id === branch.businessId)?.commissionRate || 7;
    draft.transactions.push({
      id: nid("txn"),
      orderId: order.id,
      businessId: branch.businessId,
      gross: order.total,
      commissionRate: rate,
      commission: Math.round(order.total * rate) / 100,
      netToWash: Math.round((order.total - (order.total * rate) / 100) * 100) / 100,
      date: order.createdAt,
      status: "pending",
      flag: null,
    });

    audit(draft, {
      actorType: "staff",
      actorId: staffId,
      action: "order.create_phone",
      entity: "order",
      entityId: order.id,
      branchId,
      oldValue: null,
      newValue: "confirmed",
    });

    return order;
  }));
}

/**
 * Confirm a pending booking (pending -> confirmed).
 */
export async function confirmOrder(orderId, staffId = "st_samir") {
  return write(() => mutate((draft) => {
    const order = draft.orders.find((o) => o.id === orderId);
    if (!order) throw new WashDomainError("order_not_found");
    if (order.status !== "pending") throw new WashDomainError("order_not_pending");

    const actor = staffActor(draft, staffId);
    if (!can(actor, "confirm_booking", { branchId: order.branchId })) {
      throw new WashDomainError("permission_denied", "You do not have permission to confirm bookings.");
    }

    const prev = order.status;
    order.status = "confirmed";
    order.timeline.push({ status: "confirmed", at: now().toISOString(), byType: "staff", byId: staffId });

    audit(draft, {
      actorType: "staff",
      actorId: staffId,
      action: "order.confirm",
      entity: "order",
      entityId: order.id,
      branchId: order.branchId,
      oldValue: prev,
      newValue: "confirmed",
    });

    if (order.customerId) {
      notify(draft, "customer", order.customerId, "confirmed", { ar: "تم تأكيد حجزك", en: "Your booking is confirmed" }, { ar: `أظهر رمز الوصول ${order.code} عند الوصول.`, en: `Show check-in code ${order.code} on arrival.` }, `#/booking/${order.id}`);
    }

    return order;
  }));
}

/**
 * Check-in customer (confirmed -> waiting).
 * Accepts orderId, 5-char code, order number, plate, or phone.
 */
export async function checkInOrder({
  orderId,
  code,
  number,
  plate,
  phone,
  staffId = "st_samir",
  branchId = "br_nasr",
}) {
  return write(() => mutate((draft) => {
    let order = null;
    if (orderId) {
      order = draft.orders.find((o) => o.id === orderId);
    } else if (code) {
      order = draft.orders.find((o) => o.code && o.code.toUpperCase() === String(code).trim().toUpperCase());
    } else if (number) {
      order = draft.orders.find((o) => o.number && o.number.toUpperCase() === String(number).trim().toUpperCase());
    } else if (plate) {
      const norm = normalizePlate(plate);
      order = draft.orders.find((o) => o.branchId === branchId && normalizePlate(o.plate) === norm && ["confirmed", "pending"].includes(o.status));
    } else if (phone) {
      const clean = phone.replace(/[\s-+]/g, "");
      order = draft.orders.find((o) => o.branchId === branchId && o.customerPhone && o.customerPhone.replace(/[\s-+]/g, "").includes(clean) && ["confirmed", "pending"].includes(o.status));
    }

    if (!order) {
      throw new WashDomainError("not_found", "No matching booking found.");
    }

    if (order.branchId !== branchId) {
      const b = draft.branches.find((x) => x.id === order.branchId);
      throw new WashDomainError("wrong_branch", `This booking belongs to ${b?.name?.en || order.branchId}.`);
    }

    if (order.status === "waiting") {
      throw new WashDomainError("already_waiting", "Customer has already checked in.");
    }
    if (order.status === "in_service" || order.status === "completed") {
      throw new WashDomainError("already_processed", "This order is already being serviced or completed.");
    }
    if (order.status === "cancelled") {
      throw new WashDomainError("order_cancelled", "This booking was cancelled.");
    }
    if (order.status === "no_show") {
      throw new WashDomainError("order_no_show", "This booking was marked as no-show.");
    }

    const prev = order.status;
    order.status = "waiting";
    order.timeline.push({ status: "waiting", at: now().toISOString(), byType: "staff", byId: staffId });

    audit(draft, {
      actorType: "staff",
      actorId: staffId,
      action: "order.checkin",
      entity: "order",
      entityId: order.id,
      branchId: order.branchId,
      oldValue: prev,
      newValue: "waiting",
    });

    if (order.customerId) {
      notify(draft, "customer", order.customerId, "waiting", { ar: "تم تسجيل وصولك", en: "Arrival recorded" }, { ar: "سيارتك في الانتظار لبدء الخدمة.", en: "Your car is in the queue." }, `#/booking/${order.id}`);
    }

    return order;
  }));
}

/**
 * Start service (waiting -> in_service).
 */
export async function startService(orderId, staffId = "st_samir", assignedStaffId = null) {
  return write(() => mutate((draft) => {
    const order = draft.orders.find((o) => o.id === orderId);
    if (!order) throw new WashDomainError("order_not_found");
    if (order.status !== "waiting") throw new WashDomainError("not_waiting", "Order must be in waiting status to start service.");

    const branch = draft.branches.find((b) => b.id === order.branchId);
    const busy = draft.orders.filter((o) => o.branchId === order.branchId && o.status === "in_service").length;
    if (busy >= (branch?.capacity || 6)) {
      throw new WashDomainError("no_bay", "All wash bays are currently occupied. Please complete an active service first.");
    }

    const prev = order.status;
    order.status = "in_service";
    order.assignedStaffId = assignedStaffId || staffId;
    order.startedAt = now().toISOString();
    order.timeline.push({ status: "in_service", at: now().toISOString(), byType: "staff", byId: staffId });

    audit(draft, {
      actorType: "staff",
      actorId: staffId,
      action: "order.start_service",
      entity: "order",
      entityId: order.id,
      branchId: order.branchId,
      oldValue: prev,
      newValue: "in_service",
    });

    if (order.customerId) {
      notify(draft, "customer", order.customerId, "in_service", { ar: "بدأ تنفيذ الخدمة", en: "Service started" }, { ar: "الفريق يعمل على سيارتك الآن.", en: "The team is working on your car." }, `#/booking/${order.id}`);
    }

    return order;
  }));
}

/**
 * Complete service (in_service -> completed).
 */
export async function completeService(orderId, staffId = "st_samir") {
  return write(() => mutate((draft) => {
    const order = draft.orders.find((o) => o.id === orderId);
    if (!order) throw new WashDomainError("order_not_found");
    if (order.status !== "in_service") throw new WashDomainError("not_in_service", "Order must be in service to complete.");

    const prev = order.status;
    order.status = "completed";
    order.completedAt = now().toISOString();
    order.timeline.push({ status: "completed", at: now().toISOString(), byType: "staff", byId: staffId });

    // Increment ordersCompleted in current active shift
    const shift = draft.shifts.find((s) => s.staffId === (order.assignedStaffId || staffId) && s.actualStart && !s.actualEnd);
    if (shift) {
      shift.ordersCompleted = (shift.ordersCompleted || 0) + 1;
    }

    audit(draft, {
      actorType: "staff",
      actorId: staffId,
      action: "order.complete_service",
      entity: "order",
      entityId: order.id,
      branchId: order.branchId,
      oldValue: prev,
      newValue: "completed",
    });

    if (order.customerId) {
      notify(draft, "customer", order.customerId, "completed", { ar: "اكتملت الخدمة", en: "Service completed" }, { ar: "سيارتك جاهزة للاستلام والدفع.", en: "Your car is ready. Please proceed to payment." }, `#/booking/${order.id}`);
    }

    return order;
  }));
}

/**
 * Upsell / Add extra service (only while waiting or in_service).
 */
export async function addExtraService(orderId, addonServiceId, staffId = "st_samir") {
  return write(() => mutate((draft) => {
    const order = draft.orders.find((o) => o.id === orderId);
    if (!order) throw new WashDomainError("order_not_found");
    if (!["waiting", "in_service"].includes(order.status)) {
      throw new WashDomainError("invalid_status", "Extra services can only be added while waiting or in service.");
    }

    const svc = draft.services.find((s) => s.id === addonServiceId);
    if (!svc || !svc.active) throw new WashDomainError("service_unavailable");

    const prevTotal = order.total;
    const item = {
      serviceId: svc.id,
      name: svc.name,
      type: "addon",
      price: svc.price,
      durationMin: svc.durationMin,
    };
    order.items.push(item);
    order.subtotal += svc.price;
    order.total += svc.price;
    order.durationMin += svc.durationMin;

    // Update transaction
    const txn = draft.transactions.find((t) => t.orderId === order.id);
    if (txn) {
      txn.gross = order.total;
      txn.commission = Math.round(order.total * txn.commissionRate) / 100;
      txn.netToWash = Math.round((order.total - txn.commission) * 100) / 100;
    }

    audit(draft, {
      actorType: "staff",
      actorId: staffId,
      action: "order.add_addon",
      entity: "order",
      entityId: order.id,
      branchId: order.branchId,
      oldValue: prevTotal,
      newValue: order.total,
      reason: svc.name?.en || svc.name?.ar,
    });

    if (order.customerId) {
      notify(draft, "customer", order.customerId, "order_update", { ar: "تمت إضافة خدمة جديدة", en: "Extra service added" }, { ar: `تمت إضافة ${svc.name.ar} (+${svc.price} ج.م)`, en: `Added ${svc.name.en} (+${svc.price} EGP)` }, `#/booking/${order.id}`);
    }

    return order;
  }));
}

/**
 * Apply discount to an order (percent or fixed amount).
 * Respects staff maxDiscountPct limit; allows manager PIN override (demo PIN: 1234).
 */
export async function applyDiscount(orderId, { pct, amount, reason }, staffId = "st_samir", managerPin = "") {
  return write(() => mutate((draft) => {
    const order = draft.orders.find((o) => o.id === orderId);
    if (!order) throw new WashDomainError("order_not_found");
    if (order.paymentStatus === "paid") throw new WashDomainError("paid_order_locked");

    const actor = staffActor(draft, staffId);
    const maxPct = actor?.maxDiscountPct || 10;
    const effectivePct = pct != null ? Number(pct) : (amount ? Math.round((amount / order.subtotal) * 100) : 0);

    let approvedBy = staffId;
    if (effectivePct > maxPct) {
      if (managerPin === "1234" || actor.role === "manager" || actor.role === "owner") {
        approvedBy = "st_adel"; // approved by Manager
      } else {
        throw new WashDomainError("discount_limit_exceeded", `Your limit is ${maxPct}% — ask a manager.`);
      }
    }

    const discountAmount = amount != null ? Number(amount) : Math.round((order.subtotal * effectivePct) / 100);
    const prevTotal = order.total;

    order.discount = {
      amount: discountAmount,
      pct: effectivePct,
      reason: reason || "Manager discount",
      byStaffId: approvedBy,
    };
    order.total = Math.max(0, order.subtotal - discountAmount);

    const txn = draft.transactions.find((t) => t.orderId === order.id);
    if (txn) {
      txn.gross = order.total;
      txn.commission = Math.round(order.total * txn.commissionRate) / 100;
      txn.netToWash = Math.round((order.total - txn.commission) * 100) / 100;
    }

    audit(draft, {
      actorType: "staff",
      actorId: staffId,
      action: "order.apply_discount",
      entity: "order",
      entityId: order.id,
      branchId: order.branchId,
      oldValue: prevTotal,
      newValue: order.total,
      reason: `Discount ${effectivePct}%: ${reason} (approved by ${approvedBy})`,
    });

    return order;
  }));
}

/**
 * Collect payment for completed order.
 */
export async function collectPayment({
  orderId,
  method = "cash",
  amountReceived = null,
  staffId = "st_samir",
}) {
  return write(() => mutate((draft) => {
    const order = draft.orders.find((o) => o.id === orderId);
    if (!order) throw new WashDomainError("order_not_found");
    if (order.status !== "completed") throw new WashDomainError("not_completed", "Service must be completed before payment collection.");
    if (order.paymentStatus === "paid") throw new WashDomainError("already_paid", "This order is already marked as paid.");

    const payment = {
      id: nid("pay"),
      orderId: order.id,
      amount: order.total,
      method,
      collectedBy: staffId,
      collectedAt: now().toISOString(),
      status: "paid",
    };
    draft.payments.push(payment);

    order.paymentStatus = "paid";
    order.paymentMethod = method;

    const txn = draft.transactions.find((t) => t.orderId === order.id);
    if (txn) txn.status = "paid";

    audit(draft, {
      actorType: "staff",
      actorId: staffId,
      action: "payment.collect",
      entity: "order",
      entityId: order.id,
      branchId: order.branchId,
      oldValue: "pending",
      newValue: "paid",
      reason: `${method} payment: ${order.total} EGP`,
    });

    const received = amountReceived ? Number(amountReceived) : order.total;
    const change = Math.max(0, received - order.total);

    return { order, payment, change };
  }));
}

/**
 * Refund payment (manager/owner only).
 */
export async function refundPayment(orderId, reason, staffId = "st_adel") {
  return write(() => mutate((draft) => {
    const order = draft.orders.find((o) => o.id === orderId);
    if (!order) throw new WashDomainError("order_not_found");
    if (order.paymentStatus !== "paid") throw new WashDomainError("not_paid", "Only paid orders can be refunded.");

    const actor = staffActor(draft, staffId);
    if (!can(actor, "refund", { branchId: order.branchId })) {
      throw new WashDomainError("permission_denied", "Only managers or owners can refund orders.");
    }
    if (!reason || String(reason).trim().length < 3) {
      throw new WashDomainError("reason_required", "A reason is required to process a refund.");
    }

    order.paymentStatus = "refunded";

    const pay = draft.payments.find((p) => p.orderId === order.id);
    if (pay) pay.status = "refunded";

    const txn = draft.transactions.find((t) => t.orderId === order.id);
    if (txn) txn.status = "refunded";

    audit(draft, {
      actorType: "staff",
      actorId: staffId,
      action: "payment.refund",
      entity: "order",
      entityId: order.id,
      branchId: order.branchId,
      oldValue: "paid",
      newValue: "refunded",
      reason,
    });

    return order;
  }));
}

/**
 * Cancel an order from wash staff interface.
 */
export async function cancelOrderByStaff(orderId, reason, staffId = "st_samir") {
  return write(() => mutate((draft) => {
    const order = draft.orders.find((o) => o.id === orderId);
    if (!order) throw new WashDomainError("order_not_found");
    if (!reason) throw new WashDomainError("reason_required");

    const actor = staffActor(draft, staffId);
    if (order.status === "waiting" && actor.role === "employee") {
      throw new WashDomainError("manager_required", "Cancelling an arrived/waiting car requires manager approval.");
    }

    const prev = order.status;
    order.status = "cancelled";
    order.cancel = {
      reason,
      byType: "staff",
      byId: staffId,
      at: now().toISOString(),
    };
    order.timeline.push({ status: "cancelled", at: now().toISOString(), byType: "staff", byId: staffId });

    audit(draft, {
      actorType: "staff",
      actorId: staffId,
      action: "order.cancel",
      entity: "order",
      entityId: order.id,
      branchId: order.branchId,
      oldValue: prev,
      newValue: "cancelled",
      reason,
    });

    if (order.customerId) {
      notify(draft, "customer", order.customerId, "cancelled", { ar: "تم إلغاء الحجز", en: "Booking cancelled" }, { ar: `تم إلغاء الحجز: ${reason}`, en: `Booking was cancelled: ${reason}` }, `#/booking/${order.id}`);
    }

    return order;
  }));
}

/**
 * Mark confirmed booking as no-show.
 */
export async function markNoShow(orderId, staffId = "st_samir") {
  return write(() => mutate((draft) => {
    const order = draft.orders.find((o) => o.id === orderId);
    if (!order) throw new WashDomainError("order_not_found");
    if (order.status !== "confirmed") throw new WashDomainError("not_confirmed", "Only confirmed bookings can be marked as no-show.");

    const prev = order.status;
    order.status = "no_show";
    order.timeline.push({ status: "no_show", at: now().toISOString(), byType: "staff", byId: staffId });

    audit(draft, {
      actorType: "staff",
      actorId: staffId,
      action: "order.no_show",
      entity: "order",
      entityId: order.id,
      branchId: order.branchId,
      oldValue: prev,
      newValue: "no_show",
    });

    if (order.customerId) {
      notify(draft, "customer", order.customerId, "no_show", { ar: "لم تحضر للموعد", en: "Marked as no-show" }, { ar: "تم إلغاء موعدك لعدم الحضور.", en: "Your slot was released due to no-show." }, `#/booking/${order.id}`);
    }

    return order;
  }));
}

/**
 * Add note to order.
 */
export async function addOrderNote(orderId, text, staffId = "st_samir") {
  return write(() => mutate((draft) => {
    const order = draft.orders.find((o) => o.id === orderId);
    if (!order) throw new WashDomainError("order_not_found");
    if (!text) return order;

    if (!order.notes) order.notes = [];
    order.notes.push({
      text: String(text).trim(),
      byType: "staff",
      byId: staffId,
      at: now().toISOString(),
    });

    audit(draft, {
      actorType: "staff",
      actorId: staffId,
      action: "order.add_note",
      entity: "order",
      entityId: order.id,
      branchId: order.branchId,
      newValue: text,
    });

    return order;
  }));
}

/**
 * Reassign staff for an order.
 */
export async function reassignStaff(orderId, newStaffId, staffId = "st_adel") {
  return write(() => mutate((draft) => {
    const order = draft.orders.find((o) => o.id === orderId);
    if (!order) throw new WashDomainError("order_not_found");

    const prev = order.assignedStaffId;
    order.assignedStaffId = newStaffId;

    audit(draft, {
      actorType: "staff",
      actorId: staffId,
      action: "order.reassign_staff",
      entity: "order",
      entityId: order.id,
      branchId: order.branchId,
      oldValue: prev,
      newValue: newStaffId,
    });

    return order;
  }));
}

/* =========================================================================
   SHIFT MANAGEMENT
   ========================================================================= */

export function getActiveShift(db, staffId) {
  return db.shifts.find((s) => s.staffId === staffId && s.actualStart && !s.actualEnd) || null;
}

export async function startShift({ staffId = "st_samir", branchId = "br_nasr" }) {
  return write(() => mutate((draft) => {
    let shift = draft.shifts.find((s) => s.staffId === staffId && s.actualStart && !s.actualEnd);
    if (shift) return shift;

    shift = {
      id: nid("sh"),
      staffId,
      branchId,
      scheduledStart: now().toISOString(),
      scheduledEnd: new Date(now().getTime() + 8 * 3600000).toISOString(),
      actualStart: now().toISOString(),
      actualEnd: null,
      ordersCompleted: 0,
      expectedCash: 0,
      actualCash: null,
      difference: null,
      reason: null,
      reviewStatus: "open",
    };
    draft.shifts.push(shift);

    audit(draft, {
      actorType: "staff",
      actorId: staffId,
      action: "shift.start",
      entity: "shift",
      entityId: shift.id,
      branchId,
      newValue: shift.actualStart,
    });

    return shift;
  }));
}

export async function endShift({
  shiftId,
  staffId = "st_samir",
  actualCash,
  reason = "",
  note = "",
  force = false,
}) {
  return write(() => mutate((draft) => {
    const shift = draft.shifts.find((s) => s.id === shiftId || (s.staffId === staffId && !s.actualEnd));
    if (!shift) throw new WashDomainError("shift_not_found");

    // Check if employee still has orders in_service or completed+unpaid
    const blockedOrders = draft.orders.filter((o) => {
      const isMine = o.assignedStaffId === staffId;
      const isInService = o.status === "in_service";
      const isUnpaid = o.status === "completed" && o.paymentStatus === "pending";
      return isMine && (isInService || isUnpaid);
    });

    if (blockedOrders.length > 0 && !force) {
      throw new WashDomainError(
        "shift_blocked_by_orders",
        `Cannot end shift: you have ${blockedOrders.length} active or unpaid orders.`
      );
    }

    // Compute expected cash = sum of cash payments collected by this staff member since shift actualStart
    const startTime = new Date(shift.actualStart).getTime();
    const cashPayments = draft.payments.filter((p) => {
      return p.collectedBy === staffId &&
             p.method === "cash" &&
             p.status === "paid" &&
             new Date(p.collectedAt).getTime() >= startTime;
    });

    const expectedCash = cashPayments.reduce((s, p) => s + p.amount, 0);
    const actCash = Number(actualCash) || 0;
    const diff = actCash - expectedCash;

    if (diff !== 0 && !reason) {
      throw new WashDomainError("difference_reason_required", "A reason is required when cash difference is not zero.");
    }

    shift.actualEnd = now().toISOString();
    shift.expectedCash = expectedCash;
    shift.actualCash = actCash;
    shift.difference = diff;
    shift.reason = diff !== 0 ? { ar: reason, en: reason } : null;
    shift.note = note || null;
    shift.reviewStatus = "open";

    // If mismatch, notify owner and manager!
    if (diff !== 0) {
      const owner = draft.staff.find((s) => s.businessId === "biz_carzen" && s.role === "owner");
      if (owner) {
        notify(
          draft,
          "owner",
          owner.id,
          "cash_difference",
          { ar: `عجز نقدي في الوردية: ${diff} ج.م`, en: `Cash difference: ${diff} EGP` },
          { ar: `أنهى أحمد سمير الوردية بفارق ${diff} ج.م. السبب: ${reason}`, en: `Shift closed with ${diff} EGP difference. Reason: ${reason}` },
          `#/shifts`
        );
      }
    }

    audit(draft, {
      actorType: "staff",
      actorId: staffId,
      action: "shift.close",
      entity: "shift",
      entityId: shift.id,
      branchId: shift.branchId,
      oldValue: expectedCash,
      newValue: actCash,
      reason: diff !== 0 ? `Diff ${diff} EGP: ${reason}` : "Exact cash",
    });

    return shift;
  }));
}

export async function reviewShift({ shiftId, reviewStatus, note, staffId = "st_adel" }) {
  return write(() => mutate((draft) => {
    const shift = draft.shifts.find((s) => s.id === shiftId);
    if (!shift) throw new WashDomainError("shift_not_found");

    shift.reviewStatus = reviewStatus; // 'reviewed' | 'flagged'
    if (note) shift.reviewNote = note;

    audit(draft, {
      actorType: "staff",
      actorId: staffId,
      action: "shift.review",
      entity: "shift",
      entityId: shift.id,
      branchId: shift.branchId,
      newValue: reviewStatus,
      reason: note,
    });

    return shift;
  }));
}

/* =========================================================================
   SCHEDULE & CAPACITY
   ========================================================================= */

export async function blockSlot({ branchId, start, end, reason, staffId = "st_adel" }) {
  return write(() => mutate((draft) => {
    const branch = draft.branches.find((b) => b.id === branchId);
    if (!branch) throw new WashDomainError("branch_not_found");

    if (!branch.blockedSlots) branch.blockedSlots = [];
    const entry = { start, end, reason: reason || "Manual block" };
    branch.blockedSlots.push(entry);

    audit(draft, {
      actorType: "staff",
      actorId: staffId,
      action: "branch.block_slot",
      entity: "branch",
      entityId: branchId,
      branchId,
      newValue: `${start} - ${end}`,
      reason,
    });

    return branch.blockedSlots;
  }));
}

export async function unblockSlot({ branchId, index, staffId = "st_adel" }) {
  return write(() => mutate((draft) => {
    const branch = draft.branches.find((b) => b.id === branchId);
    if (!branch || !branch.blockedSlots) throw new WashDomainError("branch_not_found");

    const removed = branch.blockedSlots.splice(index, 1);

    audit(draft, {
      actorType: "staff",
      actorId: staffId,
      action: "branch.unblock_slot",
      entity: "branch",
      entityId: branchId,
      branchId,
      oldValue: JSON.stringify(removed),
    });

    return branch.blockedSlots;
  }));
}

/* =========================================================================
   SERVICES & OFFERS CRUD
   ========================================================================= */

export async function saveService(serviceData, staffId = "st_owner_biz_carzen") {
  return write(() => mutate((draft) => {
    const actor = staffActor(draft, staffId);
    if (!can(actor, "edit_services")) {
      throw new WashDomainError("permission_denied", "You do not have permission to edit services.");
    }

    let svc = serviceData.id ? draft.services.find((s) => s.id === serviceData.id) : null;
    const isNew = !svc;

    if (isNew) {
      svc = {
        id: nid("svc"),
        branchId: serviceData.branchId,
        type: serviceData.type || "primary",
        category: serviceData.category || "exterior",
        name: serviceData.name,
        description: serviceData.description || { ar: "", en: "" },
        price: Number(serviceData.price),
        durationMin: Number(serviceData.durationMin),
        active: serviceData.active ?? true,
      };
      draft.services.push(svc);
    } else {
      const prevPrice = svc.price;
      svc.name = serviceData.name || svc.name;
      svc.description = serviceData.description || svc.description;
      svc.price = Number(serviceData.price ?? svc.price);
      svc.durationMin = Number(serviceData.durationMin ?? svc.durationMin);
      svc.category = serviceData.category || svc.category;
      svc.type = serviceData.type || svc.type;
      if (serviceData.active !== undefined) svc.active = serviceData.active;

      audit(draft, {
        actorType: "staff",
        actorId: staffId,
        action: "service.update",
        entity: "service",
        entityId: svc.id,
        branchId: svc.branchId,
        oldValue: prevPrice,
        newValue: svc.price,
      });
    }

    return svc;
  }));
}

export async function toggleServiceActive(serviceId, staffId = "st_owner_biz_carzen") {
  return write(() => mutate((draft) => {
    const svc = draft.services.find((s) => s.id === serviceId);
    if (!svc) throw new WashDomainError("service_not_found");

    svc.active = !svc.active;
    audit(draft, {
      actorType: "staff",
      actorId: staffId,
      action: "service.toggle_active",
      entity: "service",
      entityId: svc.id,
      branchId: svc.branchId,
      newValue: svc.active,
    });
    return svc;
  }));
}

export async function saveOffer(offerData, staffId = "st_owner_biz_carzen") {
  return write(() => mutate((draft) => {
    let offer = offerData.id ? draft.offers.find((o) => o.id === offerData.id) : null;
    if (!offer) {
      offer = {
        id: nid("of"),
        scope: "wash",
        businessId: "biz_carzen",
        branchIds: offerData.branchIds || ["br_nasr"],
        serviceIds: offerData.serviceIds || [],
        title: offerData.title,
        description: offerData.description || { ar: "", en: "" },
        discountType: offerData.discountType || "percent",
        discountValue: Number(offerData.discountValue),
        startAt: offerData.startAt || now().toISOString(),
        endAt: offerData.endAt || new Date(now().getTime() + 7 * 86400000).toISOString(),
        status: offerData.status || "active",
        featured: !!offerData.featured,
      };
      draft.offers.push(offer);
    } else {
      Object.assign(offer, offerData);
    }

    audit(draft, {
      actorType: "staff",
      actorId: staffId,
      action: "offer.save",
      entity: "offer",
      entityId: offer.id,
      newValue: offer.title?.en || offer.title?.ar,
    });

    return offer;
  }));
}

/* =========================================================================
   STAFF MANAGEMENT
   ========================================================================= */

export async function saveStaffMember(staffData, actorId = "st_owner_biz_carzen") {
  return write(() => mutate((draft) => {
    let member = staffData.id ? draft.staff.find((s) => s.id === staffData.id) : null;
    if (!member) {
      member = {
        id: nid("st"),
        businessId: staffData.businessId || "biz_carzen",
        branchId: staffData.branchId || "br_nasr",
        name: staffData.name,
        phone: staffData.phone,
        role: staffData.role || "employee",
        status: staffData.status || "active",
        maxDiscountPct: Number(staffData.maxDiscountPct || 10),
        permissions: staffData.permissions || { runService: true, collectPayment: true },
        scheduledShifts: staffData.scheduledShifts || [{ start: "09:00", end: "17:00", days: [0, 1, 2, 3, 4, 5, 6] }],
      };
      draft.staff.push(member);
    } else {
      Object.assign(member, staffData);
    }

    audit(draft, {
      actorType: "staff",
      actorId,
      action: "staff.save",
      entity: "staff",
      entityId: member.id,
      branchId: member.branchId,
      newValue: member.name,
    });

    return member;
  }));
}

/* =========================================================================
   REVIEWS & REPLIES
   ========================================================================= */

export async function replyToReview({ reviewId, replyText, staffId = "st_owner_biz_carzen" }) {
  return write(() => mutate((draft) => {
    const review = draft.reviews.find((r) => r.id === reviewId);
    if (!review) throw new WashDomainError("review_not_found");

    review.reply = {
      text: replyText,
      at: now().toISOString(),
      byStaffId: staffId,
    };

    audit(draft, {
      actorType: "staff",
      actorId: staffId,
      action: "review.reply",
      entity: "review",
      entityId: review.id,
      branchId: review.branchId,
      newValue: replyText,
    });

    return review;
  }));
}

export async function reportReview({ reviewId, reason, staffId = "st_owner_biz_carzen" }) {
  return write(() => mutate((draft) => {
    const review = draft.reviews.find((r) => r.id === reviewId);
    if (!review) throw new WashDomainError("review_not_found");

    review.reportedByWash = true;
    review.reportReason = reason;

    notify(
      draft,
      "admin",
      "au_mona",
      "reported_review",
      { ar: "مغسلة أبلغت عن تقييم", en: "Wash reported review" },
      { ar: `تم الإبلاغ عن تقييم في ${review.branchId}: ${reason}`, en: `Review reported at ${review.branchId}: ${reason}` },
      `#/reviews/${review.id}`
    );

    audit(draft, {
      actorType: "staff",
      actorId: staffId,
      action: "review.report",
      entity: "review",
      entityId: review.id,
      branchId: review.branchId,
      reason,
    });

    return review;
  }));
}

/* =========================================================================
   PARTNER REGISTRATION (WASH APPLICATION)
   ========================================================================= */

export async function submitWashApplication(appData) {
  return write(() => mutate((draft) => {
    if (!draft.washApplications) draft.washApplications = [];

    const appId = `app_${draft.washApplications.length + 1}`;
    const application = {
      id: appId,
      businessName: appData.businessName || "New Wash Partner",
      ownerName: appData.ownerName || "New Owner",
      phone: appData.phone || "+20 100 000 0000",
      email: appData.email || "owner@example.com",
      address: appData.address || "Cairo, Egypt",
      lat: Number(appData.lat) || 30.05,
      lng: Number(appData.lng) || 31.33,
      photos: appData.photos || [],
      services: appData.services || ["Exterior Wash", "Interior Wash"],
      workingHours: appData.workingHours || [],
      capacity: Number(appData.capacity) || 4,
      documents: appData.documents || ["commercial_reg.pdf"],
      status: "pending",
      reviewNote: null,
      submittedAt: now().toISOString(),
    };

    draft.washApplications.unshift(application);

    notify(
      draft,
      "admin",
      "au_omar",
      "wash_application",
      { ar: "طلب انضمام مغسلة جديد", en: "New Wash Partner Application" },
      { ar: `${application.businessName} تقدم بطلب انضمام جديد.`, en: `${application.businessName} submitted an application.` },
      `#/applications/${application.id}`
    );

    audit(draft, {
      actorType: "system",
      actorId: "registration_wizard",
      action: "wash_application.submit",
      entity: "wash_application",
      entityId: application.id,
      newValue: application.businessName,
    });

    return application;
  }));
}

export async function updateWashApplication(appId, appData) {
  return write(() => mutate((draft) => {
    const app = draft.washApplications.find((a) => a.id === appId);
    if (!app) throw new WashDomainError("application_not_found");

    Object.assign(app, appData);
    app.status = "pending";
    app.submittedAt = now().toISOString();

    audit(draft, {
      actorType: "system",
      actorId: "registration_wizard",
      action: "wash_application.resubmit",
      entity: "wash_application",
      entityId: app.id,
      newValue: "pending",
    });

    return app;
  }));
}
