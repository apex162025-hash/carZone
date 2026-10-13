"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GitBranch, MapPin, PauseCircle, PlayCircle } from "lucide-react";

import { AreaCoverage } from "@/components/modules/Branches/AreaCoverage";
import { BRANCH_STATUS } from "@/components/modules/Branches/branch-status";
import { ToggleBranchDialog } from "@/components/modules/Branches/ToggleBranchDialog";
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
import { Button } from "@/components/ui/button";
import { useUrlState } from "@/hooks/use-url-state";
import { useBranches } from "@/hooks/use-washes";
import { AREAS, BUSINESS_STATUS } from "@/lib/constants/labels";
import { formatNumber } from "@/lib/format";
import type { CsvColumn } from "@/lib/export-csv";
import type { BranchListItem, BranchListParams } from "@/types/washes";

type BranchTab = NonNullable<BranchListParams["status"]>;

const TAB_ORDER: BranchTab[] = ["all", "active", "inactive"];

const CSV: CsvColumn<BranchListItem>[] = [
  { header: "المعرف", value: (b) => b.id },
  { header: "الفرع", value: (b) => b.name.ar },
  { header: "المغسلة", value: (b) => b.businessName.ar },
  { header: "المنطقة", value: (b) => AREAS[b.area] ?? b.area },
  { header: "العنوان", value: (b) => b.address.ar },
  { header: "الهاتف", value: (b) => b.phone },
  { header: "السعة", value: (b) => b.capacity },
  { header: "حجوزات اليوم", value: (b) => b.todayOrders },
  { header: "التقييم", value: (b) => b.rating },
  { header: "عدد التقييمات", value: (b) => b.reviewCount },
  { header: "حالة المغسلة", value: (b) => BUSINESS_STATUS[b.businessStatus].label },
  { header: "حالة الفرع", value: (b) => BRANCH_STATUS[b.active ? "active" : "inactive"].label },
];

function buildColumns(onToggle: (branch: BranchListItem) => void): DataTableColumn<BranchListItem>[] {
  return [
    {
      key: "name",
      header: "الفرع",
      sortKey: "name",
      cell: (b) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{b.name.ar}</p>
          <Link
            href={`/washes/${b.businessId}`}
            className="text-xs text-muted-foreground transition-colors hover:text-primary hover:underline focus-visible:text-primary focus-visible:outline-none"
          >
            {b.businessName.ar}
          </Link>
        </div>
      ),
    },
    {
      key: "area",
      header: "المنطقة",
      hideBelow: "md",
      cell: (b) => (
        <span className="flex items-center gap-1 text-sm">
          <MapPin className="size-3.5 text-muted-foreground" />
          {AREAS[b.area] ?? b.area}
        </span>
      ),
    },
    {
      key: "capacity",
      header: "السعة",
      sortKey: "capacity",
      align: "center",
      cell: (b) => <span className="num font-medium">{b.capacity}</span>,
    },
    {
      key: "todayOrders",
      header: "حجوزات اليوم",
      sortKey: "todayOrders",
      align: "center",
      cell: (b) =>
        b.todayOrders ? (
          <span className="num font-semibold">{formatNumber(b.todayOrders)}</span>
        ) : (
          <span className="num text-xs text-muted-foreground">0</span>
        ),
    },
    {
      key: "rating",
      header: "التقييم",
      sortKey: "rating",
      hideBelow: "lg",
      cell: (b) =>
        b.rating ? (
          <span className="flex items-center gap-1.5">
            <RatingStars value={b.rating} showValue />
            <span className="num text-[11px] text-muted-foreground">({b.reviewCount})</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "businessStatus",
      header: "حالة المغسلة",
      hideBelow: "xl",
      cell: (b) => <StatusBadge meta={BUSINESS_STATUS[b.businessStatus]} size="sm" />,
    },
    {
      key: "status",
      header: "حالة الفرع",
      cell: (b) => <StatusBadge meta={BRANCH_STATUS[b.active ? "active" : "inactive"]} />,
    },
    {
      key: "actions",
      header: <span className="sr-only">إجراءات</span>,
      align: "end",
      cell: (b) => (
        <Button
          variant={b.active ? "outline" : "secondary"}
          size="sm"
          onClick={() => onToggle(b)}
          aria-label={b.active ? `إيقاف ${b.name.ar}` : `تفعيل ${b.name.ar}`}
        >
          {b.active ? <PauseCircle /> : <PlayCircle />}
          {b.active ? "إيقاف" : "تفعيل"}
        </Button>
      ),
    },
  ];
}

