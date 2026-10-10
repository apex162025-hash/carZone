const WASH = {
  owner: ["confirm_booking", "cancel_order", "close_shift", "edit_services", "refund", "collect_payment", "run_service", "manage_staff", "discount"],
  manager: ["confirm_booking", "cancel_order", "close_shift", "edit_services", "refund", "collect_payment", "run_service", "manage_staff", "discount"],
  employee: ["collect_payment", "run_service", "discount"],
};

export const ADMIN_DEFAULTS = {
  super: ["*"],
  operations: [
    "dashboard", "washes", "applications", "branches", "orders", "complaints",
    "reports", "reports_ops", "offers", "featured",
    "approve_application", "reject_application", "request_changes_application",
    "suspend_wash", "reactivate_wash", "activate_branch", "deactivate_branch",
    "cancel_order", "correct_order", "manage_complaint", "manage_offers", "manage_featured"
  ],
  finance: [
    "dashboard", "finance", "transactions", "commission", "payouts",
    "reports", "reports_finance", "orders_read",
    "manage_commission", "mark_payout_paid", "review_discrepancy"
  ],
  support: [
    "dashboard", "customers", "complaints", "reviews", "orders_read",
    "suspend_customer", "reactivate_customer", "manage_complaint",
    "hide_review", "restore_review"
  ],
};

const PERM_KEY = {
  confirm_booking: "confirmBooking",
  cancel_order: "cancelOrder",
  close_shift: "closeShift",
  edit_services: "editServices",
  refund: "refund",
  collect_payment: "collectPayment",
  run_service: "runService",
  manage_staff: "manageStaff",
};

export function can(actor, action, scope = {}) {
  if (!actor) return false;
  if (actor.type === "customer") {
    return ["book", "cancel_own", "review_own", "favorite", "report_own", "manage_cars"].includes(action);
  }
  if (actor.type === "staff") {
    if (scope.branchId && actor.role !== "owner" && actor.branchId && scope.branchId !== actor.branchId) return false;
    if (actor.permissions && PERM_KEY[action] && actor.permissions[PERM_KEY[action]] === false) return false;
    if (actor.permissions && PERM_KEY[action] && actor.permissions[PERM_KEY[action]] === true) return true;
    const allowed = WASH[actor.role] || [];
    if (!allowed.includes(action)) return false;
    if (action === "discount") return Number(scope.pct || 0) <= Number(actor.maxDiscountPct || 0);
    return true;
  }
  if (actor.type === "admin") {
    // Check if custom matrix exists in settings
    let matrix = ADMIN_DEFAULTS;
    try {
      const raw = localStorage.getItem("carzen_admin_roles_matrix");
      if (raw) matrix = JSON.parse(raw);
    } catch { /* use defaults */ }

    const allowed = matrix[actor.role] || ADMIN_DEFAULTS[actor.role] || [];
    if (allowed.includes("*")) return true;
    if (action === "orders" && allowed.includes("orders_read")) return true;
    if (action === "reports" && (allowed.includes("reports_ops") || allowed.includes("reports_finance"))) return true;
    return allowed.includes(action);
  }
  return false;
}
