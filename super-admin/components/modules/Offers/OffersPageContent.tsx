"use client";

import { useState } from "react";
import { Layers, Plus, Tag } from "lucide-react";

import { OfferCard } from "@/components/modules/Offers/OfferCard";
import { OfferEditorSheet } from "@/components/modules/Offers/OfferEditorSheet";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { PageHeader } from "@/components/shared/page-header";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { SearchInput } from "@/components/shared/search-input";
import { SelectFilter } from "@/components/shared/select-filter";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { TablePagination } from "@/components/shared/table-pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOffers, useToggleOffer } from "@/hooks/use-offers";
import { useUrlState } from "@/hooks/use-url-state";
import { OFFER_STATUS } from "@/lib/constants/labels";
import { cn } from "@/lib/utils";
import type { OfferListItem, OfferScope, OfferStatus } from "@/types/offers";

const TAB_ORDER: (OfferStatus | "all")[] = ["all", "active", "scheduled", "draft", "disabled", "expired"];

const SCOPE_OPTIONS: { value: OfferScope; label: string }[] = [
  { value: "platform", label: "عروض المنصة" },
  { value: "wash", label: "عروض المغاسل" },
];

export default function OffersPageContent() {
  const [state, setState] = useUrlState({ status: "all", scope: "all", search: "", page: 1 });
  const [editor, setEditor] = useState<{ offer: OfferListItem | null; open: boolean }>({ offer: null, open: false });
  const [disabling, setDisabling] = useState<{ offer: OfferListItem | null; open: boolean }>({ offer: null, open: false });

  const { data, isLoading, isFetching, error, refetch, isRefetching } = useOffers({
    status: state.status as OfferStatus | "all",
    scope: state.scope as OfferScope | "all",
    search: state.search,
    page: state.page,
  });
  const toggle = useToggleOffer();
  const pendingId = toggle.isPending ? toggle.variables?.id : undefined;

  const counts = data?.meta.counts;
  const hasFilters = state.status !== "all" || state.scope !== "all" || Boolean(state.search);
  const openNew = () => setEditor({ offer: null, open: true });

  const handleToggle = (offer: OfferListItem, enabled: boolean) => {
    // Disabling a live promotion is sensitive → reason required; re-enabling is immediate.
    if (enabled) toggle.mutate({ id: offer.id, enabled: true });
    else setDisabling({ offer, open: true });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="عروض المنصة"
        description="عروض ترويجية على مستوى المنصة تظهر في تطبيق العميل وتُطبق تلقائيًا على الأسعار — مع متابعة عروض المغاسل."
        actions={
          <Button size="lg" onClick={openNew}>
            <Plus />
            عرض جديد
          </Button>
        }
      />

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        <ListToolbar
          tabs={
            <FilterTabs
              aria-label="حالة العرض"
              value={state.status as OfferStatus | "all"}
              onChange={(status) => setState({ status })}
              items={TAB_ORDER.map((s) => ({
                value: s,
                label: s === "all" ? "الكل" : OFFER_STATUS[s].label,
                count: counts?.[s],
                tone: s === "all" ? undefined : OFFER_STATUS[s].tone,
              }))}
            />
          }
          search={<SearchInput value={state.search} onChange={(search) => setState({ search })} placeholder="ابحث بعنوان العرض" />}
          filters={
            <SelectFilter
              aria-label="نطاق العرض"
              icon={<Layers className="size-4" />}
              value={state.scope}
              onChange={(scope) => setState({ scope })}
              allLabel="كل النطاقات"
              options={SCOPE_OPTIONS}
            />
          }
        />

        <div className="p-5">
          {isLoading && !data ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy aria-label="جاري تحميل العروض">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-[300px] rounded-2xl" />
              ))}
            </div>
          ) : error && !data ? (
            <ErrorState message={error.message} onRetry={() => refetch()} isRetrying={isRefetching} />
          ) : data && data.items.length ? (
            <div className={cn("grid gap-4 transition-opacity md:grid-cols-2 xl:grid-cols-3", isFetching && "opacity-60")}>
              {data.items.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  onEdit={(o) => setEditor({ offer: o, open: true })}
                  onToggle={handleToggle}
                  togglePending={pendingId === offer.id}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Tag />}
              title={hasFilters ? "لا توجد عروض مطابقة" : "لا توجد عروض بعد"}
              description={hasFilters ? "جرّب حالة أو نطاقًا آخر أو امسح كلمة البحث." : "أنشئ أول عرض للمنصة ليظهر للعملاء في التطبيق."}
              action={
                hasFilters ? (
                  <Button variant="outline" size="sm" onClick={() => setState({ status: "all", scope: "all", search: "" })}>
                    مسح الفلاتر
                  </Button>
                ) : (
                  <Button size="sm" onClick={openNew}>
                    <Plus />
                    عرض جديد
                  </Button>
                )
              }
            />
          )}
        </div>

        <TablePagination pagination={data?.pagination} onPageChange={(page) => setState({ page }, { resetPage: false })} />
      </section>

      <OfferEditorSheet offer={editor.offer} open={editor.open} onOpenChange={(open) => setEditor((e) => ({ ...e, open }))} />

      <ReasonDialog
        open={disabling.open}
        onOpenChange={(open) => setDisabling((d) => ({ ...d, open }))}
        title={`إيقاف ${disabling.offer?.title.ar ?? "العرض"}`}
        description={
          disabling.offer?.scope === "wash"
            ? "سيختفي عرض المغسلة من تطبيق العميل فورًا ويتوقف تطبيقه على الأسعار. سيُسجل الإيقاف وسببه."
            : "سيختفي العرض من تطبيق العميل فورًا ويتوقف تطبيقه على الأسعار. يمكنك إعادة تفعيله لاحقًا."
        }
        textLabel="سبب الإيقاف (يُسجل في سجل التدقيق)"
        confirmLabel="إيقاف العرض"
        variant="destructive"
        isPending={toggle.isPending}
        onConfirm={({ text }) => {
          if (!disabling.offer) return;
          toggle.mutate(
            { id: disabling.offer.id, enabled: false, reason: text },
            { onSuccess: () => setDisabling((d) => ({ ...d, open: false })) },
          );
        }}
      />
    </div>
  );
}
