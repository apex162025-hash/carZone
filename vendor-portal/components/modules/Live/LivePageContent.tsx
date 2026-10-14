"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { CalendarClock, Clock, Footprints, Hourglass, Phone, Plus, Smartphone, Timer, Users } from "lucide-react";

import { PageHeader } from "@carzen/ui/components/shared/page-header";
import { ErrorState } from "@carzen/ui/components/shared/states";
import { UserAvatar } from "@carzen/ui/components/shared/user-avatar";
import { Button } from "@carzen/ui/components/ui/button";
import { Skeleton } from "@carzen/ui/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@carzen/ui/components/ui/tooltip";
import { TONES } from "@carzen/ui/lib/constants/labels";
import { formatMoney, formatTime, minutesSince } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import { OrderActions } from "@/components/modules/Orders/actions/OrderActions";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useLive } from "@/hooks/use-operations";
import { useAuthStore } from "@/lib/store/auth-store";
import { useUIStore } from "@/lib/store/ui-store";
import type { LiveColumnKey, VendorOrderListItem } from "@carzen/contracts/vendor/operations";

const COLUMNS: { key: LiveColumnKey; label: string; tone: string; empty: string }[] = [
  { key: "upcoming", label: "قادمة اليوم", tone: "var(--st-confirmed)", empty: "لا حجوزات قادمة" },
  { key: "waiting", label: "في الانتظار", tone: "var(--st-waiting)", empty: "لا سيارات منتظرة" },
  { key: "in_service", label: "جارٍ التنفيذ", tone: "var(--st-in_service)", empty: "كل الأماكن فاضية" },
  { key: "payment_pending", label: "بانتظار الدفع", tone: TONES.warning, empty: "لا مدفوعات معلقة" },
  { key: "done", label: "تم اليوم", tone: "var(--st-completed)", empty: "لم يكتمل شيء بعد" },
];

const SOURCE_ICON = { app: Smartphone, walk_in: Footprints, phone: Phone } as const;

/** Re-renders every 30s so elapsed timers stay accurate between refetches. */
function useTicker(ms = 30_000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), ms);
    return () => window.clearInterval(id);
  }, [ms]);
}

function elapsedLabel(o: VendorOrderListItem, column: LiveColumnKey) {
  if (column === "upcoming") return { icon: CalendarClock, text: formatTime(o.scheduledAt), late: o.overdueMin > 0 };
  const entry = [...o.timeline].reverse().find((e) => e.status === o.status);
  const since = entry ? minutesSince(entry.at) : 0;
  if (column === "in_service") return { icon: Timer, text: `${since} / ${o.durationMin} د`, late: o.overdueMin > 0 };
  if (column === "waiting") return { icon: Hourglass, text: `${since} د انتظار`, late: since > 20 };
  if (column === "payment_pending") return { icon: Clock, text: `${o.overdueMin} د بدون دفع`, late: o.overdueMin > 30 };
  return { icon: Clock, text: formatTime(o.scheduledAt), late: false };
}

