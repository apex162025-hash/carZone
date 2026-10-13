"use client";

import { useState } from "react";
import { ArrowDownUp, Star } from "lucide-react";

import { ReviewCard } from "@/components/modules/Reviews/ReviewCard";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { PageHeader } from "@/components/shared/page-header";
import { RatingStars } from "@/components/shared/rating-stars";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { SearchInput } from "@/components/shared/search-input";
import { SelectFilter } from "@/components/shared/select-filter";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { TablePagination } from "@/components/shared/table-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useReviews, useToggleReview } from "@/hooks/use-reviews";
import { useUrlState } from "@/hooks/use-url-state";
import { HIDE_REVIEW_REASON, TONES } from "@/lib/constants/labels";
import { cn } from "@/lib/utils";
import type { ReviewFilter, ReviewListItem } from "@/types/reviews";

const TABS: { value: ReviewFilter; label: string; tone?: string }[] = [
  { value: "all", label: "الكل" },
  { value: "low", label: "منخفضة (≤ ٢ نجوم)", tone: TONES.danger },
  { value: "reported", label: "أبلغت عنه المغسلة", tone: TONES.warning },
  { value: "hidden", label: "مخفية", tone: TONES.neutral },
];

/** Sort presets → API `sort` / `order` pairs. */
const SORTS = {
  newest: { label: "الأحدث أولًا", sort: "createdAt", order: "desc" },
  oldest: { label: "الأقدم أولًا", sort: "createdAt", order: "asc" },
  lowest: { label: "الأقل تقييمًا", sort: "stars", order: "asc" },
  highest: { label: "الأعلى تقييمًا", sort: "stars", order: "desc" },
} as const;

type SortKey = keyof typeof SORTS;

const HIDE_PRESETS = Object.entries(HIDE_REVIEW_REASON).map(([value, label]) => ({ value, label }));

function ReviewPreview({ review }: { review: ReviewListItem }) {
  return (
    <div className="space-y-1.5 rounded-xl border border-border bg-muted/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <RatingStars value={review.stars} />
        <span className="truncate text-[11px] text-muted-foreground">
          {review.customerName} · {review.businessName.ar}
        </span>
      </div>
      <p className="line-clamp-3 text-xs leading-relaxed" dir="auto">
        {review.comment.ar}
      </p>
    </div>
  );
}

