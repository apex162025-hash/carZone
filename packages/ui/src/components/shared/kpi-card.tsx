import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Sparkline } from "./sparkline";
import { formatPercent } from "../../lib/format";
import { cn } from "../../lib/utils";

type KpiCardProps = {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  /** % change vs previous period. */
  delta?: number | null;
  /** When a rise is bad (e.g. cancellations), flip the delta coloring. */
  invertDelta?: boolean;
  spark?: number[];
  sparkColor?: string;
  hint?: ReactNode;
  href?: string;
  emphasis?: boolean;
  className?: string;
};

export function KpiCard({
  label,
  value,
  icon,
  delta,
  invertDelta,
  spark,
  sparkColor,
  hint,
  href,
  emphasis,
  className,
}: KpiCardProps) {
  const hasDelta = delta !== null && delta !== undefined;
  const isUp = hasDelta && delta > 0;
  const isFlat = hasDelta && delta === 0;
  const good = invertDelta ? !isUp : isUp;

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {icon ? (
            <span className="flex size-7 items-center justify-center rounded-lg bg-secondary text-secondary-foreground [&_svg]:size-3.5">
              {icon}
            </span>
          ) : null}
          {label}
        </div>
        {hasDelta ? (
          <span
            className={cn(
              "num inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
              isFlat ? "bg-muted text-muted-foreground" : good ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
            )}
            aria-label={`التغير مقارنة بأمس ${formatPercent(delta)}`}
          >
            {isFlat ? <Minus className="size-3" /> : isUp ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {formatPercent(Math.abs(delta))}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className={cn("num font-bold tracking-tight whitespace-nowrap", emphasis ? "text-[26px] leading-8" : "text-2xl")}>{value}</div>
          {hint ? <div className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</div> : null}
        </div>
        {spark && spark.length > 1 ? <Sparkline data={spark} color={sparkColor} width={72} className="shrink-0" /> : null}
      </div>
    </>
  );

  const classes = cn(
    "group relative block rounded-2xl border border-border/80 bg-card p-4 shadow-soft transition-all",
    href && "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-raised focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
    className,
  );

  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
