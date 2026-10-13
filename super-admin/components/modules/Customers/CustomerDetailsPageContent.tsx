"use client";

import Link from "next/link";
import { useState } from "react";
import { Ban, Banknote, CalendarCheck2, CalendarX2, Car, CheckCircle2, MessageSquareWarning, PauseCircle, PlayCircle, Star } from "lucide-react";

import { ColorSwatch, PlateChip } from "@/components/modules/Customers/VehicleBits";
import { AuditTrail } from "@/components/shared/audit-trail";
import { InfoList } from "@/components/shared/info-list";
import { PageHeader } from "@/components/shared/page-header";
import { RatingStars } from "@/components/shared/rating-stars";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { SectionCard } from "@/components/shared/section-card";
import { StatTile } from "@/components/shared/stat-tile";
import { DetailSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomer, useToggleCustomer } from "@/hooks/use-customers";
import { COMPLAINT_CATEGORY, COMPLAINT_STATUS, CUSTOMER_STATUS, ORDER_SOURCE, ORDER_STATUS } from "@/lib/constants/labels";
import { formatDate, formatDateTime, formatMoney, formatNumber, formatPercent, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function CustomerDetailsPageContent({ id }: { id: string }) {
  const { data, isLoading, error, refetch } = useCustomer(id);
  const [toggleOpen, setToggleOpen] = useState(false);
  const toggle = useToggleCustomer(id);

  if (isLoading) return <DetailSkeleton />;
  if (error || !data) return <ErrorState message={error?.message} onRetry={() => refetch()} />;

  const { customer, vehicles, orders, reviews, complaints, stats } = data;
  const suspended = customer.status === "suspended";
  const ordersById = new Map(orders.map((o) => [o.id, o]));
  const defaultVehicle = vehicles.find((v) => v.isDefault) ?? vehicles[0];
  const lostCount = stats.cancelledCount + stats.noShowCount;
  const lostRate = stats.ordersCount ? (lostCount / stats.ordersCount) * 100 : 0;
  const completionRate = stats.ordersCount ? (stats.completedCount / stats.ordersCount) * 100 : 0;
  const openComplaints = complaints.filter((c) => c.status !== "resolved" && c.status !== "closed").length;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/customers", label: "كل العملاء" }}
        eyebrow={<span className="num">{customer.id}</span>}
        title={customer.name}
        meta={<StatusBadge meta={CUSTOMER_STATUS[customer.status]} />}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="num" dir="ltr">
              {customer.phone}
            </span>
            <span>عميل منذ {formatDate(customer.createdAt, { withYear: true })}</span>
            <span>آخر نشاط {formatRelative(customer.lastActiveAt)}</span>
          </span>
        }
        actions={
          suspended ? (
            <Button size="lg" onClick={() => setToggleOpen(true)}>
              <PlayCircle />
              إعادة التفعيل
            </Button>
          ) : (
            <Button size="lg" className="bg-destructive text-white hover:bg-destructive/90" onClick={() => setToggleOpen(true)}>
              <PauseCircle />
              إيقاف الحساب
            </Button>
          )
        }
      />

      {suspended ? (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <Ban className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="text-sm">
            <p className="font-semibold text-destructive">الحساب موقوف — لا يستطيع العميل تسجيل الدخول أو الحجز</p>
            {customer.statusReason ? <p className="mt-0.5 text-muted-foreground">{customer.statusReason}</p> : null}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="الحجوزات" value={formatNumber(stats.ordersCount)} icon={<CalendarCheck2 />} tone="var(--st-waiting)" />
        <StatTile
          label="المكتملة"
          value={formatNumber(stats.completedCount)}
          hint={`معدل الإكمال ${formatPercent(completionRate, 0)}`}
          icon={<CheckCircle2 />}
          tone="var(--success)"
        />
        <StatTile label="إجمالي الإنفاق" value={formatMoney(stats.totalSpent)} hint="على الحجوزات المكتملة" icon={<Banknote />} />
        <StatTile
          label="إلغاء وعدم حضور"
          value={formatNumber(lostCount)}
          hint={`${stats.cancelledCount} ملغي · ${stats.noShowCount} لم يحضر`}
          icon={<CalendarX2 />}
          tone={lostRate >= 30 ? "var(--destructive)" : "var(--muted-foreground)"}
          className={cn(lostRate >= 30 && "border-destructive/30")}
        />
        <StatTile
          label="متوسط تقييماته"
          value={stats.avgRating !== null ? stats.avgRating.toFixed(1) : "—"}
          hint={`${reviews.length} تقييم`}
          icon={<Star />}
          tone="var(--warning)"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <Tabs defaultValue="profile" className="gap-4">
        <div className="scrollbar-none overflow-x-auto border-b border-border">
          <TabsList variant="line" className="h-10 gap-4">
            <TabsTrigger value="profile">الملف الشخصي</TabsTrigger>
            <TabsTrigger value="vehicles">السيارات ({vehicles.length})</TabsTrigger>
            <TabsTrigger value="bookings">الحجوزات ({orders.length})</TabsTrigger>
            <TabsTrigger value="reviews">التقييمات ({reviews.length})</TabsTrigger>
            <TabsTrigger value="complaints">الشكاوى ({complaints.length})</TabsTrigger>
            <TabsTrigger value="activity">سجل النشاط</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile">
          <SectionCard title="بيانات العميل" description="بيانات يملكها العميل من التطبيق — عرض فقط">
            <InfoList
              columns={3}
              items={[
                { label: "الاسم", value: customer.name },
                {
                  label: "الهاتف",
                  value: (
                    <span className="num" dir="ltr">
                      {customer.phone}
                    </span>
                  ),
                },
                { label: "الحالة", value: <StatusBadge meta={CUSTOMER_STATUS[customer.status]} size="sm" /> },
                { label: "تاريخ التسجيل", value: <span className="num">{formatDate(customer.createdAt, { withYear: true, withDay: true })}</span> },
                { label: "آخر نشاط", value: <span className="num">{formatDateTime(customer.lastActiveAt)}</span> },
                {
                  label: "السيارة الافتراضية",
                  value: defaultVehicle ? (
                    <span className="flex flex-wrap items-center gap-2">
                      {defaultVehicle.make} {defaultVehicle.model}
                      <PlateChip plate={defaultVehicle.plate} size="sm" />
                    </span>
                  ) : (
                    "—"
                  ),
                },
                { label: "شكاوى مفتوحة", value: <span className="num">{openComplaints}</span> },
                { label: "معرف العميل", value: <span className="num text-muted-foreground">{customer.id}</span> },
                ...(suspended && customer.statusReason ? [{ label: "سبب الإيقاف", value: customer.statusReason, full: true }] : []),
              ]}
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="vehicles">
          {vehicles.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {vehicles.map((v) => (
                <SectionCard
                  key={v.id}
                  icon={<Car />}
                  title={`${v.make} ${v.model}`}
                  description={v.year ? <span className="num">{v.year}</span> : "سنة الصنع غير محددة"}
                  action={v.isDefault ? <StatusBadge size="sm" label="افتراضية" tone="var(--primary)" /> : null}
                >
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2.5 text-sm">
                    <ColorSwatch color={v.color} />
                    <PlateChip plate={v.plate} />
                  </div>
                </SectionCard>
              ))}
            </div>
          ) : (
            <SectionCard>
              <EmptyState icon={<Car />} title="لا توجد سيارات محفوظة" description="لم يضف العميل أي سيارة إلى حسابه بعد." />
            </SectionCard>
          )}
        </TabsContent>

        <TabsContent value="bookings">
          <SectionCard
            title="حجوزات العميل"
            description="الأحدث أولًا"
            flush
            action={
              orders.length ? (
                <Button variant="ghost" size="sm" render={<Link href={`/orders?customerId=${customer.id}`} />}>
                  عرض في الحجوزات
                </Button>
              ) : null
            }
          >
            {orders.length ? (
              <ul className="divide-y divide-border/60">
                {orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/orders/${o.id}`} className="flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted/40">
                      <span className="num w-24 shrink-0 font-semibold">{o.number}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{o.serviceName.ar}</span>
                        <span className="block truncate text-xs text-muted-foreground">{o.branchName.ar}</span>
                      </span>
                      <span className="hidden md:block">
                        <StatusBadge meta={ORDER_SOURCE[o.source]} size="sm" />
                      </span>
                      <span className="num hidden text-xs text-muted-foreground sm:block">{formatDateTime(o.scheduledAt)}</span>
                      <span className="num w-20 text-end font-medium">{formatMoney(o.total)}</span>
                      <StatusBadge meta={ORDER_STATUS[o.status]} size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={<CalendarCheck2 />} title="لا توجد حجوزات" description="لم يحجز هذا العميل أي خدمة حتى الآن." />
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="reviews">
          <SectionCard
            title="تقييمات العميل"
            flush
            action={stats.avgRating !== null ? <RatingStars value={stats.avgRating} showValue size="md" /> : null}
          >
            {reviews.length ? (
              <ul className="divide-y divide-border/60">
                {reviews.map((r) => {
                  const order = ordersById.get(r.orderId);
                  return (
                    <li key={r.id} className="space-y-1.5 px-5 py-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <RatingStars value={r.stars} />
                          {order ? (
                            <Link href={`/orders/${order.id}`} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                              {order.businessName.ar} · <span className="num">{order.number}</span>
                            </Link>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          {r.reportedByWash ? <StatusBadge size="sm" label="أبلغت عنه المغسلة" tone="var(--warning)" /> : null}
                          {r.status === "hidden" ? <StatusBadge size="sm" label="مخفي" tone="var(--muted-foreground)" /> : null}
                          <span className="text-[11px] text-muted-foreground">{formatRelative(r.createdAt)}</span>
                        </div>
                      </div>
                      <p className={cn("text-sm", r.status === "hidden" && "text-muted-foreground line-through")}>{r.comment.ar || "بدون تعليق"}</p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={<Star />} title="لا توجد تقييمات" description="لم يقيّم هذا العميل أي خدمة بعد." />
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="complaints">
          <SectionCard title="شكاوى العميل" flush>
            {complaints.length ? (
              <ul className="divide-y divide-border/60">
                {complaints.map((c) => (
                  <li key={c.id}>
                    <Link href={`/complaints/${c.id}`} className="flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted/40">
                      <span className="num w-20 shrink-0 font-semibold">{c.ticket}</span>
                      <span className="hidden w-28 shrink-0 text-xs text-muted-foreground sm:block">{COMPLAINT_CATEGORY[c.category]}</span>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">{c.description}</span>
                      <span className="hidden text-[11px] text-muted-foreground md:block">{formatRelative(c.createdAt)}</span>
                      <StatusBadge meta={COMPLAINT_STATUS[c.status]} size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={<MessageSquareWarning />} title="لا توجد شكاوى" description="لم يقدم هذا العميل أي شكوى." />
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="activity">
          <SectionCard title="سجل النشاط" description="تدخلات الإدارة على هذا الحساب — غير قابل للتعديل">
            <AuditTrail logs={data.auditLogs} emptyText="لا توجد إجراءات إدارية على هذا الحساب" />
          </SectionCard>
        </TabsContent>
      </Tabs>

      <ReasonDialog
        open={toggleOpen}
        onOpenChange={setToggleOpen}
        title={suspended ? `إعادة تفعيل حساب ${customer.name}` : `إيقاف حساب ${customer.name}`}
        description={
          suspended
            ? "سيتمكن العميل من تسجيل الدخول وإنشاء حجوزات جديدة فورًا."
            : "لن يتمكن العميل من تسجيل الدخول أو إنشاء حجوزات جديدة طوال فترة الإيقاف، وستظهر له رسالة «الحساب موقوف» في التطبيق."
        }
        textLabel={suspended ? "سبب إعادة التفعيل (يُسجل في سجل التدقيق)" : "سبب الإيقاف (يُسجل في سجل التدقيق)"}
        textPlaceholder={suspended ? "مثال: تمت مراجعة الحساب وحل المشكلة" : "مثال: إساءة متكررة لطاقم المغاسل"}
        confirmLabel={suspended ? "إعادة التفعيل" : "تأكيد الإيقاف"}
        variant={suspended ? "default" : "destructive"}
        isPending={toggle.isPending}
        onConfirm={({ text }) => toggle.mutate({ suspended: !suspended, reason: text }, { onSuccess: () => setToggleOpen(false) })}
      />
    </div>
  );
}
