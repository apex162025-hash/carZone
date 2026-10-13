"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Banknote,
  Ban,
  CalendarCheck2,
  Clock,
  Landmark,
  MessageSquareWarning,
  PauseCircle,
  PencilLine,
  PlayCircle,
  Star,
  Users,
} from "lucide-react";

import { EditWashDialog } from "@/components/modules/Washes/EditWashDialog";
import { SuspendWashDialog } from "@/components/modules/Washes/SuspendWashDialog";
import { AuditTrail } from "@/components/shared/audit-trail";
import { InfoList } from "@/components/shared/info-list";
import { PageHeader } from "@/components/shared/page-header";
import { RatingStars } from "@/components/shared/rating-stars";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { SectionCard } from "@/components/shared/section-card";
import { StatTile } from "@/components/shared/stat-tile";
import { DetailSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReactivateWash, useWash } from "@/hooks/use-washes";
import {
  AMENITY,
  AREAS,
  BUSINESS_STATUS,
  COMPLAINT_CATEGORY,
  COMPLAINT_STATUS,
  ORDER_STATUS,
  STAFF_ROLE,
  TRANSACTION_STATUS,
  WEEK_DAYS,
} from "@/lib/constants/labels";
import { formatDate, formatDateTime, formatDuration, formatMoney, formatNumber, formatPercent, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function WashDetailsPageContent({ id }: { id: string }) {
  const { data, isLoading, error, refetch } = useWash(id);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const reactivate = useReactivateWash(id);

  if (isLoading) return <DetailSkeleton />;
  if (error || !data) return <ErrorState message={error?.message} onRetry={() => refetch()} />;

  const { business, branches, services, staff, bookingStats, financials } = data;
  const completionRate = bookingStats.total ? (bookingStats.completed / bookingStats.total) * 100 : 0;
  const openComplaints = data.complaints.filter((c) => c.status !== "resolved" && c.status !== "closed");

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/washes", label: "كل المغاسل" }}
        eyebrow={<span className="num">{business.id}</span>}
        title={business.name.ar}
        meta={<StatusBadge meta={BUSINESS_STATUS[business.status]} />}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5">
              <UserAvatar name={business.ownerName} size="xs" />
              {business.ownerName}
            </span>
            <span>{business.name.en}</span>
            <span>على المنصة منذ {formatDate(business.createdAt, { withYear: true })}</span>
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="lg" onClick={() => setEditOpen(true)}>
              <PencilLine />
              تعديل كمسؤول
            </Button>
            {business.status === "active" ? (
              <Button size="lg" className="bg-destructive text-white hover:bg-destructive/90" onClick={() => setSuspendOpen(true)}>
                <PauseCircle />
                تعليق المغسلة
              </Button>
            ) : business.status === "suspended" ? (
              <Button size="lg" onClick={() => setReactivateOpen(true)}>
                <PlayCircle />
                إعادة التفعيل
              </Button>
            ) : null}
          </>
        }
      />

      {business.status === "suspended" && business.statusReason ? (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <Ban className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="text-sm">
            <p className="font-semibold text-destructive">المغسلة معلّقة — غير متاحة حاليًا للعملاء</p>
            <p className="mt-0.5 text-muted-foreground">{business.statusReason}</p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="إجمالي المبيعات" value={formatMoney(financials.gross)} icon={<Banknote />} />
        <StatTile label="عمولة المنصة" value={formatMoney(financials.commission, { decimals: true })} hint={`نسبة ${financials.effectiveRate}٪`} icon={<Landmark />} tone="var(--aqua)" />
        <StatTile label="الحجوزات" value={formatNumber(bookingStats.total)} hint={`معدل الإكمال ${formatPercent(completionRate, 0)}`} icon={<CalendarCheck2 />} tone="var(--st-waiting)" />
        <StatTile label="التقييم" value={business.rating ? business.rating.toFixed(1) : "—"} hint={`${data.reviews.length} تقييم حديث`} icon={<Star />} tone="var(--warning)" />
        <StatTile
          label="شكاوى مفتوحة"
          value={formatNumber(openComplaints.length)}
          hint={`من ${data.complaints.length} إجمالي`}
          icon={<MessageSquareWarning />}
          tone={openComplaints.length >= 3 ? "var(--destructive)" : "var(--muted-foreground)"}
          className={cn(openComplaints.length >= 3 && "border-destructive/30")}
        />
      </div>

      <Tabs defaultValue="branches" className="gap-4">
        <div className="scrollbar-none overflow-x-auto border-b border-border">
          <TabsList variant="line" className="h-10 gap-4">
            <TabsTrigger value="branches">الفروع ({branches.length})</TabsTrigger>
            <TabsTrigger value="services">الخدمات ({services.length})</TabsTrigger>
            <TabsTrigger value="staff">الموظفون ({staff.length})</TabsTrigger>
            <TabsTrigger value="bookings">الحجوزات</TabsTrigger>
            <TabsTrigger value="reviews">التقييمات</TabsTrigger>
            <TabsTrigger value="complaints">الشكاوى ({data.complaints.length})</TabsTrigger>
            <TabsTrigger value="revenue">الإيرادات</TabsTrigger>
            <TabsTrigger value="audit">سجل التدقيق</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="branches" className="grid gap-4 lg:grid-cols-2">
          {branches.map((b) => (
            <SectionCard
              key={b.id}
              title={b.name.ar}
              description={`${AREAS[b.area] ?? b.area} · ${b.address.ar}`}
              action={<StatusBadge label={b.active ? "نشط" : "متوقف"} tone={b.active ? "var(--success)" : "var(--muted-foreground)"} size="sm" />}
            >
              <InfoList
                columns={3}
                items={[
                  { label: "السعة", value: <span className="num">{b.capacity} أماكن</span> },
                  { label: "حجوزات اليوم", value: <span className="num">{b.todayOrders}</span> },
                  { label: "التقييم", value: b.rating ? <RatingStars value={b.rating} showValue /> : "—" },
                  { label: "تأكيد تلقائي", value: b.settings.autoConfirm ? "مفعل" : "يدوي" },
                  { label: "إلغاء مجاني", value: <span className="num">{b.settings.freeCancelMin} د</span> },
                  { label: "الهاتف", value: <span className="num" dir="ltr">{b.phone}</span> },
                ]}
              />
              <div className="mt-4 flex flex-wrap gap-1.5">
                {b.amenities.map((a) => (
                  <span key={a} className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    {AMENITY[a] ?? a}
                  </span>
                ))}
              </div>
              <details className="group mt-4 rounded-xl bg-muted/50 px-3 py-2 text-xs">
                <summary className="flex cursor-pointer items-center gap-1.5 font-medium select-none">
                  <Clock className="size-3.5" /> ساعات العمل
                </summary>
                <ul className="num mt-2 grid grid-cols-2 gap-1 text-muted-foreground">
                  {b.workingHours.map((d, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span>{WEEK_DAYS[i]}</span>
                      <span>{d.closed ? "مغلق" : `${d.open} – ${d.close}`}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </SectionCard>
          ))}
        </TabsContent>

        <TabsContent value="services">
          <SectionCard title="الخدمات والأسعار" description="أسعار تحددها المغسلة — عرض فقط" flush>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-y border-border bg-muted/50 text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 text-start font-medium">الخدمة</th>
                    <th className="px-4 py-2.5 text-start font-medium">الفرع</th>
                    <th className="px-4 py-2.5 text-start font-medium">النوع</th>
                    <th className="px-4 py-2.5 text-end font-medium">المدة</th>
                    <th className="px-5 py-2.5 text-end font-medium">السعر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {services.map((s) => (
                    <tr key={s.id}>
                      <td className="px-5 py-3 font-medium">{s.name.ar}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{branches.find((b) => b.id === s.branchId)?.name.ar}</td>
                      <td className="px-4 py-3">
                        <StatusBadge size="sm" label={s.type === "primary" ? "أساسية" : "إضافة"} tone={s.type === "primary" ? "var(--primary)" : "var(--aqua)"} />
                      </td>
                      <td className="num px-4 py-3 text-end text-muted-foreground">{formatDuration(s.durationMin)}</td>
                      <td className="num px-5 py-3 text-end font-semibold">{formatMoney(s.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="staff">
          <SectionCard title="فريق المغسلة" flush>
            <ul className="divide-y divide-border/60">
              {staff.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <UserAvatar name={s.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="num text-xs text-muted-foreground" dir="ltr">{s.phone}</p>
                  </div>
                  <span className="hidden text-xs text-muted-foreground sm:block">{branches.find((b) => b.id === s.branchId)?.name.ar}</span>
                  <StatusBadge meta={STAFF_ROLE[s.role]} size="sm" />
                  <StatusBadge size="sm" label={s.status === "active" ? "نشط" : "موقوف"} tone={s.status === "active" ? "var(--success)" : "var(--destructive)"} />
                </li>
              ))}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              { label: "الإجمالي", value: bookingStats.total },
              { label: "مكتملة", value: bookingStats.completed },
              { label: "ملغاة", value: bookingStats.cancelled },
              { label: "لم يحضر", value: bookingStats.noShow },
              { label: "قادمة", value: bookingStats.upcoming },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border/80 bg-card px-4 py-3 shadow-soft">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="num mt-1 text-lg font-bold">{formatNumber(s.value)}</p>
              </div>
            ))}
          </div>
          <SectionCard
            title="أحدث الحجوزات"
            flush
            action={
              <Button variant="ghost" size="sm" render={<Link href={`/orders?washId=${business.id}`} />}>
                كل حجوزات المغسلة
              </Button>
            }
          >
            <ul className="divide-y divide-border/60">
              {data.recentOrders.map((o) => (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className="flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted/40">
                    <span className="num w-24 shrink-0 font-semibold">{o.number}</span>
                    <span className="min-w-0 flex-1 truncate">{o.serviceName.ar}</span>
                    <span className="hidden text-xs text-muted-foreground md:block">{o.branchName.ar}</span>
                    <span className="num hidden text-xs text-muted-foreground sm:block">{formatDateTime(o.scheduledAt)}</span>
                    <span className="num w-20 text-end font-medium">{formatMoney(o.total)}</span>
                    <StatusBadge meta={ORDER_STATUS[o.status]} size="sm" />
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="reviews">
          <SectionCard title="أحدث التقييمات" flush action={<RatingStars value={business.rating} showValue size="md" />}>
            {data.reviews.length ? (
              <ul className="divide-y divide-border/60">
                {data.reviews.map((r) => (
                  <li key={r.id} className="space-y-1.5 px-5 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <RatingStars value={r.stars} />
                      <div className="flex items-center gap-2">
                        {r.reportedByWash ? <StatusBadge size="sm" label="أبلغت عنه المغسلة" tone="var(--warning)" /> : null}
                        {r.status === "hidden" ? <StatusBadge size="sm" label="مخفي" tone="var(--muted-foreground)" /> : null}
                        <span className="text-[11px] text-muted-foreground">{formatRelative(r.createdAt)}</span>
                      </div>
                    </div>
                    <p className={cn("text-sm", r.status === "hidden" && "text-muted-foreground line-through")}>{r.comment.ar}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={<Star />} title="لا توجد تقييمات بعد" />
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="complaints">
          <SectionCard title="شكاوى المغسلة" flush>
            {data.complaints.length ? (
              <ul className="divide-y divide-border/60">
                {data.complaints.map((c) => (
                  <li key={c.id}>
                    <Link href={`/complaints/${c.id}`} className="flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted/40">
                      <span className="num w-20 shrink-0 font-semibold">{c.ticket}</span>
                      <span className="w-28 shrink-0 text-xs text-muted-foreground">{COMPLAINT_CATEGORY[c.category]}</span>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">{c.description}</span>
                      <span className="text-[11px] text-muted-foreground">{formatRelative(c.createdAt)}</span>
                      <StatusBadge meta={COMPLAINT_STATUS[c.status]} size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={<Users />} title="لا توجد شكاوى" description="لم يقدم العملاء أي شكوى على هذه المغسلة." />
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <StatTile label="قيمة الخدمات" value={formatMoney(financials.gross)} />
            <StatTile label="عمولة المنصة" value={formatMoney(financials.commission, { decimals: true })} tone="var(--aqua)" />
            <StatTile label="صافي المغسلة" value={formatMoney(financials.netToWash, { decimals: true })} tone="var(--success)" />
            <StatTile label="مستحقات غير مدفوعة" value={formatMoney(financials.pendingPayout)} tone="var(--warning)" />
          </div>
          <SectionCard
            title="أحدث المعاملات"
            flush
            action={
              <Button variant="ghost" size="sm" render={<Link href={`/finance/transactions?washId=${business.id}`} />}>
                دفتر المعاملات
              </Button>
            }
          >
            <ul className="divide-y divide-border/60">
              {data.transactions.map((t) => (
                <li key={t.id} className={cn("flex items-center gap-3 px-5 py-3 text-sm", t.flag && "bg-warning/5")}>
                  <span className="num w-28 shrink-0 text-xs text-muted-foreground">{formatDate(t.date)}</span>
                  <span className="num flex-1">{formatMoney(t.gross)}</span>
                  <span className="num hidden text-xs text-muted-foreground sm:block">عمولة {formatMoney(t.commission, { decimals: true })}</span>
                  <span className="num font-medium">{formatMoney(t.netToWash, { decimals: true })}</span>
                  {t.flag ? <StatusBadge size="sm" label="فرق في التحصيل" tone="var(--warning)" /> : null}
                  <StatusBadge meta={TRANSACTION_STATUS[t.status]} size="sm" />
                </li>
              ))}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="audit">
          <SectionCard title="سجل التدقيق" description="كل تدخلات الإدارة على هذه المغسلة — غير قابل للتعديل">
            <AuditTrail logs={data.auditLogs} />
          </SectionCard>
        </TabsContent>
      </Tabs>

      <SuspendWashDialog washId={business.id} washName={business.name.ar} open={suspendOpen} onOpenChange={setSuspendOpen} />
      <EditWashDialog business={business} defaultCommission={financials.effectiveRate} open={editOpen} onOpenChange={setEditOpen} />
      <ReasonDialog
        open={reactivateOpen}
        onOpenChange={setReactivateOpen}
        title={`إعادة تفعيل ${business.name.ar}`}
        description="ستعود المغسلة للظهور في تطبيق العميل وتستقبل الحجوزات فورًا."
        textLabel="ملاحظة إعادة التفعيل"
        confirmLabel="إعادة التفعيل"
        isPending={reactivate.isPending}
        onConfirm={({ text }) => reactivate.mutate({ note: text }, { onSuccess: () => setReactivateOpen(false) })}
      />
    </div>
  );
}
