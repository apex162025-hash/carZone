"use client";

import { useQuery } from "@tanstack/react-query";

import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { CACHE_TTL_REFERENCE } from "@/lib/cache/ttl";
import { queryKeys } from "@/lib/query-keys";
import {
  createAdmin,
  fetchAdmins,
  fetchRoles,
  toggleAdminStatus,
  updateAdmin,
  updateRoles,
} from "@/lib/services/admins.service";
import type {
  AdminUserPayload,
  ToggleAdminStatusPayload,
  UpdateAdminPayload,
  UpdateRolesPayload,
} from "@/types/admins";

export function useAdmins() {
  return useQuery({
    queryKey: queryKeys.admins,
    queryFn: fetchAdmins,
    staleTime: CACHE_TTL_REFERENCE * 1000,
  });
}

export function useCreateAdmin(onDone?: () => void) {
  return useAdminMutation((payload: AdminUserPayload) => createAdmin(payload), {
    invalidate: [queryKeys.admins],
    onSuccess: () => onDone?.(),
  });
}

export function useUpdateAdmin() {
  return useAdminMutation(({ id, ...payload }: UpdateAdminPayload & { id: string }) => updateAdmin(id, payload), {
    invalidate: [queryKeys.admins],
  });
}

export function useToggleAdminStatus(onDone?: () => void) {
  return useAdminMutation(
    ({ id, ...payload }: ToggleAdminStatusPayload & { id: string }) => toggleAdminStatus(id, payload),
    { invalidate: [queryKeys.admins], onSuccess: () => onDone?.() },
  );
}

export function useRoles() {
  return useQuery({
    queryKey: queryKeys.roles,
    queryFn: fetchRoles,
    staleTime: CACHE_TTL_REFERENCE * 1000,
  });
}

export function useUpdateRoles(onDone?: () => void) {
  return useAdminMutation((payload: UpdateRolesPayload) => updateRoles(payload), {
    invalidate: [queryKeys.roles],
    onSuccess: () => onDone?.(),
  });
}
