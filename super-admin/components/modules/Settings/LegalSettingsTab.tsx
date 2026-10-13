"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { FileText, ShieldCheck } from "lucide-react";

import { describedBy, FormField } from "@/components/modules/Settings/FormField";
import { SaveSectionDialog, SettingsSaveBar } from "@/components/modules/Settings/SettingsSaveBar";
import { useSaveSection } from "@/components/modules/Settings/use-save-section";
import { SectionCard } from "@/components/shared/section-card";
import { Textarea } from "@/components/ui/textarea";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PlatformSettings } from "@/types/settings";

type Legal = PlatformSettings["legal"];

const MIN = 20;
const MAX = 10_000;

const text = (lang: "ar" | "en") =>
  z
    .string()
    .trim()
    .min(MIN, lang === "ar" ? `النص قصير جدًا (${MIN} حرفًا على الأقل)` : `Too short (at least ${MIN} characters)`)
    .max(MAX, lang === "ar" ? `النص أطول من الحد المسموح (${MAX} حرف)` : `Too long (max ${MAX} characters)`);

const schema = z.object({
  termsAr: text("ar"),
  termsEn: text("en"),
  privacyAr: text("ar"),
  privacyEn: text("en"),
});

type Values = z.infer<typeof schema>;
type FieldKey = keyof Values;

const toForm = (v: Legal): Values => ({ termsAr: v.terms.ar, termsEn: v.terms.en, privacyAr: v.privacy.ar, privacyEn: v.privacy.en });
const fromForm = (v: Values): Legal => ({ terms: { ar: v.termsAr, en: v.termsEn }, privacy: { ar: v.privacyAr, en: v.privacyEn } });

const DOCS: { title: string; description: string; icon: React.ReactNode; ar: FieldKey; en: FieldKey }[] = [
  { title: "الشروط والأحكام", description: "شروط استخدام الخدمة كما تُعرض للعميل في التطبيق.", icon: <FileText />, ar: "termsAr", en: "termsEn" },
  { title: "سياسة الخصوصية", description: "توضح للعميل البيانات التي نحتفظ بها وكيف نستخدمها.", icon: <ShieldCheck />, ar: "privacyAr", en: "privacyEn" },
];

type LegalSettingsTabProps = {
  value: Legal;
  onDirtyChange: (dirty: boolean) => void;
};

export function LegalSettingsTab({ value, onDirtyChange }: LegalSettingsTabProps) {
  const saver = useSaveSection("legal");
  const [pending, setPending] = useState<Values | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toForm(value) });
  const live = useWatch({ control });

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

  const onSubmit = handleSubmit((v) => {
    setPending(v);
    saver.setReasonOpen(true);
  });

  const counter = (key: FieldKey) => {
    const len = live[key]?.length ?? 0;
    return (
      <span className={cn("num text-[11px]", len > MAX || len < MIN ? "text-destructive" : "text-muted-foreground")} aria-live="polite">
        {formatNumber(len)} / {formatNumber(MAX)}
      </span>
    );
  };

  const area = (key: FieldKey, label: string, lang: "ar" | "en") => {
    const error = errors[key]?.message;
    return (
      <FormField id={key} label={label} error={error} aside={counter(key)} hint={dirtyFields[key] ? "معدّل — لم يُحفظ بعد" : undefined}>
        <Textarea
          id={key}
          dir={lang === "en" ? "ltr" : "rtl"}
          rows={9}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(key, error, Boolean(dirtyFields[key]))}
          className={cn("max-h-[420px] min-h-48 resize-y leading-relaxed", dirtyFields[key] && !error && "border-warning/60")}
          {...register(key)}
        />
      </FormField>
    );
  };

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <p className="rounded-xl border border-border/80 bg-muted/40 px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
          النصوص تظهر كما هي في تطبيق العميل حسب لغة المستخدم. راجع النسختين العربية والإنجليزية معًا حتى تبقى متطابقتين في المعنى.
        </p>
        {DOCS.map((doc) => (
          <SectionCard key={doc.ar} icon={doc.icon} title={doc.title} description={doc.description}>
            <div className="grid gap-4 lg:grid-cols-2">
              {area(doc.ar, "النص العربي", "ar")}
              {area(doc.en, "English text", "en")}
            </div>
          </SectionCard>
        ))}

        <SettingsSaveBar
          dirty={isDirty}
          changeCount={Object.keys(dirtyFields).length}
          isPending={saver.isPending}
          onReset={() => reset(toForm(value))}
        />
      </form>

      <SaveSectionDialog
        open={saver.reasonOpen}
        onOpenChange={saver.setReasonOpen}
        sectionLabel="النصوص القانونية"
        impact="يظهر النص الجديد فورًا لكل مستخدمي تطبيق العميل. تُحفظ النسخة السابقة في سجل التدقيق."
        isPending={saver.isPending}
        onConfirm={(reason) => pending && saver.save(fromForm(pending), reason, (saved) => reset(toForm(saved)))}
      />
    </>
  );
}
