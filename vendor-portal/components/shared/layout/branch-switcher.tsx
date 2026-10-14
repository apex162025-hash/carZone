"use client";

import { Lock, MapPin } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@carzen/ui/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@carzen/ui/components/ui/tooltip";
import { useBranchScope } from "@/hooks/use-branch-scope";

/**
 * Global branch scope (spec B2 top bar). Owners pick "all" or a branch;
 * managers see their branch with a lock — they can't switch (MG-01).
 */
export function BranchSwitcher() {
  const { branches, branchId, isLocked, setBranchId } = useBranchScope();

  if (isLocked) {
    const branch = branches.find((b) => b.id === branchId);
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="flex h-9 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm font-medium" />
          }
        >
          <MapPin className="size-4 text-muted-foreground" />
          <span className="max-w-40 truncate">{branch?.name.ar ?? "فرعي"}</span>
          <Lock className="size-3.5 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent>مدير الفرع يرى فرعه فقط</TooltipContent>
      </Tooltip>
    );
  }

  const items = { all: "كل الفروع", ...Object.fromEntries(branches.map((b) => [b.id, b.name.ar])) };
  return (
    <Select value={branchId} onValueChange={(v) => setBranchId(String(v ?? "all"))} items={items}>
      <SelectTrigger aria-label="الفرع" className="h-9 max-w-56 min-w-40 bg-card data-[size=default]:h-9">
        <MapPin className="size-4 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">كل الفروع</SelectItem>
        {branches.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name.ar}
            {!b.active ? <span className="text-xs text-muted-foreground"> (متوقف)</span> : null}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
