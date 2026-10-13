"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import type { Pagination } from "@/types/common";

type TablePaginationProps = {
  pagination: Pagination | undefined;
  onPageChange: (page: number) => void;
};

function pageWindow(current: number, last: number): (number | "…")[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages = new Set([1, last, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

export function TablePagination({ pagination, onPageChange }: TablePaginationProps) {
  if (!pagination || pagination.total === 0) return null;
  const { current_page: page, last_page: last, from, to, total } = pagination;

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border/60 px-5 py-3 sm:flex-row">
      <p className="text-xs text-muted-foreground">
        عرض <span className="num font-medium text-foreground">{formatNumber(from)}–{formatNumber(to)}</span> من{" "}
        <span className="num font-medium text-foreground">{formatNumber(total)}</span>
      </p>
      {last > 1 ? (
        <nav className="flex items-center gap-1" aria-label="التنقل بين الصفحات">
          <Button variant="ghost" size="icon-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="الصفحة السابقة">
            <ChevronRight />
          </Button>
          {pageWindow(page, last).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-1 text-xs text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? "secondary" : "ghost"}
                size="icon-sm"
                className="num"
                aria-current={p === page ? "page" : undefined}
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            ),
          )}
          <Button variant="ghost" size="icon-sm" disabled={page >= last} onClick={() => onPageChange(page + 1)} aria-label="الصفحة التالية">
            <ChevronLeft />
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
