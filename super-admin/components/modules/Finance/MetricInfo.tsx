"use client";

import { Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type MetricInfoProps = {
  /** Metric name, used for the accessible label. */
  label: string;
  definition: string;
  className?: string;
};

/** AD-36: every financial metric carries a short definition behind an info icon. */
export function MetricInfo({ label, definition, className }: MetricInfoProps) {
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
