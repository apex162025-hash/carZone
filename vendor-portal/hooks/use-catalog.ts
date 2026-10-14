"use client";

import { useQuery } from "@tanstack/react-query";

import { useVendorMutation } from "@/hooks/use-vendor-mutation";
import { CACHE_TTL_REFERENCE } from "@/lib/cache/ttl";
import { queryKeys } from "@/lib/query-keys";
import {
  createOffer,
  createService,
  fetchBranches,
  fetchOffers,
  fetchServices,
  fetchSettings,
  setOfferEnabled,
  updateBookingRules,
  updateBranch,
  updateOffer,
  updateService,
  updateSettings,
} from "@/lib/services/catalog.service";
import type {
  ServicePayload,
  UpdateBookingRulesPayload,
  UpdateBranchPayload,
  UpdateVendorSettingsPayload,
  VendorOfferPayload,
} from "@carzen/contracts/vendor/catalog";

export function useServices(branchId: string) {
  return useQuery({ queryKey: queryKeys.services(branchId), queryFn: () => fetchServices(branchId) });
}

export function useSaveService(onDone?: () => void) {
  return useVendorMutation(
    ({ id, payload }: { id?: string; payload: ServicePayload & { reason?: string } }) => (id ? updateService(id, payload) : createService(payload)),
    { invalidate: [queryKeys.servicesRoot], onSuccess: () => onDone?.() },
  );
}

export function useOffers(branchId: string, status: string) {
  return useQuery({ queryKey: queryKeys.offers(branchId, status), queryFn: () => fetchOffers(branchId, status) });
}

export function useSaveOffer(onDone?: () => void) {
  return useVendorMutation(
    ({ id, payload }: { id?: string; payload: VendorOfferPayload }) => (id ? updateOffer(id, payload) : createOffer(payload)),
    { invalidate: [queryKeys.offersRoot], onSuccess: () => onDone?.() },
  );
}

export function useToggleOffer() {
  return useVendorMutation(({ id, enabled }: { id: string; enabled: boolean }) => setOfferEnabled(id, enabled), {
    invalidate: [queryKeys.offersRoot],
  });
}

export function useBranches() {
  return useQuery({ queryKey: queryKeys.branches, queryFn: fetchBranches, staleTime: 60_000 });
}

export function useUpdateBranch(onDone?: () => void) {
  return useVendorMutation(({ id, ...payload }: UpdateBranchPayload & { id: string }) => updateBranch(id, payload), {
    invalidate: [queryKeys.branches, queryKeys.me, queryKeys.scheduleRoot],
    onSuccess: () => onDone?.(),
  });
}

export function useUpdateBookingRules(onDone?: () => void) {
  return useVendorMutation(({ id, ...payload }: UpdateBookingRulesPayload & { id: string }) => updateBookingRules(id, payload), {
    invalidate: [queryKeys.branches, queryKeys.scheduleRoot],
    onSuccess: () => onDone?.(),
  });
}

export function useSettings() {
  return useQuery({ queryKey: queryKeys.settings, queryFn: fetchSettings, staleTime: CACHE_TTL_REFERENCE * 1000 });
}

export function useUpdateSettings(onDone?: () => void) {
  return useVendorMutation((payload: UpdateVendorSettingsPayload) => updateSettings(payload), {
    invalidate: [queryKeys.settings, queryKeys.me, queryKeys.servicesRoot],
    onSuccess: () => onDone?.(),
  });
}
