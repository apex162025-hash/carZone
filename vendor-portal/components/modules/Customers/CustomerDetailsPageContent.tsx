"use client";

import Link from "next/link";
import { useState } from "react";
import { Ban, Car, ChevronLeft, ClipboardList, Footprints, Heart, MessageSquareReply, Phone, Receipt, Star, Wallet } from "lucide-react";

import { PageHeader } from "@carzen/ui/components/shared/page-header";
import { RatingStars } from "@carzen/ui/components/shared/rating-stars";
import { SectionCard } from "@carzen/ui/components/shared/section-card";
import { DetailSkeleton, EmptyState, ErrorState } from "@carzen/ui/components/shared/states";
import { StatTile } from "@carzen/ui/components/shared/stat-tile";
import { StatusBadge } from "@carzen/ui/components/shared/status-badge";
import { UserAvatar } from "@carzen/ui/components/shared/user-avatar";
import { Button } from "@carzen/ui/components/ui/button";
import { ORDER_SOURCE, ORDER_STATUS, PAYMENT_STATUS, TONES, VEHICLE_COLOR } from "@carzen/ui/lib/constants/labels";
import { formatDate, formatDateTime, formatMoney, formatNumber, formatRelative } from "@carzen/ui/lib/format";
import { PlateChip, SegmentBadge } from "@/components/modules/Customers/customer-bits";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useCustomer } from "@/hooks/use-insights";
import { useUIStore } from "@/lib/store/ui-store";

const HISTORY_STEP = 10;

