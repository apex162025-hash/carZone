import type { AdminRole, AdminStatus } from "./auth";

/** Every module/action key the roles matrix can toggle. */
export type PermissionKey =
  | "dashboard"
  | "customers"
  | "staff"
  | "washes"
  | "applications"
  | "branches"
  | "orders"
  | "reviews"
  | "complaints"
  | "offers"
  | "finance"
  | "reports"
  | "notifications"
  | "admins"
  | "roles"
  | "settings"
  | "audit";

export type PermissionLevel = "none" | "view" | "manage";

export type RolesMatrix = Record<AdminRole, Record<PermissionKey, PermissionLevel>>;

export interface AdminUserPayload {
  name: string;
  email: string;
  role: AdminRole;
}

export interface UpdateAdminPayload {
  role?: AdminRole;
  name?: string;
}

export interface ToggleAdminStatusPayload {
  status: AdminStatus;
  reason: string;
}

export interface UpdateRolesPayload {
  matrix: RolesMatrix;
  reason: string;
}
