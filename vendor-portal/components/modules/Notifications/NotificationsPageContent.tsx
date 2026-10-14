"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { BellOff, Check, CheckCheck, ChevronLeft, Settings2 } from "lucide-react";

import { FilterTabs } from "@carzen/ui/components/shared/filter-tabs";
import { PageHeader } from "@carzen/ui/components/shared/page-header";
import { EmptyState, ErrorState } from "@carzen/ui/components/shared/states";
import { StatusBadge } from "@carzen/ui/components/shared/status-badge";
import { TablePagination } from "@carzen/ui/components/shared/table-pagination";
import { Button } from "@carzen/ui/components/ui/button";
import { Skeleton } from "@carzen/ui/components/ui/skeleton";
import { useUrlState } from "@carzen/ui/hooks/use-url-state";
import { TONES, VENDOR_NOTIFICATION_TYPE } from "@carzen/ui/lib/constants/labels";
import { daysBetween, formatDate, formatDateTime, formatNumber, formatRelative } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/hooks/use-insights";
import type { VendorNotificationType } from "@carzen/contracts/vendor/catalog";
import type { VendorNotification } from "@carzen/contracts/vendor/insights";

/** "اليوم" / "أمس" / weekday + date, against the server clock (daysBetween uses serverNow). */
function dayLabel(iso: string) {
  const d = daysBetween(iso);
  if (d <= 0) return "اليوم";
  if (d === 1) return "أمس";
  return formatDate(iso, { withDay: true });
}

function groupByDay(items: VendorNotification[]) {
  const groups: { label: string; items: VendorNotification[] }[] = [];
  const sorted = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const n of sorted) {
    const label = dayLabel(n.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  }
  return groups;
}

function NotificationsSkeleton() {
  return (
    <ul className="divide-y divide-border/60" aria-busy aria-label="جاري تحميل الإشعارات">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="flex gap-3 px-5 py-4">
          <Skeleton className="mt-1 size-2.5 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-80 max-w-full" />
          </div>
          <Skeleton className="h-3 w-14" />
        </li>
      ))}
    </ul>
  );
}

export default function NotificationsPageContent() {
  const router = useRouter();
  const [state, setState] = useUrlState({ filter: "all", page: 1 });
  const { data, isLoading, isFetching, error, refetch, isRefetching } = useNotifications(state.filter, state.page);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const unread = data?.meta.unread ?? 0;
  const items = data?.items;

  const open = (n: VendorNotification) => {
    if (!n.read) markRead.mutate(n.id);
    router.push(n.href);
  };

  const tabs = [
    { value: "all", label: "الكل" },
    { value: "unread", label: "غير مقروءة", count: data ? unread : undefined, tone: TONES.danger },
    ...(Object.entries(VENDOR_NOTIFICATION_TYPE) as [VendorNotificationType, (typeof VENDOR_NOTIFICATION_TYPE)[VendorNotificationType]][]).map(([value, meta]) => ({
      value,
      label: meta.label,
    })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="الإشعارات"
        description="الحجوزات الجديدة والإلغاءات، فروق النقدية، تنبيهات الفروع، الملخص اليومي، التقييمات ورسائل كارزن — اضغط على الإشعار للانتقال مباشرة."
        meta={unread ? <StatusBadge label={`${formatNumber(unread)} غير مقروءة`} tone={TONES.danger} /> : null}
        actions={
          <>
            <Button variant="outline" size="lg" render={<Link href="/settings?tab=notifications" />}>
              <Settings2 /> تفضيلات الإشعارات
            </Button>
            <Button variant="outline" size="lg" onClick={() => markAll.mutate()} loading={markAll.isPending} disabled={!unread}>
              {!markAll.isPending ? <CheckCheck /> : null}
              تعليم الكل كمقروء
            </Button>
          </>
        }
      />

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        <div className="border-b border-border/60 px-5 py-4">
          <FilterTabs aria-label="نوع الإشعار" value={state.filter} onChange={(filter) => setState({ filter })} items={tabs} />
        </div>

        {isLoading && !items ? (
          <NotificationsSkeleton />
        ) : error && !items ? (
          <ErrorState message={error.message} onRetry={() => refetch()} isRetrying={isRefetching} />
        ) : !items?.length ? (
          <EmptyState
            icon={<BellOff />}
            title={state.filter === "unread" ? "لا توجد إشعارات غير مقروءة" : "لا توجد إشعارات"}
            description={state.filter === "unread" ? "أنت على اطلاع بكل المستجدات." : "سنُعلمك هنا فور وصول أي حدث يحتاج انتباهك."}
            action={
              state.filter !== "all" ? (
                <Button variant="outline" size="sm" onClick={() => setState({ filter: "all" })}>
                  عرض كل الإشعارات
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className={cn("transition-opacity", isFetching && "opacity-60")}>
            {groupByDay(items).map((group) => (
              <div key={group.label}>
                <h2 className="border-b border-border/60 bg-muted/60 px-5 py-1.5 text-[11px] font-medium text-muted-foreground">{group.label}</h2>
                <ul className="divide-y divide-border/60">
                  {group.items.map((n) => {
                    const meta = VENDOR_NOTIFICATION_TYPE[n.type];
                    return (
                      <li key={n.id} className={cn("group relative flex items-stretch transition-colors hover:bg-muted/40", !n.read && "bg-secondary/40")}>
                        {!n.read ? <span className="absolute inset-y-0 start-0 w-0.5 bg-primary" aria-hidden /> : null}
                        <button
                          type="button"
                          onClick={() => open(n)}
                          className="flex min-w-0 flex-1 cursor-pointer gap-3 px-5 py-4 text-start focus-visible:bg-secondary/60 focus-visible:outline-none"
                        >
                          <span style={{ "--tone": meta.tone } as CSSProperties} className="tone-dot mt-1.5 size-2.5 shrink-0 rounded-full" aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className={cn("text-sm", n.read ? "font-medium" : "font-semibold")}>{n.title.ar}</span>
                              <StatusBadge meta={meta} size="sm" />
                              {!n.read ? <span className="sr-only">(غير مقروء)</span> : null}
                            </span>
                            <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">{n.body.ar}</span>
                          </span>
                          <span className="flex shrink-0 flex-col items-end gap-1">
                            <time className="num text-[11px] whitespace-nowrap text-muted-foreground" dateTime={n.createdAt} title={formatDateTime(n.createdAt)}>
                              {formatRelative(n.createdAt)}
                            </time>
                            <ChevronLeft className="size-4 text-muted-foreground/60 transition-transform group-hover:-translate-x-0.5" aria-hidden />
                          </span>
                        </button>
                        {!n.read ? (
                          <div className="flex items-center pe-4">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`تعليم «${n.title.ar}» كمقروء`}
                              title="تعليم كمقروء"
                              onClick={() => markRead.mutate(n.id)}
                              disabled={markRead.isPending && markRead.variables === n.id}
                            >
                              <Check />
                            </Button>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}

        <TablePagination pagination={data?.pagination} onPageChange={(page) => setState({ page }, { resetPage: false })} />
      </section>
    </div>
  );
}
