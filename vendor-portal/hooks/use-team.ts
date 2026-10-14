"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useVendorMutation } from "@/hooks/use-vendor-mutation";
import { queryKeys } from "@/lib/query-keys";
import {
  closeDay,
  createStaff,
  fetchDayClosing,
  fetchShift,
  fetchShifts,
  fetchStaff,
  reviewShift,
  setStaffActive,
  updateStaff,
  updateStaffSchedule,
} from "@/lib/services/team.service";
import type {
  DayClosingPayload,
  ReviewShiftPayload,
  ShiftListParams,
  StaffPayload,
  UpdateSchedulePayload,
  UpdateStaffPayload,
  VendorStaffListParams,
} from "@carzen/contracts/vendor/team";

export function useStaff(params: VendorStaffListParams) {
  return useQuery({ queryKey: queryKeys.staff(params), queryFn: () => fetchStaff(params), placeholderData: keepPreviousData });
}

export function useCreateStaff(onDone?: () => void) {
  return useVendorMutation((payload: StaffPayload) => createStaff(payload), { invalidate: [queryKeys.staffRoot], onSuccess: () => onDone?.() });
}

export function useUpdateStaff(onDone?: () => void) {
  return useVendorMutation(({ id, ...payload }: UpdateStaffPayload & { id: string }) => updateStaff(id, payload), {
    invalidate: [queryKeys.staffRoot],
    onSuccess: () => onDone?.(),
  });
}

export function useToggleStaff(onDone?: () => void) {
  return useVendorMutation(({ id, active, reason }: { id: string; active: boolean; reason: string }) => setStaffActive(id, active, reason), {
    invalidate: [queryKeys.staffRoot],
    onSuccess: () => onDone?.(),
  });
}

export function useUpdateSchedule(onDone?: () => void) {
  return useVendorMutation(({ id, ...payload }: UpdateSchedulePayload & { id: string }) => updateStaffSchedule(id, payload), {
    invalidate: [queryKeys.staffRoot],
    onSuccess: () => onDone?.(),
  });
}

export function useShifts(params: ShiftListParams) {
  return useQuery({ queryKey: queryKeys.shifts(params), queryFn: () => fetchShifts(params), placeholderData: keepPreviousData });
}

export function useShift(id: string | null) {
  return useQuery({ queryKey: queryKeys.shift(id ?? ""), queryFn: () => fetchShift(id!), enabled: Boolean(id) });
}

export function useReviewShift(onDone?: () => void) {
  return useVendorMutation(({ id, ...payload }: ReviewShiftPayload & { id: string }) => reviewShift(id, payload), {
    invalidate: [queryKeys.shiftsRoot],
    onSuccess: () => onDone?.(),
  });
}

export function useDayClosing(branchId: string, date: string) {
  return useQuery({ queryKey: queryKeys.dayClosing(branchId, date), queryFn: () => fetchDayClosing(branchId, date), enabled: Boolean(branchId) });
}

export function useCloseDay(onDone?: () => void) {
  return useVendorMutation((payload: DayClosingPayload) => closeDay(payload), {
    invalidate: [queryKeys.shiftsRoot, queryKeys.financeRoot],
    onSuccess: () => onDone?.(),
  });
}
