"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { CACHE_TTL_REFERENCE } from "@/lib/cache/ttl";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchCommission,
  fetchFinanceOverview,
  fetchPayouts,
  fetchTransaction,
  fetchTransactions,
  markPayoutPaid,
  resolveDiscrepancy,
  updateCommission,
} from "@/lib/services/finance.service";
import type { ListParams } from "@/types/common";
import type {
  FinancePeriod,
  MarkPayoutPaidPayload,
  TransactionListParams,
  UpdateCommissionPayload,
} from "@/types/finance";

export function useFinanceOverview(period: FinancePeriod) {
  return useQuery({
    queryKey: queryKeys.financeOverview(period),
    queryFn: () => fetchFinanceOverview(period),
    placeholderData: keepPreviousData,
  });
}

export function useTransactions(params: TransactionListParams) {
  return useQuery({
    queryKey: queryKeys.transactions(params),
    queryFn: () => fetchTransactions(params),
    placeholderData: keepPreviousData,
  });
}

export function useTransaction(id: string | null) {
  return useQuery({
    queryKey: queryKeys.transaction(id ?? ""),
    queryFn: () => fetchTransaction(id!),
    enabled: Boolean(id),
  });
}

export function useResolveDiscrepancy(id: string, onDone?: () => void) {
  return useAdminMutation((note: string) => resolveDiscrepancy(id, note), {
    invalidate: [queryKeys.financeRoot],
    onSuccess: () => onDone?.(),
  });
}

export function useCommission() {
  return useQuery({
    queryKey: queryKeys.commission,
    queryFn: fetchCommission,
    staleTime: CACHE_TTL_REFERENCE * 1000,
  });
}

export function useUpdateCommission(onDone?: () => void) {
  return useAdminMutation((payload: UpdateCommissionPayload) => updateCommission(payload), {
    invalidate: [queryKeys.financeRoot, queryKeys.washesRoot],
    onSuccess: () => onDone?.(),
  });
}

export function usePayouts(params: ListParams & { status?: string }) {
  return useQuery({
    queryKey: queryKeys.payouts(params),
    queryFn: () => fetchPayouts(params),
    placeholderData: keepPreviousData,
  });
}

export function useMarkPayoutPaid(onDone?: () => void) {
  return useAdminMutation(
    ({ id, ...payload }: MarkPayoutPaidPayload & { id: string }) => markPayoutPaid(id, payload),
    { invalidate: [queryKeys.financeRoot, queryKeys.washesRoot], onSuccess: () => onDone?.() },
  );
}
