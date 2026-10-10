import { get, mutate, now, nid } from "../db.js";
import { read, write } from "../net.js";
import { can } from "./permissions.js";

/** Helper to record admin audit entries */
function logAudit(draft, adminId, action, entity, entityId, oldValue, newValue, reason, branchId = null) {
  draft.auditLogs.unshift({
    id: nid("aud"),
    actorType: "admin",
    actorId: adminId || "au_sara",
    action,
    entity,
    entityId,
    branchId: branchId || null,
    oldValue: oldValue ?? null,
    newValue: newValue ?? null,
    reason: reason || null,
    at: now().toISOString(),
  });
}

/** Helper to send notifications */
function sendNotification(draft, audience, userId, type, title, body, link = "") {
  draft.notifications.unshift({
    id: nid("ntf"),
    audience,
    userId: userId || null,
    type,
    title: typeof title === "string" ? { ar: title, en: title } : title,
    body: typeof body === "string" ? { ar: body, en: body } : body,
    link,
    read: false,
    createdAt: now().toISOString(),
  });
}

/** Recalculate rating for a branch/wash */
function recalculateRatings(draft, branchId) {
  const branchReviews = draft.reviews.filter((r) => r.branchId === branchId && r.status === "visible");
  const branch = draft.branches.find((b) => b.id === branchId);
  if (!branch) return;

  if (branchReviews.length > 0) {
    const avg = branchReviews.reduce((sum, r) => sum + r.stars, 0) / branchReviews.length;
    branch.rating = Math.round(avg * 10) / 10;
  } else {
    branch.rating = 0;
  }

  // Also update business rating
  const bizBranches = draft.branches.filter((b) => b.businessId === branch.businessId);
  const biz = draft.businesses.find((b) => b.id === branch.businessId);
  if (biz && bizBranches.length > 0) {
    const rated = bizBranches.filter((b) => b.rating > 0);
    biz.rating = rated.length ? Math.round((rated.reduce((s, b) => s + b.rating, 0) / rated.length) * 10) / 10 : 0;
  }
}

// ==========================================
// 1. DASHBOARD & KPIS
// ==========================================
export async function getDashboardStats() {
  return read(() => {
    const db = get();
    const baseline = db.platformBaseline || {
      customers: 12540,
      activeWashes: 87,
      branches: 132,
      bookingsToday: 420,
      completedToday: 352,
      gmvToday: 48500,
      platformRevenueToday: 3100,
    };

    // Calculate live deltas from orders created or completed today
    const nowDateStr = now().toDateString();
    const todayOrders = db.orders.filter((o) => new Date(o.scheduledAt).toDateString() === nowDateStr);
    const newBookings = db.orders.filter((o) => new Date(o.createdAt).toDateString() === nowDateStr && !o.isSeeded);
    const completedToday = todayOrders.filter((o) => o.status === "completed");
    const cancelledToday = todayOrders.filter((o) => o.status === "cancelled");

    const liveCompletedGmv = completedToday.reduce((sum, o) => sum + (o.paymentStatus === "paid" ? o.total : 0), 0);
    const liveCommission = completedToday.reduce((sum, o) => {
      const biz = db.businesses.find((b) => b.id === o.businessId);
      const rate = (biz?.commissionRate ?? db.settings?.defaultCommissionPct ?? 7) / 100;
      return sum + (o.paymentStatus === "paid" ? o.total * rate : 0);
    }, 0);

    const pendingApps = db.washApplications.filter((a) => a.status === "pending").length;
    const activeWashesCount = db.businesses.filter((b) => b.status === "active").length;
    const activeCustomersCount = db.customers.filter((c) => c.status === "active").length;

    // Headline KPIs
    const kpis = {
      customers: baseline.customers + (db.customers.length - 40),
      activeCustomers: activeCustomersCount,
      totalWashes: db.businesses.length,
      activeWashes: baseline.activeWashes + (activeWashesCount - 8),
      pendingApplications: pendingApps,
      totalBranches: baseline.branches + (db.branches.length - 14),
      bookingsToday: baseline.bookingsToday + newBookings.length,
      completedToday: baseline.completedToday + completedToday.filter((o) => !o.isSeeded).length,
      cancelledToday: cancelledToday.length,
      gmvToday: baseline.gmvToday + (liveCompletedGmv > 0 ? liveCompletedGmv % 1000 : 0),
      platformRevenueToday: baseline.platformRevenueToday + (liveCommission > 0 ? Math.round(liveCommission * 10) / 10 : 0),
    };

    // Funnel counts (all orders or today's orders)
    const funnel = {
      created: todayOrders.length || 24,
      confirmed: todayOrders.filter((o) => ["confirmed", "waiting", "in_service", "completed"].includes(o.status)).length || 21,
      waiting: todayOrders.filter((o) => ["waiting", "in_service", "completed"].includes(o.status)).length || 19,
      in_service: todayOrders.filter((o) => ["in_service", "completed"].includes(o.status)).length || 18,
      completed: todayOrders.filter((o) => o.status === "completed").length || 16,
      cancelled: todayOrders.filter((o) => o.status === "cancelled").length || 3,
      no_show: todayOrders.filter((o) => o.status === "no_show").length || 2,
    };

    // Action alerts
    const alerts = [];
    if (pendingApps > 0) {
      alerts.push({
        id: "alert_apps",
        type: "applications",
        severity: "warning",
        title: { ar: `${pendingApps} طلبات انضمام مغاسل جديدة قيد المراجعة`, en: `${pendingApps} new wash applications awaiting review` },
        link: "#/applications",
        count: pendingApps,
      });
    }

    // High complaint wash
    const complaintsByBiz = {};
    db.complaints.forEach((c) => {
      complaintsByBiz[c.businessId] = (complaintsByBiz[c.businessId] || 0) + 1;
    });
    for (const [bizId, count] of Object.entries(complaintsByBiz)) {
      if (count >= 3) {
        const biz = db.businesses.find((b) => b.id === bizId);
        alerts.push({
          id: `alert_comp_${bizId}`,
          type: "complaint_spike",
          severity: "danger",
          title: {
            ar: `معدل شكاوى مرتفع لدى: ${biz?.name?.ar || bizId} (${count} شكاوى)`,
            en: `High complaint count for ${biz?.name?.en || bizId} (${count} complaints)`,
          },
          link: `#/washes/${bizId}`,
          count,
        });
      }
    }

    // Discrepancy transactions
    const discrepancies = db.transactions.filter((t) => t.flag === "discrepancy" || t.discrepancy);
    if (discrepancies.length > 0) {
      alerts.push({
        id: "alert_disc",
        type: "discrepancy",
        severity: "warning",
        title: {
          ar: `يوجد ${discrepancies.length} معاملة تحتوي على فروق مالية غير متطابقة`,
          en: `${discrepancies.length} transactions flagged with financial discrepancies`,
        },
        link: "#/finance/transactions?flag=discrepancy",
        count: discrepancies.length,
      });
    }

    // Top washes today
    const topWashes = db.branches.slice(0, 5).map((b) => {
      const biz = db.businesses.find((bz) => bz.id === b.businessId);
      const orders = db.orders.filter((o) => o.branchId === b.id && o.status === "completed");
      return {
        id: b.id,
        businessId: b.businessId,
        name: b.name,
        area: b.area,
        rating: b.rating,
        completedCount: orders.length,
        gmv: orders.reduce((s, o) => s + o.total, 0),
      };
    }).sort((a, b) => b.completedCount - a.completedCount);

    return { kpis, funnel, alerts, topWashes };
  });
}

