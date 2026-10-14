"use client";

import type { CSSProperties, ReactNode } from "react";
import { Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@carzen/ui/components/ui/tooltip";
import { cn } from "@carzen/ui/lib/utils";

/** Info icon with the metric's short definition (keyboard focusable). */
export function MetricInfo({ label, definition, className }: { label: string; definition: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={`تعريف: ${label}`}
        className={cn(
          "flex size-6 shrink-0 cursor-help items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
          className,
        )}
      >
        <Info className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-64 leading-relaxed text-pretty">{definition}</TooltipContent>
    </Tooltip>
  );
}

type FinanceMetricCardProps = {
  label: string;
  /** Short definition behind the info icon. */
  definition: string;
  value: ReactNode;
  icon: ReactNode;
  hint?: ReactNode;
  /** Accent color for the icon chip. */
  tone?: string;
  emphasis?: boolean;
  className?: string;
};

/** Financial KPI: value + hint line + a definition tooltip (spec OW-14). */
export function FinanceMetricCard({ label, definition, value, icon, hint, tone = "var(--primary)", emphasis, className }: FinanceMetricCardProps) {
  return (
    <div className={cn("rounded-2xl border border-border/80 bg-card p-4 shadow-soft", emphasis && "border-primary/25 bg-primary/[0.03]", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
          <span style={{ "--tone": tone } as CSSProperties} className="tone-soft flex size-7 shrink-0 items-center justify-center rounded-lg [&_svg]:size-3.5">
            {icon}
          </span>
          <span className="truncate">{label}</span>
        </div>
        <MetricInfo label={label} definition={definition} className="-me-1 -mt-0.5" />
      </div>
      <div className={cn("num mt-3 font-bold tracking-tight whitespace-nowrap", emphasis ? "text-[26px] leading-8" : "text-xl")}>{value}</div>
      {hint ? <div className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
