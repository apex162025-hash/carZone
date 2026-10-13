import { getData, getPaginated, send } from "@/lib/api/request";
import type {
  Branch,
  BranchListItem,
  BranchListParams,
  Business,
  ReactivateWashPayload,
  Staff,
  StaffListItem,
  StaffListParams,
  StaffRole,
  SuspendWashPayload,
  SuspensionImpact,
  ToggleBranchPayload,
  ToggleStaffPayload,
  UpdateWashPayload,
  WashDetails,
  WashListItem,
  WashListMeta,
  WashListParams,
} from "@/types/washes";
import type { StatusCounts } from "@/types/common";

export function fetchWashes(params: WashListParams) {
  return getPaginated<WashListItem, WashListMeta>("/admin/washes", params, "تعذر تحميل المغاسل");
}

export function fetchWash(id: string) {
  return getData<WashDetails>(`/admin/washes/${id}`, undefined, "تعذر تحميل بيانات المغسلة");
}

export function fetchSuspensionImpact(id: string) {
  return getData<SuspensionImpact>(`/admin/washes/${id}/impact`);
}

export function suspendWash(id: string, payload: SuspendWashPayload) {
  return send<Business>("post", `/admin/washes/${id}/suspend`, payload);
}

export function reactivateWash(id: string, payload: ReactivateWashPayload) {
  return send<Business>("post", `/admin/washes/${id}/reactivate`, payload);
}

export function updateWash(id: string, payload: UpdateWashPayload) {
  return send<Business>("patch", `/admin/washes/${id}`, payload);
}

export function fetchBranches(params: BranchListParams) {
  return getPaginated<BranchListItem, { counts: StatusCounts<"active" | "inactive"> }>(
    "/admin/branches",
    params,
    "تعذر تحميل الفروع",
  );
}

export function toggleBranch(id: string, payload: ToggleBranchPayload) {
  return send<Branch>("post", `/admin/branches/${id}/toggle`, payload);
}

export function fetchStaff(params: StaffListParams) {
  return getPaginated<StaffListItem, { counts: StatusCounts<StaffRole> }>("/admin/staff", params, "تعذر تحميل الحسابات");
}

export function toggleStaff(id: string, payload: ToggleStaffPayload) {
  return send<Staff>("post", `/admin/staff/${id}/status`, payload);
}