// ==========================================
// 2. WASH ONBOARDING & APPLICATIONS
// ==========================================
export async function getApplications(statusFilter = "all") {
  return read(() => {
    const db = get();
    let list = db.washApplications || [];
    if (statusFilter && statusFilter !== "all") {
      list = list.filter((a) => a.status === statusFilter);
    }
    return list.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  });
}

export async function getApplicationById(id) {
  return read(() => {
    const db = get();
    return db.washApplications.find((a) => a.id === id) || null;
  });
}

export async function approveApplication(id, { adminId, activateImmediately = true, note = "" }) {
  return write(() => {
    return mutate((draft) => {
      const app = draft.washApplications.find((a) => a.id === id);
      if (!app) throw new Error("Application not found");

      app.status = "approved";
      app.reviewNote = note;

      // 1. Create Business
      const bizId = nid("biz");
      const bizStatus = activateImmediately ? "active" : "approved";
      draft.businesses.push({
        id: bizId,
        name: { ar: app.businessName, en: app.businessName },
        ownerId: `st_owner_${bizId}`,
        ownerName: app.ownerName,
        status: bizStatus,
        statusReason: null,
        commissionRate: draft.settings?.defaultCommissionPct || 7,
        rating: 5.0,
        createdAt: now().toISOString(),
      });

      // 2. Create Branch
      const branchId = nid("br");
      draft.branches.push({
        id: branchId,
        businessId: bizId,
        name: { ar: app.businessName, en: app.businessName },
        area: "nasr",
        address: { ar: app.address, en: app.address },
        lat: app.lat || 30.06,
        lng: app.lng || 31.33,
        phone: app.phone,
        photos: app.photos || [],
        amenities: ["waiting", "card"],
        workingHours: app.workingHours || Array.from({ length: 7 }, () => ({ open: "09:00", close: "22:00", closed: false })),
        capacity: app.capacity || 4,
        active: true,
        settings: { ...draft.settings?.bookingDefaults },
        blockedSlots: [],
        rating: 5.0,
      });

      // 3. Create Default Services
      draft.services.push({
        id: nid("svc"),
        branchId,
        type: "primary",
        category: "exterior",
        name: { ar: "غسيل خارجي", en: "Exterior Wash" },
        description: { ar: "غسيل رغوي وتجفيف يدوي", en: "Foam wash and hand dry" },
        price: 120,
        durationMin: 25,
        active: true,
      });

      // 4. Create Owner Staff Account
      draft.staff.push({
        id: `st_owner_${bizId}`,
        businessId: bizId,
        branchId,
        name: app.ownerName,
        phone: app.phone,
        role: "owner",
        status: "active",
        maxDiscountPct: 25,
        permissions: {
          confirmBooking: true,
          cancelOrder: true,
          closeShift: true,
          editServices: true,
          refund: true,
          collectPayment: true,
          runService: true,
          manageStaff: true,
        },
        password: "demo1234",
        scheduledShifts: [],
      });

      // 5. Notify Owner
      sendNotification(draft, "owner", `st_owner_${bizId}`, "application_approved",
        { ar: "تهانينا! تمت الموافقة على طلب انضمام مغسلتك", en: "Congratulations! Your wash application was approved" },
        { ar: "أصبحت مغسلتك الآن معتمدة وجاهزة لاستقبال الحجوزات على كارزن.", en: "Your car wash is now verified and ready for bookings on Carzen." },
        `#/washes/${bizId}`
      );

      // 6. Audit entry
      logAudit(draft, adminId, "approve_application", "washApplications", id, "pending", "approved", note || "Application approved and business provisioned");

      return app;
    });
  });
}

