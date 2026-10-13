"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { EmptyState, ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { SortOrder } from "@/types/common";

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Server sort key; makes the header clickable. */
  sortKey?: string;
  align?: "start" | "center" | "end";
  /** Hide on narrow screens to keep tables scannable on tablets. */
  hideBelow?: "md" | "lg" | "xl";
  className?: string;
  headClassName?: string;
};

export type DataTableSort = { key: string; order: SortOrder };

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  isLoading?: boolean;
  /** Background refetch with existing rows (dims the table instead of a skeleton). */
  isFetching?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  rowHref?: (row: T) => string;
  sort?: DataTableSort;
  onSortChange?: (sort: DataTableSort) => void;
  empty?: { title: string; description?: string; icon?: ReactNode; action?: ReactNode };
  footer?: ReactNode;
  /** Row highlight, e.g. flagged discrepancies. */
  rowClassName?: (row: T) => string | undefined;
  skeletonRows?: number;
  className?: string;
};

const HIDE: Record<NonNullable<DataTableColumn<unknown>["hideBelow"]>, string> = {
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

const ALIGN = { start: "text-start", center: "text-center", end: "text-end" } as const;

/**
 * The workhorse list component: sticky header, server-side sort, loading
 * skeleton, empty and error states, clickable rows with keyboard support.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  isFetching,
  error,
  onRetry,
  onRowClick,
  rowHref,
  sort,
  onSortChange,
  empty,
  footer,
  rowClassName,
  skeletonRows = 8,
  className,
}: DataTableProps<T>) {
  const router = useRouter();
  const showSkeleton = isLoading && !rows;
  const clickable = Boolean(onRowClick || rowHref);

  const toggleSort = (key: string) => {
    if (!onSortChange) return;
    const order: SortOrder = sort?.key === key && sort.order === "desc" ? "asc" : "desc";
    onSortChange({ key, order });
  };

  if (error && !rows) {
    return <ErrorState message={error.message} onRetry={onRetry} />;
  }

  return (
    <div className={cn("relative", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {columns.map((col) => {
                const active = sort && col.sortKey && sort.key === col.sortKey;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={active ? (sort.order === "asc" ? "ascending" : "descending") : undefined}
                    className={cn(
                      "sticky top-0 z-10 h-10 border-b border-border bg-muted/60 px-4 text-xs font-medium whitespace-nowrap text-muted-foreground backdrop-blur first:ps-5 last:pe-5",
                      ALIGN[col.align ?? "start"],
                      col.hideBelow && HIDE[col.hideBelow],
                      col.headClassName,
                    )}
                  >
                    {col.sortKey && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.sortKey!)}
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                          active && "text-foreground",
                        )}
                      >
                        {col.header}
                        {active ? (
                          sort.order === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                        ) : (
                          <ArrowUpDown className="size-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className={cn("transition-opacity", isFetching && !showSkeleton && "opacity-60")}>
            {showSkeleton
              ? Array.from({ length: skeletonRows }, (_, i) => (
                  <tr key={i}>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn("h-14 border-b border-border/60 px-4 first:ps-5 last:pe-5", col.hideBelow && HIDE[col.hideBelow])}
                      >
                        <Skeleton className="h-4 w-full max-w-[140px]" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows?.map((row) => {
                  const href = rowHref?.(row);
                  const activate = () => {
                    if (onRowClick) onRowClick(row);
                    else if (href) router.push(href);
                  };
                  return (
                    <tr
                      key={rowKey(row)}
                      tabIndex={clickable ? 0 : undefined}
                      onClick={clickable ? activate : undefined}
                      onKeyDown={
                        clickable
                          ? (e) => {
                              if (e.key === "Enter") activate();
                            }
                          : undefined
                      }
                      className={cn(
                        "group transition-colors",
                        clickable && "cursor-pointer hover:bg-secondary/50 focus-visible:bg-secondary/60 focus-visible:outline-none",
                        rowClassName?.(row),
                      )}
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn(
                            "h-14 border-b border-border/60 px-4 align-middle first:ps-5 last:pe-5 group-last:border-b-0",
                            ALIGN[col.align ?? "start"],
                            col.hideBelow && HIDE[col.hideBelow],
                            col.className,
                          )}
                        >
                          {col.cell(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
      {!showSkeleton && rows && rows.length === 0 ? (
        <EmptyState
          title={empty?.title ?? "لا توجد نتائج"}
          description={empty?.description ?? "جرّب تغيير الفلاتر أو كلمة البحث."}
          icon={empty?.icon}
          action={empty?.action}
        />
      ) : null}
      {footer}
    </div>
  );
}
