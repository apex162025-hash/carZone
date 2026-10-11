import { get, mutate, now } from "../../../shared/js/db.js";

export function currentStaffId() {
  return localStorage.getItem("carzen_staff_id") || "st_owner_biz_carzen";
}

export function currentStaff() {
  const db = get();
  const id = currentStaffId();
  return db.staff.find((s) => s.id === id) || db.staff.find((s) => s.role === "owner") || db.staff[0];
}

export function isOwner() {
  return currentStaff().role === "owner";
}

export function isManager() {
  return currentStaff().role === "manager";
}

export function selectedBranchId() {
  // If Manager, branch is locked to Nasr City (br_nasr)
  if (isManager()) return "br_nasr";
  return localStorage.getItem("carzen_dash_branch") || "all";
}

export function setSelectedBranchId(id) {
  if (isManager()) return; // locked for manager
  localStorage.setItem("carzen_dash_branch", id);
  window.dispatchEvent(new CustomEvent("carzen-branch-change", { detail: { branchId: id } }));
}

export function canEditServices() {
  const staff = currentStaff();
  if (staff.role === "owner") return true;
  if (staff.role === "manager" && staff.permissions?.editServices) return true;
  return false;
}

export function getScopedOrders(branchId = selectedBranchId()) {
  const db = get();
  if (branchId === "all") {
    return db.orders.filter((o) => o.businessId === "biz_carzen");
  }
  return db.orders.filter((o) => o.branchId === branchId);
}

export function getCarsInside(branchId = selectedBranchId()) {
  const orders = getScopedOrders(branchId);
  return orders.filter((o) => ["waiting", "in_service"].includes(o.status) || (o.status === "completed" && o.paymentStatus === "pending"));
}

export function computeKpis(branchId = selectedBranchId(), period = "today") {
  const db = get();
  const orders = getScopedOrders(branchId);

  // Period filter
  let filtered = orders;
  const current = now().getTime();
  if (period === "today") {
    filtered = orders.filter((o) => {
      const d = new Date(o.scheduledAt || o.createdAt);
      const n = now();
      return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
    });
  } else if (period === "7d") {
    filtered = orders.filter((o) => current - new Date(o.scheduledAt || o.createdAt).getTime() <= 7 * 86400000);
  } else if (period === "30d") {
    filtered = orders.filter((o) => current - new Date(o.scheduledAt || o.createdAt).getTime() <= 30 * 86400000);
  }

  const totalOrders = filtered.length;
  const walkIns = filtered.filter((o) => o.source === "walk_in").length;
  const appBookings = filtered.filter((o) => o.source === "app").length;
  const phoneBookings = filtered.filter((o) => o.source === "phone").length;
  const completed = filtered.filter((o) => o.status === "completed").length;
  const cancelled = filtered.filter((o) => o.status === "cancelled").length;
  const noShows = filtered.filter((o) => o.status === "no_show").length;

  const revenue = filtered
    .filter((o) => o.status === "completed" && o.paymentStatus === "paid")
    .reduce((s, o) => s + o.total, 0);

  const pendingPayments = filtered
    .filter((o) => o.status === "completed" && o.paymentStatus === "pending")
    .reduce((s, o) => s + o.total, 0);

  return {
    totalOrders,
    walkIns,
    appBookings,
    phoneBookings,
    completed,
    cancelled,
    noShows,
    revenue,
    pendingPayments,
  };
}

export function getAlertsFeed(branchId = selectedBranchId()) {
  const db = get();
  const alerts = [];

  // Shift cash difference alerts
  (db.shifts || []).forEach((sh) => {
    if (sh.difference && sh.difference !== 0) {
      alerts.push({
        type: "difference",
        level: "danger",
        title: { ar: `فارق نقدية بالوردية (${sh.difference} ج.م)`, en: `Shift cash difference (${sh.difference} EGP)` },
        desc: {
          ar: `أنهى الموظف الوردية بفارق ${sh.difference} ج.م. السبب: ${sh.reason?.ar || sh.reason || "غير محدد"}`,
          en: `Shift closed with ${sh.difference} EGP mismatch. Reason: ${sh.reason?.en || sh.reason || "Unspecified"}`,
        },
        link: "#/shifts",
        at: sh.actualEnd,
      });
    }
  });

  // Pending payments > 30 min
  const inside = getCarsInside(branchId);
  inside.forEach((o) => {
    if (o.status === "completed" && o.paymentStatus === "pending") {
      alerts.push({
        type: "payment",
        level: "warning",
        title: { ar: `سيارة بانتظار التحصيل: ${o.plate}`, en: `Payment pending for ${o.plate}` },
        desc: { ar: `الطلب ${o.number} مكتمل وبانتظار سداد ${o.total} ج.م`, en: `Order ${o.number} completed, waiting for ${o.total} EGP` },
        link: `#/orders?id=${o.id}`,
        at: o.completedAt || o.scheduledAt,
      });
    }
  });

  return alerts;
}