export async function rejectApplication(id, { adminId, reason }) {
  return write(() => {
    return mutate((draft) => {
      const app = draft.washApplications.find((a) => a.id === id);
      if (!app) throw new Error("Application not found");

      const old = app.status;
      app.status = "rejected";
      app.reviewNote = reason;

      logAudit(draft, adminId, "reject_application", "washApplications", id, old, "rejected", reason);
      return app;
    });
  });
}

export async function requestChangesApplication(id, { adminId, note }) {
  return write(() => {
    return mutate((draft) => {
      const app = draft.washApplications.find((a) => a.id === id);
      if (!app) throw new Error("Application not found");

      const old = app.status;
      app.status = "needs_changes";
      app.reviewNote = note;

      logAudit(draft, adminId, "request_changes_application", "washApplications", id, old, "needs_changes", note);
      return app;
    });
  });
}

// ==========================================
// 3. CAR WASHES & BRANCHES
// ==========================================
export async function getWashes(statusFilter = "all") {
  return read(() => {
    const db = get();
    let list = db.businesses || [];
    if (statusFilter && statusFilter !== "all") {
      list = list.filter((b) => b.status === statusFilter);
    }
    return list.map((b) => {
      const branches = db.branches.filter((br) => br.businessId === b.id);
      const orders = db.orders.filter((o) => o.businessId === b.id);
      return {
        ...b,
        branchesCount: branches.length,
        branches,
        ordersCount: orders.length,
        activeOrders: orders.filter((o) => ["pending", "confirmed", "waiting", "in_service"].includes(o.status)).length,
      };
    });
  });
}

export async function getWashDetails(id) {
  return read(() => {
    const db = get();
    const biz = db.businesses.find((b) => b.id === id);
    if (!biz) return null;

    const branches = db.branches.filter((b) => b.businessId === id);
    const branchIds = branches.map((b) => b.id);
    const services = db.services.filter((s) => branchIds.includes(s.branchId));
    const staff = db.staff.filter((s) => s.businessId === id);
    const orders = db.orders.filter((o) => o.businessId === id);
    const reviews = db.reviews.filter((r) => r.businessId === id);
    const complaints = db.complaints.filter((c) => c.businessId === id);
    const transactions = db.transactions.filter((t) => t.businessId === id);
    const auditLogs = db.auditLogs.filter((a) => a.entityId === id || branchIds.includes(a.branchId));

    const totalGmv = transactions.reduce((s, t) => s + (t.gross || 0), 0);
    const totalCommission = transactions.reduce((s, t) => s + (t.commission || 0), 0);
    const netPayout = transactions.reduce((s, t) => s + (t.netToWash || 0), 0);

    return {
      biz,
      branches,
      services,
      staff,
      orders,
      reviews,
      complaints,
      transactions,
      auditLogs,
      financials: { totalGmv, totalCommission, netPayout },
    };
  });
}

export async function suspendWash(id, { adminId, reason, note, cancelUpcoming = false }) {
  return write(() => {
    return mutate((draft) => {
      const biz = draft.businesses.find((b) => b.id === id);
      if (!biz) throw new Error("Business not found");

      const oldStatus = biz.status;
      biz.status = "suspended";
      biz.statusReason = `${reason}: ${note || ""}`;

      // Notify wash owner
      sendNotification(draft, "owner", biz.ownerId, "wash_suspended",
        { ar: "تم تعليق حساب مغسلتك", en: "Your car wash has been suspended" },
        { ar: `تم تعليق المغسلة بسبب: ${reason}. يرجى التواصل مع الدعم.`, en: `Your wash was suspended: ${reason}. Contact support.` },
        `#/washes/${id}`
      );

      // Handle upcoming bookings if requested
      if (cancelUpcoming) {
        const upcoming = draft.orders.filter((o) => o.businessId === id && ["pending", "confirmed"].includes(o.status));
        upcoming.forEach((o) => {
          o.status = "cancelled";
          o.cancel = { reason: "Wash operations temporarily suspended", byType: "admin", byId: adminId, at: now().toISOString() };
          sendNotification(draft, "customer", o.customerId, "order_cancelled",
            { ar: "تم إلغاء حجزك لتعليق المغسلة", en: "Booking cancelled due to wash suspension" },
            { ar: "نعتذر منك، تم إلغاء حجزك وسنعيد توجيهك لمغاسل أخرى.", en: "We apologize, your booking was cancelled. Please pick another wash." }
          );
        });
      }

      logAudit(draft, adminId, "suspend_wash", "businesses", id, oldStatus, "suspended", `${reason}: ${note}`);
      return biz;
    });
  });
}

export async function reactivateWash(id, { adminId, note }) {
  return write(() => {
    return mutate((draft) => {
      const biz = draft.businesses.find((b) => b.id === id);
      if (!biz) throw new Error("Business not found");

      const oldStatus = biz.status;
      biz.status = "active";
      biz.statusReason = null;

      sendNotification(draft, "owner", biz.ownerId, "wash_reactivated",
        { ar: "تمت إعادة تفعيل حساب مغسلتك", en: "Your car wash has been reactivated" },
        { ar: "عادت مغسلتك للظهور في نتائج البحث واستقبال الحجوزات.", en: "Your wash is active again and visible to customers." }
      );

      logAudit(draft, adminId, "reactivate_wash", "businesses", id, oldStatus, "active", note || "Reactivated by admin");
      return biz;
    });
  });
}

export async function updateBusinessDataAsAdmin(id, { adminId, patch, reason }) {
  return write(() => {
    return mutate((draft) => {
      const biz = draft.businesses.find((b) => b.id === id);
      if (!biz) throw new Error("Business not found");

      const oldData = structuredClone(biz);
      Object.assign(biz, patch);

      logAudit(draft, adminId, "edit_business_data", "businesses", id, JSON.stringify(oldData), JSON.stringify(biz), reason);
      return biz;
    });
  });
}

