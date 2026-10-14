"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useVendorMutation } from "@/hooks/use-vendor-mutation";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchAudit,
  fetchCustomer,
  fetchCustomers,
  fetchFinance,
  fetchNotifications,
  fetchReport,
  fetchReviews,
  globalSearch,
  markAllNotificationsRead,
  markNotificationRead,
  replyToReview,
  reportReview,
} from "@/lib/services/insights.service";
import type { VendorPeriod } from "@carzen/contracts/vendor/dashboard";
import type {
  VendorAuditParams,
  VendorCustomerListParams,
  VendorReportParams,
  VendorReviewListParams,
} from "@carzen/contracts/vendor/insights";

export function useCustomers(params: VendorCustomerListParams) {
  return useQuery({ queryKey: queryKeys.customers(params), queryFn: () => fetchCustomers(params), placeholderData: keepPreviousData });
}

export function useCustomer(id: string) {
  return useQuery({ queryKey: queryKeys.customer(id), queryFn: () => fetchCustomer(id), enabled: Boolean(id) });
}

export function useReviews(params: VendorReviewListParams) {
  return useQuery({ queryKey: queryKeys.reviews(params), queryFn: () => fetchReviews(params), placeholderData: keepPreviousData });
}

export function useReplyReview(onDone?: () => void) {
  return useVendorMutation(({ id, text }: { id: string; text: string }) => replyToReview(id, text), {
    invalidate: [queryKeys.reviewsRoot],
    onSuccess: () => onDone?.(),
  });
}

export function useReportReview(onDone?: () => void) {
  return useVendorMutation(({ id, reason }: { id: string; reason: string }) => reportReview(id, reason), {
    invalidate: [queryKeys.reviewsRoot],
    onSuccess: () => onDone?.(),
  });
}

export function useReport(params: VendorReportParams) {
  return useQuery({ queryKey: queryKeys.reports(params), queryFn: () => fetchReport(params), placeholderData: keepPreviousData });
}

export function useFinance(branchId: string, period: VendorPeriod) {
  return useQuery({ queryKey: queryKeys.finance(branchId, period), queryFn: () => fetchFinance(branchId, period), placeholderData: keepPreviousData });
}

export function useAudit(params: VendorAuditParams) {
  return useQuery({ queryKey: queryKeys.audit(params), queryFn: () => fetchAudit(params), placeholderData: keepPreviousData });
}

export function useNotifications(filter = "all", page = 1) {
  return useQuery({
    queryKey: queryKeys.notifications(filter, { page }),
    queryFn: () => fetchNotifications(filter, page),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  return useVendorMutation((id: string) => markNotificationRead(id), { silent: true });
}

export function useMarkAllNotificationsRead() {
  return useVendorMutation(() => markAllNotificationsRead());
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
