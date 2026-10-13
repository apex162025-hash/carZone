"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Info, MapPin, Plus, Sparkles, Trash2, Wrench } from "lucide-react";

import { SaveSectionDialog, SettingsSaveBar } from "@/components/modules/Settings/SettingsSaveBar";
import { useSaveSection } from "@/components/modules/Settings/use-save-section";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PlatformSettings } from "@/types/settings";

type Catalogs = PlatformSettings["catalogs"];
type CatalogKey = keyof Catalogs;
type CatalogItem = Catalogs[CatalogKey][number];

const SECTIONS: { key: CatalogKey; title: string; description: string; icon: ReactNode; placeholder: { ar: string; en: string } }[] = [
  { key: "areas", title: "المناطق", description: "فلتر المنطقة في تطبيق العميل ومنطقة الفرع عند تسجيل المغسلة.", icon: <MapPin />, placeholder: { ar: "مثال: الرحاب", en: "e.g. Rehab City" } },
  { key: "serviceCategories", title: "فئات الخدمات", description: "تصنيف الخدمات التي تضيفها المغاسل وفلتر نوع الغسيل.", icon: <Wrench />, placeholder: { ar: "مثال: تلميع", en: "e.g. Polishing" } },
  { key: "amenities", title: "المرافق", description: "مزايا الفرع التي تظهر في صفحته وفي فلاتر البحث.", icon: <Sparkles />, placeholder: { ar: "مثال: موقف خاص", en: "e.g. Private parking" } },
];

const NAME_MIN = 2;

