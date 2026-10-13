"use client";

import Link from "next/link";
import { MapPin, Plus, Store } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { PageHeader } from "@/components/shared/page-header";
import { RatingStars } from "@/components/shared/rating-stars";
import { SearchInput } from "@/components/shared/search-input";
import { SelectFilter } from "@/components/shared/select-filter";
import { StatusBadge } from "@/components/shared/status-badge";
import { TablePagination } from "@/components/shared/table-pagination";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { useUrlState } from "@/hooks/use-url-state";
import { useWashes } from "@/hooks/use-washes";
import { AREAS, BUSINESS_STATUS } from "@/lib/constants/labels";
import { formatMoney, formatNumber, formatRelative } from "@/lib/format";
import type { CsvColumn } from "@/lib/export-csv";
import type { BusinessStatus, WashListItem } from "@/types/washes";

const TAB_ORDER: (BusinessStatus | "all")[] = ["all", "active", "pending", "approved", "suspended", "rejected"];

const COLUMNS: DataTableColumn<WashListItem>[] = [
  {
    key: "name",
    header: "المغسلة",
    sortKey: "name",
    cell: (w) => (
      <div className="flex items-center gap-3">
        <span className="bg-brand-gradient flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white">
          {w.name.en.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{w.name.ar}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserAvatar name={w.ownerName} size="xs" className="size-4 text-[8px]" />
            {w.ownerName}
          </p>
        </div>
      </div>
    ),
  },
  { key: "status", header: "الحالة", cell: (w) => <StatusBadge meta={BUSINESS_STATUS[w.status]} /> },
  {
    key: "branches",
    header: "الفروع",
    sortKey: "branchesCount",
    hideBelow: "md",
    cell: (w) => (
      <div className="text-xs">
        <span className="num font-semibold text-foreground">{w.branchesCount}</span>
        <span className="ms-1.5 text-muted-foreground">{w.areas.map((a) => AREAS[a] ?? a).join("، ")}</span>
      </div>
    ),
  },
  { key: "rating", header: "التقييم", sortKey: "rating", hideBelow: "lg", cell: (w) => (w.rating ? <RatingStars value={w.rating} showValue /> : <span className="text-xs text-muted-foreground">—</span>) },
  { key: "orders", header: "الحجوزات", sortKey: "ordersCount", align: "end", cell: (w) => <span className="num">{formatNumber(w.ordersCount)}</span> },
  {
    key: "complaints",
    header: "شكاوى مفتوحة",
    sortKey: "complaintsCount",
    align: "center",
    hideBelow: "lg",
    cell: (w) =>
      w.openComplaints ? (
        <span className="num rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">{w.openComplaints}</span>
      ) : (
        <span className="text-xs text-muted-foreground">0</span>
      ),
  },
  { key: "gmv", header: "إجمالي المبيعات", sortKey: "gmv", align: "end", cell: (w) => <span className="num font-semibold">{formatMoney(w.gmv)}</span> },
  {
    key: "activity",
    header: "آخر نشاط",
    sortKey: "lastActivityAt",
    hideBelow: "xl",
    cell: (w) => <span className="text-xs text-muted-foreground">{w.lastActivityAt ? formatRelative(w.lastActivityAt) : "—"}</span>,
  },
];

const CSV: CsvColumn<WashListItem>[] = [
  { header: "المعرف", value: (w) => w.id },
  { header: "المغسلة", value: (w) => w.name.ar },
  { header: "Name", value: (w) => w.name.en },
  { header: "المالك", value: (w) => w.ownerName },
  { header: "الحالة", value: (w) => BUSINESS_STATUS[w.status].label },
  { header: "الفروع", value: (w) => w.branchesCount },
  { header: "التقييم", value: (w) => w.rating },
  { header: "الحجوزات", value: (w) => w.ordersCount },
  { header: "شكاوى مفتوحة", value: (w) => w.openComplaints },
  { header: "المبيعات", value: (w) => w.gmv },
];

export default function WashesPageContent() {
  const [state, setState] = useUrlState({
    status: "all",
    search: "",
    area: "all",
    sort: "gmv",
    order: "desc",
    page: 1,
  });
  const { data, isLoading, isFetching, error, refetch } = useWashes({
    status: state.status as BusinessStatus | "all",
    search: state.search,
    area: state.area,
    sort: state.sort,
    order: state.order as "asc" | "desc",
    page: state.page,
  });

  const counts = data?.meta.counts;

  return (
    <div className="space-y-6">
      <PageHeader
        title="المغاسل"
        description="كل المغاسل الشريكة على المنصة — راقب الأداء، الشكاوى والحالة، وتدخّل عند الحاجة."
        actions={
          <>
            <ExportCsvButton filename="carzen-washes" columns={CSV} rows={data?.items} />
            <Button size="lg" render={<Link href="/applications" />}>
              <Plus />
              مراجعة طلبات الانضمام
            </Button>
          </>
        }
      />

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        <ListToolbar
          tabs={
            <FilterTabs
              aria-label="حالة المغسلة"
              value={state.status}
              onChange={(status) => setState({ status })}
              items={TAB_ORDER.map((s) => ({
                value: s,
                label: s === "all" ? "الكل" : BUSINESS_STATUS[s].label,
                count: counts?.[s],
                tone: s === "all" ? undefined : BUSINESS_STATUS[s].tone,
              }))}
            />
          }
          search={<SearchInput value={state.search} onChange={(search) => setState({ search })} placeholder="ابحث باسم المغسلة أو المالك" />}
          filters={
            <SelectFilter
              aria-label="المنطقة"
              icon={<MapPin className="size-4" />}
              value={state.area}
              onChange={(area) => setState({ area })}
              allLabel="كل المناطق"
              options={Object.entries(AREAS).map(([value, label]) => ({ value, label }))}
            />
          }
        />
        <DataTable
          columns={COLUMNS}
          rows={data?.items}
          rowKey={(w) => w.id}
          rowHref={(w) => `/washes/${w.id}`}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error}
          onRetry={() => refetch()}
          sort={{ key: state.sort, order: state.order as "asc" | "desc" }}
          onSortChange={(s) => setState({ sort: s.key, order: s.order })}
          rowClassName={(w) => (w.openComplaints >= 3 ? "bg-destructive/[0.03]" : undefined)}
          empty={{ icon: <Store />, title: "لا توجد مغاسل مطابقة", description: "جرّب حالة أو منطقة أخرى أو امسح كلمة البحث." }}
          footer={<TablePagination pagination={data?.pagination} onPageChange={(page) => setState({ page }, { resetPage: false })} />}
        />
      </section>
    </div>
  );
}
