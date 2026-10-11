import { get, mutate, now } from "../../../shared/js/db.js";
import { getActiveShift } from "../../../shared/js/services/wash.js";

export function currentStaffId() {
  return localStorage.getItem("carzen_staff_id") || "st_samir";
}

export function currentStaff() {
  const db = get();
  const id = currentStaffId();
  return db.staff.find((s) => s.id === id) || db.staff.find((s) => s.id === "st_samir") || db.staff[0];
}

export function currentBranch() {
  const staff = currentStaff();
  const db = get();
  return db.branches.find((b) => b.id === (staff.branchId || "br_nasr")) || db.branches[0];
}

export function hasActiveShift() {
  const db = get();
  const staff = currentStaff();
  return !!getActiveShift(db, staff.id);
}

export function currentShift() {
  const db = get();
  const staff = currentStaff();
  return getActiveShift(db, staff.id);
}

export function todayCounters(branchId = "br_nasr") {
  const db = get();
  const orders = db.orders.filter((o) => o.branchId === branchId);

  const waiting = orders.filter((o) => o.status === "waiting").length;
  const inService = orders.filter((o) => o.status === "in_service").length;
  const completed = orders.filter((o) => o.status === "completed").length;
  const payPending = orders.filter((o) => o.status === "completed" && o.paymentStatus === "pending").length;

  return { waiting, inService, completed, payPending };
}
