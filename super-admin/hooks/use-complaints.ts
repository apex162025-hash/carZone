"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { CACHE_TTL_LIVE } from "@/lib/cache/ttl";
import { queryKeys } from "@/lib/query-keys";
import { fetchComplaint, fetchComplaints, updateComplaint } from "@/lib/services/complaints.service";
import type { ComplaintListParams, UpdateComplaintPayload } from "@/types/complaints";

export function useComplaints(params: ComplaintListParams) {
  return useQuery({
    queryKey: queryKeys.complaints(params),
    queryFn: () => fetchComplaints(params),
    placeholderData: keepPreviousData,
    staleTime: CACHE_TTL_LIVE * 1000,
  });
}

export function useComplaint(id: string) {
  return useQuery({
    queryKey: queryKeys.complaint(id),
    queryFn: () => fetchComplaint(id),
    enabled: Boolean(id),
  });
}

export function useUpdateComplaint(id: string, onDone?: () => void) {
  return useAdminMutation((payload: UpdateComplaintPayload) => updateComplaint(id, payload), {
    invalidate: [queryKeys.complaintsRoot, queryKeys.washesRoot, queryKeys.customersRoot],
    onSuccess: () => onDone?.(),
  });
}