function slugify(en: string) {
  return en
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const nameInvalid = (item: CatalogItem) => item.name.ar.trim().length < NAME_MIN || item.name.en.trim().length < NAME_MIN;

function countChanges(draft: Catalogs, base: Catalogs) {
  let n = 0;
  for (const { key } of SECTIONS) {
    const original = new Map(base[key].map((i) => [i.id, i]));
    for (const item of draft[key]) {
      const prev = original.get(item.id);
      if (!prev || !same(prev, item)) n += 1;
    }
  }
  return n;
}

function trimAll(c: Catalogs): Catalogs {
  const trim = (items: CatalogItem[]) => items.map((i) => ({ ...i, name: { ar: i.name.ar.trim(), en: i.name.en.trim() } }));
  return { areas: trim(c.areas), serviceCategories: trim(c.serviceCategories), amenities: trim(c.amenities) };
}

type CatalogSectionProps = {
  section: (typeof SECTIONS)[number];
  items: CatalogItem[];
  original: CatalogItem[];
  onChange: (items: CatalogItem[]) => void;
};

function CatalogSection({ section, items, original, onChange }: CatalogSectionProps) {
  const [newAr, setNewAr] = useState("");
  const [newEn, setNewEn] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const originalById = useMemo(() => new Map(original.map((i) => [i.id, i])), [original]);
  const activeCount = items.filter((i) => i.active).length;
  const slug = slugify(newEn);
  const fid = (suffix: string) => `${section.key}-${suffix}`;

  const patch = (id: string, next: Partial<CatalogItem>) => onChange(items.map((i) => (i.id === id ? { ...i, ...next } : i)));
  const rename = (item: CatalogItem, lang: "ar" | "en", v: string) => patch(item.id, { name: { ...item.name, [lang]: v } });

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (newAr.trim().length < NAME_MIN || newEn.trim().length < NAME_MIN) {
      setAddError("اكتب الاسم بالعربية والإنجليزية (حرفان على الأقل لكل منهما)");
      return;
    }
    if (!slug) {
      setAddError("الاسم الإنجليزي يجب أن يحتوي على حروف لاتينية أو أرقام لتوليد المعرف");
      return;
    }
    if (items.some((i) => i.id === slug)) {
      setAddError(`يوجد عنصر بنفس المعرف «${slug}» — غيّر الاسم الإنجليزي`);
      return;
    }
    onChange([...items, { id: slug, name: { ar: newAr.trim(), en: newEn.trim() }, active: true }]);
    setNewAr("");
    setNewEn("");
    setAddError(null);
  };

  return (
    <SectionCard
      flush
      icon={section.icon}
      title={section.title}
      description={section.description}
      action={
        <span className="num text-xs text-muted-foreground">
          {formatNumber(items.length)} عنصر · {formatNumber(activeCount)} نشط
        </span>
      }
    >
      <div className="hidden grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)_8.5rem] gap-3 border-y border-border bg-muted/50 px-5 py-2 text-xs font-medium text-muted-foreground md:grid">
        <span>المعرف</span>
        <span>الاسم (عربي)</span>
        <span>Name (English)</span>
        <span>الحالة</span>
      </div>

      {items.length ? (
        <ul className="divide-y divide-border/60 border-t border-border md:border-t-0">
          {items.map((item) => {
            const prev = originalById.get(item.id);
            const isNew = !prev;
            const changed = !isNew && !same(prev, item);
            const arInvalid = item.name.ar.trim().length < NAME_MIN;
            const enInvalid = item.name.en.trim().length < NAME_MIN;
            const label = item.name.ar || item.id;
            return (
              <li
                key={item.id}
                className={cn(
                  "grid grid-cols-2 items-center gap-3 px-5 py-3 md:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)_8.5rem]",
                  isNew && "bg-success/[0.05]",
                  changed && "bg-warning/[0.06]",
                )}
              >
                <div className="col-span-2 flex items-center gap-2 md:col-span-1">
                  <code className="num truncate rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground" dir="ltr" title={item.id}>
                    {item.id}
                  </code>
                  {isNew ? <StatusBadge label="جديد" tone="var(--success)" size="sm" /> : null}
                  {changed ? <span className="size-2 shrink-0 rounded-full bg-warning" aria-label="معدّل" /> : null}
                </div>
                <Input
                  value={item.name.ar}
                  onChange={(e) => rename(item, "ar", e.target.value)}
                  aria-label={`الاسم بالعربية — ${item.id}`}
                  aria-invalid={arInvalid}
                  className={cn("h-9", !item.active && "text-muted-foreground")}
                />
                <Input
                  value={item.name.en}
                  onChange={(e) => rename(item, "en", e.target.value)}
                  aria-label={`الاسم بالإنجليزية — ${item.id}`}
                  aria-invalid={enInvalid}
                  dir="ltr"
                  className={cn("h-9", !item.active && "text-muted-foreground")}
                />
                <div className="col-span-2 flex items-center justify-between gap-2 md:col-span-1">
                  <label className="flex cursor-pointer items-center gap-2 text-xs">
                    <Switch checked={item.active} onCheckedChange={(active) => patch(item.id, { active })} aria-label={`تفعيل ${label}`} />
                    <span className={cn(item.active ? "text-foreground" : "text-muted-foreground")}>{item.active ? "نشط" : "معطّل"}</span>
                  </label>
                  {isNew ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onChange(items.filter((i) => i.id !== item.id))}
                      aria-label={`إزالة ${label}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  ) : null}
                </div>
                {arInvalid || enInvalid ? <p className="col-span-full text-xs text-destructive">الاسم مطلوب بالعربية والإنجليزية (حرفان على الأقل).</p> : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState className="border-t border-border py-8" title={`لا توجد ${section.title} بعد`} description="أضف أول عنصر من الحقل بالأسفل." />
      )}

      <form onSubmit={add} noValidate className="space-y-2 rounded-b-2xl border-t border-dashed border-border bg-muted/30 px-5 py-3.5">
        <p className="text-xs font-medium">إضافة إلى {section.title}</p>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Input
            id={fid("new-ar")}
            value={newAr}
            onChange={(e) => {
              setNewAr(e.target.value);
              setAddError(null);
            }}
            placeholder={section.placeholder.ar}
            aria-label={`الاسم بالعربية — ${section.title} جديد`}
            aria-invalid={Boolean(addError)}
            aria-describedby={fid("new-help")}
            className="h-9 bg-card"
          />
          <Input
            id={fid("new-en")}
            value={newEn}
            onChange={(e) => {
              setNewEn(e.target.value);
              setAddError(null);
            }}
            placeholder={section.placeholder.en}
            aria-label={`الاسم بالإنجليزية — ${section.title} جديد`}
            aria-invalid={Boolean(addError)}
            aria-describedby={fid("new-help")}
            dir="ltr"
            className="h-9 bg-card"
          />
          <Button type="submit" variant="outline" size="lg">
            <Plus />
            إضافة
          </Button>
        </div>
        <p id={fid("new-help")} className={cn("text-[11px]", addError ? "text-destructive" : "text-muted-foreground")}>
          {addError ?? (
            <>
              المعرف يُولد من الاسم الإنجليزي ولا يمكن تغييره لاحقًا:{" "}
              <code className="num rounded bg-card px-1 py-px" dir="ltr">
                {slug || "…"}
              </code>
            </>
          )}
        </p>
      </form>
    </SectionCard>
  );
}

type CatalogsSettingsTabProps = {
  value: Catalogs;
  onDirtyChange: (dirty: boolean) => void;
};

export function CatalogsSettingsTab({ value, onDirtyChange }: CatalogsSettingsTabProps) {
  const saver = useSaveSection("catalogs");
  const [draft, setDraft] = useState<Catalogs | null>(null);
  const current = draft ?? value;
  const changeCount = useMemo(() => (draft ? countChanges(draft, value) : 0), [draft, value]);
  const dirty = changeCount > 0;
  const hasInvalid = SECTIONS.some(({ key }) => current[key].some(nameInvalid));

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-info/30 bg-info/5 px-4 py-3 text-xs leading-relaxed">
        <Info className="mt-0.5 size-4 shrink-0 text-info" />
        <p>
          <span className="font-semibold">الكتالوجات مصدر فلاتر تطبيق العميل ونماذج المغاسل</span> — تنعكس التغييرات فور الحفظ. العنصر المعطّل يختفي من
          الفلاتر والاختيارات الجديدة، ولا يُحذف من بيانات المغاسل الحالية.
        </p>
      </div>

      {SECTIONS.map((section) => (
        <CatalogSection
          key={section.key}
          section={section}
          items={current[section.key]}
          original={value[section.key]}
          onChange={(items) => setDraft({ ...current, [section.key]: items })}
        />
      ))}

      <SettingsSaveBar
        dirty={dirty}
        changeCount={changeCount}
        blockedReason={hasInvalid ? "أكمل الأسماء الفارغة قبل الحفظ" : null}
        isPending={saver.isPending}
        onReset={() => setDraft(null)}
        onSave={() => saver.setReasonOpen(true)}
      />

      <SaveSectionDialog
        open={saver.reasonOpen}
        onOpenChange={saver.setReasonOpen}
        sectionLabel="الكتالوجات"
        impact="تتحدث فلاتر تطبيق العميل واختيارات نماذج المغاسل فورًا. تُسجل القوائم القديمة والجديدة في سجل التدقيق."
        isPending={saver.isPending}
        onConfirm={(reason) => saver.save(trimAll(current), reason, () => setDraft(null))}
      >
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          سيتم حفظ <span className="num font-semibold text-foreground">{changeCount}</span> تغيير على المناطق وفئات الخدمات والمرافق.
        </p>
      </SaveSectionDialog>
    </div>
  );
}
