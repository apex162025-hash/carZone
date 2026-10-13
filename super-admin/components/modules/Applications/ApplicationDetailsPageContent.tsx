"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  Building2,
  CalendarClock,
  CarFront,
  CheckCircle2,
  Clock,
  ExternalLink,
  FilePen,
  FileText,
  FolderOpen,
  MapPin,
  Sparkles,
  XCircle,
} from "lucide-react";

import { ReviewDecisionPanel } from "@/components/modules/Applications/ReviewDecisionPanel";
import {
  arCount,
  DAYS_FORMS,
  estimateDailyCars,
  FILES_FORMS,
  formatClock,
  openMinutes,
  SERVICES_FORMS,
  summarizeHours,
  waitingLabel,
  waitingTone,
} from "@/components/modules/Applications/review-utils";
import { InfoList } from "@/components/shared/info-list";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { DetailSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { useApplication } from "@/hooks/use-applications";
import { APPLICATION_STATUS, AREAS, TONES, WEEK_DAYS } from "@/lib/constants/labels";
import { daysBetween, formatDate, formatDateTime, formatDuration, formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WashApplication } from "@/types/applications";

const BANNER: Record<Exclude<WashApplication["status"], "pending">, { tone: string; icon: ReactNode; title: string; hint: string }> = {
  needs_changes: {
    tone: TONES.violet,
    icon: <FilePen />,
    title: "بانتظار تعديلات من المالك",
    hint: "ما زال بإمكانك الموافقة أو الرفض إذا وصلتك التعديلات المطلوبة.",
  },
  approved: {
    tone: TONES.success,
    icon: <CheckCircle2 />,
    title: "تمت الموافقة على الطلب",
    hint: "المغسلة أُنشئت على المنصة.",
  },
  rejected: {
    tone: TONES.danger,
    icon: <XCircle />,
    title: "تم رفض الطلب",
    hint: "تم إبلاغ المالك بالسبب التالي.",
  },
};

function DecisionBanner({ application }: { application: WashApplication }) {
  if (application.status === "pending") return null;
  const b = BANNER[application.status];
  return (
    <div
      style={{ "--tone": b.tone } as CSSProperties}
      className="flex items-start gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--tone)_30%,transparent)] bg-[color-mix(in_oklab,var(--tone)_6%,transparent)] p-4"
    >
      <span className="mt-0.5 shrink-0 text-[var(--tone)] [&_svg]:size-5">{b.icon}</span>
      <div className="min-w-0 flex-1 space-y-1 text-sm">
        <p className="flex flex-wrap items-center gap-x-2 font-semibold text-[var(--tone)]">
          {b.title}
          {application.reviewedAt ? (
            <span className="num text-xs font-normal text-muted-foreground">{formatDateTime(application.reviewedAt)}</span>
          ) : null}
        </p>
        <p className="text-xs text-muted-foreground">{b.hint}</p>
        {application.reviewNote ? (
          <p className="mt-1.5 rounded-lg bg-card/70 px-3 py-2 text-sm leading-relaxed">{application.reviewNote}</p>
        ) : null}
      </div>
    </div>
  );
}

export default function ApplicationDetailsPageContent({ id }: { id: string }) {
  const { data: app, isLoading, error, refetch, isRefetching } = useApplication(id);

  if (isLoading) return <DetailSkeleton />;
  if (error || !app) {
    return (
      <div className="space-y-6">
        <PageHeader back={{ href: "/applications", label: "طلبات الانضمام" }} title="مراجعة طلب" />
        <ErrorState message={error?.message} onRetry={() => refetch()} isRetrying={isRefetching} />
      </div>
    );
  }

  const days = daysBetween(app.submittedAt);
  const hours = summarizeHours(app.workingHours);
  const dailyCars = estimateDailyCars(app.capacity, app.services, hours.avgDailyMinutes);
  const prices = app.services.map((s) => s.price);
  const mapsHref = `https://www.google.com/maps?q=${app.lat},${app.lng}`;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/applications", label: "طلبات الانضمام" }}
        eyebrow={<span className="num">{app.id}</span>}
        title={app.businessName}
        meta={
          <>
            <StatusBadge meta={APPLICATION_STATUS[app.status]} />
            {app.status === "pending" ? <StatusBadge label={waitingLabel(days)} tone={waitingTone(days)} /> : null}
          </>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5">
              <UserAvatar name={app.ownerName} size="xs" />
              {app.ownerName}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {AREAS[app.area] ?? app.area}
            </span>
            <span>قُدّم في {formatDate(app.submittedAt, { withYear: true })}</span>
          </span>
        }
      />

      <DecisionBanner application={app} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <SectionCard title="المغسلة والمالك" description="بيانات التسجيل كما أدخلها المالك" icon={<Building2 />}>
            <InfoList
              items={[
                { label: "اسم المغسلة", value: app.businessName },
                {
                  label: "المالك",
                  value: (
                    <span className="flex items-center gap-2">
                      <UserAvatar name={app.ownerName} size="xs" />
                      {app.ownerName}
                    </span>
                  ),
                },
                {
                  label: "الهاتف",
                  value: (
                    <a href={`tel:${app.phone.replace(/\s+/g, "")}`} className="num text-primary hover:underline" dir="ltr">
                      {app.phone}
                    </a>
                  ),
                },
                {
                  label: "البريد الإلكتروني",
                  value: (
                    <a href={`mailto:${app.email}`} className="num text-primary hover:underline" dir="ltr">
                      {app.email}
                    </a>
                  ),
                },
                { label: "تاريخ التقديم", value: <span className="num">{formatDateTime(app.submittedAt)}</span> },
                { label: "رقم الطلب", value: <span className="num">{app.id}</span> },
              ]}
            />
          </SectionCard>

          <SectionCard
            title="الموقع"
            description="تحقق أن الإحداثيات تطابق العنوان المكتوب"
            icon={<MapPin />}
            action={
              <Button variant="outline" size="sm" render={<a href={mapsHref} target="_blank" rel="noopener noreferrer" />}>
                <ExternalLink />
                فتح في خرائط Google
              </Button>
            }
          >
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <InfoList
                items={[
                  { label: "العنوان", value: app.address, full: true },
                  { label: "المنطقة", value: AREAS[app.area] ?? app.area },
                  {
                    label: "الإحداثيات",
                    value: (
                      <span className="num" dir="ltr">
                        {app.lat.toFixed(4)}, {app.lng.toFixed(4)}
                      </span>
                    ),
                  },
                ]}
              />
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`فتح موقع ${app.businessName} في خرائط Google`}
                className="group relative flex min-h-28 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary/60 transition-colors hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
              >
                <span className="absolute inset-0 bg-grid-faint bg-[size:18px_18px] opacity-80" aria-hidden />
                <span className="relative flex flex-col items-center gap-1.5 text-xs font-medium text-secondary-foreground">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-raised transition-transform group-hover:-translate-y-0.5">
                    <MapPin className="size-4" />
                  </span>
                  عرض الدبوس على الخريطة
                </span>
              </a>
            </div>
          </SectionCard>

          <SectionCard
            title="الخدمات والأسعار"
            description={
              prices.length ? (
                <span className="num">
                  {arCount(app.services.length, SERVICES_FORMS)} · من {formatMoney(Math.min(...prices))} إلى {formatMoney(Math.max(...prices))}
                </span>
              ) : undefined
            }
            icon={<Sparkles />}
            flush
          >
            {app.services.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-y border-border bg-muted/50 text-xs text-muted-foreground">
                      <th className="px-5 py-2.5 text-start font-medium">الخدمة</th>
                      <th className="px-4 py-2.5 text-end font-medium">المدة</th>
                      <th className="px-5 py-2.5 text-end font-medium">السعر</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {app.services.map((s, i) => (
                      <tr key={`${s.name}-${i}`}>
                        <td className="px-5 py-3 font-medium">{s.name}</td>
                        <td className="num px-4 py-3 text-end text-muted-foreground">{formatDuration(s.durationMin)}</td>
                        <td className="num px-5 py-3 text-end font-semibold">{formatMoney(s.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon={<Sparkles />} title="لم يضف المالك أي خدمة" description="اطلب تعديلات من المالك لإضافة الخدمات وأسعارها قبل الموافقة." />
            )}
          </SectionCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="ساعات العمل"
              description={
                <span className="num">
                  مفتوح {arCount(hours.openDays, DAYS_FORMS)} · {formatDuration(hours.weeklyMinutes)} أسبوعيًا
                </span>
              }
              icon={<Clock />}
            >
              <ul className="divide-y divide-border/60 text-sm">
                {WEEK_DAYS.map((day, i) => {
                  const d = app.workingHours[i];
                  const closed = !d || d.closed;
                  return (
                    <li key={day} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                      <span className={cn("font-medium", closed && "text-muted-foreground")}>{day}</span>
                      {closed ? (
                        <StatusBadge size="sm" label="مغلق" tone={TONES.neutral} />
                      ) : (
                        <span className="num text-xs text-muted-foreground">
                          {formatClock(d.open)} – {formatClock(d.close)}
                          <span className="ms-2 rounded bg-muted px-1.5 py-px text-[11px]">{formatDuration(openMinutes(d))}</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </SectionCard>

            <div className="space-y-6">
              <SectionCard title="السعة" description="عدد السيارات التي يمكن خدمتها في نفس الوقت" icon={<CarFront />}>
                <div className="flex items-end justify-between gap-4">
                  <p>
                    <span className="num text-3xl font-bold tracking-tight">{app.capacity}</span>
                    <span className="ms-1.5 text-sm text-muted-foreground">{app.capacity >= 3 && app.capacity <= 10 ? "أماكن غسيل" : "مكان غسيل"}</span>
                  </p>
                  {dailyCars ? (
                    <div className="rounded-xl bg-muted/60 px-3 py-2 text-end text-xs">
                      <p className="text-muted-foreground">طاقة يومية تقديرية</p>
                      <p className="num mt-0.5 text-sm font-semibold">≈ {formatNumber(dailyCars)} سيارة</p>
                    </div>
                  ) : null}
                </div>
                <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  <CalendarClock className="mt-px size-3.5 shrink-0" />
                  التقدير = السعة × متوسط ساعات الفتح ÷ متوسط مدة الخدمة. للاسترشاد فقط.
                </p>
              </SectionCard>

              <SectionCard
                title="المستندات"
                description={app.documents.length ? <span className="num">{arCount(app.documents.length, FILES_FORMS)} مرفوعة</span> : undefined}
                icon={<FolderOpen />}
              >
                {app.documents.length ? (
                  <ul className="flex flex-wrap gap-2">
                    {app.documents.map((doc) => (
                      <li
                        key={doc}
                        className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs font-medium"
                      >
                        <FileText className="size-3.5 shrink-0 text-primary" />
                        <span className="truncate">{doc}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={<FolderOpen />}
                    title="لا توجد مستندات"
                    description="لا يمكن اعتماد المغسلة بدون السجل التجاري والبطاقة الضريبية — اطلب من المالك رفعها."
                    className="py-6"
                  />
                )}
              </SectionCard>
            </div>
          </div>
        </div>

        <ReviewDecisionPanel application={app} className="xl:sticky xl:top-24" />
      </div>
    </div>
  );
}