export async function getBranches() {
  return read(() => {
    const db = get();
    return db.branches.map((b) => {
      const biz = db.businesses.find((bz) => bz.id === b.businessId);
      const todayOrders = db.orders.filter((o) => o.branchId === b.id && new Date(o.scheduledAt).toDateString() === now().toDateString());
      return {
        ...b,
        businessName: biz?.name,
        businessStatus: biz?.status,
        todayOrdersCount: todayOrders.length,
      };
    });
  });
}

export async function toggleBranchActive(id, { adminId, active, reason }) {
  return write(() => {
    return mutate((draft) => {
      const branch = draft.branches.find((b) => b.id === id);
      if (!branch) throw new Error("Branch not found");

      const old = branch.active;
      branch.active = active;

      logAudit(draft, adminId, active ? "activate_branch" : "deactivate_branch", "branches", id, old, active, reason);
      return branch;
    });
  });
}

// ==========================================
// 4. BOOKINGS & ORDERS
// ==========================================
export async function getOrders(filters = {}) {
  return read(() => {
    const db = get();
    let list = db.orders || [];

    if (filters.status && filters.status !== "all") list = list.filter((o) => o.status === filters.status);
    if (filters.source && filters.source !== "all") list = list.filter((o) => o.source === filters.source);
    if (filters.paymentStatus && filters.paymentStatus !== "all") list = list.filter((o) => o.paymentStatus === filters.paymentStatus);
    if (filters.washId && filters.washId !== "all") list = list.filter((o) => o.businessId === filters.washId);
    if (filters.branchId && filters.branchId !== "all") list = list.filter((o) => o.branchId === filters.branchId);
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter((o) => {
        const cust = db.customers.find((c) => c.id === o.customerId);
        return o.number.toLowerCase().includes(q) ||
          (o.code && o.code.toLowerCase().includes(q)) ||
          (o.plate && o.plate.toLowerCase().includes(q)) ||
          (cust && cust.name.toLowerCase().includes(q));
      });
    }

    return list.map((o) => {
      const cust = db.customers.find((c) => c.id === o.customerId);
      const biz = db.businesses.find((b) => b.id === o.businessId);
      const branch = db.branches.find((br) => br.id === o.branchId);
      return { ...o, customer: cust, business: biz, branch };
    }).sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
  });
}

export async function getOrderDetails(id) {
  return read(() => {
    const db = get();
    const order = db.orders.find((o) => o.id === id || o.number === id);
    if (!order) return null;

    const cust = db.customers.find((c) => c.id === order.customerId);
    const vehicle = db.vehicles.find((v) => v.id === order.vehicleId);
    const biz = db.businesses.find((b) => b.id === order.businessId);
    const branch = db.branches.find((br) => br.id === order.branchId);
    const staff = db.staff.find((s) => s.id === order.assignedStaffId);
    const payment = db.payments.find((p) => p.orderId === order.id);
    const transaction = db.transactions.find((t) => t.orderId === order.id);
    const review = db.reviews.find((r) => r.orderId === order.id);
    const complaint = db.complaints.find((c) => c.orderId === order.id);
    const auditEntries = db.auditLogs.filter((a) => a.entityId === order.id || a.entityId === order.number);

    return {
      order,
      customer: cust,
      vehicle,
      business: biz,
      branch,
      staff,
      payment,
      transaction,
      review,
      complaint,
      auditEntries,
    };
  });
}

export async function cancelOrderAsAdmin(id, { adminId, reason }) {
  return write(() => {
    return mutate((draft) => {
      const order = draft.orders.find((o) => o.id === id || o.number === id);
      if (!order) throw new Error("Order not found");

      if (!["pending", "confirmed"].includes(order.status)) {
        throw new Error("Only pending or confirmed bookings can be cancelled.");
      }

      const oldStatus = order.status;
      order.status = "cancelled";
      order.cancel = { reason, byType: "admin", byId: adminId, at: now().toISOString() };
      order.timeline.push({
        status: "cancelled",
        at: now().toISOString(),
        byType: "admin",
        byId: adminId,
      });

      sendNotification(draft, "customer", order.customerId, "order_cancelled",
        { ar: `تم إلغاء الحجز رقم ${order.number}`, en: `Booking ${order.number} cancelled` },
        { ar: `تم إلغاء حجزك بواسطة إدارة المنصة: ${reason}`, en: `Cancelled by platform admin: ${reason}` }
      );

      sendNotification(draft, "staff", order.assignedStaffId, "order_cancelled",
        { ar: `تم إلغاء الحجز رقم ${order.number}`, en: `Booking ${order.number} cancelled` },
        { ar: `إلغاء إداري: ${reason}`, en: `Admin cancellation: ${reason}` }
      );

      logAudit(draft, adminId, "cancel_order", "orders", order.id, oldStatus, "cancelled", reason, order.branchId);
      return order;
    });
  });
}

export async function correctOrderDataAsAdmin(id, { adminId, patch, reason }) {
  return write(() => {
    return mutate((draft) => {
      const order = draft.orders.find((o) => o.id === id || o.number === id);
      if (!order) throw new Error("Order not found");

      // Prevent editing sensitive financial fields
      delete patch.total;
      delete patch.subtotal;
      delete patch.discount;

      const oldData = structuredClone(order);
      Object.assign(order, patch);

      logAudit(draft, adminId, "correct_order_data", "orders", order.id, JSON.stringify(oldData), JSON.stringify(order), reason, order.branchId);
      return order;
    });
  });
}