function LiveCard({ order, column, showBranch }: { order: VendorOrderListItem; column: LiveColumnKey; showBranch: boolean }) {
  const SourceIcon = SOURCE_ICON[order.source];
  const t = elapsedLabel(order, column);
  const TimeIcon = t.icon;
  return (
    <article
      className={cn(
        "rounded-xl border bg-card p-3 shadow-soft transition-colors",
        t.late ? "border-destructive/40 ring-1 ring-destructive/15" : "border-border/80 hover:border-primary/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/orders/${order.id}`} className="min-w-0 focus-visible:outline-none">
          <span className="num block w-fit rounded-md border border-border bg-muted/40 px-2 py-0.5 text-sm font-bold tracking-wider">{order.plate || "—"}</span>
          <span className="num mt-1 block text-[11px] text-muted-foreground">{order.number}</span>
        </Link>
        <Tooltip>
          <TooltipTrigger render={<span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground" />}>
            <SourceIcon className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent>{order.source === "app" ? "حجز من التطبيق" : order.source === "walk_in" ? "حضور مباشر" : "حجز هاتفي"}</TooltipContent>
        </Tooltip>
      </div>
      <p className="mt-2 truncate text-sm font-medium">{order.serviceName.ar}</p>
      <p className="truncate text-xs text-muted-foreground">
        {order.customerName ?? "عميل مباشر"}
        {order.vehicleLabel ? ` · ${order.vehicleLabel}` : ""}
      </p>
      {showBranch ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{order.branchName.ar}</p> : null}
      <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
        <span className={cn("num flex items-center gap-1", t.late ? "font-semibold text-destructive" : "text-muted-foreground")}>
          <TimeIcon className="size-3.5" /> {t.text}
        </span>
        <span className="num font-semibold">{formatMoney(order.total)}</span>
      </div>
      {order.staffName ? (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <UserAvatar name={order.staffName} size="xs" className="size-5 text-[9px]" /> {order.staffName}
        </p>
      ) : null}
      {column !== "done" ? <OrderActions order={order} block className="mt-3" /> : null}
    </article>
  );
}

export default function LivePageContent() {
  useTicker();
  const { branchId, isAll } = useBranchScope();
  const suspended = useAuthStore((s) => s.account?.businessStatus === "suspended");
  const setNewOrderOpen = useUIStore((s) => s.setNewOrderOpen);
  const { data, isLoading, error, refetch, isFetching } = useLive(branchId);

  if (error && !data) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  const pct = data?.bays.capacity ? (data.bays.busy / data.bays.capacity) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="التشغيل المباشر"
        description="كل سيارة في الفرع ومرحلتها — الأزرار تنفذ نفس قواعد تطبيق الموظف."
        meta={
          <span className="num inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("size-1.5 rounded-full bg-success", isFetching ? "animate-pulse" : "animate-pulse-ring [--tone:var(--success)]")} />
            {data ? `تحديث تلقائي · ${formatTime(data.generatedAt)}` : "مباشر"}
          </span>
        }
        actions={
          <Button size="lg" onClick={() => setNewOrderOpen(true)} disabled={suspended}>
            <Plus /> حضور مباشر
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold">الأماكن المشغولة</p>
            {data ? (
              <p className="num text-2xl font-bold">
                {data.bays.busy} <span className="text-base font-medium text-muted-foreground">/ {data.bays.capacity}</span>
              </p>
            ) : (
              <Skeleton className="h-7 w-16" />
            )}
          </div>
          <div className="mt-3 flex gap-1" aria-hidden>
            {data
              ? Array.from({ length: data.bays.capacity }, (_, i) => (
                  <span key={i} className={cn("h-3 flex-1 rounded-full", i < data.bays.busy ? (pct >= 100 ? "bg-destructive" : "bg-aqua") : "bg-muted")} />
                ))
              : null}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {pct >= 100 ? "كل الأماكن مشغولة — الطلبات الجديدة تدخل قائمة الانتظار (~20 دقيقة)." : `${Math.max(0, (data?.bays.capacity ?? 0) - (data?.bays.busy ?? 0))} مكان متاح الآن`}
          </p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Users className="size-4 text-muted-foreground" /> في الوردية الآن
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {data?.staffOnShift.map((s) => (
              <span key={s.id} className="flex items-center gap-1.5 rounded-full bg-muted/70 py-1 ps-1 pe-2.5 text-xs">
                <UserAvatar name={s.name} size="xs" /> {s.name}
              </span>
            ))}
            {data && !data.staffOnShift.length ? <span className="text-xs text-destructive">لا يوجد موظف في الوردية</span> : null}
            {!data ? <Skeleton className="h-7 w-48 rounded-full" /> : null}
          </div>
        </div>
      </div>

      <div className="scrollbar-none -mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <div className="grid min-w-[1100px] grid-cols-5 gap-3">
          {COLUMNS.map((col) => {
            const items = data?.columns[col.key] ?? [];
            return (
              <section key={col.key} aria-label={col.label} className="flex min-h-[420px] flex-col rounded-2xl bg-muted/50 p-2">
                <header style={{ "--tone": col.tone } as CSSProperties} className="flex items-center justify-between px-2 py-2">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span className="tone-dot size-2 rounded-full" /> {col.label}
                  </span>
                  <span className="num tone-soft rounded-md px-2 py-0.5 text-xs font-bold">{items.length}</span>
                </header>
                <div className="flex flex-1 flex-col gap-2">
                  {isLoading
                    ? Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)
                    : items.map((o) => <LiveCard key={o.id} order={o} column={col.key} showBranch={isAll} />)}
                  {!isLoading && !items.length ? <p className="py-8 text-center text-xs text-muted-foreground">{col.empty}</p> : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
