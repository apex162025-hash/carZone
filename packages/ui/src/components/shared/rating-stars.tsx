import { Star } from "lucide-react";

import { cn } from "../../lib/utils";

type RatingStarsProps = {
  value: number;
  size?: "sm" | "md";
  showValue?: boolean;
  className?: string;
};

export function RatingStars({ value, size = "sm", showValue, className }: RatingStarsProps) {
  const rounded = Math.round(value);
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-label={`${value} من 5`}>
      <span className="inline-flex" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={cn(
              size === "sm" ? "size-3.5" : "size-4",
              i < rounded ? "fill-warning text-warning" : "fill-muted text-muted-foreground/30",
            )}
          />
        ))}
      </span>
      {showValue ? <span className="num text-xs font-semibold">{value.toFixed(1)}</span> : null}
    </span>
  );
}
