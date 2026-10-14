"use client";

import { type QueryKey, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { MutationResult } from "@/lib/api/request";
import { queryKeys } from "@/lib/query-keys";

type Options<TData, TVars> = {
  /** Extra domain roots to invalidate (orders, dashboard, audit and notifications always refresh). */
  invalidate?: QueryKey[];
  onSuccess?: (data: TData, vars: TVars) => void;
  /** Hide the success toast (silent background actions). */
  silent?: boolean;
};

/**
 * Every wash action moves today's numbers, the live board and the audit log,
 * so those are always refreshed. Errors are toasted globally (QueryProvider).
 */
export function useVendorMutation<TVars, TData>(
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
        queryKeys.ordersRoot,
        queryKeys.auditRoot,
        queryKeys.notificationsRoot,
      ];
      for (const queryKey of keys) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}
