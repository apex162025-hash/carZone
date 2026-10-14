"use client";

import { useMemo, useState } from "react";
import { Banknote, Layers, Lock, PencilLine, Plus, PlusCircle, Sparkles, Store, Timer, X } from "lucide-react";

import { DataTable, type DataTableColumn } from "@carzen/ui/components/shared/data-table";
import { FilterTabs } from "@carzen/ui/components/shared/filter-tabs";
import { ListToolbar } from "@carzen/ui/components/shared/list-toolbar";
import { PageHeader } from "@carzen/ui/components/shared/page-header";
import { SearchInput } from "@carzen/ui/components/shared/search-input";
import { SectionCard } from "@carzen/ui/components/shared/section-card";
import { SelectFilter } from "@carzen/ui/components/shared/select-filter";
import { StatTile } from "@carzen/ui/components/shared/stat-tile";
import { EmptyState, ErrorState } from "@carzen/ui/components/shared/states";
import { StatusBadge } from "@carzen/ui/components/shared/status-badge";
import { Button } from "@carzen/ui/components/ui/button";
import { Skeleton } from "@carzen/ui/components/ui/skeleton";
import { Switch } from "@carzen/ui/components/ui/switch";
import { useUrlState } from "@carzen/ui/hooks/use-url-state";
import { SERVICE_CATEGORY, TONES } from "@carzen/ui/lib/constants/labels";
import { formatDuration, formatMoney, formatNumber } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import { ServiceEditorSheet, type ServicePreset } from "@/components/modules/Services/ServiceEditorSheet";
import { SERVICE_TYPE_LABEL } from "@/components/modules/Services/service-utils";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useSaveService, useServices } from "@/hooks/use-catalog";
import type { VendorService } from "@carzen/contracts/vendor/catalog";
import type { ServiceType } from "@carzen/contracts/washes";

const TYPE_TABS: { value: "all" | ServiceType; label: string; tone?: string }[] = [
  { value: "all", label: "الكل" },
  { value: "primary", label: "الخدمات الأساسية", tone: TONES.primary },
  { value: "addon", label: "الإضافات", tone: TONES.aqua },
];

const STATUS_OPTIONS = [
  { value: "active", label: "المفعّلة" },
  { value: "inactive", label: "الموقوفة" },
];

function toPayload(s: VendorService, patch: Partial<Pick<VendorService, "active">> = {}) {
  return {
    branchId: s.branchId,
    name: s.name,
    description: s.description,
    category: s.category,
    type: s.type,
    price: s.price,
    durationMin: s.durationMin,
    active: patch.active ?? s.active,
  };
}

