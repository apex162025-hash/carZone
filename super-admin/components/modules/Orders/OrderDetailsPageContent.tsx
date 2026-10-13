"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  Ban,
  Banknote,
  Car,
  CircleSlash,
  ExternalLink,
  Flag,
  Info,
  Landmark,
  ListChecks,
  MessageSquareWarning,
  Phone,
  Star,
  Store,
  UserRound,
  Wrench,
} from "lucide-react";

import { ColorSwatch, PlateChip } from "@/components/modules/Customers/VehicleBits";
import { AuditTrail } from "@/components/shared/audit-trail";
import { OrderTimeline } from "@/components/shared/order-timeline";
import { PageHeader } from "@/components/shared/page-header";
import { RatingStars } from "@/components/shared/rating-stars";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { SectionCard } from "@/components/shared/section-card";
import { DetailSkeleton, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCancelOrder, useFlagOrder, useOrder } from "@/hooks/use-orders";
import {
  AREAS,
  BUSINESS_STATUS,
  COMPLAINT_CATEGORY,
  COMPLAINT_STATUS,
  CUSTOMER_STATUS,
  ORDER_SOURCE,
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  STAFF_ROLE,
  TRANSACTION_STATUS,
} from "@/lib/constants/labels";
import { formatDateTime, formatDuration, formatMoney, formatPercent, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ActorType } from "@/types/orders";

const ACTOR: Record<ActorType, string> = {
  customer: "العميل",
  staff: "طاقم المغسلة",
  admin: "إدارة المنصة",
  system: "النظام",
};

/** Label / value row used inside the side cards. */
function Row({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 py-2 text-sm", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 text-end font-medium">{children}</span>
    </div>
  );
}

