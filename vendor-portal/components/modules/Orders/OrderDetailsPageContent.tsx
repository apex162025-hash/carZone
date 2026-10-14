"use client";

import Link from "next/link";
import { Ban, Car, ClipboardList, History, Lock, MapPin, Phone, Receipt, StickyNote, Star, UserRound, Wallet } from "lucide-react";

import { AuditTrail } from "@carzen/ui/components/shared/audit-trail";
import { InfoList } from "@carzen/ui/components/shared/info-list";
import { OrderTimeline } from "@carzen/ui/components/shared/order-timeline";
import { PageHeader } from "@carzen/ui/components/shared/page-header";
import { RatingStars } from "@carzen/ui/components/shared/rating-stars";
import { SectionCard } from "@carzen/ui/components/shared/section-card";
import { DetailSkeleton, EmptyState, ErrorState } from "@carzen/ui/components/shared/states";
import { StatusBadge } from "@carzen/ui/components/shared/status-badge";
import { UserAvatar } from "@carzen/ui/components/shared/user-avatar";
import { Button } from "@carzen/ui/components/ui/button";
import { ORDER_SOURCE, ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, VEHICLE_COLOR } from "@carzen/ui/lib/constants/labels";
import { formatDateTime, formatDuration, formatMoney, formatRelative } from "@carzen/ui/lib/format";
import { OrderActions } from "@/components/modules/Orders/actions/OrderActions";
import { useOrder } from "@/hooks/use-operations";

