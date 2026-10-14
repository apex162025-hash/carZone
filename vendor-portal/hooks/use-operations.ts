"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useVendorMutation } from "@/hooks/use-vendor-mutation";
import { CACHE_TTL_LIVE } from "@/lib/cache/ttl";
import { queryKeys } from "@/lib/query-keys";
import {
  bulkConfirm,
  createBlock,
  createOrder,
  deleteBlock,
  fetchAvailability,
  fetchDashboard,
  fetchLive,
  fetchOrder,
  fetchOrders,
  fetchPricePreview,
  fetchRecognition,
  fetchSchedule,
  runOrderAction,
} from "@/lib/services/operations.service";
import type { VendorPeriod } from "@carzen/contracts/vendor/dashboard";
import type { CreateBlockPayload, CreateOrderPayload, OrderActionPayload, VendorOrderListParams } from "@carzen/contracts/vendor/operations";

/** Floor data refreshes on its own so actions taken in other apps/tabs appear without a reload. */
const LIVE_REFRESH_MS = 15_000;

export function useDashboard(branchId: string, period: VendorPeriod) {
  return useQuery({
    queryKey: queryKeys.dashboard(branchId, period),
    queryFn: () => fetchDashboard(branchId, period),
    placeholderData: keepPreviousData,
    staleTime: CACHE_TTL_LIVE * 1000,
    refetchInterval: LIVE_REFRESH_MS * 2,
  });
}

export function useOrders(params: VendorOrderListParams) {
  return useQuery({
    queryKey: queryKeys.orders(params),
    queryFn: () => fetchOrders(params),
    placeholderData: keepPreviousData,
    staleTime: CACHE_TTL_LIVE * 1000,
    refetchInterval: LIVE_REFRESH_MS * 2,
  });
}

export function useOrder(id: string | null) {
  return useQuery({
    queryKey: queryKeys.order(id ?? ""),
    queryFn: () => fetchOrder(id!),
    enabled: Boolean(id),
    refetchInterval: LIVE_REFRESH_MS,
  });
}

export function useLive(branchId: string) {
  return useQuery({
    queryKey: queryKeys.live(branchId),
    queryFn: () => fetchLive(branchId),
    placeholderData: keepPreviousData,
    staleTime: 5_000,
    refetchInterval: LIVE_REFRESH_MS,
  });
}

/** Runs any order action (confirm, start, collect payment…). */
export function useOrderAction(onDone?: () => void) {
  return useVendorMutation(
    ({ id, ...payload }: OrderActionPayload & { id: string }) => runOrderAction(id, payload),
    { invalidate: [queryKeys.scheduleRoot, queryKeys.financeRoot, queryKeys.shiftsRoot, queryKeys.customersRoot], onSuccess: () => onDone?.() },
  );
}

export function useCreateOrder(onDone?: (orderId: string) => void) {
  return useVendorMutation((payload: CreateOrderPayload) => createOrder(payload), {
    invalidate: [queryKeys.scheduleRoot, queryKeys.customersRoot],
    onSuccess: (order) => onDone?.(order.id),
  });
}

export function useBulkConfirm(onDone?: () => void) {
  return useVendorMutation((ids: string[]) => bulkConfirm(ids), { onSuccess: () => onDone?.() });
}

export function usePricePreview(branchId: string, serviceIds: string[]) {
  return useQuery({
    queryKey: queryKeys.pricePreview(branchId, serviceIds),
    queryFn: () => fetchPricePreview(branchId, serviceIds),
    enabled: Boolean(branchId) && serviceIds.length > 0,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useRecognition(plate: string, phone: string) {
  const plateOk = plate.replace(/[\s-]/g, "").length >= 4;
  const phoneOk = phone.replace(/\D/g, "").length >= 10;
  return useQuery({
    queryKey: queryKeys.recognize(plateOk ? plate : "", phoneOk ? phone : ""),
    queryFn: () => fetchRecognition(plateOk ? plate : "", phoneOk ? phone : ""),
    enabled: plateOk || phoneOk,
    staleTime: 60_000,
  });
}

export function useAvailability(branchId: string, date: string, serviceIds: string[], enabled = true) {
  return useQuery({
    queryKey: queryKeys.availability(branchId, date, serviceIds),
    queryFn: () => fetchAvailability(branchId, date, serviceIds),
    enabled: enabled && Boolean(branchId && date) && serviceIds.length > 0,
    staleTime: 10_000,
  });
}

export function useSchedule(branchId: string, date: string) {
  return useQuery({
    queryKey: queryKeys.schedule(branchId, date),
    queryFn: () => fetchSchedule(branchId, date),
    enabled: Boolean(branchId),
    placeholderData: keepPreviousData,
    refetchInterval: LIVE_REFRESH_MS * 2,
  });
}

export function useCreateBlock(onDone?: () => void) {
  return useVendorMutation((payload: CreateBlockPayload) => createBlock(payload), {
    invalidate: [queryKeys.scheduleRoot, queryKeys.branches],
    onSuccess: () => onDone?.(),
  });
}

export function useDeleteBlock() {
  return useVendorMutation((id: string) => deleteBlock(id), { invalidate: [queryKeys.scheduleRoot, queryKeys.branches] });
}
