"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { AdminUser } from "@/types/auth";

export const AUTH_STORE_KEY = "carzen-super-admin-auth-v1";

export type EstablishSessionInput = {
  admin: AdminUser;
  accessToken: string;
  tokenType?: string;
};

type AuthState = {
  admin: AdminUser | null;
  accessToken: string | null;
  tokenType: string;
  /** True once the persisted session has been read from storage. */
  hasHydrated: boolean;
  establishSession: (session: EstablishSessionInput) => void;
  setAdmin: (admin: AdminUser) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      admin: null,
      accessToken: null,
      tokenType: "Bearer",
      hasHydrated: false,
      establishSession: ({ admin, accessToken, tokenType = "Bearer" }) =>
        set({ admin, accessToken, tokenType }),
      setAdmin: (admin) => set({ admin }),
      clearAuth: () => set({ admin: null, accessToken: null, tokenType: "Bearer" }),
    }),
    {
      name: AUTH_STORE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Rehydrated manually after mount (AuthBootstrap) to avoid SSR mismatches.
      skipHydration: true,
      partialize: (state) => ({
        admin: state.admin,
        accessToken: state.accessToken,
        tokenType: state.tokenType,
      }),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ hasHydrated: true });
      },
    },
  ),
);

export function getAuthAccessToken(): string | null {
  return useAuthStore.getState().accessToken;
}

export function getAuthTokenType(): string {
  return useAuthStore.getState().tokenType || "Bearer";
}
