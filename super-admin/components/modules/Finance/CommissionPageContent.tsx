"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgePercent, Info, Lock, RotateCcw, Save, Sparkles, Store } from "lucide-react";

import { MetricInfo } from "@/components/modules/Finance/MetricInfo";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { SearchInput } from "@/components/shared/search-input";
import { SectionCard } from "@/components/shared/section-card";
import { ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommission, useUpdateCommission } from "@/hooks/use-finance";
import { TONES } from "@/lib/constants/labels";
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CommissionWash } from "@/types/finance";

const MIN = 0;
const MAX = 30;

/** "" → null (use default); otherwise a number, or NaN when invalid. */
function parsePct(raw: string): number | null {
  const v = raw.trim();
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= MIN && n <= MAX ? n : Number.NaN;
}

const isInvalid = (raw: string) => Number.isNaN(parsePct(raw) as number);
const rateText = (n: number | null, fallback: number) => (n === null ? `افتراضي (${formatPercent(fallback)})` : formatPercent(n));

function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="جاري التحميل">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4">
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-[420px] rounded-2xl xl:col-span-2" />
      </div>
    </div>
  );
}

export default function CommissionPageContent() {
  const { data, isLoading, error, refetch, isRefetching } = useCommission();
  const [defaultEdit, setDefaultEdit] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [query, setQuery] = useState("");

  const discard = () => {
    setDefaultEdit(null);
    setEdits({});
  };
  const update = useUpdateCommission(() => {
    setConfirmOpen(false);
    // Keep the drafts until fresh server values land to avoid a flash of old rates.
    void refetch().then(discard);
  });

  const serverDefault = data?.defaultCommissionPct ?? 0;
  const defaultValue = defaultEdit ?? String(serverDefault);
  const parsedDefault = parsePct(defaultValue);
  const defaultError = parsedDefault === null || Number.isNaN(parsedDefault) ? `أدخل نسبة بين ${MIN} و ${MAX}٪` : null;
  const effectiveDefault = defaultError ? serverDefault : (parsedDefault as number);
  const defaultChanged = !defaultError && parsedDefault !== serverDefault;

  const serverOverride = (w: CommissionWash) => (w.isOverride ? String(w.rate) : "");
  const overrideValue = (w: CommissionWash) => edits[w.id] ?? serverOverride(w);
  const washes = data?.washes ?? [];
  const changedWashes = washes.filter((w) => {
    const next = overrideValue(w);
    if (isInvalid(next)) return true;
    return parsePct(next) !== parsePct(serverOverride(w));
  });
  const invalidCount = changedWashes.filter((w) => isInvalid(overrideValue(w))).length + (defaultError ? 1 : 0);
  const changeCount = changedWashes.length + (defaultChanged || defaultError ? 1 : 0);
  const dirty = changeCount > 0;

  // Warn before leaving with unsaved commission changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  if (isLoading) return <PageSkeleton />;
  if (error || !data) return <ErrorState message={error?.message} onRetry={() => refetch()} isRetrying={isRefetching} />;

  const overridesCount = washes.filter((w) => parsePct(overrideValue(w)) !== null).length;
  const q = query.trim().toLowerCase();
  const visible = q ? washes.filter((w) => w.name.ar.toLowerCase().includes(q) || w.name.en.toLowerCase().includes(q)) : washes;

  const setOverride = (id: string, value: string) => setEdits((prev) => ({ ...prev, [id]: value }));

  const save = (reason: string) => {
    const overrides: Record<string, number | null> = {};
    for (const w of changedWashes) overrides[w.id] = parsePct(overrideValue(w));
    update.mutate({ defaultCommissionPct: effectiveDefault, overrides, reason });
  };

  const columns: DataTableColumn<CommissionWash>[] = [
    {
      key: "wash",
      header: "المغسلة",
      cell: (w) => (
        <Link href={`/washes/${w.id}`} className="group/link flex min-w-0 items-center gap-3">
          <span className="bg-brand-gradient flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white">
            {w.name.en.slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold group-hover/link:text-primary">{w.name.ar}</span>
            <span className="block truncate text-xs text-muted-foreground">{w.name.en}</span>
          </span>
        </Link>
      ),
    },
    {
      key: "gmv",
      header: "مبيعات 30 يوم",
      align: "end",
      hideBelow: "md",
      cell: (w) => <span className="num">{formatMoney(w.gmv30d)}</span>,
    },
    {
      key: "current",
      header: "النسبة الحالية",
      cell: (w) => (
        <span className="flex items-center gap-2">
          <span className="num font-semibold">{formatPercent(w.rate)}</span>
          <StatusBadge size="sm" label={w.isOverride ? "خاصة" : "افتراضية"} tone={w.isOverride ? TONES.violet : TONES.neutral} />
        </span>
      ),
    },
    {
      key: "override",
      header: "نسبة خاصة",
      cell: (w) => {
        const value = overrideValue(w);
        const invalid = isInvalid(value);
        return (
          <div className="space-y-1">
            <div className="relative w-28">
              <Input
                value={value}
                onChange={(e) => setOverride(w.id, e.target.value)}
                inputMode="decimal"
                placeholder="افتراضي"
                aria-label={`نسبة عمولة خاصة لـ ${w.name.ar}`}
                aria-invalid={invalid}
                className="num h-8 pe-7"
              />
              <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">٪</span>
            </div>
            {invalid ? <p className="text-[11px] text-destructive">بين 0 و 30٪</p> : null}
          </div>
        );
      },
    },
    {
      key: "after",
      header: "بعد الحفظ",
      hideBelow: "lg",
      cell: (w) => {
        const parsed = parsePct(overrideValue(w));
        const rate = parsed === null || Number.isNaN(parsed) ? effectiveDefault : parsed;
        const changed = rate !== w.rate;
        return (
          <div className="text-xs">
            <p className={cn("num font-semibold", changed ? "text-primary" : "text-muted-foreground")}>
              {formatPercent(rate)}
              {changed ? <span className="ms-1 font-normal text-muted-foreground">(كان {formatPercent(w.rate)})</span> : null}
            </p>
            <p className="num text-muted-foreground">≈ {formatMoney((w.gmv30d * rate) / 100, { decimals: true })} / 30 يوم</p>
          </div>
        );
      },
    },
    {
      key: "reset",
      header: <span className="sr-only">إعادة للافتراضي</span>,
      align: "end",
      cell: (w) => (
        <Button
          variant="ghost"
          size="sm"
          disabled={overrideValue(w).trim() === ""}
          onClick={() => setOverride(w.id, "")}
          aria-label={`إعادة ${w.name.ar} للنسبة الافتراضية`}
        >
          <RotateCcw />
          <span className="hidden sm:inline">إعادة للافتراضي</span>
        </Button>
      ),
    },
  ];

  return (
    <div className={cn("space-y-6", dirty && "pb-4")}>
      <PageHeader
        title="عمولة المنصة"
        description="النسبة الافتراضية التي تحصل عليها المنصة من كل حجز مدفوع، مع نسب خاصة لمغاسل بعينها عند الحاجة."
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4">
          <SectionCard
            icon={<BadgePercent />}
            title={
              <span className="inline-flex items-center gap-1">
                العمولة الافتراضية
                <MetricInfo
                  label="العمولة الافتراضية"
                  definition="النسبة المطبقة على كل مغسلة ليس لها نسبة خاصة. تُحسب من قيمة الحجز المكتمل والمدفوع."
                />
              </span>
            }
            description="تُطبق على كل المغاسل التي ليس لها نسبة خاصة"
          >
            <label htmlFor="default-commission" className="text-xs font-medium">
              النسبة (من {MIN} إلى {MAX}٪)
            </label>
            <div className="relative mt-1.5 w-40">
              <Input
                id="default-commission"
                value={defaultValue}
                onChange={(e) => setDefaultEdit(e.target.value)}
                inputMode="decimal"
                aria-invalid={Boolean(defaultError)}
                aria-describedby="default-commission-hint"
                className="num h-11 pe-9 text-xl font-bold md:text-xl"
              />
              <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground">٪</span>
            </div>
            {defaultError ? (
              <p className="mt-1.5 text-xs text-destructive">{defaultError}</p>
            ) : defaultChanged ? (
              <p id="default-commission-hint" className="num mt-1.5 text-xs text-primary">
                القيمة الحالية {formatPercent(serverDefault)} — لم تُحفظ بعد
              </p>
            ) : (
              <p id="default-commission-hint" className="mt-1.5 text-xs text-muted-foreground">
                الافتراضي المعتمد للمنصة.
              </p>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/60 px-3 py-2.5">
                <dt className="text-[11px] text-muted-foreground">تستخدم الافتراضي</dt>
                <dd className="num mt-0.5 text-base font-bold">{formatNumber(washes.length - overridesCount)}</dd>
              </div>
              <div className="rounded-xl bg-muted/60 px-3 py-2.5">
                <dt className="text-[11px] text-muted-foreground">بنسبة خاصة</dt>
                <dd className="num mt-0.5 text-base font-bold">{formatNumber(overridesCount)}</dd>
              </div>
            </dl>
          </SectionCard>

          <div className="flex items-start gap-3 rounded-2xl border border-info/30 bg-info/5 p-4 text-sm" role="note">
            <Info className="mt-0.5 size-5 shrink-0 text-info" />
            <div>
              <p className="font-semibold">تُطبق على المعاملات الجديدة فقط</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                لا يُعاد حساب المعاملات السابقة. كل تغيير يتطلب سببًا ويُسجل بالقيمة القديمة والجديدة في سجل التدقيق.
              </p>
            </div>
          </div>

          <div role="group" aria-disabled aria-label="خطط الاشتراك — قريبًا" className="relative overflow-hidden rounded-2xl border border-dashed border-border bg-card/60 p-4 select-none">
            <div className="flex items-start justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Sparkles className="size-4" />
                خطط الاشتراك
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <Lock className="size-3" />
                قريبًا
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">عمولة حسب خطة المغسلة بدلًا من نسبة واحدة.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 opacity-60">
              <div className="rounded-xl border border-border px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">Free</p>
                <p className="num text-base font-bold">10٪</p>
              </div>
              <div className="rounded-xl border border-border px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">Pro</p>
                <p className="num text-base font-bold">5٪</p>
              </div>
            </div>
          </div>
        </div>

        <SectionCard
          className="xl:col-span-2"
          icon={<Store />}
          title="نسب خاصة لكل مغسلة"
          description="اترك الحقل فارغًا لتطبيق النسبة الافتراضية."
          action={<SearchInput value={query} onChange={setQuery} placeholder="ابحث عن مغسلة" className="hidden w-56 sm:block sm:w-56" />}
          flush
        >
          <div className="px-5 pb-3 sm:hidden">
            <SearchInput value={query} onChange={setQuery} placeholder="ابحث عن مغسلة" />
          </div>
          <DataTable
            columns={columns}
            rows={visible}
            rowKey={(w) => w.id}
            rowClassName={(w) => (changedWashes.includes(w) ? "bg-primary/[0.04]" : undefined)}
            empty={{
              icon: <Store />,
              title: q ? "لا توجد مغاسل مطابقة" : "لا توجد مغاسل بعد",
              description: q ? "جرّب اسمًا آخر." : "ستظهر المغاسل هنا بعد اعتمادها على المنصة.",
            }}
          />
        </SectionCard>
      </div>

      {dirty ? (
        <div
          role="region"
          aria-label="تغييرات غير محفوظة"
          className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-primary/30 bg-card/95 p-3 shadow-raised backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:ps-5"
        >
          <p className="text-sm">
            لديك <span className="num font-semibold">{formatNumber(changeCount)}</span> {changeCount === 1 ? "تغيير" : "تغييرات"} غير محفوظة
            {invalidCount ? <span className="ms-1 text-destructive">— صحّح القيم غير الصالحة أولًا</span> : null}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="lg" onClick={discard} disabled={update.isPending}>
              تجاهل
            </Button>
            <Button size="lg" onClick={() => setConfirmOpen(true)} disabled={invalidCount > 0} loading={update.isPending}>
              {!update.isPending ? <Save /> : null}
              حفظ التغييرات
            </Button>
          </div>
        </div>
      ) : null}

      <ReasonDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="تأكيد تعديل العمولة"
        description="تُطبق النسب الجديدة على المعاملات الجديدة فقط، ولا تتغير المعاملات السابقة."
        textLabel="سبب التعديل (يُسجل في سجل التدقيق)"
        textPlaceholder="مثال: اتفاق تجاري جديد مع المغسلة"
        confirmLabel="تأكيد الحفظ"
        isPending={update.isPending}
        onConfirm={({ text }) => save(text)}
      >
        <div className="rounded-xl border border-border bg-muted/40 p-3.5">
          <p className="mb-2 text-xs font-semibold">
            التغييرات (<span className="num">{changeCount}</span>)
          </p>
          <ul className="max-h-48 space-y-1.5 overflow-y-auto">
            {defaultChanged ? (
              <li className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2 text-xs">
                <span className="font-medium">العمولة الافتراضية</span>
                <span className="num">
                  <span className="text-muted-foreground line-through decoration-destructive/50">{formatPercent(serverDefault)}</span>
                  <span className="mx-1.5">←</span>
                  <span className="font-semibold text-primary">{formatPercent(effectiveDefault)}</span>
                </span>
              </li>
            ) : null}
            {changedWashes.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2 text-xs">
                <span className="truncate font-medium">{w.name.ar}</span>
                <span className="num shrink-0">
                  <span className="text-muted-foreground line-through decoration-destructive/50">
                    {rateText(w.isOverride ? w.rate : null, serverDefault)}
                  </span>
                  <span className="mx-1.5">←</span>
                  <span className="font-semibold text-primary">{rateText(parsePct(overrideValue(w)), effectiveDefault)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </ReasonDialog>
    </div>
  );
}
