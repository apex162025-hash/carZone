import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

export type InfoItem = {
  label: string;
  value: ReactNode;
  /** Span both columns (long text). */
  full?: boolean;
};

type InfoListProps = {
  items: InfoItem[];
  columns?: 1 | 2 | 3;
  className?: string;
};

/** Label/value definition grid for detail pages. */
export function InfoList({ items, columns = 2, className }: InfoListProps) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-4",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className={cn("min-w-0", item.full && "sm:col-span-full")}>
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="mt-1 text-sm font-medium break-words">{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
