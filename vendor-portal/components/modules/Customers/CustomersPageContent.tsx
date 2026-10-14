"use client";

import { Users, X } from "lucide-react";

import { DataTable, type DataTableColumn } from "@carzen/ui/components/shared/data-table";
import { ExportCsvButton } from "@carzen/ui/components/shared/export-csv-button";
import { FilterTabs } from "@carzen/ui/components/shared/filter-tabs";
import { ListToolbar } from "@carzen/ui/components/shared/list-toolbar";
import { PageHeader } from "@carzen/ui/components/shared/page-header";
import { SearchInput } from "@carzen/ui/components/shared/search-input";
import { TablePagination } from "@carzen/ui/components/shared/table-pagination";
import { UserAvatar } from "@carzen/ui/components/shared/user-avatar";
import { Button } from "@carzen/ui/components/ui/button";
import { useUrlState } from "@carzen/ui/hooks/use-url-state";
import { CUSTOMER_SEGMENT } from "@carzen/ui/lib/constants/labels";
import type { CsvColumn } from "@carzen/ui/lib/export-csv";
import { formatDate, formatMoney, formatNumber, formatRelative } from "@carzen/ui/lib/format";
import { PlateChip, SegmentBadge, SegmentLegend } from "@/components/modules/Customers/customer-bits";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useCustomers } from "@/hooks/use-insights";
import type { CustomerSegment, VendorCustomer } from "@carzen/contracts/vendor/insights";

const SEGMENTS: (CustomerSegment | "all")[] = ["all", "new", "returning", "lost"];

const CSV: CsvColumn<VendorCustomer>[] = [
  { header: "العميل", value: (c) => c.name },
  { header: "الموبايل", value: (c) => c.phone },
  { header: "اللوحات", value: (c) => c.plates.join(" | ") },
  { header: "الزيارات", value: (c) => c.visits },
  { header: "أول زيارة", value: (c) => c.firstVisitAt ?? "" },
  { header: "آخر زيارة", value: (c) => c.lastVisitAt ?? "" },
  { header: "إجمالي الإنفاق", value: (c) => c.totalSpent },
  { header: "الخدمة المفضلة", value: (c) => c.favoriteService?.ar ?? "" },
  { header: "التصنيف", value: (c) => CUSTOMER_SEGMENT[c.segment].label },
];

const COLUMNS: DataTableColumn<VendorCustomer>[] = [
  {
    key: "name",
    header: "العميل",
    sortKey: "name",
    cell: (c) => (
      <div className="flex min-w-0 items-center gap-2.5">
        <UserAvatar name={c.name} size="sm" />
        <div className="min-w-0">
          <p className="truncate font-medium">{c.name}</p>
          <p className="num truncate text-xs text-muted-foreground" dir="ltr">
            {c.phone}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: "plates",
    header: "السيارات",
    hideBelow: "md",
    cell: (c) =>
      c.plates.length ? (
        <div className="flex max-w-56 flex-wrap gap-1">
          {c.plates.slice(0, 2).map((p) => (
            <PlateChip key={p} plate={p} size="sm" />
          ))}
          {c.plates.length > 2 ? <span className="num text-[11px] text-muted-foreground">+{c.plates.length - 2}</span> : null}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  { key: "visits", header: "الزيارات", sortKey: "visits", align: "center", cell: (c) => <span className="num font-semibold">{formatNumber(c.visits)}</span> },
  {
    key: "lastVisitAt",
    header: "آخر زيارة",
    sortKey: "lastVisitAt",
    cell: (c) =>
      c.lastVisitAt ? (
        <div className="text-xs">
          <span className="block font-medium">{formatRelative(c.lastVisitAt)}</span>
          <span className="num text-muted-foreground">{formatDate(c.lastVisitAt)}</span>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">لم يكمل زيارة بعد</span>
      ),
  },
  { key: "favorite", header: "الخدمة المفضلة", hideBelow: "xl", cell: (c) => <span className="text-xs">{c.favoriteService?.ar ?? <span className="text-muted-foreground">—</span>}</span> },
  { key: "segment", header: "التصنيف", cell: (c) => <SegmentBadge segment={c.segment} /> },
  { key: "totalSpent", header: "إجمالي الإنفاق", sortKey: "totalSpent", align: "end", cell: (c) => <span className="num font-semibold">{formatMoney(c.totalSpent)}</span> },
];

export default function CustomersPageContent() {
  const { branchId, isAll, branchName } = useBranchScope();
  const [state, setState] = useUrlState({ segment: "all", search: "", sort: "lastVisitAt", order: "desc", page: 1 });

  const { data, isLoading, isFetching, error, refetch } = useCustomers({
    branchId,
    segment: state.segment as CustomerSegment | "all",
    search: state.search,
    sort: state.sort,
    order: state.order as "asc" | "desc",
    page: state.page,
  });

  const hasFilters = state.segment !== "all" || Boolean(state.search);
  const clear = () => setState({ segment: "all", search: "" });
  const tabs = SEGMENTS.map((s) => ({
    value: s,
    label: s === "all" ? "الكل" : CUSTOMER_SEGMENT[s].label,
    tone: s === "all" ? undefined : CUSTOMER_SEGMENT[s].tone,
    count: data?.meta.counts[s],
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="العملاء"
        description={`كل من زار ${isAll ? "فروعك" : branchName(branchId)} — الزيارات والإنفاق والخدمة المفضلة. اعرف عملاءك المتكررين وتابع المنقطعين.`}
        actions={<ExportCsvButton filename="carzen-customers" columns={CSV} rows={data?.items} />}
      />

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        <ListToolbar
          tabs={
            <div className="space-y-3">
              <FilterTabs aria-label="تصنيف العملاء" value={state.segment} onChange={(segment) => setState({ segment })} items={tabs} />
              <SegmentLegend />
            </div>
          }
          search={<SearchInput value={state.search} onChange={(search) => setState({ search })} placeholder="الاسم، الموبايل أو رقم اللوحة" />}
          actions={
            hasFilters ? (
              <Button variant="ghost" size="lg" onClick={clear}>
                <X /> مسح الفلاتر
              </Button>
            ) : null
          }
        />

        <DataTable
          columns={COLUMNS}
          rows={data?.items}
          rowKey={(c) => c.id}
          rowHref={(c) => `/customers/${c.id}`}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error}
          onRetry={() => refetch()}
          sort={{ key: state.sort, order: state.order as "asc" | "desc" }}
          onSortChange={(s) => setState({ sort: s.key, order: s.order })}
          empty={{
            icon: <Users />,
            title: hasFilters ? "لا يوجد عملاء مطابقون" : "لا يوجد عملاء بعد",
            description: hasFilters ? "جرّب تصنيفًا آخر أو امسح البحث." : "يظهر العميل هنا بعد أول طلب مسجل برقم موبايل.",
            action: hasFilters ? (
              <Button variant="outline" size="sm" onClick={clear}>
                مسح الفلاتر
              </Button>
            ) : undefined,
          }}
          footer={<TablePagination pagination={data?.pagination} onPageChange={(page) => setState({ page }, { resetPage: false })} />}
        />
      </section>
    </div>
  );
}
