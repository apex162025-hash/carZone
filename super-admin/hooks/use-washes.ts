"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchBranches,
  fetchStaff,
  fetchSuspensionImpact,
  fetchWash,
  fetchWashes,
  reactivateWash,
  suspendWash,
  toggleBranch,
  toggleStaff,
  updateWash,
} from "@/lib/services/washes.service";
import type {
  BranchListParams,
  ReactivateWashPayload,
  StaffListParams,
  SuspendWashPayload,
  ToggleBranchPayload,
  ToggleStaffPayload,
  UpdateWashPayload,
  WashListParams,
} from "@/types/washes";

export function useWashes(params: WashListParams) {
  return useQuery({
    queryKey: queryKeys.washes(params),
    queryFn: () => fetchWashes(params),
    placeholderData: keepPreviousData,
  });
}

export function useWash(id: string) {
  return useQuery({
    queryKey: queryKeys.wash(id),
    queryFn: () => fetchWash(id),
    enabled: Boolean(id),
  });
}

export function useSuspensionImpact(id: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.washImpact(id),
    queryFn: () => fetchSuspensionImpact(id),
    enabled: enabled && Boolean(id),
    staleTime: 0,
  });
}

const WASH_KEYS = [queryKeys.washesRoot, queryKeys.branchesRoot, queryKeys.ordersRoot, queryKeys.staffRoot];

export function useSuspendWash(id: string) {
  return useAdminMutation((payload: SuspendWashPayload) => suspendWash(id, payload), { invalidate: WASH_KEYS });
}

export function useReactivateWash(id: string) {
  return useAdminMutation((payload: ReactivateWashPayload) => reactivateWash(id, payload), { invalidate: WASH_KEYS });
}

export function useUpdateWash(id: string) {
  return useAdminMutation((payload: UpdateWashPayload) => updateWash(id, payload), {
    invalidate: [queryKeys.washesRoot, queryKeys.financeRoot],
  });
}

export function useBranches(params: BranchListParams) {
  return useQuery({
    queryKey: queryKeys.branches(params),
    queryFn: () => fetchBranches(params),
    placeholderData: keepPreviousData,
  });
}

export function useToggleBranch() {
  return useAdminMutation(
    ({ id, ...payload }: ToggleBranchPayload & { id: string }) => toggleBranch(id, payload),
    { invalidate: [queryKeys.branchesRoot, queryKeys.washesRoot] },
  );
}

export function useStaff(params: StaffListParams) {
  return useQuery({
    queryKey: queryKeys.staff(params),
    queryFn: () => fetchStaff(params),
    placeholderData: keepPreviousData,
  });
}

export function useToggleStaff() {
  return useAdminMutation(
    ({ id, ...payload }: ToggleStaffPayload & { id: string }) => toggleStaff(id, payload),
    { invalidate: [queryKeys.staffRoot, queryKeys.washesRoot] },
  );
}
