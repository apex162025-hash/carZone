import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

type ListToolbarProps = {
  /** Usually a <FilterTabs/> row. */
  tabs?: ReactNode;
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** Filters in one row above the table (tabs on top, search + dropdowns + actions below). */
export function ListToolbar({ tabs, search, filters, actions, className }: ListToolbarProps) {
  return (
    <div className={cn("space-y-3 border-b border-border/60 px-5 py-4", className)}>
      {tabs}
      {search || filters || actions ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {search}
          {filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
          {actions ? <div className="flex items-center gap-2 sm:ms-auto">{actions}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
