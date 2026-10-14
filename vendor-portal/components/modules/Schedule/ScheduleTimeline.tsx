"use client";

import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";
import { Ban, LockOpen } from "lucide-react";

import { Button } from "@carzen/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@carzen/ui/components/ui/tooltip";
import { ORDER_STATUS } from "@carzen/ui/lib/constants/labels";
import { formatTime } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import type { BlockedSlot } from "@carzen/contracts/washes";
import type { ScheduleDay, ScheduleSlot } from "@carzen/contracts/vendor/operations";

/** Diagonal stripes for blocked periods (works in both themes). */
export const HATCH_STYLE: CSSProperties = {
  backgroundImage: "repeating-linear-gradient(135deg, color-mix(in oklab, var(--muted-foreground) 16%, transparent) 0 5px, transparent 5px 11px)",
};

const MAX_CHIPS = 5;

function CapacityBar({ slot }: { slot: ScheduleSlot }) {
  const full = slot.occupied >= slot.capacity;
  const over = slot.occupied > slot.capacity;
  const free = Math.max(0, slot.capacity - slot.occupied);
  return (
    <div className="min-w-0">
      <div className="flex gap-0.5" aria-hidden>
        {Array.from({ length: slot.capacity }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 min-w-0 flex-1 rounded-[3px]",
              slot.blocked ? "bg-muted-foreground/25" : i < slot.occupied ? (over ? "bg-destructive" : full ? "bg-warning" : "bg-aqua") : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className={cn("num mt-1 text-[11px]", over ? "font-semibold text-destructive" : "text-muted-foreground")}>
        {slot.occupied}/{slot.capacity}
        <span className="ms-1">{slot.blocked ? "· محجوب" : over ? "· فوق السعة" : full ? "· ممتلئ" : `· ${free} متاح`}</span>
      </p>
    </div>
  );
}

function OrderChips({ slot }: { slot: ScheduleSlot }) {
  const shown = slot.orders.slice(0, MAX_CHIPS);
  const rest = slot.orders.length - shown.length;
  return (
    <>
      {shown.map((o) => (
        <Tooltip key={o.id}>
          <TooltipTrigger
            render={
              <Link
                href={`/orders/${o.id}`}
                style={{ "--tone": ORDER_STATUS[o.status].tone } as CSSProperties}
                className="tone-soft tone-ring num inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] font-bold tracking-wide transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                aria-label={`${o.number} — ${o.plate || "بدون لوحة"} — ${ORDER_STATUS[o.status].label}`}
              />
            }
          >
            <span className="tone-dot size-1.5 rounded-full" aria-hidden />
            {o.plate || o.number}
          </TooltipTrigger>
          <TooltipContent>
            <span className="num">{o.number}</span> · {o.serviceName.ar} · {ORDER_STATUS[o.status].label}
          </TooltipContent>
        </Tooltip>
      ))}
      {rest > 0 ? <span className="num inline-flex h-6 items-center rounded-md bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground">+{rest}</span> : null}
    </>
  );
}

type ScheduleTimelineProps = {
  day: ScheduleDay;
  nowMs: number;
  dimmed?: boolean;
  onBlockSlot: (start: string) => void;
  onUnblock: (block: BlockedSlot) => void;
};

/** MG-05: time axis × capacity lanes — occupied vs free bays per slot, blocked periods hatched. */
export function ScheduleTimeline({ day, nowMs, dimmed, onBlockSlot, onUnblock }: ScheduleTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stepMs = day.slotIntervalMin * 60_000;
  const currentIndex = day.slots.findIndex((s) => {
    const t = new Date(s.start).getTime();
    return nowMs >= t && nowMs < t + stepMs;
  });

  // Bring "now" into view once per day/branch (scrolls the grid only, never the page).
  useEffect(() => {
    const box = scrollRef.current;
    const row = box?.querySelector<HTMLElement>("[data-current='true']");
    if (box && row) box.scrollTop = Math.max(0, row.offsetTop - 56);
  }, [day.date, day.branchId]);

  return (
    <div ref={scrollRef} className={cn("relative max-h-[min(68vh,680px)] overflow-y-auto transition-opacity", dimmed && "opacity-60")}>
      <div className="sticky top-0 z-10 grid grid-cols-[56px_96px_minmax(0,1fr)_32px] gap-3 border-y border-border/60 bg-muted/80 px-4 py-2 text-[11px] font-medium text-muted-foreground backdrop-blur sm:grid-cols-[72px_150px_minmax(0,1fr)_32px]">
        <span>الوقت</span>
        <span>الأماكن</span>
        <span>الطلبات في الفترة</span>
        <span className="sr-only">إجراء</span>
      </div>
      <ul className="divide-y divide-border/50">
        {day.slots.map((slot, i) => {
          const current = i === currentIndex;
          const canBlock = !slot.past && !slot.blocked;
          const nowPct = current ? ((nowMs - new Date(slot.start).getTime()) / stepMs) * 100 : 0;
          return (
            <li
              key={slot.start}
              data-current={current}
              style={slot.blocked ? HATCH_STYLE : undefined}
              className={cn(
                "group relative grid grid-cols-[56px_96px_minmax(0,1fr)_32px] items-center gap-3 px-4 py-2 transition-colors sm:grid-cols-[72px_150px_minmax(0,1fr)_32px]",
                current ? "bg-primary/[0.05]" : !slot.blocked && "hover:bg-muted/40",
                slot.past && !current && "opacity-55",
              )}
            >
              {current ? (
                <>
                  <span className="absolute inset-y-0 start-0 w-0.5 bg-primary" aria-hidden />
                  <span className="pointer-events-none absolute inset-x-0 h-px bg-primary/60" style={{ insetBlockStart: `${nowPct}%` }} aria-hidden />
                </>
              ) : null}

              <div className="min-w-0">
                <p className={cn("num text-sm", current ? "font-bold text-primary" : "font-medium")}>{formatTime(slot.start)}</p>
                {current ? <span className="mt-0.5 inline-block rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">الآن</span> : null}
              </div>

              <CapacityBar slot={slot} />

              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                {slot.blocked ? (
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-card/90 px-2 py-0.5 text-xs font-medium shadow-xs ring-1 ring-border">
                    <Ban className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">محجوب · {slot.blocked.reason}</span>
                  </span>
                ) : null}
                <OrderChips slot={slot} />
                {!slot.orders.length && !slot.blocked ? <span className="text-xs text-muted-foreground/70">{slot.past ? "—" : "فاضية"}</span> : null}
              </div>

              <div className="flex justify-end">
                {slot.blocked ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`إلغاء حجب ${formatTime(slot.blocked.start)} – ${formatTime(slot.blocked.end)}`}
                    title="إلغاء الحجب"
                    onClick={() => slot.blocked && onUnblock(slot.blocked)}
                    className="bg-card/80"
                  >
                    <LockOpen />
                  </Button>
                ) : canBlock ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`حجب الفترة ${formatTime(slot.start)}`}
                    title="حجب هذه الفترة"
                    onClick={() => onBlockSlot(slot.start)}
                    className="text-muted-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                  >
                    <Ban />
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TimelineLegend() {
  const items = [
    { label: "مشغول", className: "bg-aqua" },
    { label: "متاح", className: "bg-muted ring-1 ring-border" },
    { label: "ممتلئ", className: "bg-warning" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-[3px]", i.className)} aria-hidden />
          {i.label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-[3px] ring-1 ring-border" style={HATCH_STYLE} aria-hidden />
        محجوب
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-0.5 rounded-full bg-primary" aria-hidden />
        الآن
      </span>
    </div>
  );
}