function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy aria-label="جاري التحميل">
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-border/80 bg-card p-5 shadow-soft">
          <Skeleton className="h-5 w-48" />
          {Array.from({ length: 4 }, (_, j) => (
            <Skeleton key={j} className="h-11 w-full rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function ServicesPageContent() {
  const { account, branchId, isAll, branches, branchName } = useBranchScope();
  const isOwner = account?.role === "owner";
  const [state, setState] = useUrlState({ type: "all", status: "all", search: "" });
  const { data, isLoading, error, refetch, isRefetching, isFetching } = useServices(branchId);
  const toggle = useSaveService();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<VendorService | null>(null);
  const [preset, setPreset] = useState<ServicePreset>({ branchId: isAll ? branches[0]?.id ?? "" : branchId, type: "primary" });

  const canEdit = Boolean(data?.canEdit);
  const items = useMemo(() => data?.items ?? [], [data]);
  const q = state.search.trim().toLowerCase();
  const hasFilters = state.type !== "all" || state.status !== "all" || Boolean(q);

  // Search + status first (they drive the type-tab counts), then the type tab.
  const matching = useMemo(
    () =>
      items.filter(
        (s) =>
          (state.status === "all" || (state.status === "active" ? s.active : !s.active)) &&
          (!q || s.name.ar.toLowerCase().includes(q) || s.name.en.toLowerCase().includes(q)),
      ),
    [items, state.status, q],
  );
  const visible = matching.filter((s) => state.type === "all" || s.type === state.type);

  // Group by branch in the account's branch order (sections only matter on "all branches").
  const groups = useMemo(() => {
    const order = isAll ? branches.map((b) => b.id) : [branchId];
    for (const s of items) if (!order.includes(s.branchId)) order.push(s.branchId);
    return order.map((id) => ({ id, name: items.find((s) => s.branchId === id)?.branchName.ar ?? branchName(id), services: visible.filter((s) => s.branchId === id) }));
  }, [isAll, branches, branchId, items, visible, branchName]);

  const stats = useMemo(() => {
    const active = items.filter((s) => s.active);
    const primaries = active.filter((s) => s.type === "primary");
    return {
      primaries: primaries.length,
      addons: active.filter((s) => s.type === "addon").length,
      inactive: items.length - active.length,
      avgPrice: primaries.length ? Math.round(primaries.reduce((sum, s) => sum + s.price, 0) / primaries.length) : 0,
      avgDuration: primaries.length ? Math.round(primaries.reduce((sum, s) => sum + s.durationMin, 0) / primaries.length) : 0,
      revenue: items.reduce((sum, s) => sum + s.revenue30d, 0),
    };
  }, [items]);

  const openCreate = (p?: Partial<ServicePreset>) => {
    setEditing(null);
    setPreset({ branchId: p?.branchId ?? (isAll ? branches[0]?.id ?? "" : branchId), type: p?.type ?? "primary" });
    setEditorOpen(true);
  };
  const openEdit = (s: VendorService) => {
    setEditing(s);
    setEditorOpen(true);
  };

  const columns: DataTableColumn<VendorService>[] = [
    {
      key: "name",
      header: "الخدمة",
      cell: (s) => (
        <div className={cn("min-w-0", !s.active && "opacity-60")}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{s.name.ar}</span>
            {!s.active ? <StatusBadge label="موقوفة" tone={TONES.neutral} size="sm" /> : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            <span dir="ltr">{s.name.en}</span>
          </p>
        </div>
      ),
    },
    {
      key: "category",
      header: "التصنيف",
      hideBelow: "md",
      cell: (s) => <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{SERVICE_CATEGORY[s.category] ?? s.category}</span>,
    },
    { key: "price", header: "السعر", cell: (s) => <span className="num font-semibold">{formatMoney(s.price)}</span> },
    { key: "duration", header: "المدة", cell: (s) => <span className="num text-sm">{formatDuration(s.durationMin)}</span> },
    { key: "orders", header: "الطلبات", hideBelow: "lg", cell: (s) => <span className="num text-sm">{formatNumber(s.ordersCount)}</span> },
    {
      key: "revenue",
      header: "إيراد 30 يوم",
      hideBelow: "lg",
      cell: (s) => <span className={cn("num text-sm", !s.revenue30d && "text-muted-foreground")}>{formatMoney(s.revenue30d)}</span>,
    },
    {
      key: "active",
      header: "مفعّلة",
      cell: (s) => {
        const pending = toggle.isPending && toggle.variables?.id === s.id;
        return (
          <span onClick={(e) => e.stopPropagation()} className="inline-flex items-center">
            <Switch
              checked={s.active}
              disabled={!canEdit || pending}
              onCheckedChange={(on) => toggle.mutate({ id: s.id, payload: toPayload(s, { active: on }) })}
              aria-label={s.active ? `إيقاف ${s.name.ar}` : `تفعيل ${s.name.ar}`}
              title={s.active ? "الإيقاف يخفي الخدمة من العملاء ويحتفظ بسجلها" : "إعادة إظهار الخدمة للعملاء"}
            />
          </span>
        );
      },
    },
    ...(canEdit
      ? [
          {
            key: "actions",
            header: <span className="sr-only">إجراءات</span>,
            align: "end" as const,
            cell: (s: VendorService) => (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`تعديل ${s.name.ar}`}
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit(s);
                }}
              >
                <PencilLine />
              </Button>
            ),
          },
        ]
      : []),
  ];

  const typesToShow: ServiceType[] = state.type === "all" ? ["primary", "addon"] : [state.type as ServiceType];
  const anyVisible = visible.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="الخدمات والأسعار"
        description="قائمة الخدمات الأساسية والإضافات لكل فرع — السعر والمدة هنا هما ما يراه العميل ويُحسب على الطلب تلقائيًا."
        actions={
          canEdit ? (
            <Button size="lg" onClick={() => openCreate()}>
              <Plus /> خدمة جديدة
            </Button>
          ) : null
        }
      />

      {data && !canEdit ? (
        <div role="note" className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <p className="font-semibold">الخدمات للعرض فقط — المالك لم يفعّل صلاحية تعديل الخدمات للمديرين</p>
            <p className="mt-0.5 text-xs text-muted-foreground">تواصل مع مالك المغسلة لتعديل سعر أو إيقاف خدمة، أو ليفعّل الصلاحية من الإعدادات.</p>
          </div>
        </div>
      ) : null}
      {data && canEdit && !isOwner ? (
        <p className="flex items-center gap-2 rounded-xl bg-secondary/60 px-4 py-2.5 text-xs text-secondary-foreground">
          <Sparkles className="size-3.5 shrink-0" /> المالك سمح لمديري الفروع بتعديل الخدمات والأسعار — كل تعديل يُسجل باسمك في سجل التدقيق.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {data ? (
          <>
            <StatTile label="خدمات أساسية مفعّلة" icon={<Layers />} value={formatNumber(stats.primaries)} hint={stats.inactive ? `${formatNumber(stats.inactive)} خدمة موقوفة` : "لا توجد خدمات موقوفة"} />
            <StatTile label="إضافات مفعّلة" icon={<PlusCircle />} tone={TONES.aqua} value={formatNumber(stats.addons)} hint="تُضاف فوق الخدمة الأساسية" />
            <StatTile label="متوسط سعر الخدمة الأساسية" icon={<Timer />} tone={TONES.violet} value={formatMoney(stats.avgPrice)} hint={stats.avgDuration ? `متوسط المدة ${formatDuration(stats.avgDuration)}` : undefined} />
            <StatTile label="إيراد الخدمات (30 يوم)" icon={<Banknote />} tone={TONES.success} value={formatMoney(stats.revenue)} hint="الطلبات المدفوعة فقط" />
          </>
        ) : (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)
        )}
      </div>

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        <ListToolbar
          className="border-b-0"
          tabs={
            <FilterTabs
              aria-label="نوع الخدمة"
              value={state.type}
              onChange={(type) => setState({ type })}
              items={TYPE_TABS.map((t) => ({ ...t, count: data ? (t.value === "all" ? matching.length : matching.filter((s) => s.type === t.value).length) : undefined }))}
            />
          }
          search={<SearchInput value={state.search} onChange={(search) => setState({ search })} placeholder="اسم الخدمة بالعربية أو الإنجليزية" />}
          filters={
            <>
              <SelectFilter aria-label="الحالة" value={state.status} onChange={(status) => setState({ status })} allLabel="كل الحالات" options={STATUS_OPTIONS} />
              {hasFilters ? (
                <Button variant="ghost" size="lg" onClick={() => setState({ type: "all", status: "all", search: "" })}>
                  <X /> مسح الفلاتر
                </Button>
              ) : null}
            </>
          }
        />
      </section>

      {isLoading && !data ? (
        <PageSkeleton />
      ) : error && !data ? (
        <SectionCard>
          <ErrorState message={error.message} onRetry={() => refetch()} isRetrying={isRefetching} />
        </SectionCard>
      ) : !items.length ? (
        <SectionCard>
          <EmptyState
            icon={<Sparkles />}
            title="لا توجد خدمات بعد"
            description="أضف خدمة أساسية واحدة على الأقل ليتمكن العملاء من الحجز ويُسعّر الطلب تلقائيًا."
            action={
              canEdit ? (
                <Button size="sm" onClick={() => openCreate()}>
                  <Plus /> إضافة أول خدمة
                </Button>
              ) : undefined
            }
          />
        </SectionCard>
      ) : !anyVisible ? (
        <SectionCard>
          <EmptyState
            icon={<Sparkles />}
            title="لا توجد خدمات مطابقة"
            description="جرّب تغيير الفلاتر أو مسح البحث."
            action={
              <Button variant="outline" size="sm" onClick={() => setState({ type: "all", status: "all", search: "" })}>
                <X /> مسح الفلاتر
              </Button>
            }
          />
        </SectionCard>
      ) : (
        <div className={cn("space-y-6 transition-opacity", isFetching && !isLoading && "opacity-80")}>
          {groups
            .filter((g) => !hasFilters || g.services.length)
            .map((g) => (
              <SectionCard
                key={g.id}
                flush
                icon={<Store />}
                title={g.name}
                description={`${formatNumber(g.services.filter((s) => s.type === "primary").length)} خدمة أساسية · ${formatNumber(g.services.filter((s) => s.type === "addon").length)} إضافة`}
                action={
                  canEdit && isAll ? (
                    <Button variant="outline" size="sm" onClick={() => openCreate({ branchId: g.id })}>
                      <Plus /> خدمة لهذا الفرع
                    </Button>
                  ) : null
                }
              >
                {typesToShow.map((type) => {
                  const rows = g.services.filter((s) => s.type === type);
                  if (!rows.length && hasFilters) return null;
                  return (
                    <div key={type} className="border-t border-border/60">
                      <div className="flex items-center justify-between gap-3 bg-muted/30 px-5 py-2">
                        <p className="text-xs font-semibold">
                          {SERVICE_TYPE_LABEL[type].plural} <span className="num font-normal text-muted-foreground">({formatNumber(rows.length)})</span>
                        </p>
                        <p className="hidden text-[11px] text-muted-foreground sm:block">{SERVICE_TYPE_LABEL[type].hint}</p>
                      </div>
                      {rows.length ? (
                        <DataTable
                          columns={columns}
                          rows={rows}
                          rowKey={(s) => s.id}
                          onRowClick={canEdit ? openEdit : undefined}
                          rowClassName={(s) => (!s.active ? "bg-muted/20" : undefined)}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 px-5 py-6 text-center">
                          <p className="text-xs text-muted-foreground">{type === "addon" ? "لا توجد إضافات في هذا الفرع بعد." : "لا توجد خدمات أساسية — لا يمكن للعملاء الحجز بدونها."}</p>
                          {canEdit ? (
                            <Button variant="outline" size="sm" onClick={() => openCreate({ branchId: g.id, type })}>
                              <Plus /> {type === "addon" ? "إضافة جديدة" : "خدمة أساسية جديدة"}
                            </Button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </SectionCard>
            ))}
        </div>
      )}

      {canEdit ? (
        <ServiceEditorSheet
          open={editorOpen}
          onOpenChange={setEditorOpen}
          service={editing}
          preset={preset}
          branchChoices={isOwner && isAll ? branches.map((b) => ({ id: b.id, name: b.name.ar })) : []}
          branchName={branchName}
        />
      ) : null}
    </div>
  );
}
