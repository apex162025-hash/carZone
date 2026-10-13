"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { CACHE_TTL_LIVE } from "@/lib/cache/ttl";
import { queryKeys } from "@/lib/query-keys";
import { cancelOrder, fetchOrder, fetchOrders, flagOrderForFinance } from "@/lib/services/orders.service";
import type { ReasonPayload } from "@/types/common";
import type { OrderListParams } from "@/types/orders";

export function useOrders(params: OrderListParams) {
  return useQuery({
    queryKey: queryKeys.orders(params),
    queryFn: () => fetchOrders(params),
    placeholderData: keepPreviousData,
    staleTime: CACHE_TTL_LIVE * 1000,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.order(id),
    queryFn: () => fetchOrder(id),
    enabled: Boolean(id),
  });
}

const KEYS = [queryKeys.ordersRoot, queryKeys.washesRoot, queryKeys.customersRoot, queryKeys.financeRoot];

export function useCancelOrder(id: string) {
  return useAdminMutation((payload: ReasonPayload) => cancelOrder(id, payload), { invalidate: KEYS });
}

export function useFlagOrder(id: string) {
  return useAdminMutation((payload: ReasonPayload) => flagOrderForFinance(id, payload), { invalidate: KEYS });
}
