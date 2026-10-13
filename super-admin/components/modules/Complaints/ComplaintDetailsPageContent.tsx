"use client";

import Link from "next/link";
import {
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  ExternalLink,
  FileText,
  History,
  Phone,
  ShieldAlert,
  Store,
  UserRound,
} from "lucide-react";

import { ComplaintNotes } from "@/components/modules/Complaints/ComplaintNotes";
import { ComplaintWorkflowCard } from "@/components/modules/Complaints/ComplaintWorkflowCard";
import { AuditTrail } from "@/components/shared/audit-trail";
import { InfoList } from "@/components/shared/info-list";
import { OrderTimeline } from "@/components/shared/order-timeline";
import { PageHeader } from "@/components/shared/page-header";
import { RatingStars } from "@/components/shared/rating-stars";
import { SectionCard } from "@/components/shared/section-card";
import { DetailSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmins } from "@/hooks/use-admins";
import { useComplaint } from "@/hooks/use-complaints";
import { useOrder } from "@/hooks/use-orders";
import {
  COMPLAINT_CATEGORY,
  COMPLAINT_STATUS,
  CUSTOMER_STATUS,
  ORDER_STATUS,
  PAYMENT_STATUS,
} from "@/lib/constants/labels";
import { daysBetween, formatDate, formatDateTime, formatMoney, formatNumber, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Open complaints on one wash at/above this count raise the "review wash" shortcut (AD-33). */
const WASH_ALERT_THRESHOLD = 3;
const OVERDUE_DAYS = 3;

export default function ComplaintDetailsPageContent({ id }: { id: string }) {
  const { data, isLoading, error, refetch, isRefetching } = useComplaint(id);
  const orderId = data?.complaint.orderId ?? "";
  const orderQuery = useOrder(orderId);
  const admins = useAdmins();

  if (isLoading) return <DetailSkeleton />;
  if (error || !data) return <ErrorState message={error?.message} onRetry={() => refetch()} isRetrying={isRefetching} />;

  const { complaint, customer, business, branch, washComplaintCount, washOpenComplaints, noteAuthors, auditLogs } = data;
  const order = orderQuery.data?.order ?? data.order;
  const ageDays = daysBetween(complaint.createdAt);
  const overdue = complaint.status === "open" && ageDays > OVERDUE_DAYS;
  const isDone = complaint.status === "resolved" || complaint.status === "closed";
  const washAlert = washOpenComplaints >= WASH_ALERT_THRESHOLD;
  const actorNames = { ...Object.fromEntries((admins.data ?? []).map((a) => [a.id, a.name])), ...noteAuthors };

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/complaints", label: "صندوق الشكاوى" }}
        eyebrow={<span>شكوى · {COMPLAINT_CATEGORY[complaint.category]}</span>}
        title={<span className="num">{complaint.ticket}</span>}
        meta={
          <>
            <StatusBadge meta={COMPLAINT_STATUS[complaint.status]} />
            {overdue ? <StatusBadge label={`متأخرة — ${formatNumber(ageDays)} أيام`} tone="var(--destructive)" /> : null}
          </>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5">
              <UserAvatar name={customer.name} size="xs" />
              {customer.name}
            </span>
            <span>{business.name.ar}</span>
            <span className="num">
              فُتحت {formatRelative(complaint.createdAt)} · {formatDateTime(complaint.createdAt)}
            </span>
          </span>
        }
      />

      {isDone && complaint.resolution ? (
        <div className="flex items-start gap-3 rounded-2xl border border-success/30 bg-success/5 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-success">
              {complaint.status === "closed" ? "الشكوى مغلقة — قرار الحل" : "تم حل الشكوى — قرار الحل"}
            </p>
            <p className="mt-1 leading-relaxed whitespace-pre-line" dir="auto">
              {complaint.resolution}
            </p>
            <p className="num mt-1.5 text-[11px] text-muted-foreground">آخر تحديث {formatDateTime(complaint.updatedAt)}</p>
          </div>
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="وصف الشكوى" icon={<FileText />} action={<span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{COMPLAINT_CATEGORY[complaint.category]}</span>}>
            <p className="text-sm leading-relaxed whitespace-pre-line" dir="auto">
              {complaint.description}
            </p>
            <InfoList
              className="mt-5 border-t border-border/60 pt-4"
              columns={3}
              items={[
                { label: "تاريخ الإنشاء", value: <span className="num">{formatDateTime(complaint.createdAt)}</span> },
                { label: "عمر الشكوى", value: <span className={cn(overdue && "text-destructive")}>{formatRelative(complaint.createdAt)}</span> },
                { label: "الفرع", value: branch.name.ar },
              ]}
            />
          </SectionCard>

          <SectionCard
            title="الحجز المرتبط"
            description="الخط الزمني التشغيلي للحجز محل الشكوى"
            icon={<CalendarClock />}
            action={
              order ? (
                <Button variant="ghost" size="sm" render={<Link href={`/orders/${order.id}`} />}>
                  فتح الحجز
                  <ExternalLink className="rtl:-scale-x-100" />
                </Button>
              ) : null
            }
          >
            {order ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="num text-sm font-semibold">{order.number}</span>
                  <StatusBadge meta={ORDER_STATUS[order.status]} size="sm" />
                  <StatusBadge meta={PAYMENT_STATUS[order.paymentStatus]} size="sm" />
                </div>
                <InfoList
                  columns={3}
                  items={[
                    { label: "الموعد", value: <span className="num">{formatDateTime(order.scheduledAt)}</span> },
                    { label: "الخدمات", value: order.items.map((it) => it.name.ar).join("، ") || "—" },
                    { label: "الإجمالي", value: <span className="num">{formatMoney(order.total)}</span> },
                    { label: "اللوحة", value: <span className="num" dir="ltr">{order.plate}</span> },
                    { label: "الفرع", value: branch.name.ar },
                    { label: "كود الحجز", value: <span className="num">{order.code}</span> },
                  ]}
                />
                <div className="rounded-xl border border-border/70 p-4">
                  {orderQuery.isLoading && !order.timeline.length ? (
                    <Skeleton className="h-32 rounded-lg" />
                  ) : order.timeline.length ? (
                    <OrderTimeline timeline={order.timeline} />
                  ) : (
                    <p className="text-center text-xs text-muted-foreground">لا توجد خطوات مسجلة لهذا الحجز.</p>
                  )}
                </div>
                {orderQuery.error ? (
                  <p className="text-xs text-muted-foreground">
                    تعذر تحديث تفاصيل الحجز.{" "}
                    <button type="button" onClick={() => orderQuery.refetch()} className="cursor-pointer font-medium text-primary hover:underline">
                      إعادة المحاولة
                    </button>
                  </p>
                ) : null}
              </div>
            ) : (
              <EmptyState
                icon={<CalendarX2 />}
                title="الشكوى غير مرتبطة بحجز"
                description="قدّم العميل هذه الشكوى بشكل عام على المغسلة دون تحديد حجز."
                className="py-8"
              />
            )}
          </SectionCard>

          <ComplaintNotes complaintId={complaint.id} notes={complaint.notes} noteAuthors={noteAuthors} />

          <SectionCard title="سجل التدقيق" description="كل الإجراءات على هذه الشكوى — غير قابل للتعديل" icon={<History />}>
            <AuditTrail logs={auditLogs} actorNames={actorNames} />
          </SectionCard>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20">
          <ComplaintWorkflowCard complaint={complaint} />

          <SectionCard
            title="العميل"
            icon={<UserRound />}
            action={
              <Button variant="ghost" size="sm" render={<Link href={`/customers/${customer.id}`} />}>
                الملف
              </Button>
            }
          >
            <div className="flex items-center gap-3">
              <UserAvatar name={customer.name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{customer.name}</p>
                <a href={`tel:${customer.phone.replace(/\s/g, "")}`} className="num flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground" dir="ltr">
                  <Phone className="size-3" />
                  {customer.phone}
                </a>
              </div>
              <StatusBadge meta={CUSTOMER_STATUS[customer.status]} size="sm" />
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              عميل منذ {formatDate(customer.createdAt, { withYear: true })} · آخر نشاط {formatRelative(customer.lastActiveAt)}
            </p>
          </SectionCard>

          <SectionCard
            title="المغسلة"
            icon={<Store />}
            action={
              <Button variant="ghost" size="sm" render={<Link href={`/washes/${business.id}`} />}>
                الملف
              </Button>
            }
            className={cn(washAlert && "border-destructive/30")}
          >
            <p className="text-sm font-semibold">{business.name.ar}</p>
            <p className="text-xs text-muted-foreground">{branch.name.ar}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-muted/50 px-2 py-2.5">
                <p className="text-[11px] text-muted-foreground">التقييم</p>
                <div className="mt-1 flex justify-center">
                  {business.rating ? <span className="num text-sm font-bold">{business.rating.toFixed(1)}</span> : <span className="text-sm">—</span>}
                </div>
              </div>
              <div className="rounded-xl bg-muted/50 px-2 py-2.5">
                <p className="text-[11px] text-muted-foreground">كل الشكاوى</p>
                <p className="num mt-1 text-sm font-bold">{formatNumber(washComplaintCount)}</p>
              </div>
              <div className={cn("rounded-xl px-2 py-2.5", washAlert ? "bg-destructive/10 text-destructive" : "bg-muted/50")}>
                <p className={cn("text-[11px]", !washAlert && "text-muted-foreground")}>مفتوحة</p>
                <p className="num mt-1 text-sm font-bold">{formatNumber(washOpenComplaints)}</p>
              </div>
            </div>
            {business.rating ? <RatingStars value={business.rating} className="mt-3" /> : null}
            {washAlert ? (
              <p className="mt-4 rounded-lg bg-destructive/5 px-3 py-2 text-xs leading-relaxed text-destructive">
                شكاوى مفتوحة متكررة على هذه المغسلة — تجاوزت حد التنبيه (<span className="num">{WASH_ALERT_THRESHOLD}</span>).
              </p>
            ) : null}
            {washAlert ? (
              <Button size="lg" className="mt-3 w-full bg-destructive text-white hover:bg-destructive/90" render={<Link href={`/washes/${business.id}`} />}>
                <ShieldAlert />
                مراجعة المغسلة
              </Button>
            ) : null}
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