export default function CustomerDetailsPageContent({ id }: { id: string }) {
  const { data, isLoading, error, refetch, isRefetching } = useCustomer(id);
  const { branchName, isLocked } = useBranchScope();
  const openNewOrder = useUIStore((s) => s.openNewOrder);
  const [visible, setVisible] = useState(HISTORY_STEP);

  if (isLoading) return <DetailSkeleton />;
  if (error || !data) return <ErrorState message={error?.message} onRetry={() => refetch()} isRetrying={isRefetching} />;

  const { customer, vehicles, orders, favoriteServices, reviews, stats } = data;
  const topFavorite = favoriteServices[0]?.count ?? 0;
  const orderNumber = (orderId: string) => orders.find((o) => o.id === orderId)?.number ?? null;
  const lastVisit = orders.find((o) => o.status === "completed")?.scheduledAt ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/customers", label: "العملاء" }}
        eyebrow={<span className="num">عميل منذ {formatDate(customer.createdAt, { withYear: true })}</span>}
        title={
          <span className="flex items-center gap-3">
            <UserAvatar name={customer.name} size="md" />
            {customer.name}
          </span>
        }
        meta={<SegmentBadge segment={stats.segment} size="md" />}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a href={`tel:${customer.phone.replace(/\s/g, "")}`} className="num inline-flex items-center gap-1.5 font-medium text-foreground hover:underline" dir="ltr">
              <Phone className="size-3.5" /> {customer.phone}
            </a>
            <span>{lastVisit ? `آخر زيارة ${formatRelative(lastVisit)}` : "لم يكمل زيارة بعد"}</span>
          </span>
        }
        actions={
          <Button size="lg" onClick={() => openNewOrder({ phone: customer.phone, name: customer.name, plate: (vehicles.find((v) => v.isDefault) ?? vehicles[0])?.plate })}>
            <Footprints /> طلب جديد لهذا العميل
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="الزيارات المكتملة" icon={<ClipboardList />} value={formatNumber(stats.visits)} hint={`من ${formatNumber(orders.length)} طلب مسجل`} />
        <StatTile label="إجمالي الإنفاق" icon={<Wallet />} tone={TONES.success} value={formatMoney(stats.totalSpent)} hint="الطلبات المدفوعة فقط" />
        <StatTile label="متوسط التذكرة" icon={<Receipt />} tone={TONES.aqua} value={formatMoney(stats.avgTicket)} />
        <StatTile
          label="عدم حضور + إلغاء"
          icon={<Ban />}
          tone={stats.noShows + stats.cancellations ? TONES.danger : TONES.neutral}
          value={formatNumber(stats.noShows + stats.cancellations)}
          hint={`${formatNumber(stats.noShows)} لم يحضر · ${formatNumber(stats.cancellations)} إلغاء`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard
            icon={<ClipboardList />}
            title="سجل الزيارات"
            description={`كل طلبات العميل في ${isLocked ? "فرعك" : "فروعك"} — الأحدث أولًا`}
            flush
          >
            {orders.length ? (
              <>
                <ul className="divide-y divide-border/60 border-t border-border/60">
                  {orders.slice(0, visible).map((o) => (
                    <li key={o.id}>
                      <Link
                        href={`/orders/${o.id}`}
                        className="group flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 transition-colors hover:bg-secondary/50 focus-visible:bg-secondary/60 focus-visible:outline-none"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2">
                            <span className="num text-sm font-semibold">{o.number}</span>
                            <StatusBadge meta={ORDER_SOURCE[o.source]} size="sm" />
                            {o.plate ? <PlateChip plate={o.plate} size="sm" /> : null}
                          </p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {o.serviceName.ar}
                            {o.items.length > 1 ? ` +${o.items.length - 1}` : ""} · {o.branchName.ar}
                          </p>
                        </div>
                        <span className="num text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(o.scheduledAt)}</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge meta={ORDER_STATUS[o.status]} size="sm" live={o.status === "in_service"} />
                          {o.status === "completed" ? <StatusBadge meta={PAYMENT_STATUS[o.paymentStatus]} size="sm" /> : null}
                        </div>
                        <span className="num w-20 text-end font-semibold">{formatMoney(o.total)}</span>
                        <ChevronLeft className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:-translate-x-0.5" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
                {orders.length > visible ? (
                  <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-5 py-2.5 text-xs text-muted-foreground">
                    <span>
                      عرض <span className="num font-medium text-foreground">{formatNumber(visible)}</span> من{" "}
                      <span className="num font-medium text-foreground">{formatNumber(orders.length)}</span> طلب
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setVisible((v) => v + HISTORY_STEP)}>
                      عرض المزيد
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <EmptyState icon={<ClipboardList />} title="لا توجد طلبات" description="لم يسجل العميل أي طلب في فروعك." className="py-8" />
            )}
          </SectionCard>

          <SectionCard icon={<Star />} title="تقييمات العميل" description="ما كتبه العميل عن خدمتك وردودك عليه">
            {reviews.length ? (
              <ul className="space-y-3">
                {reviews.map((r) => {
                  const num = orderNumber(r.orderId);
                  return (
                    <li key={r.id} className="rounded-xl border border-border/70 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <RatingStars value={r.stars} />
                        <span className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          {r.reportedByWash ? <StatusBadge label="مُبلغ لكارزن" tone={TONES.warning} size="sm" /> : null}
                          <span>{branchName(r.branchId)}</span>
                          {num ? (
                            <Link href={`/orders/${r.orderId}`} className="num font-medium text-primary hover:underline">
                              {num}
                            </Link>
                          ) : null}
                          <time className="num" dateTime={r.createdAt} title={formatDateTime(r.createdAt)}>
                            {formatRelative(r.createdAt)}
                          </time>
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed" dir="auto">
                        {r.comment.ar || <span className="text-muted-foreground italic">بدون تعليق</span>}
                      </p>
                      {r.reply ? (
                        <p className="mt-2 flex gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed" dir="auto">
                          <MessageSquareReply className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                          <span>
                            <span className="font-medium">ردك: </span>
                            {r.reply}
                          </span>
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={<Star />} title="لم يترك تقييمات" description="تظهر هنا تقييمات العميل بعد إكمال الطلبات." className="py-6" />
            )}
            {reviews.some((r) => !r.reply && !r.reportedByWash) ? (
              <Button variant="ghost" size="sm" className="mt-3" render={<Link href="/reviews?replied=no" />}>
                الرد من صفحة التقييمات <ChevronLeft />
              </Button>
            ) : null}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard icon={<Car />} title="السيارات" description={`${formatNumber(vehicles.length)} سيارة مسجلة`}>
            {vehicles.length ? (
              <ul className="space-y-2.5">
                {vehicles.map((v) => {
                  const color = VEHICLE_COLOR[v.color];
                  return (
                    <li key={v.id} className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
                      <span
                        className="size-9 shrink-0 rounded-lg border border-border"
                        style={{ backgroundColor: color?.hex ?? v.color }}
                        role="img"
                        aria-label={`اللون: ${color?.label ?? v.color}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                          <span dir="auto">
                            {v.make} {v.model}
                          </span>
                          {v.isDefault ? <StatusBadge label="الافتراضية" tone={TONES.primary} size="sm" /> : null}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {color?.label ?? v.color}
                          {v.year ? <span className="num"> · {v.year}</span> : null}
                        </p>
                      </div>
                      <PlateChip plate={v.plate} className="border-2 border-foreground/80 bg-card" />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={<Car />} title="لا توجد سيارات مسجلة" description="تُسجل السيارة من التطبيق أو عند إنشاء طلب بلوحتها." className="py-6" />
            )}
          </SectionCard>

          <SectionCard icon={<Heart />} title="الخدمات المفضلة" description="الأكثر طلبًا ضمن الزيارات المكتملة">
            {favoriteServices.length ? (
              <ol className="space-y-3">
                {favoriteServices.map((f, i) => (
                  <li key={f.name.ar} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="num flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground">{i + 1}</span>
                        <span className="truncate">{f.name.ar}</span>
                      </span>
                      <span className="num shrink-0 text-xs text-muted-foreground">{formatNumber(f.count)} مرة</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={i === 0 ? "h-full rounded-full bg-primary" : "h-full rounded-full bg-primary/45"}
                        style={{ width: `${Math.max(topFavorite ? (f.count / topFavorite) * 100 : 0, 4)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState icon={<Heart />} title="لا توجد بيانات بعد" description="تُحسب بعد أول زيارة مكتملة." className="py-6" />
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
