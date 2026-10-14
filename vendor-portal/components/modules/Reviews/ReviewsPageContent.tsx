"use client";

import { useState } from "react";
import { ArrowUpDown, Flag, MessageSquareDashed, MessageSquareText, Star, X } from "lucide-react";

import { FilterTabs } from "@carzen/ui/components/shared/filter-tabs";
import { ListToolbar } from "@carzen/ui/components/shared/list-toolbar";
import { PageHeader } from "@carzen/ui/components/shared/page-header";
import { RatingStars } from "@carzen/ui/components/shared/rating-stars";
import { ReasonDialog } from "@carzen/ui/components/shared/reason-dialog";
import { SearchInput } from "@carzen/ui/components/shared/search-input";
import { SelectFilter } from "@carzen/ui/components/shared/select-filter";
import { EmptyState, ErrorState } from "@carzen/ui/components/shared/states";
import { TablePagination } from "@carzen/ui/components/shared/table-pagination";
import { Button } from "@carzen/ui/components/ui/button";
import { Skeleton } from "@carzen/ui/components/ui/skeleton";
import { useUrlState } from "@carzen/ui/hooks/use-url-state";
import { TONES } from "@carzen/ui/lib/constants/labels";
import { formatNumber, formatPercent } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import { ReplyReviewDialog } from "@/components/modules/Reviews/ReplyReviewDialog";
import { ReviewCard } from "@/components/modules/Reviews/ReviewCard";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useReplyReview, useReportReview, useReviews } from "@/hooks/use-insights";
import type { VendorReview, VendorReviewListMeta } from "@carzen/contracts/vendor/insights";

const REPORT_PRESETS = [
  { value: "not_visited", label: "عميل لم يزر المغسلة" },
  { value: "abusive", label: "ألفاظ مسيئة" },
  { value: "false_info", label: "معلومات خاطئة" },
  { value: "unfair_competition", label: "منافسة غير عادلة" },
];

const SORTS = [
  { value: "createdAt:desc", label: "الأحدث أولًا" },
  { value: "createdAt:asc", label: "الأقدم أولًا" },
  { value: "stars:asc", label: "الأقل تقييمًا" },
  { value: "stars:desc", label: "الأعلى تقييمًا" },
];

const STAR_LEVELS = ["5", "4", "3", "2", "1"] as const;

// ── Rating summary (average + 5→1 distribution) ────────────

function RatingSummary({
  meta,
  stars,
  onStars,
  onUnreplied,
}: {
  meta: VendorReviewListMeta;
  stars: string;
  onStars: (stars: string) => void;
  onUnreplied: () => void;
}) {
  const max = Math.max(1, ...STAR_LEVELS.map((s) => meta.distribution[s]));
  return (
    <section className="grid gap-5 rounded-2xl border border-border/80 bg-card p-5 shadow-soft md:grid-cols-[auto_1fr] xl:grid-cols-[auto_1fr_auto]" aria-label="ملخص التقييمات">
      <div className="flex flex-col items-center justify-center gap-1.5 md:min-w-40 md:border-e md:border-border/60 md:pe-6">
        <span className="num text-5xl font-bold tracking-tight">{meta.count ? meta.average.toFixed(1) : "—"}</span>
        <RatingStars value={meta.average} size="md" />
        <span className="text-xs text-muted-foreground">
          من <span className="num font-medium text-foreground">{formatNumber(meta.count)}</span> تقييم
        </span>
      </div>

      <div className="space-y-1.5" role="group" aria-label="توزيع النجوم — اضغط للتصفية">
        {STAR_LEVELS.map((s) => {
          const count = meta.distribution[s];
          const active = stars === s;
          const pct = meta.count ? (count / meta.count) * 100 : 0;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => onStars(active ? "all" : s)}
              disabled={!count && !active}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent",
                active && "bg-secondary hover:bg-secondary",
              )}
            >
              <span className="num flex w-8 shrink-0 items-center gap-0.5 font-medium">
                {s} <Star className="size-3 fill-warning text-warning" />
              </span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className={cn("block h-full rounded-full transition-[width]", Number(s) <= 2 ? "bg-destructive" : Number(s) === 3 ? "bg-warning" : "bg-success")}
                  style={{ width: `${count ? Math.max((count / max) * 100, 3) : 0}%` }}
                />
              </span>
              <span className="num w-16 shrink-0 text-end text-muted-foreground">
                {formatNumber(count)} <span className="text-[10px]">({formatPercent(pct, 0)})</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 md:col-span-2 xl:col-span-1 xl:w-56 xl:grid-cols-1">
        <button
          type="button"
          onClick={onUnreplied}
          className="flex items-center gap-3 rounded-xl border border-border/70 p-3 text-start transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
            <MessageSquareDashed className="size-4" />
          </span>
          <span>
            <span className="num block text-lg leading-tight font-bold">{formatNumber(meta.unreplied)}</span>
            <span className="text-[11px] text-muted-foreground">بانتظار ردك</span>
          </span>
        </button>
        <div className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Flag className="size-4" />
          </span>
          <span>
            <span className="num block text-lg leading-tight font-bold">{formatNumber(meta.reported)}</span>
            <span className="text-[11px] text-muted-foreground">مُبلغ لكارزن</span>
          </span>
        </div>
      </div>
    </section>
  );
}

