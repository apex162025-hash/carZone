"use client";

import { useAuthStore } from "@/lib/store/auth-store";
import { useUIStore } from "@/lib/store/ui-store";

/**
 * The branch every screen reads. Owners switch freely between "all" and any
 * branch; managers are always locked to their own branch (spec MG-01) — the
 * API enforces the same rule, this keeps the UI honest about it.
 */
export function useBranchScope() {
  const account = useAuthStore((s) => s.account);
  const selected = useUIStore((s) => s.selectedBranchId);
  const setSelected = useUIStore((s) => s.setSelectedBranchId);

  const branches = account?.branches ?? [];
  const isLocked = account?.role !== "owner";
  const validSelection = selected === "all" || branches.some((b) => b.id === selected);
  const branchId = isLocked ? account?.homeBranchId ?? "all" : validSelection ? selected : "all";
  /** A concrete branch for screens that need one (schedule, day closing). */
  const singleBranchId = branchId === "all" ? account?.homeBranchId ?? branches[0]?.id ?? "" : branchId;

  return {
    account,
    branches,
    branchId,
    singleBranchId,
    isLocked,
    isAll: branchId === "all",
    setBranchId: (id: string) => {
      if (!isLocked) setSelected(id);
    },
    branchName: (id: string) => branches.find((b) => b.id === id)?.name.ar ?? "كل الفروع",
  };
}
