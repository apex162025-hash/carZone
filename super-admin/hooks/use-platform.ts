"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { CACHE_TTL_REFERENCE } from "@/lib/cache/ttl";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchAuditLogs,
  fetchNotifications,
  fetchSettings,
  globalSearch,
  markAllNotificationsRead,
  markNotificationRead,
  resetDemoData,
  updateSettings,
} from "@/lib/services/platform.service";
import type { AuditListParams } from "@/types/audit";
import type { UpdateSettingsPayload } from "@/types/settings";

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: fetchSettings,
    staleTime: CACHE_TTL_REFERENCE * 1000,
  });
}

export function useUpdateSettings(onDone?: () => void) {
  return useAdminMutation((payload: UpdateSettingsPayload) => updateSettings(payload), {
    invalidate: [queryKeys.settings],
    onSuccess: () => onDone?.(),
  });
}

export function useAuditLogs(params: AuditListParams) {
  return useQuery({
    queryKey: queryKeys.audit(params),
    queryFn: () => fetchAuditLogs(params),
    placeholderData: keepPreviousData,
  });
}

export function useNotifications(filter = "all") {
  return useQuery({
    queryKey: queryKeys.notifications(filter),
    queryFn: () => fetchNotifications(filter),
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  return useAdminMutation((id: string) => markNotificationRead(id), { silent: true });
}

export function useMarkAllNotificationsRead() {
  return useAdminMutation(() => markAllNotificationsRead());
}

export function useGlobalSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: queryKeys.search(term),
    queryFn: () => globalSearch(term),
    enabled: term.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useResetDemoData() {
  const queryClient = useQueryClient();
  return useAdminMutation(() => resetDemoData(), {
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });
}