function SummarySkeleton() {
  return <Skeleton className="h-[188px] rounded-2xl" aria-label="جاري التحميل" />;
}

function CardsSkeleton() {
  return (
    <div className="grid gap-4 p-5 lg:grid-cols-2" aria-busy aria-label="جاري تحميل التقييمات">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-48 rounded-2xl" />
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────

export default function ReviewsPageContent() {
  const { branchId, isAll, branchName } = useBranchScope();
  const [state, setState] = useUrlState({ stars: "all", replied: "all", search: "", sort: "createdAt", order: "desc", page: 1 });
  // Target + open flag are separate so dialog content stays put during the close animation.
  const [replyTo, setReplyTo] = useState<VendorReview | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [reportOn, setReportOn] = useState<VendorReview | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const { data, isLoading, isFetching, error, refetch, isRefetching } = useReviews({
    branchId,
    stars: state.stars === "all" ? "all" : Number(state.stars),
    replied: state.replied as "all" | "yes" | "no",
    search: state.search,
    sort: state.sort,
    order: state.order as "asc" | "desc",
    page: state.page,
  });
  const reply = useReplyReview(() => setReplyOpen(false));
  const report = useReportReview(() => setReportOpen(false));
  const openReply = (r: VendorReview) => {
    setReplyTo(r);
    setReplyOpen(true);
  };
  const openReport = (r: VendorReview) => {
    setReportOn(r);
    setReportOpen(true);
  };

  const meta = data?.meta;
  const items = data?.items;
  const hasFilters = state.stars !== "all" || state.replied !== "all" || Boolean(state.search);
  const clear = () => setState({ stars: "all", replied: "all", search: "" });

  const repliedTabs = [
    { value: "all", label: "الكل", count: meta?.count },
    { value: "no", label: "بدون رد", count: meta?.unreplied, tone: TONES.warning },
    { value: "yes", label: "تم الرد", count: meta ? meta.count - meta.unreplied : undefined, tone: TONES.success },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="التقييمات"
        description={`آراء عملاء ${isAll ? "كل الفروع" : branchName(branchId)} — رد مرة واحدة على كل تقييم، وأبلغ كارزن عن التقييمات غير العادلة.`}
      />

      {meta ? (
        <RatingSummary
          meta={meta}
          stars={state.stars}
          onStars={(stars) => setState({ stars })}
          onUnreplied={() => setState({ replied: "no", stars: "all" })}
        />
      ) : error ? null : (
        <SummarySkeleton />
      )}

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        <ListToolbar
          tabs={<FilterTabs aria-label="حالة الرد" value={state.replied} onChange={(replied) => setState({ replied })} items={repliedTabs} />}
          search={<SearchInput value={state.search} onChange={(search) => setState({ search })} placeholder="نص التقييم، اسم العميل أو رقم الطلب" />}
          filters={
            <>
              <SelectFilter
                aria-label="عدد النجوم"
                icon={<Star className="size-4" />}
                value={state.stars}
                onChange={(stars) => setState({ stars })}
                allLabel="كل النجوم"
                options={STAR_LEVELS.map((s) => ({ value: s, label: `${s} ${Number(s) === 1 ? "نجمة" : Number(s) === 2 ? "نجمتان" : "نجوم"}` }))}
              />
              <SelectFilter
                aria-label="الترتيب"
                icon={<ArrowUpDown className="size-4" />}
                value={`${state.sort}:${state.order}`}
                onChange={(v) => {
                  const [sort, order] = v.split(":");
                  setState({ sort, order });
                }}
                options={SORTS}
              />
            </>
          }
          actions={
            hasFilters ? (
              <Button variant="ghost" size="lg" onClick={clear}>
                <X /> مسح الفلاتر
              </Button>
            ) : null
          }
        />

        {isLoading && !items ? (
          <CardsSkeleton />
        ) : error && !items ? (
          <ErrorState message={error.message} onRetry={() => refetch()} isRetrying={isRefetching} />
        ) : !items?.length ? (
          <EmptyState
            icon={<MessageSquareText />}
            title={hasFilters ? "لا توجد تقييمات مطابقة" : "لا توجد تقييمات بعد"}
            description={hasFilters ? "جرّب تغيير الفلاتر أو مسح البحث." : "يقيّم العملاء الخدمة من التطبيق بعد إكمال الطلب، وستظهر التقييمات هنا."}
            action={
              hasFilters ? (
                <Button variant="outline" size="sm" onClick={clear}>
                  مسح الفلاتر
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className={cn("grid gap-4 p-5 lg:grid-cols-2", isFetching && "opacity-60 transition-opacity")}>
            {items.map((r) => (
              <ReviewCard key={r.id} review={r} showBranch={isAll} onReply={openReply} onReport={openReport} />
            ))}
          </div>
        )}

        <TablePagination pagination={data?.pagination} onPageChange={(page) => setState({ page }, { resetPage: false })} />
      </section>

      <ReplyReviewDialog
        review={replyTo}
        open={replyOpen}
        onOpenChange={setReplyOpen}
        isPending={reply.isPending}
        onSubmit={(text) => replyTo && reply.mutate({ id: replyTo.id, text })}
      />

      <ReasonDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        title="إبلاغ كارزن عن تقييم"
        description="يراجع فريق الإشراف في كارزن التقييم وقد يخفيه إذا خالف سياسة التقييمات. يبقى التقييم ظاهرًا حتى انتهاء المراجعة، ولا يمكن الإبلاغ عنه مرة أخرى."
        presets={REPORT_PRESETS}
        presetLabel="سبب الإبلاغ"
        textLabel="تفاصيل إضافية"
        textPlaceholder="مثال: لا يوجد طلب بهذا الرقم في سجلاتنا…"
        textRequired={false}
        confirmLabel="إرسال البلاغ"
        isPending={report.isPending}
        onConfirm={({ preset, text }) => {
          if (!reportOn) return;
          const label = REPORT_PRESETS.find((p) => p.value === preset)?.label ?? "";
          report.mutate({ id: reportOn.id, reason: [label, text].filter(Boolean).join(" — ") });
        }}
      >
        {reportOn ? (
          <blockquote className="rounded-xl border border-border/70 bg-muted/40 p-3">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <RatingStars value={reportOn.stars} />
              <span>{reportOn.customerName}</span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed" dir="auto">
              {reportOn.comment.ar || <span className="text-muted-foreground italic">بدون تعليق</span>}
            </p>
          </blockquote>
        ) : null}
      </ReasonDialog>
    </div>
  );
}
