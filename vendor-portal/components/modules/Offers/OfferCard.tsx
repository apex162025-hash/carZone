"use client";

import type { CSSProperties } from "react";
import { BadgeCheck, CalendarRange, Lock, MapPinned, PencilLine, Send, Ticket } from "lucide-react";

import { StatusBadge } from "@carzen/ui/components/shared/status-badge";
import { Button } from "@carzen/ui/components/ui/button";
import { Switch } from "@carzen/ui/components/ui/switch";
import { OFFER_STATUS, SERVICE_CATEGORY, TONES } from "@carzen/ui/lib/constants/labels";
import { formatDateTime, formatMoney, formatNumber, formatRelative, serverNow } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import type { VendorOffer } from "@carzen/contracts/vendor/catalog";

type OfferCardProps = {
  offer: VendorOffer;
  /** Total branches on the account — "all branches" when the offer covers every one. */
  branchCount: number;
  branchName: (id: string) => string;
  /** Owner on a wash offer. */
  canManage: boolean;
  onEdit: (offer: VendorOffer) => void;
  onToggle: (offer: VendorOffer, enabled: boolean) => void;
  togglePending?: boolean;
};

export function formatDiscount(offer: Pick<VendorOffer, "discountType" | "discountValue">) {
  return offer.discountType === "percent" ? `${offer.discountValue}٪` : formatMoney(offer.discountValue);
}

/** Share of the offer window already elapsed (0–100), on the demo clock. */
function elapsedPercent(startAt: string, endAt: string) {
  const start = new Date(startAt).getTime();
  const span = new Date(endAt).getTime() - start;
  if (span <= 0) return 100;
  return Math.min(100, Math.max(0, ((serverNow().getTime() - start) / span) * 100));
}

function timingText(offer: VendorOffer) {
  switch (offer.status) {
    case "scheduled":
      return `يبدأ ${formatRelative(offer.startAt)}`;
    case "active":
      return `ينتهي ${formatRelative(offer.endAt)}`;
    case "expired":
      return `انتهى ${formatRelative(offer.endAt)}`;
    case "draft":
      return "مسودة — لم يُنشر بعد ولا يراه العملاء";
    default:
      return "موقوف يدويًا — لا يُطبق على الأسعار";
  }
}

/** D9 — one wash or Carzen offer. Carzen (platform) offers are read-only here. */
export function OfferCard({ offer, branchCount, branchName, canManage, onEdit, onToggle, togglePending }: OfferCardProps) {
  const isPlatform = offer.scope === "platform";
  const manageable = canManage && offer.editable;
  const canToggle = manageable && offer.status !== "draft" && offer.status !== "expired";
  const enabled = offer.status !== "disabled";
  const progress = offer.status === "active" ? elapsedPercent(offer.startAt, offer.endAt) : null;
  const dim = offer.status === "expired" || offer.status === "disabled";
  const allBranches = branchCount > 1 && offer.branchIds.length >= branchCount;

  return (
    <article
      aria-label={offer.title.ar}
      className={cn("flex flex-col rounded-2xl border border-border/80 bg-card shadow-soft transition-colors", offer.status === "active" && "border-success/30")}
    >
      <div className="flex-1 space-y-3.5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {isPlatform ? (
            <span className="inline-flex h-5 items-center gap-1 rounded-full bg-primary/10 px-2 text-[11px] font-medium text-primary">
              <BadgeCheck className="size-3" />
              عرض من كارزن
            </span>
          ) : (
            <StatusBadge size="sm" label="عرض المغسلة" tone={TONES.aqua} />
          )}
          <StatusBadge meta={OFFER_STATUS[offer.status]} size="sm" live={offer.status === "active"} />
        </div>

        <div className={cn("flex items-start gap-3", dim && "opacity-70")}>
          <div
            style={{ "--tone": isPlatform ? "var(--primary)" : "var(--aqua)" } as CSSProperties}
            className="tone-soft flex min-h-16 min-w-16 shrink-0 flex-col items-center justify-center rounded-xl px-2"
          >
            <span className="num text-lg leading-tight font-bold">{formatDiscount(offer)}</span>
            <span className="text-[10px] font-medium">خصم</span>
          </div>
          <div className="min-w-0 space-y-0.5">
            <h3 className="line-clamp-2 text-sm font-semibold">{offer.title.ar}</h3>
            {offer.title.en && offer.title.en !== offer.title.ar ? (
              <p className="truncate text-xs text-muted-foreground">
                <span dir="ltr">{offer.title.en}</span>
              </p>
            ) : null}
            {offer.description.ar ? <p className="line-clamp-2 pt-1 text-xs leading-relaxed text-muted-foreground">{offer.description.ar}</p> : null}
          </div>
        </div>

        <div className="space-y-2 rounded-xl bg-muted/50 px-3 py-2.5 text-xs">
          <p className="flex flex-wrap items-center gap-1.5">
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
              <div className="h-full rounded-full bg-success" style={{ width: `${Math.max(progress, 2)}%` }} />
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

        <p className="flex items-start gap-1.5 text-xs">
          <MapPinned className="mt-px size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="sr-only">الفروع:</span>
          <span className="min-w-0">
            {allBranches ? `كل الفروع (${formatNumber(branchCount)})` : offer.branchIds.map((id) => branchName(id)).join("، ") || "—"}
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3">
        <p className="flex items-center gap-1.5 text-xs" title="عدد الطلبات التي طُبق عليها العرض في فروعك">
          <Ticket className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="num font-medium">{formatNumber(offer.redemptions)}</span> استخدام
        </p>

        <div className="flex items-center gap-2">
          {isPlatform ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Lock className="size-3" />
              تديره كارزن — للعرض فقط
            </span>
          ) : manageable ? (
            <Button variant="outline" size="sm" onClick={() => onEdit(offer)} aria-label={`${offer.status === "draft" ? "نشر" : "تعديل"} ${offer.title.ar}`}>
              {offer.status === "draft" ? <Send /> : <PencilLine />}
              {offer.status === "draft" ? "مراجعة ونشر" : "تعديل"}
            </Button>
          ) : null}
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