export default function BranchesPageContent() {
  const [state, setState] = useUrlState({
    status: "all",
    search: "",
    area: "all",
    sort: "todayOrders",
    order: "desc",
    page: 1,
  });
  const { data, isLoading, isFetching, error, refetch } = useBranches({
    status: state.status as BranchTab,
    search: state.search,
    area: state.area,
    sort: state.sort,
    order: state.order as "asc" | "desc",
    page: state.page,
  });
  // The table is paginated, so the coverage summary loads its own (max-size) page.
  const coverage = useBranches({ per_page: 100 });

  const [target, setTarget] = useState<BranchListItem | null>(null);
  const [toggleOpen, setToggleOpen] = useState(false);
  const columns = useMemo(
    () =>
      buildColumns((branch) => {
        setTarget(branch);
        setToggleOpen(true);
      }),
    [],
  );

  const counts = data?.meta.counts;
  const filtered = Boolean(state.search) || state.status !== "all" || state.area !== "all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="الفروع"
        description="كل فروع المغاسل على المنصة — السعة والطلب اليومي والتغطية حسب المنطقة، مع إمكانية إيقاف أو تفعيل أي فرع بسبب موثق."
        actions={<ExportCsvButton filename="carzen-branches" columns={CSV} rows={data?.items} />}
      />

      <AreaCoverage
        branches={coverage.data?.items}
        total={coverage.data?.pagination.total}
        isLoading={coverage.isLoading}
        error={coverage.error}
        onRetry={() => coverage.refetch()}
        selectedArea={state.area}
        onSelectArea={(area) => setState({ area })}
      />

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        <ListToolbar
          tabs={
            <FilterTabs
              aria-label="حالة الفرع"
              value={state.status as BranchTab}
              onChange={(status) => setState({ status })}
              items={TAB_ORDER.map((s) => ({
                value: s,
                label: s === "all" ? "الكل" : BRANCH_STATUS[s].label,
                count: counts?.[s],
                tone: s === "all" ? undefined : BRANCH_STATUS[s].tone,
              }))}
            />
          }
          search={<SearchInput value={state.search} onChange={(search) => setState({ search })} placeholder="ابحث باسم الفرع أو المغسلة" />}
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
          columns={columns}
          rows={data?.items}
          rowKey={(b) => b.id}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error}
          onRetry={() => refetch()}
          sort={{ key: state.sort, order: state.order as "asc" | "desc" }}
          onSortChange={(s) => setState({ sort: s.key, order: s.order })}
          rowClassName={(b) => (!b.active ? "bg-muted/40 text-muted-foreground" : undefined)}
          empty={
            filtered
              ? {
                  icon: <GitBranch />,
                  title: "لا توجد فروع مطابقة",
                  description: "جرّب حالة أو منطقة أخرى أو امسح كلمة البحث.",
                  action: (
                    <Button variant="outline" size="sm" onClick={() => setState({ status: "all", area: "all", search: "" })}>
                      مسح الفلاتر
                    </Button>
                  ),
                }
              : {
                  icon: <GitBranch />,
                  title: "لا توجد فروع بعد",
                  description: "تظهر الفروع هنا تلقائيًا بعد اعتماد طلبات انضمام المغاسل.",
                  action: (
                    <Button variant="outline" size="sm" render={<Link href="/applications" />}>
                      مراجعة طلبات الانضمام
                    </Button>
                  ),
                }
          }
          footer={<TablePagination pagination={data?.pagination} onPageChange={(page) => setState({ page }, { resetPage: false })} />}
        />
      </section>

      <ToggleBranchDialog branch={target} open={toggleOpen} onOpenChange={setToggleOpen} />
    </div>
  );
}
