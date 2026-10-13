import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

import { MetricInfo } from "@/components/modules/Finance/MetricInfo";
import { cn } from "@/lib/utils";

type FinanceMetricCardProps = {
  label: string;
  /** Short definition shown in the info tooltip (AD-36). */
  definition: string;
  value: ReactNode;
  icon: ReactNode;
  hint?: ReactNode;
  href?: string;
  /** Accent color for the icon chip. */
  tone?: string;
  emphasis?: boolean;
  /** Warning highlight (e.g. open discrepancies). */
  highlight?: boolean;
  className?: string;
};

/**
 * KPI card with a definition tooltip. When linked, the label is a stretched
 * link so the whole card is clickable while the info button stays reachable
 * (no interactive element nested inside an anchor).
 */
export function FinanceMetricCard({
  label,
  definition,
  value,
  icon,
  hint,
  href,
  tone = "var(--primary)",
  emphasis,
  highlight,
  className,
}: FinanceMetricCardProps) {
  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-border/80 bg-card p-4 shadow-soft transition-all",
        href && "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-raised has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/30",
        highlight && "border-warning/50 bg-warning/5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
          <span
            style={{ "--tone": tone } as CSSProperties}
            className="tone-soft flex size-7 shrink-0 items-center justify-center rounded-lg [&_svg]:size-3.5"
          >
            {icon}
          </span>
          {href ? (
            <Link href={href} className="truncate after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
              {label}
            </Link>
          ) : (
            <span className="truncate">{label}</span>
          )}
        </div>
        <MetricInfo label={label} definition={definition} className="relative z-[1] -me-1 -mt-0.5" />
      </div>
      <div className={cn("num mt-3 font-bold tracking-tight whitespace-nowrap", emphasis ? "text-[26px] leading-8" : "text-xl")}>{value}</div>
      <div className="mt-1 flex min-h-4 items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="truncate">{hint}</span>
        {href ? <ChevronLeft className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden /> : null}
      </div>
    </div>
  );
}
