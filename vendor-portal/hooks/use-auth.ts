"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { fetchMe, login, logout } from "@/lib/services/auth.service";
import { useAuthStore } from "@/lib/store/auth-store";
import type { VendorLoginPayload } from "@carzen/contracts/vendor/auth";

/** `isReady` = persisted session read; `isAuthenticated` = token + account present. */
export function useAuthReady() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const account = useAuthStore((s) => s.account);
  return {
    isReady: hasHydrated,
    isAuthenticated: hasHydrated && Boolean(accessToken) && account !== null,
    account,
  };
}

export function useLogin() {
  const establishSession = useAuthStore((s) => s.establishSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: VendorLoginPayload) => login(payload),
    meta: { skipErrorToast: true },
    onSuccess: ({ data }) => {
      queryClient.clear();
      establishSession({ account: data.account, accessToken: data.access_token, tokenType: data.token_type });
    },
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => logout(),
    meta: { skipErrorToast: true },
    onSettled: () => {
      clearAuth();
      queryClient.clear();
    },
  });
}

/**
 * Re-validates the session and refreshes the account (business status can be
 * changed by Carzen admins at any time — e.g. a suspension).
 */
export function useMe(enabled: boolean) {
  const setAccount = useAuthStore((s) => s.setAccount);
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      const account = await fetchMe();
      setAccount(account);
      return account;
    },
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
  });
}
