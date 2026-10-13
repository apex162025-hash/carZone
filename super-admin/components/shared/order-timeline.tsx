import type { CSSProperties } from "react";
import { Check } from "lucide-react";

import { ORDER_STATUS } from "@/lib/constants/labels";
import { formatDuration, formatTime, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TimelineEntry } from "@/types/orders";

const ACTOR: Record<TimelineEntry["byType"], string> = {
  customer: "العميل",
  staff: "طاقم المغسلة",
  admin: "إدارة المنصة",
  system: "النظام",
};

type OrderTimelineProps = {
  timeline: TimelineEntry[];
  className?: string;
};

/**
 * Operational timeline (AD-26): each step with time, actor and the duration
 * since the previous step.
 */
export function OrderTimeline({ timeline, className }: OrderTimelineProps) {
  return (
    <ol className={cn("relative space-y-0", className)}>
      {timeline.map((step, i) => {
        const meta = ORDER_STATUS[step.status];
        const prev = timeline[i - 1];
        const gap = prev ? (new Date(step.at).getTime() - new Date(prev.at).getTime()) / 60000 : null;
        const last = i === timeline.length - 1;
        return (
          <li key={`${step.status}-${step.at}`} className="relative flex gap-3 pb-5 last:pb-0">
            {!last ? <span className="absolute start-[13px] top-7 bottom-0 w-px bg-border" aria-hidden /> : null}
            <span
              style={{ "--tone": meta.tone } as CSSProperties}
              className="tone-soft tone-ring relative z-[1] flex size-7 shrink-0 items-center justify-center rounded-full"
            >
              <Check className="size-3.5" strokeWidth={3} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                <p className="text-sm font-medium">{meta.label}</p>
                <p className="num text-xs text-muted-foreground">
                  {formatDate(step.at)} · {formatTime(step.at)}
                </p>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                بواسطة {ACTOR[step.byType]}
                {gap !== null && gap > 0 ? (
                  <span className="num ms-2 rounded bg-muted px-1.5 py-px text-[11px]">+{formatDuration(gap)}</span>
                ) : null}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
