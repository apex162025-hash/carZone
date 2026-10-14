import "server-only";

import type { VendorAccount } from "@carzen/contracts/vendor/auth";
import { MockApiError } from "../http";
import type { VendorActor } from "../router";
import type { MockDatabase } from "../schema";
import { vendorSettingsFor } from "./notify";

/** Token → signed-in owner/manager, or null when the session is invalid. */
export function resolveVendorActor(db: MockDatabase, token: string): VendorActor | null {
  const staffId = db.vendorSessions[token];
  if (!staffId) return null;
  const staff = db.staff.find((s) => s.id === staffId);
  if (!staff || staff.status !== "active" || staff.role === "employee") return null;
  const business = db.businesses.find((b) => b.id === staff.businessId);
  if (!business || business.status === "rejected") return null;
  const branchIds =
    staff.role === "owner"
      ? db.branches.filter((b) => b.businessId === business.id).map((b) => b.id)
      : [staff.branchId];
  return { staff, business, role: staff.role, branchIds };
}

export function toVendorAccount(db: MockDatabase, actor: VendorActor): VendorAccount {
  const settings = vendorSettingsFor(db, actor.business.id);
  return {
    id: actor.staff.id,
    name: actor.staff.name,
    phone: actor.staff.phone,
    role: actor.role,
    businessId: actor.business.id,
    businessName: actor.business.name,
    businessStatus: actor.business.status,
    businessStatusReason: actor.business.statusReason,
    homeBranchId: actor.staff.branchId,
    branches: db.branches
      .filter((b) => actor.branchIds.includes(b.id))
      .map((b) => ({ id: b.id, name: b.name, area: b.area, active: b.active, capacity: b.capacity })),
    permissions: actor.staff.permissions,
    maxDiscountPct: actor.staff.maxDiscountPct,
    canEditServices: actor.role === "owner" || settings.managerCanEditServices,
    lastLoginAt: null,
  };
}

/**
 * Resolves the `branchId` query/body value to the list of branches to read.
 * "all" (or empty) → every branch the actor may see. A specific branch must
 * be inside the actor's scope — managers can't read other branches (MG-01).
 */
export function scopeBranches(actor: VendorActor, branchId: string | null | undefined): string[] {
  if (!branchId || branchId === "all") return actor.branchIds;
  assertBranch(actor, branchId);
  return [branchId];
}

export function assertBranch(actor: VendorActor, branchId: string): void {
  if (!actor.branchIds.includes(branchId)) {
    throw new MockApiError("ليس لديك صلاحية على هذا الفرع", 403);
  }
}

/** A single branch is required (schedule, day closing…): "all" falls back to the home branch. */
export function singleBranch(actor: VendorActor, branchId: string | null | undefined): string {
  if (!branchId || branchId === "all") return actor.branchIds.includes(actor.staff.branchId) ? actor.staff.branchId : actor.branchIds[0];
  assertBranch(actor, branchId);
  return branchId;
}

export function assertOwner(actor: VendorActor, what = "هذا الإجراء"): void {
  if (actor.role !== "owner") throw new MockApiError(`${what} متاح لمالك المغسلة فقط`, 403);
}

export function assertNotSuspended(actor: VendorActor): void {
  if (actor.business.status === "suspended") {
    throw new MockApiError("المغسلة معلّقة من إدارة كارزن — لا يمكن استقبال حجوزات جديدة حاليًا", 423);
  }
}

export function findInScope<T extends { id: string; branchId: string }>(actor: VendorActor, list: T[], id: string, label: string): T {
  const item = list.find((x) => x.id === id);
  if (!item || !actor.branchIds.includes(item.branchId)) throw new MockApiError(`${label} غير موجود`, 404);
  return item;
}
