import { getData, send } from "@/lib/api/request";
import type {
  AdminUserPayload,
  RolesMatrix,
  ToggleAdminStatusPayload,
  UpdateAdminPayload,
  UpdateRolesPayload,
} from "@/types/admins";
import type { AdminUser } from "@/types/auth";

export function fetchAdmins() {
  return getData<AdminUser[]>("/admin/admins", undefined, "تعذر تحميل المسؤولين");
}

export function createAdmin(payload: AdminUserPayload) {
  return send<AdminUser>("post", "/admin/admins", payload);
}

export function updateAdmin(id: string, payload: UpdateAdminPayload) {
  return send<AdminUser>("patch", `/admin/admins/${id}`, payload);
}

export function toggleAdminStatus(id: string, payload: ToggleAdminStatusPayload) {
  return send<AdminUser>("post", `/admin/admins/${id}/status`, payload);
}

export function fetchRoles() {
  return getData<RolesMatrix>("/admin/roles", undefined, "تعذر تحميل الصلاحيات");
}

export function updateRoles(payload: UpdateRolesPayload) {
  return send<RolesMatrix>("put", "/admin/roles", payload);
}
