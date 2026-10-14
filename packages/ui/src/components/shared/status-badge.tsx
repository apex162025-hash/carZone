import type { CSSProperties } from "react";

import type { StatusMeta } from "../../lib/constants/labels";
import { cn } from "../../lib/utils";

type StatusBadgeProps = {
  /** Pass a meta entry from `lib/constants/labels` … */
  meta?: StatusMeta;
  /** …or a free label + tone. */
  label?: string;
  tone?: string;
  /** Pulsing dot for live states (e.g. in service). */
  live?: boolean;
  size?: "sm" | "md";
  className?: string;
};

/**
 * Spec A4: tinted background (~12%) + colored dot + label. The same status has
 * the same color everywhere in the platform.
 */
export function StatusBadge({ meta, label, tone, live, size = "md", className }: StatusBadgeProps) {
  const text = meta?.label ?? label ?? "—";
  const color = meta?.tone ?? tone ?? "var(--muted-foreground)";

  return (
    <span
      style={{ "--tone": color } as CSSProperties}
      className={cn(
        "tone-soft inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        size === "sm" ? "h-5 px-2 text-[11px]" : "h-6 px-2.5 text-xs",
        className,
      )}
    >
      <span className={cn("tone-dot size-1.5 rounded-full", live && "animate-pulse-ring")} aria-hidden />
      {text}
    </span>
  );
}
