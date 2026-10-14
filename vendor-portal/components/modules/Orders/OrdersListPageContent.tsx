"use client";

import { useState } from "react";
import { CalendarDays, CheckCheck, ClipboardList, Footprints, UserRound, X } from "lucide-react";

import { DataTable, type DataTableColumn } from "@carzen/ui/components/shared/data-table";
import { ExportCsvButton } from "@carzen/ui/components/shared/export-csv-button";
import { FilterTabs } from "@carzen/ui/components/shared/filter-tabs";
import { ListToolbar } from "@carzen/ui/components/shared/list-toolbar";
import { PageHeader } from "@carzen/ui/components/shared/page-header";
import { SearchInput } from "@carzen/ui/components/shared/search-input";
import { SelectFilter } from "@carzen/ui/components/shared/select-filter";
import { StatusBadge } from "@carzen/ui/components/shared/status-badge";
import { TablePagination } from "@carzen/ui/components/shared/table-pagination";
import { Button } from "@carzen/ui/components/ui/button";
import { Checkbox } from "@carzen/ui/components/ui/checkbox";
import { useUrlState } from "@carzen/ui/hooks/use-url-state";
import { ORDER_SOURCE, ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, TONES } from "@carzen/ui/lib/constants/labels";
import type { CsvColumn } from "@carzen/ui/lib/export-csv";
import { formatDate, formatMoney, formatTime } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import { OrderActions } from "@/components/modules/Orders/actions/OrderActions";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useBulkConfirm, useOrders } from "@/hooks/use-operations";
import { useStaff } from "@/hooks/use-team";
import { useUIStore } from "@/lib/store/ui-store";
import type { OrderSource } from "@carzen/contracts/orders";
import type { VendorOrderListItem } from "@carzen/contracts/vendor/operations";

type View = "orders" | "bookings";

const TABS: Record<View, { value: string; label: string; tone?: string }[]> = {
  orders: [
    { value: "active", label: "داخل الفرع" },
    { value: "waiting", label: "في الانتظار", tone: "var(--st-waiting)" },
    { value: "in_service", label: "جارٍ التنفيذ", tone: "var(--st-in_service)" },
    { value: "payment_pending", label: "بانتظار الدفع", tone: TONES.warning },
    { value: "paid", label: "مكتملة", tone: "var(--st-completed)" },
    { value: "all", label: "الكل" },
  ],
  bookings: [
    { value: "today", label: "اليوم" },
    { value: "upcoming", label: "القادمة", tone: "var(--st-confirmed)" },
    { value: "completed", label: "مكتملة", tone: "var(--st-completed)" },
    { value: "cancelled", label: "ملغاة", tone: "var(--st-cancelled)" },
    { value: "no_show", label: "لم يحضر", tone: "var(--st-no_show)" },
  ],
};

const COPY: Record<View, { title: string; description: string; empty: string }> = {
  orders: {
    title: "الطلبات",
    description: "كل سيارة لها طلب — من التطبيق أو الحضور المباشر أو الهاتف. تابع المرحلة والدفع ونفّذ الخطوة التالية.",
    empty: "لا توجد طلبات في هذا التبويب",
  },
  bookings: {
    title: "الحجوزات",
    description: "حجوزات التطبيق والهاتف — أكّد الجديد، وتابع القادم، وراجع الإلغاءات وعدم الحضور.",
    empty: "لا توجد حجوزات في هذا التبويب",
  },
};

const CSV: CsvColumn<VendorOrderListItem>[] = [
  { header: "رقم الطلب", value: (o) => o.number },
  { header: "الكود", value: (o) => o.code },
  { header: "المصدر", value: (o) => ORDER_SOURCE[o.source].label },
  { header: "اللوحة", value: (o) => o.plate },
  { header: "العميل", value: (o) => o.customerName ?? "عميل مباشر" },
  { header: "الخدمة", value: (o) => o.serviceName.ar },
  { header: "الفرع", value: (o) => o.branchName.ar },
  { header: "الموعد", value: (o) => o.scheduledAt },
  { header: "الحالة", value: (o) => ORDER_STATUS[o.status].label },
  { header: "الدفع", value: (o) => PAYMENT_STATUS[o.paymentStatus].label },
  { header: "طريقة الدفع", value: (o) => (o.paymentMethod ? PAYMENT_METHOD[o.paymentMethod] : "") },
  { header: "الموظف", value: (o) => o.staffName ?? "" },
  { header: "الإجمالي", value: (o) => o.total },
];

