"use client";

import type { CSSProperties } from "react";

import { formatNumber } from "../../lib/format";
import { cn } from "../../lib/utils";

export type FilterTabItem<V extends string> = {
  value: V;
  label: string;
  count?: number;
  /** Optional status tone for the count pill. */
  tone?: string;
};

type FilterTabsProps<V extends string> = {
  items: FilterTabItem<V>[];
  value: V;
  onChange: (value: V) => void;
  className?: string;
  "aria-label"?: string;
};

/** Status tabs / quick-filter chips with live counts. Scrolls horizontally on small screens. */
export function FilterTabs<V extends string>({ items, value, onChange, className, ...rest }: FilterTabsProps<V>) {
  return (
    <div
      role="tablist"
      aria-label={rest["aria-label"] ?? "تصفية"}
      className={cn("scrollbar-none -mx-1 flex items-center gap-1 overflow-x-auto px-1", className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            style={item.tone ? ({ "--tone": item.tone } as CSSProperties) : undefined}
            className={cn(
              "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
              active
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
            {item.count !== undefined ? (
              <span
                className={cn(
                  "num min-w-5 rounded-md px-1.5 py-px text-[11px] leading-4",
                  active ? "bg-background/20 text-background" : item.tone ? "tone-soft" : "bg-muted text-muted-foreground",
                )}
              >
                {formatNumber(item.count)}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
