"use client";

import Link from "next/link";
import { Ban, CalendarCog, CalendarDays, Car, Clock, Lock, MapPin, Pencil, Phone } from "lucide-react";

import { RatingStars } from "@carzen/ui/components/shared/rating-stars";
import { StatusBadge } from "@carzen/ui/components/shared/status-badge";
import { Button } from "@carzen/ui/components/ui/button";
import { AMENITY, AREAS, BRANCH_STATUS } from "@carzen/ui/lib/constants/labels";
import { formatDuration, formatNumber } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import { weeklySummary } from "@/components/modules/Branches/branch-utils";
import type { VendorBranch } from "@carzen/contracts/vendor/catalog";

type BranchCardProps = {
  branch: VendorBranch;
  canEdit: boolean;
  nowMs: number;
  onEdit: () => void;
  onRules: () => void;
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/50 px-3 py-2.5">
      <p className="num text-lg leading-tight font-bold">{formatNumber(value)}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function rulesSummary(b: VendorBranch): string[] {
  const s = b.settings;
  return [
    s.autoConfirm ? "تأكيد تلقائي" : "تأكيد يدوي",
    `فترة ${s.slotIntervalMin} د`,
    s.leadTimeMin ? `حجز قبل الموعد بـ ${formatDuration(s.leadTimeMin)}` : "حجز فوري مسموح",
    `حتى ${s.maxAdvanceDays} ${s.maxAdvanceDays <= 10 ? "أيام" : "يوم"} مقدمًا`,
    s.freeCancelMin ? `إلغاء مجاني قبل ${formatDuration(s.freeCancelMin)}` : "بدون إلغاء مجاني",
    `مهلة عدم الحضور ${formatDuration(s.noShowGraceMin)}`,
    `تذكير قبل ${formatDuration(s.reminderMin)}`,
  ];
}

/** D16 branch card: identity, today's load, amenities, hours and booking rules at a glance. */
export function BranchCard({ branch: b, canEdit, nowMs, onEdit, onRules }: BranchCardProps) {
  const upcomingBlocks = b.blockedSlots.filter((s) => new Date(s.end).getTime() > nowMs).length;
  const hours = weeklySummary(b.workingHours);

  return (
    <article className={cn("flex flex-col rounded-2xl border border-border/80 bg-card shadow-soft", !b.active && "bg-muted/20")}>
      <header className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", b.active ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground")}>
            <MapPin className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{b.name.ar}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>{AREAS[b.area] ?? b.area}</span>
              <span aria-hidden>·</span>
              {b.reviewCount ? (
                <span className="flex items-center gap-1">
                  <RatingStars value={b.rating} showValue />
                  <span className="num">({formatNumber(b.reviewCount)})</span>
                </span>
              ) : (
                <span>لا تقييمات بعد</span>
              )}
            </div>
          </div>
        </div>
        <StatusBadge meta={BRANCH_STATUS[b.active ? "active" : "inactive"]} />
      </header>

      <dl className="mt-4 grid gap-2 px-5 text-sm sm:grid-cols-2">
        <div className="flex min-w-0 items-start gap-2 sm:col-span-2">
          <dt className="sr-only">العنوان</dt>
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <dd className="min-w-0 break-words">{b.address.ar}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">الهاتف</dt>
          <Phone className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <dd className="num" dir="ltr">
            {b.phone || "—"}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">السعة</dt>
          <Car className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <dd>
            <span className="num font-semibold">{b.capacity}</span> أماكن غسيل
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-2 px-5 sm:grid-cols-4">
        <Stat label="طلبات اليوم" value={b.todayOrders} />
        <Stat label="حجوزات قادمة" value={b.upcomingOrders} />
        <Stat label="خدمة مفعّلة" value={b.servicesCount} />
        <Stat label="موظف نشط" value={b.staffCount} />
      </div>

      <div className="mt-4 grid gap-4 px-5 md:grid-cols-2">
        <section aria-label="ساعات العمل">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
            <Clock className="size-3.5 text-muted-foreground" /> ساعات العمل
          </p>
          <ul className="space-y-1 text-xs">
            {hours.map((h) => (
              <li key={h.days} className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-muted-foreground">{h.days}</span>
                <span className={cn("num", h.closed ? "text-destructive" : "font-medium")}>{h.hours}</span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-label="المرافق">
          <p className="mb-2 text-xs font-semibold">المرافق</p>
          {b.amenities.length ? (
            <div className="flex flex-wrap gap-1.5">
              {b.amenities.map((a) => (
                <span key={a} className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px]">
                  {AMENITY[a] ?? a}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">لم تُحدد مرافق — أضفها ليعرف العملاء ما يقدمه الفرع.</p>
          )}
        </section>
      </div>

      <section aria-label="قواعد الحجز" className="mx-5 mt-4 rounded-xl border border-dashed border-border px-3 py-2.5">
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
          <CalendarCog className="size-3.5 text-muted-foreground" /> قواعد الحجز
        </p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{rulesSummary(b).join(" · ")}</p>
      </section>

      {upcomingBlocks ? (
        <Link
          href={`/schedule?branch=${b.id}`}
          className="mx-5 mt-3 flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs transition-colors hover:bg-muted"
        >
          <Ban className="size-3.5 text-muted-foreground" />
          <span>
            <span className="num font-semibold">{upcomingBlocks}</span> فترة محجوبة قادمة
          </span>
          <span className="ms-auto font-medium text-primary">عرض في الجدول</span>
        </Link>
      ) : null}

      <div className="min-h-5 flex-1" aria-hidden />
      <footer className="flex flex-wrap items-center gap-2 border-t border-border/60 px-5 py-3">
        {canEdit ? (
          <>
            <Button size="sm" onClick={onEdit}>
              <Pencil /> تعديل الفرع
            </Button>
            <Button size="sm" variant="outline" onClick={onRules}>
              <CalendarCog /> قواعد الحجز
            </Button>
          </>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" /> التعديل للمالك فقط
          </span>
        )}
        <Button size="sm" variant="ghost" className="ms-auto" render={<Link href={`/schedule?branch=${b.id}`} />}>
          <CalendarDays /> الجدول
        </Button>
      </footer>
    </article>
  );
}
