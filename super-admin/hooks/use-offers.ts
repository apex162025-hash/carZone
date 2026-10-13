"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { queryKeys } from "@/lib/query-keys";
import { createOffer, fetchOffers, setOfferEnabled, updateOffer } from "@/lib/services/offers.service";
import type { OfferListParams, OfferPayload } from "@/types/offers";

export function useOffers(params: OfferListParams) {
  return useQuery({
    queryKey: queryKeys.offers(params),
    queryFn: () => fetchOffers(params),
    placeholderData: keepPreviousData,
  });
}

export function useSaveOffer(onDone?: () => void) {
  return useAdminMutation(
    ({ id, payload }: { id?: string; payload: OfferPayload }) => (id ? updateOffer(id, payload) : createOffer(payload)),
    { invalidate: [queryKeys.offersRoot], onSuccess: () => onDone?.() },
  );
}

export function useToggleOffer() {
  return useAdminMutation(
    ({ id, enabled, reason }: { id: string; enabled: boolean; reason?: string }) => setOfferEnabled(id, enabled, reason),
    { invalidate: [queryKeys.offersRoot] },
  );
}
