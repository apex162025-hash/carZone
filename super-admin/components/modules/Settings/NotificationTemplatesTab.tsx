import { Fragment } from "react";
import { BellRing, Eye } from "lucide-react";

import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { TONES } from "@/lib/constants/labels";
import type { Localized } from "@/types/common";
import type { PlatformSettings } from "@/types/settings";

type Template = PlatformSettings["notificationTemplates"][number];

const EVENT_LABEL: Record<string, string> = {
  "booking.confirmed": "تأكيد الحجز",
  "booking.reminder": "تذكير بالموعد",
  "booking.cancelled": "إلغاء الحجز",
  "application.approved": "قبول طلب الانضمام",
  "wash.suspended": "تعليق المغسلة",
  "complaint.resolved": "حل الشكوى",
};

const AUDIENCE: Record<string, { label: string; tone: string }> = {
  customer: { label: "العميل", tone: TONES.info },
  owner: { label: "مالك المغسلة", tone: TONES.primary },
  staff: { label: "طاقم الفرع", tone: TONES.violet },
  admin: { label: "الإدارة", tone: TONES.neutral },
};

const VAR_RE = /(\{\{\s*[\w.]+\s*\}\})/g;
// Non-global twin for testing single parts (a /g regex keeps `lastIndex` between calls).
const IS_VAR = /^\{\{\s*[\w.]+\s*\}\}$/;

/** Renders template text with `{{variables}}` as highlighted chips. */
function TemplateText({ text }: { text: string }) {
  const parts = text.split(VAR_RE);
  return (
    <>
      {parts.map((part, i) =>
        IS_VAR.test(part) ? (
          <code
            key={i}
            dir="ltr"
            className="num mx-0.5 inline-block rounded-md bg-primary/10 px-1.5 py-px align-baseline text-[11px] font-medium text-primary"
          >
            {part.replace(/[{}\s]/g, "")}
          </code>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function variablesOf(t: Template) {
  const all = [t.title.ar, t.title.en, t.body.ar, t.body.en].join(" ").match(VAR_RE) ?? [];
  return [...new Set(all.map((v) => v.replace(/[{}\s]/g, "")))];
}

function LangBlock({ lang, title, body }: { lang: "ar" | "en"; title: Localized; body: Localized }) {
  return (
    <div dir={lang === "en" ? "ltr" : "rtl"} lang={lang} className="rounded-xl border border-border/80 bg-muted/40 p-3">
      <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{lang === "ar" ? "العربية" : "English"}</p>
      <p className="text-sm font-semibold">
        <TemplateText text={title[lang]} />
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        <TemplateText text={body[lang]} />
      </p>
    </div>
  );
}

export function NotificationTemplatesTab({ templates }: { templates: Template[] }) {
  if (!templates.length) {
    return (
      <SectionCard>
        <EmptyState icon={<BellRing />} title="لا توجد قوالب إشعارات" description="عند إضافة قوالب للمنصة ستظهر معاينتها هنا بالعربية والإنجليزية." />
      </SectionCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <Eye className="mt-0.5 size-4 shrink-0" />
        <p>
          معاينة للعرض فقط — تعديل القوالب غير متاح في هذه المرحلة. المتغيرات المميزة مثل{" "}
          <code dir="ltr" className="num rounded-md bg-primary/10 px-1.5 py-px text-[11px] font-medium text-primary">
            branch
          </code>{" "}
          تُستبدل بالقيم الفعلية عند الإرسال.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {templates.map((t) => {
          const audience = AUDIENCE[t.audience] ?? { label: t.audience, tone: TONES.neutral };
          const vars = variablesOf(t);
          return (
            <SectionCard
              key={t.id}
              icon={<BellRing />}
              title={EVENT_LABEL[t.event] ?? t.event}
              description={
                <code className="num" dir="ltr">
                  {t.event}
                </code>
              }
              action={<StatusBadge label={audience.label} tone={audience.tone} size="sm" />}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <LangBlock lang="ar" title={t.title} body={t.body} />
                <LangBlock lang="en" title={t.title} body={t.body} />
              </div>
              {vars.length ? (
                <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  المتغيرات:
                  {vars.map((v) => (
                    <code key={v} dir="ltr" className="num rounded-md bg-muted px-1.5 py-px text-[11px]">
                      {v}
                    </code>
                  ))}
                </p>
              ) : null}
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
