"use client";

import { Info } from "lucide-react";

import { StatusBadge } from "@carzen/ui/components/shared/status-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@carzen/ui/components/ui/tooltip";
import { CUSTOMER_SEGMENT } from "@carzen/ui/lib/constants/labels";
import { cn } from "@carzen/ui/lib/utils";
import type { CustomerSegment } from "@carzen/contracts/vendor/insights";

/** Egyptian-style plate chip: framed, always LTR, same look as the orders screens. */
export function PlateChip({ plate, size = "md", className }: { plate: string; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      dir="ltr"
      className={cn(
        "num inline-flex w-fit shrink-0 items-center rounded-md border border-border bg-muted/40 font-bold tracking-wider",
        size === "sm" ? "px-1.5 py-px text-[11px]" : "px-2 py-0.5 text-xs",
        className,
      )}
    >
      {plate}
    </span>
  );
}

/** Segment badge with its definition on hover/focus (New / Returning / Lost — OW-19). */
export function SegmentBadge({ segment, size = "sm" }: { segment: CustomerSegment; size?: "sm" | "md" }) {
  const meta = CUSTOMER_SEGMENT[segment];
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span tabIndex={0} className="inline-flex rounded-full focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none" />}
        aria-label={`${meta.label}: ${meta.description}`}
      >
        <StatusBadge meta={meta} size={size} />
      </TooltipTrigger>
      <TooltipContent>{meta.description}</TooltipContent>
    </Tooltip>
  );
}

/** Small legend explaining how segments are computed. */
export function SegmentLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground", className)}>
      <span className="flex items-center gap-1 font-medium">
        <Info className="size-3.5" /> التصنيف:
      </span>
      {(Object.keys(CUSTOMER_SEGMENT) as CustomerSegment[]).map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <StatusBadge meta={CUSTOMER_SEGMENT[s]} size="sm" />
          {CUSTOMER_SEGMENT[s].description}
        </span>
      ))}
    </div>
  );
}
