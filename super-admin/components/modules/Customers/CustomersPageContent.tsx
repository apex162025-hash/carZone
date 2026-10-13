"use client";

import { Users } from "lucide-react";

import { PlateChip } from "@/components/modules/Customers/VehicleBits";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { TablePagination } from "@/components/shared/table-pagination";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { useCustomers } from "@/hooks/use-customers";
import { useUrlState } from "@/hooks/use-url-state";
import { CUSTOMER_STATUS, TONES } from "@/lib/constants/labels";
import { formatDate, formatMoney, formatNumber, formatRelative } from "@/lib/format";
import type { CsvColumn } from "@/lib/export-csv";
import type { CustomerFilter, CustomerListItem } from "@/types/customers";

const TABS: { value: CustomerFilter; label: string; tone?: string }[] = [
  { value: "all", label: "الكل" },
  { value: "active", label: "نشط", tone: CUSTOMER_STATUS.active.tone },
  { value: "suspended", label: "موقوف", tone: CUSTOMER_STATUS.suspended.tone },
  { value: "new", label: "جديد (7 أيام)", tone: TONES.info },
  { value: "high_activity", label: "نشاط مرتفع", tone: TONES.violet },
];

const COLUMNS: DataTableColumn<CustomerListItem>[] = [
  {
    key: "name",
    header: "العميل",
    sortKey: "name",
    cell: (c) => (
      <div className="flex items-center gap-3">
        <UserAvatar name={c.name} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{c.name}</p>
          <p className="num text-xs text-muted-foreground" dir="ltr">
            {c.phone}
          </p>
        </div>
      </div>
    ),
  },
  { key: "status", header: "الحالة", cell: (c) => <StatusBadge meta={CUSTOMER_STATUS[c.status]} size="sm" /> },
  {
    key: "vehicles",
    header: "السيارات",
    hideBelow: "md",
    cell: (c) =>
      c.vehiclesCount ? (
        <div className="flex items-center gap-2">
          <span className="num font-semibold">{c.vehiclesCount}</span>
          {c.plates[0] ? <PlateChip plate={c.plates[0]} size="sm" /> : null}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">لا توجد</span>
      ),
  },
  { key: "orders", header: "الحجوزات", sortKey: "ordersCount", align: "end", cell: (c) => <span className="num">{formatNumber(c.ordersCount)}</span> },
  {
    key: "completed",
    header: "المكتملة",
    sortKey: "completedCount",
    align: "end",
    hideBelow: "lg",
    cell: (c) => <span className="num text-muted-foreground">{formatNumber(c.completedCount)}</span>,
  },
  { key: "spent", header: "إجمالي الإنفاق", sortKey: "totalSpent", align: "end", cell: (c) => <span className="num font-semibold">{formatMoney(c.totalSpent)}</span> },
  {
    key: "lastActive",
    header: "آخر نشاط",
    sortKey: "lastActiveAt",
    hideBelow: "lg",
    cell: (c) => <span className="text-xs text-muted-foreground">{formatRelative(c.lastActiveAt)}</span>,
  },
  {
    key: "joined",
    header: "تاريخ الانضمام",
    sortKey: "createdAt",
    hideBelow: "xl",
    cell: (c) => <span className="num text-xs text-muted-foreground">{formatDate(c.createdAt, { withYear: true })}</span>,
  },
];

const CSV: CsvColumn<CustomerListItem>[] = [
  { header: "المعرف", value: (c) => c.id },
  { header: "الاسم", value: (c) => c.name },
  { header: "الهاتف", value: (c) => c.phone },
  { header: "الحالة", value: (c) => CUSTOMER_STATUS[c.status].label },
  { header: "السيارات", value: (c) => c.vehiclesCount },
  { header: "اللوحات", value: (c) => c.plates.join(" / ") },
  { header: "الحجوزات", value: (c) => c.ordersCount },
  { header: "المكتملة", value: (c) => c.completedCount },
  { header: "إجمالي الإنفاق", value: (c) => c.totalSpent },
  { header: "آخر نشاط", value: (c) => c.lastActiveAt },
  { header: "تاريخ الانضمام", value: (c) => c.createdAt },
];

export default function CustomersPageContent() {
  const [state, setState] = useUrlState({
    filter: "all",
    search: "",
    sort: "lastActiveAt",
    order: "desc",
    page: 1,
  });
  const { data, isLoading, isFetching, error, refetch } = useCustomers({
    filter: state.filter as CustomerFilter,
    search: state.search,
    sort: state.sort,
    order: state.order as "asc" | "desc",
    page: state.page,
  });

  const counts = data?.meta.counts;
  const hasFilters = state.filter !== "all" || Boolean(state.search);

  return (
    <div className="space-y-6">
      <PageHeader
        title="العملاء"
        description="كل حسابات العملاء على تطبيق كارزن — ابحث بالاسم أو الهاتف أو اللوحة، وتابع النشاط والإنفاق."
        actions={<ExportCsvButton filename="carzen-customers" columns={CSV} rows={data?.items} />}
      />

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        <ListToolbar
          tabs={
            <FilterTabs
              aria-label="تصفية العملاء"
              value={state.filter}
              onChange={(filter) => setState({ filter })}
              items={TABS.map((t) => ({ ...t, count: counts?.[t.value] }))}
            />
          }
          search={<SearchInput value={state.search} onChange={(search) => setState({ search })} placeholder="ابحث بالاسم أو الهاتف أو رقم اللوحة" />}
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
          rowClassName={(c) => (c.status === "suspended" ? "bg-destructive/[0.03]" : undefined)}
          empty={{
            icon: <Users />,
            title: "لا يوجد عملاء مطابقون",
            description: hasFilters ? "جرّب فلترًا آخر أو تأكد من رقم الهاتف أو اللوحة." : "لم يسجل أي عميل على التطبيق بعد.",
            action: hasFilters ? (
              <Button variant="outline" size="sm" onClick={() => setState({ filter: "all", search: "" })}>
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