export default function OrdersListPageContent({ view }: { view: View }) {
  const { branchId, isAll } = useBranchScope();
  const setNewOrderOpen = useUIStore((s) => s.setNewOrderOpen);
  const [state, setState] = useUrlState({
    tab: TABS[view][0].value,
    source: "all",
    staffId: "all",
    date: "",
    search: "",
    sort: "scheduledAt",
    order: view === "orders" ? "desc" : "asc",
    page: 1,
  });
  const [selected, setSelected] = useState<string[]>([]);
  const bulk = useBulkConfirm(() => setSelected([]));

  const { data, isLoading, isFetching, error, refetch } = useOrders({
    branchId,
    view,
    tab: state.tab as never,
    source: state.source as OrderSource | "all",
    staffId: state.staffId,
    date: state.date || undefined,
    search: state.search,
    sort: state.sort,
    order: state.order as "asc" | "desc",
    page: state.page,
  });
  const staff = useStaff({ branchId, role: "all" });
  const staffOptions = (staff.data?.items ?? []).filter((s) => s.role !== "owner").map((s) => ({ value: s.id, label: s.name }));

  const rows = data?.items ?? [];
  const pendingOnPage = rows.filter((o) => o.status === "pending");
  const allPendingSelected = pendingOnPage.length > 0 && pendingOnPage.every((o) => selected.includes(o.id));
  const hasFilters = state.source !== "all" || state.staffId !== "all" || Boolean(state.date || state.search);

  const columns: DataTableColumn<VendorOrderListItem>[] = [
    ...(view === "bookings"
      ? [
          {
            key: "select",
            header: (
              <Checkbox
                aria-label="تحديد كل الحجوزات بانتظار التأكيد"
                checked={allPendingSelected}
                disabled={!pendingOnPage.length}
                onCheckedChange={(on) => setSelected(on ? pendingOnPage.map((o) => o.id) : [])}
              />
            ),
            className: "w-10",
            headClassName: "w-10",
            cell: (o: VendorOrderListItem) =>
              o.status === "pending" ? (
                <span onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    aria-label={`تحديد ${o.number}`}
                    checked={selected.includes(o.id)}
                    onCheckedChange={(on) => setSelected((s) => (on ? [...s, o.id] : s.filter((x) => x !== o.id)))}
                  />
                </span>
              ) : null,
          } satisfies DataTableColumn<VendorOrderListItem>,
        ]
      : []),
    {
      key: "number",
      header: "الطلب",
      sortKey: "number",
      cell: (o) => (
        <div className="space-y-1">
          <span className="num block font-semibold">{o.number}</span>
          <StatusBadge meta={ORDER_SOURCE[o.source]} size="sm" />
        </div>
      ),
    },
    {
      key: "vehicle",
      header: "السيارة والعميل",
      cell: (o) => (
        <div className="min-w-0">
          <span className="num inline-block rounded-md border border-border bg-muted/40 px-1.5 py-px text-xs font-bold tracking-wider">{o.plate || "—"}</span>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {o.customerName ?? "عميل مباشر"}
            {o.vehicleLabel ? ` · ${o.vehicleLabel}` : ""}
          </p>
        </div>
      ),
    },
    { key: "service", header: "الخدمة", hideBelow: "lg", cell: (o) => <span className="text-sm">{o.serviceName.ar}{o.items.length > 1 ? <span className="text-xs text-muted-foreground"> +{o.items.length - 1}</span> : null}</span> },
    {
      key: "scheduledAt",
      header: "الموعد",
      sortKey: "scheduledAt",
      cell: (o) => (
        <div className="num text-xs">
          <span className="block font-medium">{formatTime(o.scheduledAt)}</span>
          <span className="text-muted-foreground">{formatDate(o.scheduledAt)}</span>
          {o.overdueMin > 0 && ["pending", "confirmed", "in_service"].includes(o.status) ? <span className="ms-1 text-destructive">· متأخر {o.overdueMin} د</span> : null}
        </div>
      ),
    },
    ...(isAll ? [{ key: "branch", header: "الفرع", hideBelow: "xl" as const, cell: (o: VendorOrderListItem) => <span className="text-xs text-muted-foreground">{o.branchName.ar}</span> }] : []),
    { key: "staff", header: "الموظف", hideBelow: "xl", cell: (o) => <span className="text-xs">{o.staffName ?? <span className="text-muted-foreground">—</span>}</span> },
    {
      key: "status",
      header: "الحالة",
      sortKey: "status",
      cell: (o) => (
        <div className="space-y-1">
          <StatusBadge meta={ORDER_STATUS[o.status]} size="sm" live={o.status === "in_service"} />
          {o.status === "completed" ? <StatusBadge meta={PAYMENT_STATUS[o.paymentStatus]} size="sm" /> : null}
        </div>
      ),
    },
    { key: "total", header: "الإجمالي", sortKey: "total", align: "end", cell: (o) => <span className="num font-semibold">{formatMoney(o.total)}</span> },
    { key: "actions", header: <span className="sr-only">إجراءات</span>, align: "end", cell: (o) => <OrderActions order={o} className="justify-end" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={COPY[view].title}
        description={COPY[view].description}
        actions={
          <>
            <ExportCsvButton filename={`carzen-${view}`} columns={CSV} rows={data?.items} />
            <Button size="lg" onClick={() => setNewOrderOpen(true)}>
              {view === "orders" ? <Footprints /> : <CalendarDays />}
              {view === "orders" ? "طلب جديد" : "حجز هاتفي"}
            </Button>
          </>
        }
      />

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        <ListToolbar
          tabs={
            <FilterTabs
              aria-label="التبويب"
              value={state.tab}
              onChange={(tab) => {
                setState({ tab });
                setSelected([]);
              }}
              items={TABS[view].map((t) => ({ ...t, count: data?.meta.counts[t.value] }))}
            />
          }
          search={<SearchInput value={state.search} onChange={(search) => setState({ search })} placeholder="رقم الطلب، الكود، اللوحة أو الموبايل" />}
          filters={
            <>
              <SelectFilter
                aria-label="المصدر"
                value={state.source}
                onChange={(source) => setState({ source })}
                allLabel="كل المصادر"
                options={(view === "bookings" ? (["app", "phone"] as const) : (["app", "walk_in", "phone"] as const)).map((s) => ({ value: s, label: ORDER_SOURCE[s].label }))}
              />
              <SelectFilter aria-label="الموظف" icon={<UserRound className="size-4" />} value={state.staffId} onChange={(staffId) => setState({ staffId })} allLabel="كل الموظفين" options={staffOptions} />
              <div className="relative">
                <input
                  type="date"
                  aria-label="التاريخ"
                  value={state.date}
                  onChange={(e) => setState({ date: e.target.value })}
                  className="num h-9 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                />
              </div>
              {hasFilters ? (
                <Button variant="ghost" size="lg" onClick={() => setState({ source: "all", staffId: "all", date: "", search: "" })}>
                  <X /> مسح الفلاتر
                </Button>
              ) : null}
            </>
          }
        />

        {view === "bookings" && selected.length ? (
          <div className="flex items-center justify-between gap-3 border-b border-primary/20 bg-secondary/60 px-5 py-2.5">
            <p className="text-sm">
              تم تحديد <span className="num font-semibold">{selected.length}</span> حجز بانتظار التأكيد
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                إلغاء التحديد
              </Button>
              <Button size="sm" loading={bulk.isPending} onClick={() => bulk.mutate(selected)}>
                <CheckCheck /> تأكيد المحدد
              </Button>
            </div>
          </div>
        ) : null}

        <DataTable
          columns={columns}
          rows={data?.items}
          rowKey={(o) => o.id}
          rowHref={(o) => `/orders/${o.id}`}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error}
          onRetry={() => refetch()}
          sort={{ key: state.sort, order: state.order as "asc" | "desc" }}
          onSortChange={(s) => setState({ sort: s.key, order: s.order })}
          rowClassName={(o) => cn(selected.includes(o.id) && "bg-secondary/40", o.overdueMin > 0 && o.status === "in_service" && "bg-destructive/[0.03]")}
          empty={{ icon: <ClipboardList />, title: COPY[view].empty, description: hasFilters ? "جرّب تغيير الفلاتر أو مسح البحث." : undefined }}
          footer={
            <>
              {data && data.items.length ? (
                <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-5 py-2.5 text-xs text-muted-foreground">
                  <span>إجمالي قيمة الطلبات في هذا التبويب</span>
                  <span className="num font-semibold text-foreground">{formatMoney(data.meta.totalAmount)}</span>
                </div>
              ) : null}
              <TablePagination pagination={data?.pagination} onPageChange={(page) => setState({ page }, { resetPage: false })} />
            </>
          }
        />
      </section>
    </div>
  );
}
