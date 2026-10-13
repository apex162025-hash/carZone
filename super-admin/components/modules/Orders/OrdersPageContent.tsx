"use client";

import { CalendarRange, CreditCard, Flag, Radio, Store } from "lucide-react";

import { DateRangeFilter } from "@/components/modules/Orders/DateRangeFilter";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { SelectFilter } from "@/components/shared/select-filter";
import { StatusBadge } from "@/components/shared/status-badge";
import { TablePagination } from "@/components/shared/table-pagination";
import { Button } from "@/components/ui/button";
import { useOrders } from "@/hooks/use-orders";
import { useUrlState } from "@/hooks/use-url-state";
import { useWashes } from "@/hooks/use-washes";
import { ORDER_SOURCE, ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from "@/lib/constants/labels";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import type { CsvColumn } from "@/lib/export-csv";
import type { OrderListItem, OrderSource, OrderStatus, PaymentStatus } from "@/types/orders";

const TAB_ORDER: (OrderStatus | "all")[] = ["all", "pending", "confirmed", "waiting", "in_service", "completed", "cancelled", "no_show"];

const DEFAULTS = {
  status: "all",
  source: "all",
  payment: "all",
  washId: "all",
  customerId: "",
  dateFrom: "",
  dateTo: "",
  search: "",
  sort: "scheduledAt",
  order: "desc",
  page: 1,
};

const COLUMNS: DataTableColumn<OrderListItem>[] = [
  {
    key: "number",
    header: "رقم الحجز",
    sortKey: "number",
    cell: (o) => (
      <div className="space-y-0.5">
        <p className="num flex items-center gap-1.5 font-semibold">
          {o.number}
          {o.flag ? <Flag className="size-3.5 text-info" aria-label="قيد المراجعة المالية" /> : null}
        </p>
        <p className="num text-[11px] tracking-wider text-muted-foreground" dir="ltr">
          {o.code}
        </p>
      </div>
    ),
  },
  { key: "source", header: "المصدر", hideBelow: "lg", cell: (o) => <StatusBadge meta={ORDER_SOURCE[o.source]} size="sm" /> },
  {
    key: "customer",
    header: "العميل",
    cell: (o) =>
      o.customerName ? (
        <div className="min-w-0">
          <p className="truncate font-medium">{o.customerName}</p>
          <p className="num text-[11px] text-muted-foreground" dir="ltr">
            {o.plate}
          </p>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">عميل مباشر</span>
      ),
  },
  {
    key: "wash",
    header: "المغسلة / الفرع",
    hideBelow: "md",
    cell: (o) => (
      <div className="min-w-0 max-w-56">
        <p className="truncate font-medium">{o.businessName.ar}</p>
        <p className="truncate text-xs text-muted-foreground">{o.branchName.ar}</p>
      </div>
    ),
  },
  {
    key: "service",
    header: "الخدمة",
    hideBelow: "xl",
    cell: (o) => (
      <div className="text-xs">
        <p className="font-medium text-foreground">{o.serviceName.ar}</p>
        {o.items.length > 1 ? <p className="text-muted-foreground">+ {o.items.length - 1} إضافة</p> : null}
      </div>
    ),
  },
  {
    key: "scheduled",
    header: "الموعد",
    sortKey: "scheduledAt",
    cell: (o) => <span className="num text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(o.scheduledAt)}</span>,
  },
  { key: "status", header: "الحالة", cell: (o) => <StatusBadge meta={ORDER_STATUS[o.status]} size="sm" /> },
  { key: "payment", header: "الدفع", hideBelow: "lg", cell: (o) => <StatusBadge meta={PAYMENT_STATUS[o.paymentStatus]} size="sm" /> },
  { key: "total", header: "المبلغ", sortKey: "total", align: "end", cell: (o) => <span className="num font-semibold">{formatMoney(o.total)}</span> },
];

const CSV: CsvColumn<OrderListItem>[] = [
  { header: "رقم الحجز", value: (o) => o.number },
  { header: "الكود", value: (o) => o.code },
  { header: "المصدر", value: (o) => ORDER_SOURCE[o.source].label },
  { header: "العميل", value: (o) => o.customerName ?? "عميل مباشر" },
  { header: "اللوحة", value: (o) => o.plate },
  { header: "المغسلة", value: (o) => o.businessName.ar },
  { header: "الفرع", value: (o) => o.branchName.ar },
  { header: "الخدمة", value: (o) => o.items.map((i) => i.name.ar).join(" + ") },
  { header: "الموعد", value: (o) => o.scheduledAt },
  { header: "الحالة", value: (o) => ORDER_STATUS[o.status].label },
  { header: "الدفع", value: (o) => PAYMENT_STATUS[o.paymentStatus].label },
  { header: "طريقة الدفع", value: (o) => (o.paymentMethod ? PAYMENT_METHOD[o.paymentMethod] : "") },
  { header: "الخصم", value: (o) => o.discount?.amount ?? 0 },
  { header: "المبلغ", value: (o) => o.total },
  { header: "مراجعة مالية", value: (o) => (o.flag ? "نعم" : "") },
];

export default function OrdersPageContent() {
  const [state, setState] = useUrlState(DEFAULTS);
  const { data, isLoading, isFetching, error, refetch } = useOrders({
    status: state.status as OrderStatus | "all",
    source: state.source as OrderSource | "all",
    payment: state.payment as PaymentStatus | "all",
    washId: state.washId,
    customerId: state.customerId,
    dateFrom: state.dateFrom,
    dateTo: state.dateTo,
    search: state.search,
    sort: state.sort,
    order: state.order as "asc" | "desc",
    page: state.page,
  });
  const washes = useWashes({ per_page: 100, sort: "name", order: "asc" });

  const counts = data?.meta.counts;
  const washOptions = (washes.data?.items ?? []).map((w) => ({ value: w.id, label: w.name.ar }));
  // Deep links (e.g. from a wash page) arrive before the wash list loads.
  if (state.washId !== "all" && !washOptions.some((o) => o.value === state.washId)) {
    washOptions.unshift({ value: state.washId, label: washes.isLoading ? "جاري التحميل…" : state.washId });
  }

  const hasFilters =
    state.status !== "all" ||
    state.source !== "all" ||
    state.payment !== "all" ||
    state.washId !== "all" ||
    Boolean(state.customerId || state.dateFrom || state.dateTo || state.search);
  const clearFilters = () =>
    setState({ status: "all", source: "all", payment: "all", washId: "all", customerId: "", dateFrom: "", dateTo: "", search: "" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="الحجوزات والطلبات"
        description="كل حجز على المنصة من التطبيق أو الحضور المباشر أو الهاتف — تابع الحالة والدفع وتدخّل عند الحاجة."
        actions={<ExportCsvButton filename="carzen-orders" columns={CSV} rows={data?.items} />}
      />

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        <ListToolbar
          tabs={
            <FilterTabs
              aria-label="حالة الحجز"
              value={state.status}
              onChange={(status) => setState({ status })}
              items={TAB_ORDER.map((s) => ({
                value: s,
                label: s === "all" ? "الكل" : ORDER_STATUS[s].label,
                count: counts?.[s],
                tone: s === "all" ? undefined : ORDER_STATUS[s].tone,
              }))}
            />
          }
          search={<SearchInput value={state.search} onChange={(search) => setState({ search })} placeholder="رقم الحجز، الكود، اللوحة أو العميل" />}
          filters={
            <>
              {state.customerId ? (
                <button
                  type="button"
                  onClick={() => setState({ customerId: "" })}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-primary/30 bg-secondary px-3 text-xs font-medium text-secondary-foreground"
                  aria-label="إزالة فلتر العميل"
                >
                  {data?.items[0]?.customerName ? `العميل: ${data.items[0].customerName}` : "عميل محدد"}
                  <span aria-hidden>×</span>
                </button>
              ) : null}
              <SelectFilter
                aria-label="المغسلة"
                icon={<Store className="size-4" />}
                value={state.washId}
                onChange={(washId) => setState({ washId })}
                allLabel="كل المغاسل"
                options={washOptions}
                className="max-w-56"
              />
              <SelectFilter
                aria-label="مصدر الحجز"
                icon={<Radio className="size-4" />}
                value={state.source}
                onChange={(source) => setState({ source })}
                allLabel="كل المصادر"
                options={Object.entries(ORDER_SOURCE).map(([value, m]) => ({ value, label: m.label }))}
              />
              <SelectFilter
                aria-label="حالة الدفع"
                icon={<CreditCard className="size-4" />}
                value={state.payment}
                onChange={(payment) => setState({ payment })}
                allLabel="كل حالات الدفع"
                options={Object.entries(PAYMENT_STATUS).map(([value, m]) => ({ value, label: m.label }))}
              />
              <DateRangeFilter from={state.dateFrom} to={state.dateTo} onChange={(range) => setState(range)} />
            </>
          }
          actions={
            hasFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                مسح الفلاتر
              </Button>
            ) : null
          }
        />
        <DataTable
          columns={COLUMNS}
          rows={data?.items}
          rowKey={(o) => o.id}
          rowHref={(o) => `/orders/${o.id}`}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error}
          onRetry={() => refetch()}
          sort={{ key: state.sort, order: state.order as "asc" | "desc" }}
          onSortChange={(s) => setState({ sort: s.key, order: s.order })}
          rowClassName={(o) => (o.flag ? "bg-info/[0.04]" : undefined)}
          empty={{
            icon: <CalendarRange />,
            title: "لا توجد حجوزات مطابقة",
            description: hasFilters
              ? "لا توجد حجوزات بهذه الفلاتر. جرّب نطاق تاريخ أوسع أو حالة أخرى."
              : "لم يتم تسجيل أي حجز على المنصة بعد.",
            action: hasFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                مسح الفلاتر
              </Button>
            ) : undefined,
          }}
          footer={
            data && data.pagination.total > 0 ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-muted/30 px-5 py-2.5 text-xs">
                  <span className="text-muted-foreground">
                    إجمالي القيمة المعروضة
                    <span className="ms-1">
                      (<span className="num">{formatNumber(data.pagination.total)}</span> حجز بالفلاتر الحالية)
                    </span>
                  </span>
                  <span className="num text-sm font-bold text-foreground">{formatMoney(data.meta.totalAmount)}</span>
                </div>
                <TablePagination pagination={data.pagination} onPageChange={(page) => setState({ page }, { resetPage: false })} />
              </>
            ) : null
          }
        />
      </section>
    </div>
  );
}
