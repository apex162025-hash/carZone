"use client";

import { useMemo, useState } from "react";
import { BadgePercent, Info, Lock, Plus, X } from "lucide-react";

import { OfferCard } from "@/components/modules/Offers/OfferCard";
import { OfferEditorSheet } from "@/components/modules/Offers/OfferEditorSheet";
import { FilterTabs } from "@carzen/ui/components/shared/filter-tabs";
import { ListToolbar } from "@carzen/ui/components/shared/list-toolbar";
import { PageHeader } from "@carzen/ui/components/shared/page-header";
import { SearchInput } from "@carzen/ui/components/shared/search-input";
import { SectionCard } from "@carzen/ui/components/shared/section-card";
import { EmptyState, ErrorState } from "@carzen/ui/components/shared/states";
import { Button } from "@carzen/ui/components/ui/button";
import { Skeleton } from "@carzen/ui/components/ui/skeleton";
import { useUrlState } from "@carzen/ui/hooks/use-url-state";
import { OFFER_STATUS } from "@carzen/ui/lib/constants/labels";
import { cn } from "@carzen/ui/lib/utils";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useOffers, useToggleOffer } from "@/hooks/use-catalog";
import type { OfferStatus } from "@carzen/contracts/offers";
import type { VendorOffer } from "@carzen/contracts/vendor/catalog";

const STATUS_ORDER: OfferStatus[] = ["active", "scheduled", "draft", "disabled", "expired"];

const EMPTY_COPY: Record<string, string> = {
  all: "لا توجد عروض بعد",
  active: "لا توجد عروض نشطة الآن",
  scheduled: "لا توجد عروض مجدولة",
  draft: "لا توجد مسودات",
  disabled: "لا توجد عروض موقوفة",
  expired: "لا توجد عروض منتهية",
};

function CardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy aria-label="جاري التحميل">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-[300px] rounded-2xl" />
      ))}
    </div>
  );
}

export default function OffersPageContent() {
  const { account, branchId, isAll, branches, branchName } = useBranchScope();
  const canManage = account?.role === "owner";
  const [state, setState] = useUrlState({ status: "all", search: "" });
  // Always load every status: counts per tab come from one list, and switching tabs is instant.
  const { data, isLoading, isFetching, error, refetch, isRefetching } = useOffers(branchId, "all");
  const toggle = useToggleOffer();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<VendorOffer | null>(null);

  const q = state.search.trim().toLowerCase();
  const matching = useMemo(
    () => (data?.items ?? []).filter((o) => !q || o.title.ar.toLowerCase().includes(q) || o.title.en.toLowerCase().includes(q)),
    [data, q],
  );
  const visible = useMemo(
    () =>
      matching
        .filter((o) => state.status === "all" || o.status === state.status)
        .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || b.startAt.localeCompare(a.startAt)),
    [matching, state.status],
  );
  const hasFilters = state.status !== "all" || Boolean(q);

  const tabs = [
    { value: "all", label: "الكل", count: data ? matching.length : undefined },
    ...STATUS_ORDER.map((s) => ({ value: s, label: OFFER_STATUS[s].label, tone: OFFER_STATUS[s].tone, count: data ? matching.filter((o) => o.status === s).length : undefined })),
  ];

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (o: VendorOffer) => {
    setEditing(o);
    setEditorOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="العروض"
        description="عروض مغسلتك على فروع وخدمات محددة، بجانب عروض كارزن المطبقة على فروعك."
        actions={
          canManage ? (
            <Button size="lg" onClick={openCreate}>
              <Plus /> عرض جديد
            </Button>
          ) : null
        }
      />

      <div role="note" className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-secondary/60 px-4 py-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-secondary-foreground">
          <span className="font-semibold">العروض النشطة تُطبق تلقائيًا</span> — يحسبها التسعير في تطبيق العميل وفي شاشة «طلب جديد» بالفرع، فلا داعي لإدخال الخصم يدويًا.
          المسودات والعروض الموقوفة لا تظهر للعملاء.
        </p>
      </div>

      {!canManage && account ? (
        <p className="flex items-center gap-2 rounded-xl bg-muted/60 px-4 py-2.5 text-xs text-muted-foreground">
          <Lock className="size-3.5 shrink-0" /> إنشاء العروض وتعديلها وإيقافها متاح لمالك المغسلة — يمكنك متابعة العروض المطبقة على فرعك هنا.
        </p>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        <ListToolbar
          className="border-b-0"
          tabs={<FilterTabs aria-label="حالة العرض" value={state.status} onChange={(status) => setState({ status })} items={tabs} />}
          search={<SearchInput value={state.search} onChange={(search) => setState({ search })} placeholder="عنوان العرض" />}
          filters={
            hasFilters ? (
              <Button variant="ghost" size="lg" onClick={() => setState({ status: "all", search: "" })}>
                <X /> مسح الفلاتر
              </Button>
            ) : null
          }
        />
      </section>

      {isLoading && !data ? (
        <CardsSkeleton />
      ) : error && !data ? (
        <SectionCard>
          <ErrorState message={error.message} onRetry={() => refetch()} isRetrying={isRefetching} />
        </SectionCard>
      ) : !visible.length ? (
        <SectionCard>
          <EmptyState
            icon={<BadgePercent />}
            title={q ? "لا توجد عروض مطابقة للبحث" : EMPTY_COPY[state.status] ?? EMPTY_COPY.all}
            description={
              q
                ? "جرّب كلمة أخرى أو امسح البحث."
                : canManage
                  ? "أنشئ عرضًا بنسبة أو مبلغ ثابت على فروع وخدمات محددة — يُطبق تلقائيًا خلال مدته."
                  : "ستظهر هنا العروض التي ينشرها مالك المغسلة أو كارزن على فرعك."
            }
            action={
              hasFilters ? (
                <Button variant="outline" size="sm" onClick={() => setState({ status: "all", search: "" })}>
                  <X /> مسح الفلاتر
                </Button>
              ) : canManage ? (
                <Button size="sm" onClick={openCreate}>
                  <Plus /> عرض جديد
                </Button>
              ) : undefined
            }
          />
        </SectionCard>
      ) : (
        <div className={cn("grid gap-4 transition-opacity md:grid-cols-2 xl:grid-cols-3", isFetching && !isLoading && "opacity-80")}>
          {visible.map((o) => (
            <OfferCard
              key={o.id}
              offer={o}
              branchCount={branches.length}
              branchName={branchName}
              canManage={canManage}
              onEdit={openEdit}
              onToggle={(offer, enabled) => toggle.mutate({ id: offer.id, enabled })}
              togglePending={toggle.isPending && toggle.variables?.id === o.id}
            />
          ))}
        </div>
      )}

      {canManage ? (
        <OfferEditorSheet
          open={editorOpen}
          onOpenChange={setEditorOpen}
          offer={editing}
          defaultBranchIds={isAll ? branches.map((b) => b.id) : [branchId]}
        />
      ) : null}
    </div>
  );
}
