"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { VendorAccount } from "@carzen/contracts/vendor/auth";

export const AUTH_STORE_KEY = "carzen-vendor-auth-v1";

export type EstablishSessionInput = {
  account: VendorAccount;
  accessToken: string;
  tokenType?: string;
};

type AuthState = {
  account: VendorAccount | null;
  accessToken: string | null;
  tokenType: string;
  /** True once the persisted session has been read from storage. */
  hasHydrated: boolean;
  establishSession: (session: EstablishSessionInput) => void;
  setAccount: (account: VendorAccount) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      account: null,
      accessToken: null,
      tokenType: "Bearer",
      hasHydrated: false,
      establishSession: ({ account, accessToken, tokenType = "Bearer" }) => set({ account, accessToken, tokenType }),
      setAccount: (account) => set({ account }),
      clearAuth: () => set({ account: null, accessToken: null, tokenType: "Bearer" }),
    }),
    {
      name: AUTH_STORE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Rehydrated manually after mount (AuthBootstrap) to avoid SSR mismatches.
      skipHydration: true,
      partialize: (state) => ({
        account: state.account,
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
