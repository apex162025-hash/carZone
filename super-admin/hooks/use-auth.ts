"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { fetchMe, login, logout } from "@/lib/services/auth.service";
import { useAuthStore } from "@/lib/store/auth-store";
import type { LoginPayload } from "@/types/auth";

/** `isReady` = persisted session read; `isAuthenticated` = token + admin present. */
export function useAuthReady() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const admin = useAuthStore((s) => s.admin);
  return {
    isReady: hasHydrated,
    isAuthenticated: hasHydrated && Boolean(accessToken) && admin !== null,
    admin,
  };
}

export function useLogin() {
  const establishSession = useAuthStore((s) => s.establishSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    meta: { skipErrorToast: true },
    onSuccess: ({ data }) => {
      queryClient.clear();
      establishSession({ admin: data.admin, accessToken: data.access_token, tokenType: data.token_type });
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

/** Re-validates the persisted session against the API (401 clears it via the axios interceptor). */
export function useMe(enabled: boolean) {
  const setAdmin = useAuthStore((s) => s.setAdmin);
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      const admin = await fetchMe();
      setAdmin(admin);
      return admin;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
