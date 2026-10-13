"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type UIState = {
  /** Desktop sidebar collapsed to icons (per-viewer preference, persisted). */
  sidebarCollapsed: boolean;
  /** Mobile navigation sheet. */
  mobileNavOpen: boolean;
  /** Global ⌘K command palette. */
  commandOpen: boolean;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      commandOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
    }),
    {
      name: "carzen-super-admin-ui-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);
