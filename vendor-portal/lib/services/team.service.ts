import { apiClient } from "@/lib/axios";
import { throwApiError } from "@/lib/api/api-error-handler";
import { getData, getPaginated, send } from "@/lib/api/request";
import type { AuditLog } from "@carzen/contracts/audit";
import type { ApiEnvelope } from "@carzen/contracts/common";
import type { Staff } from "@carzen/contracts/washes";
import type {
  DayClosing,
  DayClosingPayload,
  DayClosingSummary,
  ReviewShiftPayload,
  ShiftClosing,
  ShiftListParams,
  StaffPayload,
  UpdateSchedulePayload,
  UpdateStaffPayload,
  VendorStaffListParams,
  VendorStaffMember,
} from "@carzen/contracts/vendor/team";
import type { PaymentMethod } from "@carzen/contracts/orders";

export type StaffResult = { items: VendorStaffMember[]; counts: Record<string, number>; onShift: number };

export async function fetchStaff(params: VendorStaffListParams): Promise<StaffResult> {
  try {
    const { data } = await apiClient.get<ApiEnvelope<VendorStaffMember[], { counts: Record<string, number>; onShift: number }>>("/vendor/staff", { params });
    return { items: data.data, counts: data.meta?.counts ?? {}, onShift: data.meta?.onShift ?? 0 };
  } catch (error) {
    throwApiError(error, "تعذر تحميل الموظفين");
  }
}

export function createStaff(payload: StaffPayload) {
  return send<Staff>("post", "/vendor/staff", payload);
}

export function updateStaff(id: string, payload: UpdateStaffPayload) {
  return send<Staff>("patch", `/vendor/staff/${id}`, payload);
}

export function setStaffActive(id: string, active: boolean, reason: string) {
  return send<Staff>("post", `/vendor/staff/${id}/status`, { active, reason });
}

export function updateStaffSchedule(id: string, payload: UpdateSchedulePayload) {
  return send<Staff>("put", `/vendor/staff/${id}/schedule`, payload);
}

export type ShiftListMeta = {
  counts: Record<string, number>;
  totals: { expected: number; difference: number };
};

export function fetchShifts(params: ShiftListParams) {
  return getPaginated<ShiftClosing, ShiftListMeta>("/vendor/shifts", params, "تعذر تحميل الورديات");
}

export type ShiftDetails = {
  shift: ShiftClosing;
  orders: { id: string; number: string; plate: string; total: number; method: PaymentMethod | null; paid: boolean; at: string }[];
  auditLogs: AuditLog[];
};

export function fetchShift(id: string) {
  return getData<ShiftDetails>(`/vendor/shifts/${id}`, undefined, "تعذر تحميل الوردية");
}

export function reviewShift(id: string, payload: ReviewShiftPayload) {
  return send<ShiftClosing>("post", `/vendor/shifts/${id}/review`, payload);
}

export function fetchDayClosing(branchId: string, date: string) {
  return getData<DayClosingSummary>("/vendor/day-closing", { branchId, date }, "تعذر تحميل إغلاق اليوم");
}

export function closeDay(payload: DayClosingPayload) {
  return send<DayClosing>("post", "/vendor/day-closing", payload);
}
