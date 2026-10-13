"use client";

import { useMemo, useState } from "react";
import { MapPinned, Search, X } from "lucide-react";

import { ErrorState } from "@/components/shared/states";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranches } from "@/hooks/use-washes";
import { AREAS } from "@/lib/constants/labels";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BranchListItem } from "@/types/washes";

type BranchPickerProps = {
  value: string[];
  onChange: (ids: string[]) => void;
  invalid?: boolean;
  id?: string;
};

type Group = { businessId: string; businessName: string; branches: BranchListItem[] };

/** Searchable multi-select of every branch, grouped by wash, with "select all". */
export function BranchPicker({ value, onChange, invalid, id }: BranchPickerProps) {
  const { data, isLoading, error, refetch, isRefetching } = useBranches({ per_page: 100 });
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(value), [value]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, Group>();
    for (const b of data?.items ?? []) {
      const hay = `${b.name.ar} ${b.name.en} ${b.businessName.ar} ${b.businessName.en} ${AREAS[b.area] ?? ""}`.toLowerCase();
      if (q && !hay.includes(q)) continue;
      const g = map.get(b.businessId) ?? { businessId: b.businessId, businessName: b.businessName.ar, branches: [] };
      g.branches.push(b);
      map.set(b.businessId, g);
    }
    return [...map.values()];
  }, [data, query]);

  const visibleIds = groups.flatMap((g) => g.branches.map((b) => b.id));
  const total = data?.items.length ?? 0;
  const visibleSelected = visibleIds.filter((i) => selected.has(i)).length;

  const setMany = (ids: string[], on: boolean) => {
    const next = new Set(value);
    for (const i of ids) {
      if (on) next.add(i);
      else next.delete(i);
    }
    onChange([...next]);
  };

  if (isLoading) {
    return (
      <div className="space-y-2 rounded-xl border border-border p-3" aria-busy aria-label="جاري تحميل الفروع">
        <Skeleton className="h-8 w-full" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-border">
        <ErrorState message={error.message} onRetry={() => refetch()} isRetrying={isRefetching} className="py-6" />
      </div>
    );
  }

  return (
    <div id={id} className={cn("overflow-hidden rounded-xl border", invalid ? "border-destructive" : "border-border")}>
      <div className="space-y-2 border-b border-border/60 bg-muted/40 p-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم الفرع أو المغسلة أو المنطقة"
            aria-label="ابحث في الفروع"
            className="h-8 w-full rounded-lg border border-input bg-card ps-8 pe-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="مسح البحث"
              className="absolute end-2 top-1/2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-2 px-1">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
            <Checkbox
              checked={visibleIds.length > 0 && visibleSelected === visibleIds.length}
              indeterminate={visibleSelected > 0 && visibleSelected < visibleIds.length}
              disabled={!visibleIds.length}
              onCheckedChange={(on) => setMany(visibleIds, Boolean(on))}
            />
            {query ? "تحديد كل النتائج" : "تحديد كل الفروع"}
          </label>
          <span className="num text-[11px] text-muted-foreground">
            تم اختيار {formatNumber(value.length)} من {formatNumber(total)}
          </span>
        </div>
      </div>

      {groups.length ? (
        <ul className="max-h-72 divide-y divide-border/60 overflow-y-auto" aria-label="الفروع حسب المغسلة">
          {groups.map((g) => {
            const ids = g.branches.map((b) => b.id);
            const count = ids.filter((i) => selected.has(i)).length;
            return (
              <li key={g.businessId}>
                <label className="flex cursor-pointer items-center gap-2 bg-muted/30 px-3 py-2 text-xs font-semibold">
                  <Checkbox
                    checked={count === ids.length}
                    indeterminate={count > 0 && count < ids.length}
                    onCheckedChange={(on) => setMany(ids, Boolean(on))}
                  />
                  <span className="flex-1 truncate">{g.businessName}</span>
                  <span className="num font-normal text-muted-foreground">
                    {count}/{ids.length}
                  </span>
                </label>
                <ul>
                  {g.branches.map((b) => (
                    <li key={b.id}>
                      <label className="flex cursor-pointer items-center gap-2.5 py-2 ps-8 pe-3 text-sm transition-colors hover:bg-muted/40">
                        <Checkbox checked={selected.has(b.id)} onCheckedChange={(on) => setMany([b.id], Boolean(on))} />
                        <span className="min-w-0 flex-1 truncate">{b.name.ar}</span>
                        {!b.active || b.businessStatus !== "active" ? (
                          <span className="shrink-0 rounded bg-muted px-1.5 py-px text-[10px] text-muted-foreground">متوقف</span>
                        ) : null}
                        <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPinned className="size-3" />
                          {AREAS[b.area] ?? b.area}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-4 py-8 text-center text-xs text-muted-foreground">{total ? "لا توجد فروع مطابقة للبحث." : "لا توجد فروع على المنصة بعد."}</p>
      )}
    </div>
  );
}
