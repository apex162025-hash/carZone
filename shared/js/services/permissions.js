const WASH = {
  owner: ["confirm_booking", "cancel_order", "close_shift", "edit_services", "refund", "collect_payment", "run_service", "manage_staff", "discount"],
  manager: ["confirm_booking", "cancel_order", "close_shift", "edit_services", "refund", "collect_payment", "run_service", "manage_staff", "discount"],
  employee: ["collect_payment", "run_service", "discount"],
};

const ADMIN = {
  super: ["*"],
  operations: ["dashboard", "washes", "applications", "branches", "orders", "complaints", "reports_ops"],
  finance: ["dashboard", "transactions", "payouts", "reports_finance"],
  support: ["dashboard", "complaints", "customers", "orders"],
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
    const allowed = ADMIN[actor.role] || [];
    return allowed.includes("*") || allowed.includes(action);
  }
  return false;
}