export async function flagOrderForFinance(id, { adminId, reason }) {
  return write(() => {
    return mutate((draft) => {
      const order = draft.orders.find((o) => o.id === id || o.number === id);
      if (!order) throw new Error("Order not found");

      order.flag = "finance_review";
      order.notes = order.notes || [];
      order.notes.push({ text: `Flagged for finance review by ${adminId}: ${reason}`, at: now().toISOString() });

      // Notify Finance admin
      sendNotification(draft, "admin", "au_nour", "finance_flag",
        { ar: `طلب مراجعة مالية للحجز ${order.number}`, en: `Finance review flagged for ${order.number}` },
        { ar: reason, en: reason },
        `#/orders/${order.id}`
      );

      logAudit(draft, adminId, "flag_order_finance", "orders", order.id, null, "finance_review", reason, order.branchId);
      return order;
    });
  });
}

// ==========================================
// 5. CUSTOMERS, OWNERS, EMPLOYEES
// ==========================================
export async function getCustomers(filter = "all", search = "") {
  return read(() => {
    const db = get();
    let list = db.customers || [];

    if (filter === "active") list = list.filter((c) => c.status === "active");
    if (filter === "suspended") list = list.filter((c) => c.status === "suspended");
    if (filter === "new") {
      const sevenDaysAgo = new Date(now().getTime() - 7 * 86400000);
      list = list.filter((c) => new Date(c.createdAt) >= sevenDaysAgo);
    }

    if (search) {
      const q = search.toLowerCase().trim();
      list = list.filter((c) => {
        const vehicles = db.vehicles.filter((v) => v.customerId === c.id);
        const matchPlate = vehicles.some((v) => v.plate.toLowerCase().includes(q) || v.plateNormalized.includes(q.toUpperCase()));
        return c.name.toLowerCase().includes(q) || c.phone.includes(q) || matchPlate;
      });
    }

    return list.map((c) => {
      const vehicles = db.vehicles.filter((v) => v.customerId === c.id);
      const orders = db.orders.filter((o) => o.customerId === c.id);
      const completed = orders.filter((o) => o.status === "completed");
      return {
        ...c,
        vehicles,
        ordersCount: orders.length,
        completedCount: completed.length,
      };
    }).sort((a, b) => (filter === "high_activity" ? b.ordersCount - a.ordersCount : 0));
  });
}

export async function getCustomerDetails(id) {
  return read(() => {
    const db = get();
    const customer = db.customers.find((c) => c.id === id);
    if (!customer) return null;

    const vehicles = db.vehicles.filter((v) => v.customerId === id);
    const orders = db.orders.filter((o) => o.customerId === id).map((o) => {
      const biz = db.businesses.find((b) => b.id === o.businessId);
      const branch = db.branches.find((br) => br.id === o.branchId);
      return { ...o, business: biz, branch };
    });
    const reviews = db.reviews.filter((r) => r.customerId === id);
    const complaints = db.complaints.filter((c) => c.customerId === id);
    const auditEntries = db.auditLogs.filter((a) => a.entityId === id);

    return { customer, vehicles, orders, reviews, complaints, auditEntries };
  });
}

export async function toggleCustomerSuspended(id, { adminId, suspended, reason }) {
  return write(() => {
    return mutate((draft) => {
      const customer = draft.customers.find((c) => c.id === id);
      if (!customer) throw new Error("Customer not found");

      const oldStatus = customer.status;
      customer.status = suspended ? "suspended" : "active";
      customer.statusReason = suspended ? reason : null;

      logAudit(draft, adminId, suspended ? "suspend_customer" : "reactivate_customer", "customers", id, oldStatus, customer.status, reason);
      return customer;
    });
  });
}

export async function getOwners() {
  return read(() => {
    const db = get();
    return db.businesses.map((biz) => {
      const branches = db.branches.filter((br) => br.businessId === biz.id);
      return {
        id: biz.ownerId,
        businessId: biz.id,
        name: biz.ownerName || "—",
        businessName: biz.name,
        branchesCount: branches.length,
        status: biz.status,
      };
    });
  });
}

export async function getEmployees() {
  return read(() => {
    const db = get();
    return db.staff.map((s) => {
      const biz = db.businesses.find((b) => b.id === s.businessId);
      const branch = db.branches.find((br) => br.id === s.branchId);
      return {
        ...s,
        businessName: biz?.name,
        branchName: branch?.name,
      };
    });
  });
}

export async function toggleStaffSuspended(id, { adminId, suspended, reason }) {
  return write(() => {
    return mutate((draft) => {
      const staff = draft.staff.find((s) => s.id === id);
      if (!staff) throw new Error("Staff member not found");

      const old = staff.status;
      staff.status = suspended ? "suspended" : "active";

      logAudit(draft, adminId, suspended ? "suspend_staff" : "reactivate_staff", "staff", id, old, staff.status, reason);
      return staff;
    });
  });
}

