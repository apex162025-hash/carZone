import { VEHICLE_COLOR } from "@/lib/constants/labels";
import { cn } from "@/lib/utils";

/** Egyptian-style plate chip: monospaced, framed, always LTR. */
export function PlateChip({ plate, size = "md", className }: { plate: string; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      dir="ltr"
      className={cn(
        "num inline-flex w-fit items-center overflow-hidden rounded-md border border-foreground/15 bg-card font-mono font-semibold tracking-wider shadow-xs",
        size === "sm" ? "h-5 text-[11px]" : "h-7 text-xs",
        className,
      )}
    >
      <span className={cn("h-full bg-primary/80", size === "sm" ? "w-1" : "w-1.5")} aria-hidden />
      <span className={size === "sm" ? "px-1.5" : "px-2.5"}>{plate}</span>
    </span>
  );
}

/** Color dot + Arabic label for a vehicle color key. */
export function ColorSwatch({ color, showLabel = true, className }: { color: string; showLabel?: boolean; className?: string }) {
  const meta = VEHICLE_COLOR[color];
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className="size-3.5 shrink-0 rounded-full border border-foreground/15 shadow-xs"
        style={{ backgroundColor: meta?.hex ?? color }}
        aria-hidden
      />
      {showLabel ? <span>{meta?.label ?? color}</span> : <span className="sr-only">{meta?.label ?? color}</span>}
    </span>
  );
}
