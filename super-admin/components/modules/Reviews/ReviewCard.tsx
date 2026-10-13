import Link from "next/link";
import { Eye, EyeOff, MessageSquareReply, Store, Tag } from "lucide-react";

import { RatingStars } from "@/components/shared/rating-stars";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { HIDE_REVIEW_REASON } from "@/lib/constants/labels";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HideReviewReason, ReviewListItem } from "@/types/reviews";

type ReviewCardProps = {
  review: ReviewListItem;
  onHide: (review: ReviewListItem) => void;
  onRestore: (review: ReviewListItem) => void;
};

export function hiddenReasonLabel(reason: string | null) {
  if (!reason) return null;
  return HIDE_REVIEW_REASON[reason as HideReviewReason] ?? reason;
}

/** One review in the moderation queue (AD-28) with its hide / restore action (AD-29). */
export function ReviewCard({ review: r, onHide, onRestore }: ReviewCardProps) {
  const hidden = r.status === "hidden";
  const low = r.stars <= 2;

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-soft transition-colors",
        hidden && "bg-muted/30",
        r.reportedByWash && !hidden && "border-warning/40",
      )}
      aria-label={`تقييم ${r.customerName} على ${r.businessName.ar}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <RatingStars value={r.stars} size="md" />
          {low ? <span className="num rounded-md bg-destructive/10 px-1.5 py-px text-[11px] font-semibold text-destructive">{r.stars}/5</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {r.reportedByWash ? (
            <StatusBadge size="sm" label="أبلغت عنه المغسلة" tone="var(--warning)" />
          ) : null}
          {hidden ? <StatusBadge size="sm" label="مخفي" tone="var(--muted-foreground)" /> : null}
          <time className="num text-[11px] text-muted-foreground" dateTime={r.createdAt} title={formatDateTime(r.createdAt)}>
            {formatRelative(r.createdAt)}
          </time>
        </div>
      </header>

      <p className={cn("text-sm leading-relaxed", hidden && "text-muted-foreground line-through decoration-muted-foreground/40")} dir="auto">
        {r.comment.ar || <span className="text-muted-foreground italic">بدون تعليق</span>}
      </p>

      {r.tags.length ? (
        <div className="flex flex-wrap gap-1.5">
          {r.tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              <Tag className="size-3" />
              {t}
            </span>
          ))}
        </div>
      ) : null}

      {r.reply ? (
        <div className="flex gap-2 rounded-xl bg-muted/50 px-3 py-2 text-xs">
          <MessageSquareReply className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <p className="leading-relaxed" dir="auto">
            <span className="font-medium">رد المغسلة: </span>
            {r.reply}
          </p>
        </div>
      ) : null}

      {hidden && r.hiddenReason ? (
        <p className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
          <EyeOff className="size-3.5" />
          سبب الإخفاء: <span className="font-medium text-foreground">{hiddenReasonLabel(r.hiddenReason)}</span>
        </p>
      ) : null}

      <footer className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-border/60 pt-3">
        <dl className="grid min-w-0 flex-1 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <dt className="sr-only">العميل</dt>
            <UserAvatar name={r.customerName} size="xs" className="size-5 text-[9px]" />
            <dd className="truncate font-medium">{r.customerName}</dd>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
            <dt className="sr-only">المغسلة والفرع</dt>
            <Store className="size-3.5 shrink-0" />
            <dd className="truncate" title={r.branchName.ar}>
              {r.businessName.ar} · {r.branchName.ar}
            </dd>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
            <dt>الخدمة:</dt>
            <dd className="truncate text-foreground">{r.serviceName.ar}</dd>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
            <dt>الحجز:</dt>
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
        {hidden ? (
          <Button variant="outline" size="sm" onClick={() => onRestore(r)}>
            <Eye />
            استعادة
          </Button>
        ) : (
          <Button variant="destructive" size="sm" onClick={() => onHide(r)}>
            <EyeOff />
            إخفاء
          </Button>
        )}
      </footer>
    </article>
  );
}
