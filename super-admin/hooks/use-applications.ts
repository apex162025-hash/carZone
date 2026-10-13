"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { queryKeys } from "@/lib/query-keys";
import {
  approveApplication,
  fetchApplication,
  fetchApplications,
  rejectApplication,
  requestApplicationChanges,
} from "@/lib/services/applications.service";
import type {
  ApplicationListParams,
  ApproveApplicationPayload,
  RejectApplicationPayload,
  RequestChangesPayload,
} from "@/types/applications";

export function useApplications(params: ApplicationListParams) {
  return useQuery({
    queryKey: queryKeys.applications(params),
    queryFn: () => fetchApplications(params),
    placeholderData: keepPreviousData,
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: queryKeys.application(id),
    queryFn: () => fetchApplication(id),
    enabled: Boolean(id),
  });
}

const KEYS = [queryKeys.applicationsRoot, queryKeys.washesRoot, queryKeys.branchesRoot];

export function useApproveApplication(id: string, onDone?: (businessId: string) => void) {
  return useAdminMutation((payload: ApproveApplicationPayload) => approveApplication(id, payload), {
    invalidate: KEYS,
    onSuccess: (data) => onDone?.(data.businessId),
  });
}

export function useRejectApplication(id: string) {
  return useAdminMutation((payload: RejectApplicationPayload) => rejectApplication(id, payload), { invalidate: KEYS });
}

export function useRequestApplicationChanges(id: string) {
  return useAdminMutation((payload: RequestChangesPayload) => requestApplicationChanges(id, payload), { invalidate: KEYS });
}