// ==========================================
// 6. COMPLAINTS & SUPPORT
// ==========================================
export async function getComplaints(statusFilter = "all") {
  return read(() => {
    const db = get();
    let list = db.complaints || [];
    if (statusFilter && statusFilter !== "all") {
      list = list.filter((c) => c.status === statusFilter);
    }

    return list.map((c) => {
      const customer = db.customers.find((cu) => cu.id === c.customerId);
      const biz = db.businesses.find((b) => b.id === c.businessId);
      const branch = db.branches.find((br) => br.id === c.branchId);
      const order = db.orders.find((o) => o.id === c.orderId);
      const assignee = db.adminUsers.find((au) => au.id === c.assignedAdminId);
      return {
        ...c,
        customer,
        business: biz,
        branch,
        order,
        assignee,
      };
    }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  });
}

export async function getComplaintDetails(id) {
  return read(() => {
    const db = get();
    const complaint = db.complaints.find((c) => c.id === id);
    if (!complaint) return null;

    const customer = db.customers.find((cu) => cu.id === complaint.customerId);
    const biz = db.businesses.find((b) => b.id === complaint.businessId);
    const branch = db.branches.find((br) => br.id === complaint.branchId);
    const order = db.orders.find((o) => o.id === complaint.orderId);
    const washComplaints = db.complaints.filter((c) => c.businessId === complaint.businessId);
    const auditEntries = db.auditLogs.filter((a) => a.entityId === id);

    return {
      complaint,
      customer,
      business: biz,
      branch,
      order,
      washComplaintCount: washComplaints.length,
      auditEntries,
    };
  });
}

export async function updateComplaint(id, { adminId, status, assignedAdminId, note, resolution }) {
  return write(() => {
    return mutate((draft) => {
      const complaint = draft.complaints.find((c) => c.id === id);
      if (!complaint) throw new Error("Complaint not found");

      const oldStatus = complaint.status;
      if (status) complaint.status = status;
      if (assignedAdminId !== undefined) complaint.assignedAdminId = assignedAdminId;
      if (resolution) complaint.resolution = resolution;

      complaint.notes = complaint.notes || [];
      if (note) {
        complaint.notes.push({
          authorId: adminId,
          text: note,
          at: now().toISOString(),
        });
      }

      if (resolution && (status === "resolved" || status === "closed")) {
        sendNotification(draft, "customer", complaint.customerId, "complaint_resolved",
          { ar: `تم حل الشكوى الخاصة بك: ${complaint.id}`, en: `Complaint ${complaint.id} resolved` },
          { ar: `القرار: ${resolution}`, en: `Resolution: ${resolution}` },
          `#/complaints/${complaint.id}`
        );
      }

      logAudit(draft, adminId, "update_complaint", "complaints", id, oldStatus, complaint.status, note || resolution);
      return complaint;
    });
  });
}

// ==========================================
// 7. REVIEWS MODERATION
// ==========================================
export async function getReviews(filters = {}) {
  return read(() => {
    const db = get();
    let list = db.reviews || [];

    if (filters.status && filters.status !== "all") list = list.filter((r) => r.status === filters.status);
    if (filters.lowOnly) list = list.filter((r) => r.stars <= 2);
    if (filters.reportedOnly) list = list.filter((r) => r.reportedByWash);

    return list.map((r) => {
      const customer = db.customers.find((c) => c.id === r.customerId);
      const biz = db.businesses.find((b) => b.id === r.businessId);
      const branch = db.branches.find((br) => br.id === r.branchId);
      const order = db.orders.find((o) => o.id === r.orderId);
      return { ...r, customer, business: biz, branch, order };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  });
}

export async function toggleReviewHidden(id, { adminId, hidden, reason }) {
  return write(() => {
    return mutate((draft) => {
      const rev = draft.reviews.find((r) => r.id === id);
      if (!rev) throw new Error("Review not found");

      const oldStatus = rev.status;
      rev.status = hidden ? "hidden" : "visible";
      rev.hiddenReason = hidden ? reason : null;

      // Recalculate wash & branch ratings
      recalculateRatings(draft, rev.branchId);

      logAudit(draft, adminId, hidden ? "hide_review" : "restore_review", "reviews", id, oldStatus, rev.status, reason, rev.branchId);
      return rev;
    });
  });
}

// ==========================================
// 8. OFFERS & FEATURED LISTINGS
// ==========================================
export async function getOffers() {
  return read(() => {
    const db = get();
    return db.offers || [];
  });
}

export async function saveOffer(offerData, { adminId }) {
  return write(() => {
    return mutate((draft) => {
      draft.offers = draft.offers || [];
      const isNew = !offerData.id;
      const id = offerData.id || nid("off");
      const existing = draft.offers.find((o) => o.id === id);

      const record = {
        id,
        scope: offerData.scope || "platform",
        businessId: offerData.businessId || null,
        branchIds: offerData.branchIds || [],
        serviceIds: offerData.serviceIds || [],
        title: offerData.title,
        description: offerData.description,
        discountType: offerData.discountType || "percent",
        discountValue: Number(offerData.discountValue) || 10,
        startAt: offerData.startAt || now().toISOString(),
        endAt: offerData.endAt || new Date(now().getTime() + 14 * 86400000).toISOString(),
        status: offerData.status || "active",
        featured: !!offerData.featured,
      };

      if (existing) {
        Object.assign(existing, record);
      } else {
        draft.offers.unshift(record);
      }

      logAudit(draft, adminId, isNew ? "create_offer" : "update_offer", "offers", id, null, JSON.stringify(record), "Platform promotional offer update");
      return record;
    });
  });
}

export async function getFeaturedListings() {
  return read(() => {
    const db = get();
    return (db.featuredListings || []).map((f) => {
      const biz = db.businesses.find((b) => b.id === f.businessId);
      const branch = db.branches.find((br) => br.id === f.branchId);
      return { ...f, business: biz, branch };
    });
  });
}

export async function saveFeaturedListing(data, { adminId }) {
  return write(() => {
    return mutate((draft) => {
      draft.featuredListings = draft.featuredListings || [];
      const id = data.id || nid("feat");
      const record = {
        id,
        businessId: data.businessId,
        branchId: data.branchId,
        placement: data.placement || "home",
        startAt: data.startAt,
        endAt: data.endAt,
        active: true,
      };

      draft.featuredListings.unshift(record);
      logAudit(draft, adminId, "create_featured_listing", "featuredListings", id, null, JSON.stringify(record), "Featured placement scheduled");
      return record;
    });
  });
}

// ==========================================
// 9. FINANCIALS, TRANSACTIONS, COMMISSION, PAYOUTS
// ==========================================
export async function getFinancialOverview() {
  return read(() => {
    const db = get();
    const paidOrders = db.orders.filter((o) => o.status === "completed" && o.paymentStatus === "paid");
    const totalGmv = paidOrders.reduce((s, o) => s + o.total, 0);
    const totalCommission = paidOrders.reduce((s, o) => {
      const biz = db.businesses.find((b) => b.id === o.businessId);
      const rate = (biz?.commissionRate ?? db.settings?.defaultCommissionPct ?? 7) / 100;
      return s + o.total * rate;
    }, 0);
    const netToWashes = totalGmv - totalCommission;
    const refunds = db.orders.filter((o) => o.paymentStatus === "refunded").reduce((s, o) => s + o.total, 0);

    const topWashesByGmv = db.businesses.map((biz) => {
      const bizOrders = paidOrders.filter((o) => o.businessId === biz.id);
      const gmv = bizOrders.reduce((s, o) => s + o.total, 0);
      return {
        id: biz.id,
        name: biz.name,
        gmv,
        ordersCount: bizOrders.length,
      };
    }).sort((a, b) => b.gmv - a.gmv).slice(0, 5);

    return {
      totalGmv,
      totalCommission: Math.round(totalCommission * 10) / 10,
      netToWashes: Math.round(netToWashes * 10) / 10,
      refunds,
      topWashesByGmv,
    };
  });
}

export async function getTransactions(filter = "all") {
  return read(() => {
    const db = get();
    let list = db.transactions || [];
    if (filter === "discrepancy") {
      list = list.filter((t) => t.flag === "discrepancy" || t.discrepancy);
    } else if (filter && filter !== "all") {
      list = list.filter((t) => t.status === filter);
    }

    return list.map((t) => {
      const biz = db.businesses.find((b) => b.id === t.businessId);
      const order = db.orders.find((o) => o.id === t.orderId);
      return { ...t, business: biz, order };
    }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  });
}

export async function resolveDiscrepancy(id, { adminId, note }) {
  return write(() => {
    return mutate((draft) => {
      const tx = draft.transactions.find((t) => t.id === id);
      if (!tx) throw new Error("Transaction not found");

      const oldFlag = tx.flag;
      tx.flag = null;
      tx.discrepancy = false;
      tx.reviewNote = note;

      logAudit(draft, adminId, "resolve_discrepancy", "transactions", id, oldFlag, "resolved", note);
      return tx;
    });
  });
}

export async function updateCommissionSettings({ defaultCommissionPct, overrides }, { adminId, reason }) {
  return write(() => {
    return mutate((draft) => {
      draft.settings = draft.settings || {};
      const oldDefault = draft.settings.defaultCommissionPct;
      if (defaultCommissionPct !== undefined) {
        draft.settings.defaultCommissionPct = Number(defaultCommissionPct);
      }

      if (overrides) {
        for (const [bizId, rate] of Object.entries(overrides)) {
          const biz = draft.businesses.find((b) => b.id === bizId);
          if (biz) biz.commissionRate = Number(rate);
        }
      }

      logAudit(draft, adminId, "update_commission_settings", "settings", "commission", oldDefault, defaultCommissionPct, reason);
      return draft.settings;
    });
  });
}

export async function getPayouts() {
  return read(() => {
    const db = get();
    return (db.payouts || []).map((p) => {
      const biz = db.businesses.find((b) => b.id === p.businessId);
      return { ...p, business: biz };
    });
  });
}

export async function markPayoutPaid(id, { adminId, amountPaid, reference, date }) {
  return write(() => {
    return mutate((draft) => {
      const payout = draft.payouts.find((p) => p.id === id);
      if (!payout) throw new Error("Payout record not found");

      payout.status = "paid";
      payout.amountPaid = Number(amountPaid) || payout.amountDue;
      payout.reference = reference || `TRX-${Math.floor(10000 + Math.random() * 90000)}`;
      payout.paidAt = date || now().toISOString();

      // Settle related transactions
      draft.transactions.filter((t) => t.businessId === payout.businessId && t.status !== "settled").forEach((t) => {
        t.status = "settled";
      });

      logAudit(draft, adminId, "mark_payout_paid", "payouts", id, "due", "paid", `Reference: ${payout.reference}`);
      return payout;
    });
  });
}

// ==========================================
// 10. REPORTS & MARKETPLACE HEALTH
// ==========================================
export async function getMarketplaceHealth() {
  return read(() => {
    const db = get();
    return {
      supply: {
        activeWashes: db.businesses.filter((b) => b.status === "active").length,
        activeBranches: db.branches.filter((b) => b.active).length,
        totalBays: db.branches.reduce((s, b) => s + (b.capacity || 0), 0),
        trend: "+5.2%",
        interpretation: { ar: "العرض التشغيلي يغطي معظم مناطق القاهرة الكبرى بكفاءة.", en: "Operational supply covers Greater Cairo with strong capacity." },
      },
      demand: {
        activeCustomers: db.customers.filter((c) => c.status === "active").length,
        totalBookings: db.orders.length,
        todayBookings: db.orders.filter((o) => new Date(o.scheduledAt).toDateString() === now().toDateString()).length,
        trend: "+12.8%",
        interpretation: { ar: "نمو ملحوظ في الطلب على باقات الغسيل السريعة في عطلات نهاية الأسبوع.", en: "Noticeable increase in weekend demand for quick wash packages." },
      },
      conversion: {
        viewToBooking: 68,
        bookingToComplete: 89,
        trend: "+3.1%",
        interpretation: { ar: "نسبة التحويل من الحجز إلى الخدمة المكتملة أعلى من المعايير السوقية.", en: "Conversion from booking to completion outperforms mobility averages." },
      },
      retention: {
        repeatCustomerRate: 46,
        repeatBookingRate: 62,
        trend: "+4.4%",
        interpretation: { ar: "ما يقرب من نصف العملاء يكررون الحجز خلال شهر واحد.", en: "Nearly half of all customers book again within 30 days." },
      },
      quality: {
        averageRating: 4.7,
        complaintRate: 1.2,
        cancelRate: 4.8,
        noShowRate: 2.1,
        trend: "مستقر",
        interpretation: { ar: "مستوى الرضا مستقر ونسبة الإلغاء في الحدود الآمنة للعمليات.", en: "Satisfaction is stable and cancellations remain well within safe operating limits." },
      },
    };
  });
}

// ==========================================
// 11. ADMIN USERS & ROLES
// ==========================================
export async function getAdminUsers() {
  return read(() => {
    const db = get();
    return db.adminUsers || [];
  });
}

export async function saveAdminUser(userData, { adminId }) {
  return write(() => {
    return mutate((draft) => {
      draft.adminUsers = draft.adminUsers || [];
      const id = userData.id || nid("au");
      const existing = draft.adminUsers.find((u) => u.id === id);

      const record = {
        id,
        name: userData.name,
        email: userData.email,
        role: userData.role || "support",
        status: userData.status || "active",
        password: "demo1234",
      };

      if (existing) {
        Object.assign(existing, record);
      } else {
        draft.adminUsers.push(record);
      }

      logAudit(draft, adminId, existing ? "update_admin_user" : "create_admin_user", "adminUsers", id, null, userData.role, "Admin account provisioned");
      return record;
    });
  });
}

export async function toggleAdminUserStatus(id, { adminId, status }) {
  return write(() => {
    return mutate((draft) => {
      if (id === adminId) throw new Error("Cannot deactivate your own account.");
      const superAdmins = draft.adminUsers.filter((u) => u.role === "super" && u.status === "active");
      const target = draft.adminUsers.find((u) => u.id === id);
      if (target?.role === "super" && superAdmins.length <= 1 && status !== "active") {
        throw new Error("Cannot deactivate the last Super Admin.");
      }

      const old = target.status;
      target.status = status;

      logAudit(draft, adminId, "toggle_admin_status", "adminUsers", id, old, status, "Admin account status changed");
      return target;
    });
  });
}

// ==========================================
// 12. AUDIT LOGS (IMMUTABLE)
// ==========================================
export async function getAuditLogs(filters = {}) {
  return read(() => {
    const db = get();
    let list = db.auditLogs || [];

    if (filters.action && filters.action !== "all") list = list.filter((a) => a.action === filters.action);
    if (filters.entity && filters.entity !== "all") list = list.filter((a) => a.entity === filters.entity);
    if (filters.actorId && filters.actorId !== "all") list = list.filter((a) => a.actorId === filters.actorId);

    return list.map((a) => {
      const actor = db.adminUsers?.find((au) => au.id === a.actorId) || { name: a.actorId };
      return { ...a, actorName: actor.name };
    }).sort((a, b) => new Date(b.at) - new Date(a.at));
  });
}

// ==========================================
// 13. NOTIFICATIONS & SEARCH
// ==========================================
export async function getAdminNotifications() {
  return read(() => {
    const db = get();
    return (db.notifications || []).filter((n) => n.audience === "admin");
  });
}

export async function markNotificationRead(id) {
  return write(() => {
    return mutate((draft) => {
      const n = draft.notifications.find((notif) => notif.id === id);
      if (n) n.read = true;
      return n;
    });
  });
}

export async function globalSearch(q, currentRole = "super") {
  return read(() => {
    const db = get();
    const query = q.toLowerCase().trim();
    if (!query) return { customers: [], orders: [], washes: [], branches: [] };

    const results = { customers: [], orders: [], washes: [], branches: [] };

    // Search customers
    if (can({ type: "admin", role: currentRole }, "customers")) {
      results.customers = db.customers.filter((c) => {
        const vehicles = db.vehicles.filter((v) => v.customerId === c.id);
        const matchPlate = vehicles.some((v) => v.plate.toLowerCase().includes(query) || v.plateNormalized.includes(query.toUpperCase()));
        return c.name.toLowerCase().includes(query) || c.phone.includes(query) || matchPlate;
      }).slice(0, 5);
    }

    // Search orders
    if (can({ type: "admin", role: currentRole }, "orders")) {
      results.orders = db.orders.filter((o) => {
        return o.number.toLowerCase().includes(query) || (o.code && o.code.toLowerCase().includes(query)) || (o.plate && o.plate.toLowerCase().includes(query));
      }).slice(0, 5);
    }

    // Search washes
    if (can({ type: "admin", role: currentRole }, "washes")) {
      results.washes = db.businesses.filter((b) => {
        return b.name.ar.toLowerCase().includes(query) || b.name.en.toLowerCase().includes(query);
      }).slice(0, 5);
    }

    // Search branches
    if (can({ type: "admin", role: currentRole }, "branches")) {
      results.branches = db.branches.filter((br) => {
        return br.name.ar.toLowerCase().includes(query) || br.name.en.toLowerCase().includes(query);
      }).slice(0, 5);
    }

    return results;
  });
}
