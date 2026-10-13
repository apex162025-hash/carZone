"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

import { AUTH_STORE_KEY, useAuthStore } from "@/lib/store/auth-store";
import { useUIStore } from "@/lib/store/ui-store";

type AuthBootstrapProps = {
  children: ReactNode;
};

/**
 * Rehydrates persisted Zustand stores after mount (stores use `skipHydration`
 * so server and first client render match), and keeps tabs in sync: signing
 * out in one tab signs out everywhere.
 */
export function AuthBootstrap({ children }: AuthBootstrapProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    void useAuthStore.persist.rehydrate();
    void useUIStore.persist.rehydrate();

    const onStorage = (event: StorageEvent) => {
      if (event.key !== AUTH_STORE_KEY) return;
      void useAuthStore.persist.rehydrate();
      if (!event.newValue) queryClient.clear();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [queryClient]);

  return children;
}
