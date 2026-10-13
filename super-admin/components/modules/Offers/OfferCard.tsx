"use client";

import type { CSSProperties } from "react";
import { CalendarRange, Lock, MapPinned, PencilLine, Star, Ticket } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { OFFER_STATUS, SERVICE_CATEGORY, TONES } from "@/lib/constants/labels";
import { formatDateTime, formatMoney, formatNumber, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OfferListItem } from "@/types/offers";

type OfferCardProps = {
  offer: OfferListItem;
  onEdit: (offer: OfferListItem) => void;
  onToggle: (offer: OfferListItem, enabled: boolean) => void;
  togglePending?: boolean;
};

/** Share of the offer window already elapsed (0–100). */
function elapsedPercent(startAt: string, endAt: string) {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  const span = end - start;
  if (span <= 0) return 100;
  return Math.min(100, Math.max(0, ((Date.now() - start) / span) * 100));
}

function timingText(offer: OfferListItem) {
  switch (offer.status) {
    case "scheduled":
      return `يبدأ ${formatRelative(offer.startAt)}`;
    case "active":
      return `ينتهي ${formatRelative(offer.endAt)}`;
    case "expired":
      return `انتهى ${formatRelative(offer.endAt)}`;
    case "draft":
      return "لم يُنشر بعد";
    default:
      return "موقوف يدويًا";
  }
}

export function OfferCard({ offer, onEdit, onToggle, togglePending }: OfferCardProps) {
  const isPlatform = offer.scope === "platform";
  const statusMeta = OFFER_STATUS[offer.status];
  const discount = offer.discountType === "percent" ? `${offer.discountValue}٪` : formatMoney(offer.discountValue);
  const canToggle = offer.status !== "draft" && offer.status !== "expired";
  const enabled = offer.status !== "disabled";
  const progress = offer.status === "active" ? elapsedPercent(offer.startAt, offer.endAt) : null;
  const dim = offer.status === "expired" || offer.status === "disabled";

  return (
    <article
      className={cn(
        "flex flex-col rounded-2xl border border-border/80 bg-card shadow-soft transition-colors",
        offer.status === "active" && "border-success/30",
      )}
      aria-label={offer.title.ar}
    >
      <div className="flex-1 space-y-3.5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge
              size="sm"
              label={isPlatform ? "عرض المنصة" : `مغسلة: ${offer.businessName?.ar ?? "—"}`}
              tone={isPlatform ? TONES.primary : TONES.aqua}
            />
            {offer.featured ? (
              <span className="inline-flex h-5 items-center gap-1 rounded-full bg-warning/15 px-2 text-[11px] font-medium text-warning">
                <Star className="size-3 fill-current" />
                مميز
              </span>
            ) : null}
          </div>
          <StatusBadge meta={statusMeta} size="sm" live={offer.status === "active"} />
        </div>

        <div className={cn("flex items-start gap-3", dim && "opacity-70")}>
          <div
            style={{ "--tone": isPlatform ? "var(--primary)" : "var(--aqua)" } as CSSProperties}
            className="tone-soft flex min-h-16 min-w-16 shrink-0 flex-col items-center justify-center rounded-xl px-2"
          >
            <span className="num text-lg leading-tight font-bold">{discount}</span>
            <span className="text-[10px] font-medium">خصم</span>
          </div>
          <div className="min-w-0 space-y-0.5">
            <h3 className="line-clamp-2 text-sm font-semibold">{offer.title.ar}</h3>
            <p className="truncate text-end text-xs text-muted-foreground" dir="ltr">
              {offer.title.en}
            </p>
            {offer.description.ar ? <p className="line-clamp-2 pt-1 text-xs leading-relaxed text-muted-foreground">{offer.description.ar}</p> : null}
          </div>
        </div>

        <div className="space-y-2 rounded-xl bg-muted/50 px-3 py-2.5 text-xs">
          <p className="flex items-center gap-1.5">
            <CalendarRange className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="num">{formatDateTime(offer.startAt)}</span>
            <span className="text-muted-foreground">←</span>
            <span className="num">{formatDateTime(offer.endAt)}</span>
          </p>
          {progress !== null ? (
            <div
              role="progressbar"
              aria-label="الوقت المنقضي من مدة العرض"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
              className="h-1.5 overflow-hidden rounded-full bg-background"
            >
              <div className="h-full rounded-full bg-success" style={{ width: `${progress}%` }} />
            </div>
          ) : null}
          <p className="num text-[11px] text-muted-foreground">
            {timingText(offer)}
            {progress !== null ? ` · مضى ${Math.round(progress)}٪ من المدة` : null}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {offer.serviceCategories.length ? (
            offer.serviceCategories.map((c) => (
              <span key={c} className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {SERVICE_CATEGORY[c] ?? c}
              </span>
            ))
          ) : (
            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">كل الخدمات</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3">
        <dl className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5" title="عدد الفروع">
            <dt>
              <MapPinned className="size-3.5 text-muted-foreground" aria-hidden />
              <span className="sr-only">الفروع</span>
            </dt>
            <dd className="num font-medium">{formatNumber(offer.branchesCount)} فرع</dd>
          </div>
          <div className="flex items-center gap-1.5" title="مرات الاستخدام">
            <dt>
              <Ticket className="size-3.5 text-muted-foreground" aria-hidden />
              <span className="sr-only">مرات الاستخدام</span>
            </dt>
            <dd className="num font-medium">{formatNumber(offer.redemptions)} استخدام</dd>
          </div>
        </dl>

        <div className="flex items-center gap-2">
          {isPlatform ? (
            <Button variant="outline" size="sm" onClick={() => onEdit(offer)} aria-label={`تعديل ${offer.title.ar}`}>
              <PencilLine />
              تعديل
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Lock className="size-3" />
              تُدار من لوحة المغسلة
            </span>
          )}
          {canToggle ? (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-xs font-medium">
              <span className={enabled ? "text-foreground" : "text-muted-foreground"}>{enabled ? "مفعّل" : "موقوف"}</span>
              <Switch
                checked={enabled}
                disabled={togglePending}
                onCheckedChange={(on) => onToggle(offer, on)}
                aria-label={enabled ? `إيقاف ${offer.title.ar}` : `تفعيل ${offer.title.ar}`}
              />
            </label>
          ) : null}
        </div>
      </div>
    </article>
  );
}
