"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Ban, CalendarDays, CalendarOff, ChevronLeft, ChevronRight, Clock, Gauge, Info, LockOpen, PauseCircle, Timer, TrendingUp } from "lucide-react";

import { FilterTabs } from "@carzen/ui/components/shared/filter-tabs";
import { PageHeader } from "@carzen/ui/components/shared/page-header";
import { SectionCard } from "@carzen/ui/components/shared/section-card";
import { EmptyState, ErrorState } from "@carzen/ui/components/shared/states";
import { StatTile } from "@carzen/ui/components/shared/stat-tile";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@carzen/ui/components/ui/alert-dialog";
import { Button } from "@carzen/ui/components/ui/button";
import { Skeleton } from "@carzen/ui/components/ui/skeleton";
import { useUrlState } from "@carzen/ui/hooks/use-url-state";
import { TONES, WEEK_DAYS } from "@carzen/ui/lib/constants/labels";
import { formatDuration, formatNumber, formatTime, serverNow } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import { clockLabel } from "@/components/modules/Branches/branch-utils";
import { BlockSlotDialog } from "@/components/modules/Schedule/BlockSlotDialog";
import { HATCH_STYLE, ScheduleTimeline, TimelineLegend } from "@/components/modules/Schedule/ScheduleTimeline";
import { fromDateKey, fullDayLabel, isValidDateKey, relativeDayLabel, shiftDay, todayKey } from "@/components/modules/Schedule/schedule-utils";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useDeleteBlock, useSchedule } from "@/hooks/use-operations";
import type { BlockedSlot } from "@carzen/contracts/washes";
import type { ScheduleDay } from "@carzen/contracts/vendor/operations";

/** Re-renders every minute so "now", past slots and remaining capacity stay current. */
function useMinuteTicker() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);
}

function summarize(day: ScheduleDay, nowMs: number) {
  const stepMs = day.slotIntervalMin * 60_000;
  const open = day.slots.filter((s) => !s.blocked);
  const upcoming = open.filter((s) => new Date(s.start).getTime() + stepMs > nowMs);
  const freeLeft = upcoming.reduce((sum, s) => sum + Math.max(0, s.capacity - s.occupied), 0);
  const peak = day.slots.reduce<ScheduleDay["slots"][number] | null>((best, s) => (!best || s.occupied > best.occupied ? s : best), null);
  const blockedMin = day.slots.filter((s) => s.blocked).length * day.slotIntervalMin;
  return { freeLeft, upcomingTotal: upcoming.length * day.capacity, peak, blockedMin };
}

