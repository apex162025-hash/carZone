"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { BadgeCheck, Hourglass, Inbox, Settings2, Store } from "lucide-react";

import { SectionCard } from "@/components/shared/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { TONES } from "@/lib/constants/labels";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ApplicationListMeta, ApplicationStatus } from "@/types/applications";

type Pipeline = ApplicationListMeta["pipeline"];

type Step = {
  key: keyof Pipeline;
  label: string;
  hint: string;
  icon: ReactNode;
  tone: string;
  /** In-page filter (queue tabs) … */
  status?: ApplicationStatus | "all";
  /** … or a deep link to the washes list. */
  href?: string;
};

const STEPS: Step[] = [
  { key: "submitted", label: "طلبات مقدّمة", hint: "إجمالي ما وصل للمنصة", icon: <Inbox />, tone: TONES.primary, status: "all" },
  { key: "pendingReview", label: "قيد المراجعة", hint: "يشمل المطلوب تعديلها", icon: <Hourglass />, tone: TONES.warning, status: "pending" },
  { key: "approved", label: "تمت الموافقة", hint: "طلبات معتمدة", icon: <BadgeCheck />, tone: TONES.info, status: "approved" },
  { key: "onboarding", label: "قيد الإعداد", hint: "معتمدة ولم تُفعّل بعد", icon: <Settings2 />, tone: TONES.violet, href: "/washes?status=approved" },
  { key: "active", label: "نشطة", hint: "تظهر للعملاء الآن", icon: <Store />, tone: TONES.success, href: "/washes?status=active" },
];

type OnboardingPipelineProps = {
  pipeline: Pipeline | undefined;
  isLoading: boolean;
  activeStatus: string;
  onSelectStatus: (status: ApplicationStatus | "all") => void;
};

/** AD-18: Submitted → Pending review → Approved → Onboarding → Active, with counts. */
export function OnboardingPipeline({ pipeline, isLoading, activeStatus, onSelectStatus }: OnboardingPipelineProps) {
  return (
    <SectionCard title="مسار الانضمام" description="من تقديم الطلب حتى ظهور المغسلة للعملاء — اضغط على مرحلة لعرضها">
      <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
        <ol className="grid min-w-[600px] grid-cols-5">
          {STEPS.map((step, i) => {
            const selected = step.status !== undefined && step.status === activeStatus;
            const inner = (
              <>
                <span
                  style={{ "--tone": step.tone } as CSSProperties}
                  className={cn(
                    "tone-soft tone-ring relative z-[1] flex size-10 items-center justify-center rounded-full bg-card transition-transform group-hover:scale-105 [&_svg]:size-[18px]",
                    selected && "ring-2 ring-[var(--tone)] ring-offset-2 ring-offset-card",
                  )}
                >
                  {step.icon}
                </span>
                {isLoading || !pipeline ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <span className="num text-xl leading-6 font-bold">{formatNumber(pipeline[step.key])}</span>
                )}
                <span className="text-xs font-semibold">{step.label}</span>
                <span className="hidden text-[11px] leading-4 text-muted-foreground md:block">{step.hint}</span>
              </>
            );
            const classes = cn(
              "group flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-xl px-2 py-1.5 text-center transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
              selected && "bg-muted/60",
            );
            return (
              <li key={step.key} className="relative">
                {i < STEPS.length - 1 ? (
                  <span aria-hidden className="absolute start-[calc(50%+28px)] end-[calc(28px-50%)] top-[26px] border-t border-dashed border-border" />
                ) : null}
                {step.href ? (
                  <Link href={step.href} className={classes}>
                    {inner}
                  </Link>
                ) : (
                  <button type="button" className={classes} aria-pressed={selected} onClick={() => step.status && onSelectStatus(step.status)}>
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </SectionCard>
  );
}