function ReviewsSkeleton() {
  return (
    <div className="grid gap-3 p-5 xl:grid-cols-2" aria-busy aria-label="جاري تحميل التقييمات">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-border/80 p-4">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex justify-between border-t border-border/60 pt-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-7 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReviewsPageContent() {
  const [state, setState] = useUrlState({ filter: "all", search: "", sortBy: "newest", page: 1 });
  const sort = SORTS[(state.sortBy in SORTS ? state.sortBy : "newest") as SortKey];
  const { data, isLoading, isFetching, error, refetch, isRefetching } = useReviews({
    filter: state.filter as ReviewFilter,
    search: state.search,
    sort: sort.sort,
    order: sort.order,
    page: state.page,
  });
  const toggle = useToggleReview();
  const [hideTarget, setHideTarget] = useState<ReviewListItem | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<ReviewListItem | null>(null);

  const counts = data?.meta.counts;
  const average = data?.meta.averageRating;
  const items = data?.items;

  return (
    <div className="space-y-6">
      <PageHeader
        title="التقييمات"
        description="راقب تقييمات العملاء، راجع ما أبلغت عنه المغاسل، وأخفِ المحتوى المسيء — كل إجراء يُسجل بسببه."
        actions={
          <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-card px-3.5 py-2 shadow-soft">
            <span className="flex size-8 items-center justify-center rounded-lg bg-warning/15 text-warning">
              <Star className="size-4 fill-current" />
            </span>
            <div>
              <p className="text-[11px] text-muted-foreground">متوسط تقييم المنصة</p>
              {average !== undefined ? (
                <p className="flex items-center gap-2">
                  <span className="num text-lg leading-6 font-bold">{average ? average.toFixed(2) : "—"}</span>
                  {average ? <RatingStars value={average} /> : null}
                </p>
              ) : (
                <Skeleton className="mt-1 h-5 w-24" />
              )}
            </div>
          </div>
        }
      />

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        <ListToolbar
          tabs={
            <FilterTabs
              aria-label="تصفية التقييمات"
              value={state.filter}
              onChange={(filter) => setState({ filter })}
              items={TABS.map((t) => ({ ...t, count: counts?.[t.value] }))}
            />
          }
          search={<SearchInput value={state.search} onChange={(search) => setState({ search })} placeholder="ابحث في التعليق، العميل، المغسلة أو رقم الحجز" />}
          filters={
            <SelectFilter
              aria-label="الترتيب"
              icon={<ArrowDownUp className="size-4" />}
              value={state.sortBy}
              onChange={(sortBy) => setState({ sortBy })}
              options={Object.entries(SORTS).map(([value, s]) => ({ value, label: s.label }))}
            />
          }
        />

        {isLoading && !items ? (
          <ReviewsSkeleton />
        ) : error && !items ? (
          <ErrorState message={error.message} onRetry={() => refetch()} isRetrying={isRefetching} />
        ) : items && items.length === 0 ? (
          <EmptyState
            icon={<Star />}
            title="لا توجد تقييمات مطابقة"
            description={state.filter === "reported" ? "لم تبلغ أي مغسلة عن تقييمات — لا شيء يحتاج مراجعة." : "جرّب تصفية أخرى أو امسح كلمة البحث."}
          />
        ) : (
          <div className={cn("grid gap-3 p-5 transition-opacity xl:grid-cols-2", isFetching && "opacity-60")}>
            {items?.map((r) => (
              <ReviewCard key={r.id} review={r} onHide={setHideTarget} onRestore={setRestoreTarget} />
            ))}
          </div>
        )}
        <TablePagination pagination={data?.pagination} onPageChange={(page) => setState({ page }, { resetPage: false })} />
      </section>

      <ReasonDialog
        open={Boolean(hideTarget)}
        onOpenChange={(open) => !open && setHideTarget(null)}
        title="إخفاء التقييم"
        description="سيختفي التقييم فورًا من تطبيق العميل وصفحة المغسلة، ويُعاد حساب تقييم المغسلة والفرع بدونه. يمكن استعادته لاحقًا."
        presets={HIDE_PRESETS}
        presetLabel="سبب الإخفاء"
        textLabel="ملاحظة إضافية"
        textRequired={false}
        confirmLabel="إخفاء التقييم"
        variant="destructive"
        isPending={toggle.isPending}
        onConfirm={({ preset, text }) => {
          if (!hideTarget || !preset) return;
          toggle.mutate({ id: hideTarget.id, hidden: true, reason: preset, note: text }, { onSuccess: () => setHideTarget(null) });
        }}
      >
        {hideTarget ? <ReviewPreview review={hideTarget} /> : null}
      </ReasonDialog>

      <ReasonDialog
        open={Boolean(restoreTarget)}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        title="استعادة التقييم"
        description="سيظهر التقييم مجددًا في تطبيق العميل ويُعاد احتسابه ضمن تقييم المغسلة والفرع."
        textLabel="سبب الاستعادة (يُسجل في سجل التدقيق)"
        textPlaceholder="مثال: تم الإخفاء بالخطأ — التعليق لا يخالف السياسات."
        confirmLabel="استعادة التقييم"
        isPending={toggle.isPending}
        onConfirm={({ text }) => {
          if (!restoreTarget) return;
          toggle.mutate({ id: restoreTarget.id, hidden: false, reason: text }, { onSuccess: () => setRestoreTarget(null) });
        }}
      >
        {restoreTarget ? <ReviewPreview review={restoreTarget} /> : null}
      </ReasonDialog>
    </div>
  );
}