export default function OrderDetailsPageContent({ id }: { id: string }) {
  const { data, isLoading, error, refetch } = useOrder(id);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const cancel = useCancelOrder(id);
  const flag = useFlagOrder(id);

  if (isLoading) return <DetailSkeleton />;
  if (error || !data) return <ErrorState message={error?.message} onRetry={() => refetch()} />;

  const { order, customer, vehicle, business, branch, staff, payment, transaction, review, complaint } = data;
  const canCancel = order.status === "pending" || order.status === "confirmed";
  const isFlagged = order.flag === "finance_review";
  const isSettled = order.status === "completed" && order.paymentStatus === "paid";
  const paymentGap = payment ? payment.amount - order.total : 0;
  const first = order.timeline[0];
  const last = order.timeline[order.timeline.length - 1];
  const elapsedMin = first && last ? (new Date(last.at).getTime() - new Date(first.at).getTime()) / 60000 : 0;

  const flagButton = (
    <Button variant="outline" size="lg" disabled={isFlagged} onClick={() => setFlagOpen(true)}>
      <Flag />
      {isFlagged ? "محوّل للمراجعة المالية" : "تحويل لمراجعة مالية"}
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/orders", label: "كل الحجوزات" }}
        eyebrow={
          <span>
            كود الحجز{" "}
            <span className="num tracking-wider" dir="ltr">
              {order.code}
            </span>
          </span>
        }
        title={<span className="num">{order.number}</span>}
        meta={
          <>
            <StatusBadge meta={ORDER_STATUS[order.status]} live={order.status === "in_service"} />
            <StatusBadge meta={PAYMENT_STATUS[order.paymentStatus]} />
            <StatusBadge meta={ORDER_SOURCE[order.source]} />
            {isFlagged ? <StatusBadge label="قيد المراجعة المالية" tone="var(--info)" /> : null}
          </>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              الموعد <span className="num font-medium text-foreground">{formatDateTime(order.scheduledAt)}</span>
            </span>
            <span>
              أُنشئ <span className="num">{formatRelative(order.createdAt)}</span>
            </span>
            <span>
              المدة المتوقعة <span className="num">{formatDuration(order.durationMin)}</span>
            </span>
          </span>
        }
        actions={
          <>
            {isFlagged ? (
              <Tooltip>
                <TooltipTrigger render={<span tabIndex={0} className="rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" />}>
                  {flagButton}
                </TooltipTrigger>
                <TooltipContent>الحجز محوّل بالفعل لفريق المالية</TooltipContent>
              </Tooltip>
            ) : (
              flagButton
            )}
            {canCancel ? (
              <Button size="lg" className="bg-destructive text-white hover:bg-destructive/90" onClick={() => setCancelOpen(true)}>
                <CircleSlash />
                إلغاء الحجز
              </Button>
            ) : null}
          </>
        }
      />

      {order.status === "cancelled" && order.cancel ? (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <Ban className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="text-sm">
            <p className="font-semibold text-destructive">
              تم إلغاء الحجز بواسطة {ACTOR[order.cancel.byType]}
              <span className="num ms-2 text-xs font-normal text-muted-foreground">{formatDateTime(order.cancel.at)}</span>
            </p>
            <p className="mt-0.5 text-muted-foreground">{order.cancel.reason}</p>
          </div>
        </div>
      ) : null}

      {isSettled ? (
        <div className="flex items-start gap-3 rounded-2xl border border-info/30 bg-info/5 p-4">
          <Info className="mt-0.5 size-5 shrink-0 text-info" />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">المعاملات المالية المكتملة لا يمكن تعديلها</span> — استخدم التحويل للمراجعة المالية
            إن وُجد خطأ في المبلغ أو التحصيل.
          </p>
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="الخدمات" icon={<ListChecks />} description={`${order.items.length} بند · ${formatDuration(order.durationMin)}`} flush>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-y border-border bg-muted/50 text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 text-start font-medium">الخدمة</th>
                    <th className="px-4 py-2.5 text-start font-medium">النوع</th>
                    <th className="px-4 py-2.5 text-end font-medium">المدة</th>
                    <th className="px-5 py-2.5 text-end font-medium">السعر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {order.items.map((item) => (
                    <tr key={item.serviceId}>
                      <td className="px-5 py-3 font-medium">{item.name.ar}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          size="sm"
                          label={item.type === "primary" ? "أساسية" : "إضافة"}
                          tone={item.type === "primary" ? "var(--primary)" : "var(--aqua)"}
                        />
                      </td>
                      <td className="num px-4 py-3 text-end text-muted-foreground">{formatDuration(item.durationMin)}</td>
                      <td className="num px-5 py-3 text-end font-semibold">{formatMoney(item.price)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border text-sm">
                  <tr>
                    <td colSpan={3} className="px-5 pt-3 pb-1 text-muted-foreground">
                      المجموع الفرعي
                    </td>
                    <td className="num px-5 pt-3 pb-1 text-end">{formatMoney(order.subtotal)}</td>
                  </tr>
                  {order.discount ? (
                    <tr>
                      <td colSpan={3} className="px-5 py-1 text-muted-foreground">
                        الخصم <span className="num">({formatPercent(order.discount.pct, 0)})</span>
                        {order.discount.reason ? <span className="ms-1.5 text-xs">— {order.discount.reason}</span> : null}
                      </td>
                      <td className="num px-5 py-1 text-end text-success">− {formatMoney(order.discount.amount, { decimals: true })}</td>
                    </tr>
                  ) : null}
                  <tr>
                    <td colSpan={3} className="px-5 pt-1 pb-4 font-semibold">
                      الإجمالي
                    </td>
                    <td className="num px-5 pt-1 pb-4 text-end text-base font-bold">{formatMoney(order.total, { decimals: true })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </SectionCard>

          <SectionCard
            title="الخط الزمني التشغيلي"
            description="كل خطوة بوقتها ومنفذها والمدة منذ الخطوة السابقة"
            action={
              elapsedMin > 0 ? (
                <span className="num rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">الإجمالي {formatDuration(elapsedMin)}</span>
              ) : null
            }
          >
            <OrderTimeline timeline={order.timeline} />
          </SectionCard>

          {order.notes.length ? (
            <SectionCard title="ملاحظات الحجز">
              <ul className="space-y-2">
                {order.notes.map((n, i) => (
                  <li key={`${n.at}-${i}`} className="rounded-xl bg-muted/60 px-3 py-2 text-sm">
                    <p>{n.text}</p>
                    <p className="num mt-0.5 text-[11px] text-muted-foreground">{formatDateTime(n.at)}</p>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}

          {review || complaint ? (
            <div className="grid gap-6 md:grid-cols-2">
              {review ? (
                <SectionCard
                  title="تقييم العميل"
                  icon={<Star />}
                  action={
                    <Button variant="ghost" size="sm" render={<Link href="/reviews" />}>
                      إدارة التقييمات
                    </Button>
                  }
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <RatingStars value={review.stars} size="md" showValue />
                      <div className="flex items-center gap-1.5">
                        {review.reportedByWash ? <StatusBadge size="sm" label="أبلغت عنه المغسلة" tone="var(--warning)" /> : null}
                        {review.status === "hidden" ? <StatusBadge size="sm" label="مخفي" tone="var(--muted-foreground)" /> : null}
                      </div>
                    </div>
                    <p className={cn("text-sm leading-relaxed", review.status === "hidden" && "text-muted-foreground line-through")}>
                      {review.comment.ar || "بدون تعليق"}
                    </p>
                    {review.reply ? (
                      <p className="rounded-lg bg-muted/70 px-2.5 py-1.5 text-xs">
                        <span className="text-muted-foreground">رد المغسلة: </span>
                        {review.reply}
                      </p>
                    ) : null}
                    <p className="text-[11px] text-muted-foreground">{formatRelative(review.createdAt)}</p>
                  </div>
                </SectionCard>
              ) : null}
              {complaint ? (
                <SectionCard
                  title="شكوى مرتبطة"
                  icon={<MessageSquareWarning />}
                  action={<StatusBadge meta={COMPLAINT_STATUS[complaint.status]} size="sm" />}
                >
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      <span className="num font-semibold text-foreground">{complaint.ticket}</span> · {COMPLAINT_CATEGORY[complaint.category]} ·{" "}
                      {formatRelative(complaint.createdAt)}
                    </p>
                    <p className="line-clamp-3 text-sm leading-relaxed">{complaint.description}</p>
                    <Button variant="outline" size="sm" render={<Link href={`/complaints/${complaint.id}`} />}>
                      فتح الشكوى
                      <ExternalLink />
                    </Button>
                  </div>
                </SectionCard>
              ) : null}
            </div>
          ) : null}

          <SectionCard title="سجل التدقيق" description="كل الإجراءات المسجلة على هذا الحجز — غير قابل للتعديل">
            <AuditTrail logs={data.auditLogs} emptyText="لا توجد تدخلات إدارية على هذا الحجز" />
          </SectionCard>
        </div>

        <aside className="space-y-4">
          <SectionCard title="العميل" icon={<UserRound />}>
            {customer ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <UserAvatar name={customer.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/customers/${customer.id}`} className="block truncate text-sm font-semibold hover:text-primary hover:underline">
                      {customer.name}
                    </Link>
                    <a href={`tel:${customer.phone.replace(/\s/g, "")}`} className="num inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" dir="ltr">
                      <Phone className="size-3" />
                      {customer.phone}
                    </a>
                  </div>
                  {customer.status !== "active" ? <StatusBadge meta={CUSTOMER_STATUS[customer.status]} size="sm" /> : null}
                </div>
                <Button variant="outline" size="sm" className="w-full" render={<Link href={`/customers/${customer.id}`} />}>
                  ملف العميل الكامل
                </Button>
              </div>
            ) : (
              <div className="rounded-xl bg-muted/60 px-3 py-2.5 text-sm">
                <p className="font-medium">عميل مباشر</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  حجز {ORDER_SOURCE[order.source].label} بدون حساب على تطبيق العميل — يُعرَّف باللوحة فقط.
                </p>
              </div>
            )}
          </SectionCard>

          <SectionCard title="السيارة" icon={<Car />}>
            {vehicle ? (
              <div className="divide-y divide-border/60">
                <Row label="الطراز">
                  {vehicle.make} {vehicle.model}
                  {vehicle.year ? <span className="num ms-1 text-muted-foreground">{vehicle.year}</span> : null}
                </Row>
                <Row label="اللون">
                  <ColorSwatch color={vehicle.color} />
                </Row>
                <Row label="اللوحة">
                  <PlateChip plate={vehicle.plate} />
                </Row>
              </div>
            ) : (
              <div className="space-y-2">
                <Row label="اللوحة" className="py-0">
                  <PlateChip plate={order.plate} />
                </Row>
                <p className="text-xs text-muted-foreground">لا توجد سيارة محفوظة مرتبطة بالحجز — اللوحة مسجلة على الحجز فقط.</p>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="المغسلة والفرع"
            icon={<Store />}
            action={business.status !== "active" ? <StatusBadge meta={BUSINESS_STATUS[business.status]} size="sm" /> : null}
          >
            <div className="divide-y divide-border/60">
              <Row label="المغسلة">
                <Link href={`/washes/${business.id}`} className="hover:text-primary hover:underline">
                  {business.name.ar}
                </Link>
              </Row>
              <Row label="الفرع">
                <span className="block truncate">{branch.name.ar}</span>
              </Row>
              <Row label="المنطقة">{AREAS[branch.area] ?? branch.area}</Row>
              <Row label="هاتف الفرع">
                <span className="num" dir="ltr">
                  {branch.phone}
                </span>
              </Row>
            </div>
          </SectionCard>

          <SectionCard title="الموظف المسؤول" icon={<Wrench />}>
            {staff ? (
              <div className="flex items-center gap-3">
                <UserAvatar name={staff.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{staff.name}</p>
                  <p className="num text-xs text-muted-foreground" dir="ltr">
                    {staff.phone}
                  </p>
                </div>
                <StatusBadge meta={STAFF_ROLE[staff.role]} size="sm" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">لم يُعيَّن موظف لهذا الحجز بعد.</p>
            )}
          </SectionCard>

          <SectionCard title="الدفع" icon={<Banknote />} action={<StatusBadge meta={PAYMENT_STATUS[order.paymentStatus]} size="sm" />}>
            <div className="divide-y divide-border/60">
              <Row label="طريقة الدفع">{order.paymentMethod ? PAYMENT_METHOD[order.paymentMethod] : "—"}</Row>
              <Row label="قيمة الحجز">
                <span className="num">{formatMoney(order.total, { decimals: true })}</span>
              </Row>
              {payment ? (
                <>
                  <Row label="المبلغ المحصّل">
                    <span className="num">{formatMoney(payment.amount, { decimals: true })}</span>
                  </Row>
                  <Row label="وقت التحصيل">
                    <span className="num text-xs">{formatDateTime(payment.collectedAt)}</span>
                  </Row>
                  {staff && payment.collectedBy === staff.id ? <Row label="حصّلها">{staff.name}</Row> : null}
                  {paymentGap !== 0 ? (
                    <div className="-mx-2 mt-1 flex items-center justify-between gap-2 rounded-lg border-0 bg-warning/10 px-2 py-2 text-sm text-warning">
                      <span className="flex items-center gap-1.5 text-xs font-semibold">
                        <AlertTriangle className="size-3.5" />
                        فرق في التحصيل
                      </span>
                      <span className="num font-semibold">
                        {paymentGap > 0 ? "+" : "−"} {formatMoney(Math.abs(paymentGap), { decimals: true })}
                      </span>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="pt-2 text-xs text-muted-foreground">لم يتم تسجيل تحصيل لهذا الحجز بعد.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="المعاملة المالية"
            icon={<Landmark />}
            action={transaction ? <StatusBadge meta={TRANSACTION_STATUS[transaction.status]} size="sm" /> : null}
          >
            {transaction ? (
              <div className="divide-y divide-border/60">
                <Row label="إجمالي المعاملة">
                  <span className="num">{formatMoney(transaction.gross, { decimals: true })}</span>
                </Row>
                <Row label="نسبة العمولة">
                  <span className="num">{formatPercent(transaction.commissionRate)}</span>
                </Row>
                <Row label="عمولة المنصة">
                  <span className="num text-aqua">{formatMoney(transaction.commission, { decimals: true })}</span>
                </Row>
                <Row label="صافي المغسلة">
                  <span className="num font-bold">{formatMoney(transaction.netToWash, { decimals: true })}</span>
                </Row>
                {transaction.flag === "discrepancy" ? (
                  <div className="pt-2">
                    <StatusBadge size="sm" label="فرق مالي قيد المراجعة" tone="var(--warning)" />
                    {transaction.reviewNote ? <p className="mt-1.5 text-xs text-muted-foreground">{transaction.reviewNote}</p> : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">لا توجد معاملة مالية لهذا الحجز — تُنشأ عند اكتمال الخدمة.</p>
            )}
          </SectionCard>
        </aside>
      </div>

      <ReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={`إلغاء الحجز ${order.number}`}
        description="سيتم إلغاء الحجز فورًا وإبلاغ العميل والمغسلة، ولا يمكن التراجع عن الإلغاء."
        textLabel="سبب الإلغاء (يُرسل للطرفين ويُسجل في سجل التدقيق)"
        textPlaceholder="مثال: طلب العميل عبر الدعم بسبب ظرف طارئ"
        confirmLabel="تأكيد الإلغاء"
        variant="destructive"
        isPending={cancel.isPending}
        onConfirm={({ text }) => cancel.mutate({ reason: text }, { onSuccess: () => setCancelOpen(false) })}
      />
      <ReasonDialog
        open={flagOpen}
        onOpenChange={setFlagOpen}
        title={`تحويل ${order.number} للمراجعة المالية`}
        description="سيُبلَّغ فريق المالية لمراجعة المبلغ والتحصيل والعمولة. لا يغيّر التحويل حالة الحجز أو المعاملة."
        textLabel="ما الذي يحتاج للمراجعة؟"
        textPlaceholder="مثال: المبلغ المحصّل أقل من قيمة الحجز بـ 20 ج.م"
        confirmLabel="تحويل للمالية"
        isPending={flag.isPending}
        onConfirm={({ text }) => flag.mutate({ reason: text }, { onSuccess: () => setFlagOpen(false) })}
      />
    </div>
  );
}