export default function SchedulePageContent() {
  useMinuteTicker();
  const { account, branches, singleBranchId, isLocked, branchName } = useBranchScope();
  const [state, setState] = useUrlState({ date: "", branch: "" });
  const [blockStart, setBlockStart] = useState<string | null | undefined>(undefined);
  const [unblock, setUnblock] = useState<BlockedSlot | null>(null);
  const del = useDeleteBlock();

  const today = todayKey();
  const date = state.date && isValidDateKey(state.date) ? state.date : today;
  const branchId = !isLocked && branches.some((b) => b.id === state.branch) ? state.branch : singleBranchId;
  const branch = branches.find((b) => b.id === branchId);
  const isOwner = account?.role === "owner";

  const { data, isLoading, isFetching, isPlaceholderData, error, refetch } = useSchedule(branchId, date);
  const nowMs = serverNow().getTime();
  const isToday = date === today;
  const isPastDay = date < today;
  const summary = data ? summarize(data, nowMs) : null;
  const canBlock = Boolean(data && !data.hours.closed && data.slots.some((s) => !s.past));

  const go = (next: string) => setState({ date: next === today ? "" : next });

  return (
    <div className="space-y-6">
      <PageHeader
        title="الجدول والسعة"
        description="الأماكن المشغولة والمتاحة في كل فترة من اليوم. احجب فترة عند الصيانة أو نقص العمالة — تختفي من تطبيق العميل فورًا."
        meta={
          isFetching && !isLoading ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" /> جاري التحديث
            </span>
          ) : null
        }
        actions={
          <Button size="lg" onClick={() => setBlockStart(null)} disabled={!canBlock || isPlaceholderData}>
            <Ban /> حجب فترة
          </Button>
        }
      />

      <section className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-3 shadow-soft lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon-lg" aria-label="اليوم السابق" onClick={() => go(shiftDay(date, -1))}>
            <ChevronRight />
          </Button>
          <div className="min-w-44 px-1 text-center">
            <p className="text-sm font-semibold">{relativeDayLabel(date)}</p>
            <p className="num text-xs text-muted-foreground">{fullDayLabel(date)}</p>
          </div>
          <Button variant="outline" size="icon-lg" aria-label="اليوم التالي" onClick={() => go(shiftDay(date, 1))}>
            <ChevronLeft />
          </Button>
          <Button variant={isToday ? "secondary" : "outline"} size="lg" onClick={() => go(today)} disabled={isToday}>
            اليوم
          </Button>
          <input
            type="date"
            aria-label="اختيار يوم"
            value={date}
            onChange={(e) => e.target.value && go(e.target.value)}
            className="num h-9 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </div>
        {!isLocked && branches.length > 1 ? (
          <FilterTabs
            aria-label="الفرع"
            value={branchId}
            onChange={(id) => setState({ branch: id })}
            items={branches.map((b) => ({ value: b.id, label: b.name.ar }))}
          />
        ) : (
          <p className="flex items-center gap-1.5 px-1 text-sm font-medium">
            <CalendarDays className="size-4 text-muted-foreground" /> {branchName(branchId)}
          </p>
        )}
      </section>

      {branch && !branch.active ? (
        <p className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm">
          <PauseCircle className="size-4 shrink-0 text-muted-foreground" />
          هذا الفرع متوقف حاليًا — لا يظهر في تطبيق العميل ولا يستقبل حجوزات جديدة.
          {isOwner ? (
            <Link href="/branches" className="ms-auto shrink-0 text-xs font-medium text-primary hover:underline">
              إدارة الفروع
            </Link>
          ) : null}
        </p>
      ) : null}

      {error && !data ? (
        <SectionCard>
          <ErrorState message={error.message} onRetry={() => refetch()} isRetrying={isFetching} />
        </SectionCard>
      ) : isLoading || !data ? (
        <ScheduleSkeleton />
      ) : data.hours.closed || !data.slots.length ? (
        <SectionCard>
          <EmptyState
            icon={<CalendarOff />}
            title={`الفرع مغلق يوم ${WEEK_DAYS[fromDateKey(date).getDay()]}`}
            description={
              isOwner
                ? "حسب ساعات العمل لا توجد فترات حجز في هذا اليوم. يمكنك تعديل أيام وساعات العمل من صفحة الفروع."
                : "حسب ساعات العمل لا توجد فترات حجز في هذا اليوم. تعديل ساعات العمل من صلاحيات المالك."
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => go(shiftDay(date, 1))}>
                  اليوم التالي <ChevronLeft />
                </Button>
                {isOwner ? (
                  <Button size="sm" render={<Link href="/branches" />}>
                    ساعات العمل
                  </Button>
                ) : null}
              </div>
            }
          />
        </SectionCard>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="ساعات العمل"
              icon={<Clock />}
              tone={TONES.primary}
              value={
                <span className="text-lg">
                  {clockLabel(data.hours.open)} – {clockLabel(data.hours.close)}
                </span>
              }
              hint={`${data.slots.length} فترة${data.hours.close === "00:00" ? " · حتى منتصف الليل" : ""}`}
            />
            <StatTile label="مدة الفترة" icon={<Timer />} tone={TONES.info} value={`${data.slotIntervalMin} د`} hint={`السعة ${data.capacity} أماكن في كل فترة`} />
            <StatTile
              label="ذروة الإشغال"
              icon={<TrendingUp />}
              tone={TONES.warning}
              value={summary?.peak && summary.peak.occupied ? `${summary.peak.occupied}/${data.capacity}` : "—"}
              hint={summary?.peak && summary.peak.occupied ? `الساعة ${formatTime(summary.peak.start)}` : "لا حجوزات في هذا اليوم بعد"}
            />
            <StatTile
              label={isToday ? "المتاح باقي اليوم" : "المتاح في اليوم"}
              icon={<Gauge />}
              tone={TONES.success}
              value={isPastDay ? "—" : formatNumber(summary?.freeLeft ?? 0)}
              hint={
                isPastDay
                  ? "يوم منتهي"
                  : `من ${formatNumber(summary?.upcomingTotal ?? 0)} مكان × فترة${summary?.blockedMin ? ` · محجوب ${formatDuration(summary.blockedMin)}` : ""}`
              }
            />
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
            <SectionCard
              title="فترات اليوم"
              description={`كل صف = فترة ${data.slotIntervalMin} دقيقة — المربعات هي أماكن الغسيل (${data.capacity}).`}
              icon={<CalendarDays />}
              action={<TimelineLegend />}
              flush
              className="overflow-hidden"
              contentClassName="pb-0"
            >
              <ScheduleTimeline
                day={data}
                nowMs={nowMs}
                dimmed={isPlaceholderData}
                onBlockSlot={(start) => setBlockStart(start)}
                onUnblock={setUnblock}
              />
            </SectionCard>

            <div className="space-y-6">
              <BlocksCard blocks={data.blocks} nowMs={nowMs} onUnblock={setUnblock} onAdd={canBlock ? () => setBlockStart(null) : undefined} />
              <div className="flex gap-2.5 rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0" />
                <p>
                  الحجب يمنع الحجوزات الجديدة من التطبيق والهاتف في الفترة المحددة فقط، ولا يلغي الحجوزات القائمة. مدة الفترة والسعة تُضبط من{" "}
                  {isOwner ? (
                    <Link href="/branches" className="font-medium text-primary hover:underline">
                      الفروع ← قواعد الحجز
                    </Link>
                  ) : (
                    "قواعد الحجز (للمالك)"
                  )}
                  .
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {blockStart !== undefined && data ? (
        <BlockSlotDialog day={data} branchName={branchName(data.branchId)} initialStart={blockStart} onOpenChange={(o) => !o && setBlockStart(undefined)} />
      ) : null}

      <AlertDialog open={Boolean(unblock)} onOpenChange={(o) => !o && !del.isPending && setUnblock(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء حجب الفترة؟</AlertDialogTitle>
            <AlertDialogDescription>
              {unblock ? (
                <>
                  <span className="num font-medium text-foreground">
                    {formatTime(unblock.start)} – {formatTime(unblock.end)}
                  </span>{" "}
                  ({unblock.reason}) — ستعود الفترة متاحة للحجز في تطبيق العميل فورًا.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>تراجع</AlertDialogCancel>
            <Button loading={del.isPending} onClick={() => unblock && del.mutate(unblock.id, { onSuccess: () => setUnblock(null) })}>
              {!del.isPending ? <LockOpen /> : null}
              إلغاء الحجب
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BlocksCard({ blocks, nowMs, onUnblock, onAdd }: { blocks: BlockedSlot[]; nowMs: number; onUnblock: (b: BlockedSlot) => void; onAdd?: () => void }) {
  const sorted = [...blocks].sort((a, b) => a.start.localeCompare(b.start));
  return (
    <SectionCard
      title="الفترات المحجوبة"
      description={blocks.length ? `${blocks.length} فترة في هذا اليوم` : "لا توجد فترات محجوبة"}
      icon={<Ban />}
      action={
        onAdd ? (
          <Button variant="outline" size="sm" onClick={onAdd}>
            حجب فترة
          </Button>
        ) : null
      }
    >
      {sorted.length ? (
        <ul className="space-y-2">
          {sorted.map((b) => {
            const ended = new Date(b.end).getTime() <= nowMs;
            const durationMin = (new Date(b.end).getTime() - new Date(b.start).getTime()) / 60_000;
            return (
              <li key={b.id} className={cn("flex items-start gap-3 rounded-xl border border-border/70 p-3", ended && "opacity-60")}>
                <span className="mt-0.5 size-8 shrink-0 rounded-lg ring-1 ring-border" style={HATCH_STYLE} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="num text-sm font-semibold">
                    {formatTime(b.start)} – {formatTime(b.end)}
                    <span className="ms-1.5 text-[11px] font-normal text-muted-foreground">{formatDuration(durationMin)}</span>
                  </p>
                  <p className="mt-0.5 text-xs break-words text-muted-foreground">{b.reason}</p>
                  {ended ? <p className="mt-1 text-[11px] text-muted-foreground">انتهت</p> : null}
                </div>
                {!ended ? (
                  <Button variant="ghost" size="sm" className="shrink-0" onClick={() => onUnblock(b)}>
                    <LockOpen /> إلغاء الحجب
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl bg-muted/50 px-3 py-4 text-center text-xs leading-relaxed text-muted-foreground">
          كل فترات اليوم متاحة للحجز. استخدم «حجب فترة» أو زر <Ban className="inline size-3.5 align-[-2px]" /> بجوار أي فترة في الجدول.
        </p>
      )}
    </SectionCard>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="جاري تحميل الجدول">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-2 rounded-2xl border border-border/80 bg-card p-4 shadow-soft">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    </div>
  );
}
