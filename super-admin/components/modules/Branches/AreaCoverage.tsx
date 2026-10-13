"use client";

import { useMemo } from "react";
import { MapPinned } from "lucide-react";

import { branchesLabel } from "@/components/modules/Branches/branch-status";
import { SectionCard } from "@/components/shared/section-card";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AREAS } from "@/lib/constants/labels";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BranchListItem } from "@/types/washes";

type AreaStat = { area: string; branches: number; active: number; capacity: number; activeCapacity: number };

type AreaCoverageProps = {
  branches: BranchListItem[] | undefined;
  /** Total reported by the API — if larger than what was loaded, the summary is partial. */
  total: number | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  selectedArea: string;
  onSelectArea: (area: string) => void;
};

/** Supply view per area (branches + capacity) to spot coverage gaps; tiles double as the area filter. */
export function AreaCoverage({ branches, total, isLoading, error, onRetry, selectedArea, onSelectArea }: AreaCoverageProps) {
  const stats = useMemo<AreaStat[]>(() => {
    const map = new Map<string, AreaStat>(
      Object.keys(AREAS).map((area) => [area, { area, branches: 0, active: 0, capacity: 0, activeCapacity: 0 }]),
    );
    for (const b of branches ?? []) {
      const s = map.get(b.area) ?? { area: b.area, branches: 0, active: 0, capacity: 0, activeCapacity: 0 };
      s.branches += 1;
      s.capacity += b.capacity;
      if (b.active) {
        s.active += 1;
        s.activeCapacity += b.capacity;
      }
      map.set(b.area, s);
    }
    return [...map.values()].sort((a, b) => b.activeCapacity - a.activeCapacity || b.branches - a.branches);
  }, [branches]);

  const maxCapacity = Math.max(1, ...stats.map((s) => s.capacity));
  const gaps = stats.filter((s) => s.active === 0).length;
  const partial = branches && total !== undefined && total > branches.length;

  return (
    <SectionCard
      title="التغطية حسب المنطقة"
      description={
        partial ? (
          <span className="num">ملخص لأول {branches.length} فرع من {total}</span>
        ) : gaps ? (
          <span>
            <span className="num">{gaps}</span> مناطق بدون فرع نشط — فرص توسع
          </span>
        ) : (
          "عدد الفروع والسعة النشطة في كل منطقة — اضغط على منطقة لتصفية الجدول"
        )
      }
      icon={<MapPinned />}
      action={
        selectedArea !== "all" ? (
          <Button variant="ghost" size="sm" onClick={() => onSelectArea("all")}>
            إلغاء تصفية المنطقة
          </Button>
        ) : null
      }
    >
      {error && !branches ? (
        <ErrorState message={error.message} onRetry={onRetry} className="py-6" />
      ) : isLoading && !branches ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-[76px] rounded-xl" />
          ))}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((s) => {
            const selected = selectedArea === s.area;
            const empty = s.active === 0;
            return (
              <li key={s.area}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelectArea(selected ? "all" : s.area)}
                  className={cn(
                    "flex w-full cursor-pointer flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-start transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                    selected
                      ? "border-primary bg-secondary"
                      : empty
                        ? "border-dashed border-border bg-transparent hover:bg-muted/50"
                        : "border-border/80 bg-muted/30 hover:bg-muted/60",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className={cn("truncate text-xs font-semibold", empty && !selected && "text-muted-foreground")}>
                      {AREAS[s.area] ?? s.area}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{branchesLabel(s.branches)}</span>
                  </span>
                  <span className="flex items-baseline gap-1">
                    <span className="num text-base leading-5 font-bold">{formatNumber(s.activeCapacity)}</span>
                    <span className="text-[11px] text-muted-foreground">مكان نشط</span>
                    {s.branches > s.active ? (
                      <span className="num ms-auto text-[11px] text-muted-foreground">{s.branches - s.active} متوقف</span>
                    ) : null}
                  </span>
                  <span className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span
                      className="block h-full rounded-full bg-primary transition-[width] duration-500 ease-fluid"
                      style={{ width: `${(s.activeCapacity / maxCapacity) * 100}%` }}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
