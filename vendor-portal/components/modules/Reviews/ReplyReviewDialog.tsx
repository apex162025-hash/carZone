"use client";

import { useState } from "react";
import { Info } from "lucide-react";

import { RatingStars } from "@carzen/ui/components/shared/rating-stars";
import { Button } from "@carzen/ui/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@carzen/ui/components/ui/dialog";
import { Textarea } from "@carzen/ui/components/ui/textarea";
import { formatNumber } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import type { VendorReview } from "@carzen/contracts/vendor/insights";

const MIN = 5;
const MAX = 400;

type ReplyReviewDialogProps = {
  review: VendorReview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onSubmit: (text: string) => void;
};

/** Public reply to a review — one per review, shown to customers in the app. */
export function ReplyReviewDialog({ review, open, onOpenChange, isPending, onSubmit }: ReplyReviewDialogProps) {
  return (
    <Dialog open={open}onOpenChange={(o) => !isPending && onOpenChange(o)}>
      <DialogContent className="gap-5 sm:max-w-lg">
        {/* Popup content unmounts on close, so the draft resets for every review. */}
        {review ? <ReplyForm review={review} onCancel={() => onOpenChange(false)} isPending={isPending} onSubmit={onSubmit} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ReplyForm({ review, onCancel, isPending, onSubmit }: { review: VendorReview; onCancel: () => void; isPending: boolean; onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);
  const length = text.trim().length;
  const error = length < MIN ? `اكتب ${MIN} أحرف على الأقل` : length > MAX ? `الحد الأقصى ${MAX} حرف` : null;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-base font-semibold">الرد على تقييم {review.customerName}</DialogTitle>
        <DialogDescription>رد واحد لكل تقييم ويظهر للعملاء في التطبيق — لا يمكن تعديله بعد النشر.</DialogDescription>
      </DialogHeader>

      <blockquote className="rounded-xl border border-border/70 bg-muted/40 p-3">
        <RatingStars value={review.stars} />
        <p className="mt-1.5 text-sm leading-relaxed" dir="auto">
          {review.comment.ar || <span className="text-muted-foreground italic">بدون تعليق</span>}
        </p>
      </blockquote>

      <form
        id="review-reply-form"
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (!error) onSubmit(text.trim());
        }}
      >
        <label htmlFor="review-reply" className="text-xs font-medium">
          نص الرد
        </label>
        <Textarea
          id="review-reply"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX + 50}
          rows={4}
          dir="auto"
          placeholder="شكرًا لتقييمك… (اكتب ردًا مهذبًا ومحددًا)"
          aria-invalid={touched && Boolean(error)}
          aria-describedby="review-reply-hint"
          className="min-h-24 resize-none"
        />
        <div id="review-reply-hint" className="flex items-center justify-between gap-3 text-xs">
          {touched && error ? <p className="text-destructive">{error}</p> : <p className="flex items-center gap-1 text-muted-foreground"><Info className="size-3.5" /> بين {MIN} و{MAX} حرف</p>}
          <span className={cn("num shrink-0 text-muted-foreground", length > MAX && "font-semibold text-destructive")} aria-live="polite">
            {formatNumber(length)} / {formatNumber(MAX)}
          </span>
        </div>
      </form>

      <DialogFooter className="-mx-4 -mb-4">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          إلغاء
        </Button>
        <Button type="submit" form="review-reply-form" loading={isPending}>
          نشر الرد
        </Button>
      </DialogFooter>
    </>
  );
}
