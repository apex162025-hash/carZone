import Link from "next/link";
import { Flag, MessageSquareReply, Store, Tag } from "lucide-react";

import { RatingStars } from "@carzen/ui/components/shared/rating-stars";
import { StatusBadge } from "@carzen/ui/components/shared/status-badge";
import { UserAvatar } from "@carzen/ui/components/shared/user-avatar";
import { Button } from "@carzen/ui/components/ui/button";
import { TONES } from "@carzen/ui/lib/constants/labels";
import { formatDateTime, formatRelative } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import type { VendorReview } from "@carzen/contracts/vendor/insights";

/** Customer-app review tags (raw keys from the API). Falls back to the key itself. */
const REVIEW_TAG: Record<string, string> = {
  clean: "نظافة ممتازة",
  value: "سعر مناسب",
  fast: "خدمة سريعة",
  on_time: "التزام بالموعد",
  staff: "تعامل محترم",
  interior: "الداخلية",
  wait: "انتظار طويل",
  price: "السعر",
};

type ReviewCardProps = {
  review: VendorReview;
  showBranch: boolean;
  onReply: (review: VendorReview) => void;
  onReport: (review: VendorReview) => void;
};

/** One customer review with reply (once) and "report to Carzen" (once) — OW-20. */
export function ReviewCard({ review: r, showBranch, onReply, onReport }: ReviewCardProps) {
  const low = r.stars <= 2;

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-soft transition-colors",
        r.reportedByWash && "border-warning/40",
        !r.reply && !r.reportedByWash && low && "border-destructive/30",
      )}
      aria-label={`تقييم ${r.customerName} — ${r.stars} من 5`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <RatingStars value={r.stars} size="md" />
          {low ? <span className="num rounded-md bg-destructive/10 px-1.5 py-px text-[11px] font-semibold text-destructive">{r.stars}/5</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {r.reportedByWash ? <StatusBadge size="sm" label="مُبلغ لكارزن" tone={TONES.warning} /> : null}
          {r.reply ? <StatusBadge size="sm" label="تم الرد" tone={TONES.success} /> : <StatusBadge size="sm" label="بدون رد" tone={TONES.neutral} />}
          <time className="num text-[11px] text-muted-foreground" dateTime={r.createdAt} title={formatDateTime(r.createdAt)}>
            {formatRelative(r.createdAt)}
          </time>
        </div>
      </header>

      <p className="text-sm leading-relaxed" dir="auto">
        {r.comment.ar || <span className="text-muted-foreground italic">بدون تعليق</span>}
      </p>

      {r.tags.length ? (
        <div className="flex flex-wrap gap-1.5">
          {r.tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              <Tag className="size-3" />
              {REVIEW_TAG[t] ?? t}
            </span>
          ))}
        </div>
      ) : null}

      {r.reply ? (
        <div className="flex gap-2 rounded-xl bg-muted/50 px-3 py-2 text-xs">
          <MessageSquareReply className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="leading-relaxed" dir="auto">
              <span className="font-medium">ردك: </span>
              {r.reply}
            </p>
            {r.replyAt ? (
              <p className="num mt-0.5 text-[11px] text-muted-foreground" title={formatDateTime(r.replyAt)}>
                {formatRelative(r.replyAt)} · يظهر للعملاء في التطبيق
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {r.reportedByWash ? (
        <p className="flex items-start gap-1.5 rounded-lg bg-warning/10 px-2.5 py-1.5 text-xs text-warning">
          <Flag className="mt-0.5 size-3.5 shrink-0" />
          <span>
            قيد مراجعة فريق كارزن{r.reportReason ? <span className="text-foreground/80"> — {r.reportReason}</span> : null}
          </span>
        </p>
      ) : null}

      <footer className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-border/60 pt-3">
        <dl className="grid min-w-0 flex-1 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <dt className="sr-only">العميل</dt>
            <UserAvatar name={r.customerName} size="xs" className="size-5 text-[9px]" />
            <dd className="truncate font-medium">
              <Link href={`/customers/${r.customerId}`} className="hover:underline">
                {r.customerName}
              </Link>
            </dd>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
            <dt>الخدمة:</dt>
            <dd className="truncate text-foreground">{r.serviceName.ar}</dd>
          </div>
          {showBranch ? (
            <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
              <dt className="sr-only">الفرع</dt>
              <Store className="size-3.5 shrink-0" />
              <dd className="truncate" title={r.branchName.ar}>
                {r.branchName.ar}
              </dd>
            </div>
          ) : null}
          <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
            <dt>الطلب:</dt>
            <dd>
              {r.orderNumber ? (
                <Link href={`/orders/${r.orderId}`} className="num font-medium text-primary hover:underline">
                  {r.orderNumber}
                </Link>
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center gap-2">
          {!r.reportedByWash ? (
            <Button variant="ghost" size="sm" onClick={() => onReport(r)} aria-label={`إبلاغ كارزن عن تقييم ${r.customerName}`}>
              <Flag />
              إبلاغ كارزن
            </Button>
          ) : null}
          {!r.reply ? (
            <Button size="sm" onClick={() => onReply(r)} aria-label={`الرد على تقييم ${r.customerName}`}>
              <MessageSquareReply />
              رد
            </Button>
          ) : null}
        </div>
      </footer>
    </article>
  );
}