export default function OrderDetailsPageContent({ id }: { id: string }) {
  const { data, isLoading, error, refetch } = useOrder(id);

  if (isLoading) return <DetailSkeleton />;
  if (error || !data) return <ErrorState message={error?.message} onRetry={() => refetch()} />;

  const { order, customer, vehicle, branch, staff, payment, review } = data;
  const color = vehicle ? VEHICLE_COLOR[vehicle.color] : null;
  const collectedMismatch = payment && payment.amount !== order.total;
  const start = order.timeline.find((t) => t.status === "in_service");
  const end = order.timeline.find((t) => t.status === "completed");
  const actualMin = start && end ? Math.round((new Date(end.at).getTime() - new Date(start.at).getTime()) / 60000) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/orders", label: "الطلبات" }}
        eyebrow={
          <span className="num">
            الكود {order.code} · {formatDateTime(order.scheduledAt)}
          </span>
        }
        title={<span className="num">{order.number}</span>}
        meta={
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge meta={ORDER_STATUS[order.status]} live={order.status === "in_service"} />
            <StatusBadge meta={PAYMENT_STATUS[order.paymentStatus]} />
            <StatusBadge meta={ORDER_SOURCE[order.source]} />
          </div>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="num rounded-md border border-border bg-card px-2 py-0.5 font-bold tracking-wider text-foreground">{order.plate}</span>
            <span>{branch.name.ar}</span>
          </span>
        }
        actions={
          <OrderActions
            size="lg"
            allowed={data.allowedActions}
            order={{ ...order, nextAction: data.nextAction, locked: data.locked }}
          />
        }
      />

      {data.locked ? (
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/60 p-4 text-sm">
          <Lock className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-semibold">الطلب مقفل بإغلاق اليوم</p>
            <p className="mt-0.5 text-muted-foreground">تم احتسابه في تسوية نهاية اليوم ولا يمكن تعديله — يمكن إضافة ملاحظات فقط.</p>
          </div>
        </div>
      ) : null}
      {order.cancel ? (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <Ban className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">
              {order.cancel.byType === "admin" ? "ألغته إدارة كارزن" : order.cancel.byType === "customer" ? "ألغاه العميل" : "ألغاه طاقم المغسلة"} — {formatRelative(order.cancel.at)}
            </p>
            <p className="mt-0.5 text-muted-foreground">السبب: {order.cancel.reason}</p>
          </div>
        </div>
      ) : null}
      {order.paymentStatus === "paid" && !data.locked ? (
        <p className="flex items-center gap-2 rounded-xl bg-muted/60 px-4 py-2.5 text-xs text-muted-foreground">
          <Lock className="size-3.5" /> الطلب مدفوع — الأسعار والخدمات مقفلة. الاسترداد متاح للمدير والمالك فقط مع ذكر السبب.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard icon={<Receipt />} title="الخدمات والسعر" description="السعر محسوب من قائمة الخدمات والعروض — لا يُكتب يدويًا" flush>
            <ul className="divide-y divide-border/60 border-t border-border/60">
              {order.items.map((it) => (
                <li key={it.serviceId} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span className="flex items-center gap-2">
                    {it.name.ar}
                    {it.type === "addon" ? <StatusBadge label="إضافة" tone="var(--aqua)" size="sm" /> : null}
                  </span>
                  <span className="flex items-center gap-4">
                    <span className="num text-xs text-muted-foreground">{formatDuration(it.durationMin)}</span>
                    <span className="num font-medium">{formatMoney(it.price)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-border/60 bg-muted/30 px-5 py-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>المجموع</dt>
                <dd className="num">{formatMoney(order.subtotal)}</dd>
              </div>
              {order.discount ? (
                <div className="flex justify-between text-success">
                  <dt>خصم — {order.discount.reason}</dt>
                  <dd className="num">-{formatMoney(order.discount.amount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between pt-1 text-base font-bold">
                <dt>الإجمالي</dt>
                <dd className="num">{formatMoney(order.total)}</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            icon={<History />}
            title="المسار التشغيلي"
            description={actualMin !== null ? `مدة التنفيذ الفعلية ${formatDuration(actualMin)} مقابل ${formatDuration(order.durationMin)} متوقعة` : `المدة المتوقعة ${formatDuration(order.durationMin)}`}
          >
            <OrderTimeline timeline={order.timeline} />
          </SectionCard>

          <SectionCard icon={<StickyNote />} title="الملاحظات" description="ملاحظات الطاقم على السيارة والطلب">
            {order.notes.length ? (
              <ul className="space-y-3">
                {order.notes.map((n, i) => {
                  const author = n.authorId ? data.noteAuthors[n.authorId] : null;
                  return (
                    <li key={i} className="flex gap-3">
                      <UserAvatar name={author ?? "?"} size="xs" className="mt-0.5" />
                      <div className="min-w-0 flex-1 rounded-xl bg-muted/60 px-3 py-2">
                        <p className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">{author ?? "النظام"}</span>
                          <span>{formatRelative(n.at)}</span>
                        </p>
                        <p className="mt-0.5 text-sm">{n.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={<StickyNote />} title="لا توجد ملاحظات" description="استخدم «ملاحظة» من قائمة الإجراءات لتوثيق حالة السيارة." className="py-6" />
            )}
          </SectionCard>

          <SectionCard icon={<ClipboardList />} title="سجل التدقيق" description="كل إجراء على الطلب بالاسم والوقت والقيمة قبل وبعد">
            <AuditTrail logs={data.auditLogs} />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard icon={<UserRound />} title="العميل">
            {customer ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <UserAvatar name={customer.name} size="md" />
                  <div className="min-w-0">
                    <Link href={`/customers/${customer.id}`} className="block truncate font-semibold hover:underline">
                      {customer.name}
                    </Link>
                    <a href={`tel:${customer.phone.replace(/\s/g, "")}`} className="num flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" dir="ltr">
                      <Phone className="size-3" /> {customer.phone}
                    </a>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full" render={<Link href={`/customers/${customer.id}`} />}>
                  سجل زيارات العميل
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">عميل مباشر بدون بيانات تواصل.</p>
            )}
          </SectionCard>

          <SectionCard icon={<Car />} title="السيارة">
            <div className="flex items-center gap-3">
              {color ? <span className="size-8 rounded-lg border border-border" style={{ backgroundColor: color.hex }} aria-label={color.label} /> : null}
              <div>
                <p className="font-semibold">{vehicle ? `${vehicle.make} ${vehicle.model}` : "غير مسجلة"}</p>
                <p className="text-xs text-muted-foreground">
                  {color?.label ?? ""}
                  {vehicle?.year ? ` · ${vehicle.year}` : ""}
                </p>
              </div>
              <span className="num ms-auto rounded-md border-2 border-foreground/80 bg-card px-2 py-0.5 text-sm font-bold tracking-wider">{order.plate}</span>
            </div>
          </SectionCard>

          <SectionCard icon={<MapPin />} title="التنفيذ">
            <InfoList
              columns={1}
              items={[
                { label: "الفرع", value: branch.name.ar },
                { label: "الموظف المسؤول", value: staff ? <span className="flex items-center gap-2"><UserAvatar name={staff.name} size="xs" />{staff.name}</span> : <span className="text-muted-foreground">لم يُعيّن بعد</span> },
                { label: "تاريخ الإنشاء", value: <span className="num">{formatDateTime(order.createdAt)}</span> },
              ]}
            />
          </SectionCard>

          <SectionCard icon={<Wallet />} title="الدفع">
            <InfoList
              columns={1}
              items={[
                { label: "الحالة", value: <StatusBadge meta={PAYMENT_STATUS[order.paymentStatus]} size="sm" /> },
                { label: "الطريقة", value: order.paymentMethod ? PAYMENT_METHOD[order.paymentMethod] : "—" },
                { label: "المبلغ المحصّل", value: payment ? <span className="num">{formatMoney(payment.amount)}</span> : "—" },
                { label: "وقت التحصيل", value: payment ? <span className="num">{formatDateTime(payment.collectedAt)}</span> : "—" },
              ]}
            />
            {collectedMismatch ? (
              <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
                فرق في التحصيل: المحصّل {formatMoney(payment!.amount)} مقابل إجمالي {formatMoney(order.total)}
              </p>
            ) : null}
          </SectionCard>

          {review ? (
            <SectionCard icon={<Star />} title="تقييم العميل" action={<RatingStars value={review.stars} />}>
              <p className="text-sm">{review.comment.ar}</p>
              {review.reply ? <p className="mt-2 rounded-lg bg-muted/60 px-3 py-2 text-xs">ردك: {review.reply}</p> : null}
              <Button variant="ghost" size="sm" className="mt-2" render={<Link href="/reviews" />}>
                إدارة التقييمات
              </Button>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
