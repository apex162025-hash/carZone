"use client";

import { type QueryKey, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { MutationResult } from "@/lib/api/request";
import { queryKeys } from "@/lib/query-keys";

type Options<TData, TVars> = {
  /** Domain roots to invalidate on success (dashboard, audit and notifications are always refreshed). */
  invalidate?: QueryKey[];
  onSuccess?: (data: TData, vars: TVars) => void;
  /** Hide the success toast (e.g. silent background actions). */
  silent?: boolean;
};

/**
 * Every admin mutation changes platform KPIs and writes an audit entry, so the
 * dashboard, audit log and notifications are refreshed after any success.
 * Errors are toasted globally by the QueryProvider MutationCache.
 */
export function useAdminMutation<TVars, TData>(
  mutationFn: (vars: TVars) => Promise<MutationResult<TData>>,
  { invalidate = [], onSuccess, silent }: Options<TData, TVars> = {},
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (result, vars) => {
      if (!silent && result.message) toast.success(result.message);
      onSuccess?.(result.data, vars);
    },
    onSettled: () => {
      const keys: QueryKey[] = [
        ...invalidate,
        queryKeys.dashboardRoot,
        queryKeys.auditRoot,
        queryKeys.notificationsRoot,
      ];
      for (const queryKey of keys) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}
