import type { CSSProperties, ReactNode } from "react";

import { cn } from "../../lib/utils";

type StatTileProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  /** Accent color for the icon chip. */
  tone?: string;
  className?: string;
};

/** Small stat used on detail pages (no sparkline / delta). */
export function StatTile({ label, value, hint, icon, tone = "var(--primary)", className }: StatTileProps) {
  return (
    <div className={cn("rounded-2xl border border-border/80 bg-card p-4 shadow-soft", className)}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon ? (
          <span
            style={{ "--tone": tone } as CSSProperties}
            className="tone-soft flex size-7 items-center justify-center rounded-lg [&_svg]:size-3.5"
          >
            {icon}
          </span>
        ) : null}
        {label}
      </div>
      <div className="num mt-2.5 text-xl font-bold tracking-tight">{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
