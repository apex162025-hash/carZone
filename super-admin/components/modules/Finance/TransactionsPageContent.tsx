"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, ChartPie, Receipt, ScanSearch, Store } from "lucide-react";

import { DiscrepancySheet } from "@/components/modules/Finance/DiscrepancySheet";
import { MetricInfo } from "@/components/modules/Finance/MetricInfo";
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
import { useTransactions } from "@/hooks/use-finance";
import { useUrlState } from "@/hooks/use-url-state";
import { useWashes } from "@/hooks/use-washes";
import { PAYMENT_METHOD, TONES, TRANSACTION_STATUS } from "@/lib/constants/labels";
import { formatDate, formatMoney, formatNumber, formatPercent, formatTime } from "@/lib/format";
import type { CsvColumn } from "@/lib/export-csv";
import type { TransactionFilter, TransactionListItem, TransactionListMeta } from "@/types/finance";

const TAB_ORDER: TransactionFilter[] = ["all", "pending", "paid", "refunded", "settled", "discrepancy"];

const CSV: CsvColumn<TransactionListItem>[] = [
  { header: "المعرف", value: (t) => t.id },
  { header: "التاريخ", value: (t) => t.date.slice(0, 10) },
  { header: "رقم الحجز", value: (t) => t.orderNumber },
  { header: "المغسلة", value: (t) => t.businessName.ar },
  { header: "القيمة الإجمالية", value: (t) => t.gross },
  { header: "نسبة العمولة ٪", value: (t) => t.commissionRate },
  { header: "العمولة", value: (t) => t.commission },
  { header: "صافي المغسلة", value: (t) => t.netToWash },
  { header: "المحصّل", value: (t) => t.collectedAmount },
  { header: "طريقة الدفع", value: (t) => (t.paymentMethod ? PAYMENT_METHOD[t.paymentMethod] : "") },
  { header: "الحالة", value: (t) => TRANSACTION_STATUS[t.status].label },
  { header: "فرق", value: (t) => (t.flag === "discrepancy" ? "نعم" : "") },
];

/** Stop the row's click/Enter handler when an inner control is used. */
const stop = { onClick: (e: React.SyntheticEvent) => e.stopPropagation(), onKeyDown: (e: React.SyntheticEvent) => e.stopPropagation() };

function buildColumns(onInvestigate: (t: TransactionListItem) => void): DataTableColumn<TransactionListItem>[] {
  return [
    {
      key: "date",
      header: "التاريخ",
      sortKey: "date",
      cell: (t) => (
        <div className="num text-xs whitespace-nowrap">
          <p className="font-medium text-foreground">{formatDate(t.date)}</p>
          <p className="text-muted-foreground">{formatTime(t.date)}</p>
        </div>
      ),
    },
    {
      key: "order",
      header: "رقم الحجز",
      cell: (t) => (
        <Link href={`/orders/${t.orderId}`} {...stop} className="num font-semibold text-primary hover:underline focus-visible:underline focus-visible:outline-none">
          {t.orderNumber}
        </Link>
      ),
    },
    {
      key: "wash",
      header: "المغسلة",
      hideBelow: "md",
      cell: (t) => <span className="block max-w-40 truncate">{t.businessName.ar}</span>,
    },
    { key: "gross", header: "القيمة", sortKey: "gross", align: "end", cell: (t) => <span className="num font-medium">{formatMoney(t.gross)}</span> },
    {
      key: "rate",
      header: "النسبة",
      align: "center",
      hideBelow: "lg",
      cell: (t) => <span className="num text-xs text-muted-foreground">{formatPercent(t.commissionRate)}</span>,
    },
    {
      key: "commission",
      header: "العمولة",
      sortKey: "commission",
      align: "end",
      cell: (t) => <span className="num text-[var(--chart-2)]">{formatMoney(t.commission, { decimals: true })}</span>,
    },
    {
      key: "net",
      header: "صافي المغسلة",
      sortKey: "net",
      align: "end",
      cell: (t) => <span className="num font-semibold">{formatMoney(t.netToWash, { decimals: true })}</span>,
    },
    {
      key: "method",
      header: "الطريقة",
      hideBelow: "xl",
      cell: (t) => <span className="text-xs text-muted-foreground">{t.paymentMethod ? PAYMENT_METHOD[t.paymentMethod] : "—"}</span>,
    },
    {
      key: "status",
      header: "الحالة",
      cell: (t) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge meta={TRANSACTION_STATUS[t.status]} size="sm" />
          {t.flag === "discrepancy" ? <StatusBadge label="فرق" tone={TONES.warning} size="sm" /> : null}
        </div>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">إجراءات</span>,
      align: "end",
      cell: (t) =>
        t.flag === "discrepancy" ? (
          <Button
            variant="outline"
            size="sm"
            className="border-warning/40 text-warning hover:bg-warning/10 hover:text-warning"
            onClick={(e) => {
              e.stopPropagation();
              onInvestigate(t);
            }}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <ScanSearch />
            تحقيق
          </Button>
        ) : null,
    },
  ];
}

function TotalsRow({ totals, count }: { totals: TransactionListMeta["totals"]; count: number }) {
  const items = [
    { label: "القيمة الإجمالية", value: formatMoney(totals.gross) },
    { label: "عمولة المنصة", value: formatMoney(totals.commission, { decimals: true }), className: "text-[var(--chart-2)]" },
    { label: "صافي المغاسل", value: formatMoney(totals.netToWash, { decimals: true }) },
  ];
  return (
    <div className="flex flex-col gap-2 border-t border-border bg-muted/50 px-5 py-3 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <p className="flex items-center gap-1 font-semibold">
        الإجمالي لكل النتائج المطابقة
        <span className="num font-normal text-muted-foreground">({formatNumber(count)} معاملة)</span>
        <MetricInfo
          label="إجمالي النتائج"
          definition="مجموع كل المعاملات المطابقة للفلاتر الحالية في جميع الصفحات، وليس الصفحة المعروضة فقط."
        />
      </p>
      <dl className="flex flex-wrap items-center gap-x-6 gap-y-1">
        {items.map((i) => (
          <div key={i.label} className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">{i.label}</dt>
            <dd className={`num text-sm font-bold ${i.className ?? ""}`}>{i.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function TransactionsPageContent() {
  const router = useRouter();
  const [state, setState] = useUrlState({
    filter: "all",
    washId: "all",
    search: "",
    sort: "date",
    order: "desc",
    page: 1,
  });
  const [sheet, setSheet] = useState<{ id: string | null; open: boolean }>({ id: null, open: false });

  const { data, isLoading, isFetching, error, refetch } = useTransactions({
    filter: state.filter as TransactionFilter,
    washId: state.washId,
    search: state.search,
    sort: state.sort,
    order: state.order as "asc" | "desc",
    page: state.page,
  });
  const washes = useWashes({ per_page: 100, sort: "name", order: "asc" });

  const counts = data?.meta.counts;
  const washOptions = (washes.data?.items ?? []).map((w) => ({ value: w.id, label: w.name.ar }));
  const filteredWash = state.washId !== "all" ? washOptions.find((w) => w.value === state.washId) : undefined;
  const investigate = (t: TransactionListItem) => setSheet({ id: t.id, open: true });
  const columns = buildColumns(investigate);
  const hasFilters = state.filter !== "all" || state.washId !== "all" || Boolean(state.search);

  return (
    <div className="space-y-6">
      <PageHeader
        back={state.washId !== "all" ? { href: `/washes/${state.washId}`, label: filteredWash ? `العودة إلى ${filteredWash.label}` : "العودة للمغسلة" } : undefined}
        title="دفتر المعاملات"
        description="كل معاملة مالية بعمولتها وصافي المغسلة. اضغط على المعاملة لفتح الحجز، أو على معاملة بها فرق للتحقيق فيها."
        actions={
          <>
            <ExportCsvButton filename="carzen-transactions" columns={CSV} rows={data?.items} />
            <Button variant="outline" size="lg" render={<Link href="/finance" />}>
              <ChartPie />
              الملخص المالي
            </Button>
          </>
        }
      />

      {counts?.discrepancy && state.filter !== "discrepancy" ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-3 text-sm">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
            <span>
              <span className="font-semibold">
                يوجد <span className="num">{formatNumber(counts.discrepancy)}</span> فرق في التحصيل بانتظار المراجعة
              </span>
              <span className="block text-xs text-muted-foreground">المبلغ المحصّل من الكاشير لا يطابق فاتورة الحجز.</span>
            </span>
          </p>
          <Button variant="outline" size="lg" className="shrink-0" onClick={() => setState({ filter: "discrepancy" })}>
            عرض الفروقات
          </Button>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        <ListToolbar
          tabs={
            <FilterTabs
              aria-label="حالة المعاملة"
              value={state.filter as TransactionFilter}
              onChange={(filter) => setState({ filter })}
              items={TAB_ORDER.map((s) => ({
                value: s,
                label: s === "all" ? "الكل" : s === "discrepancy" ? "فروقات" : TRANSACTION_STATUS[s].label,
                count: counts?.[s],
                tone: s === "all" ? undefined : s === "discrepancy" ? TONES.warning : TRANSACTION_STATUS[s].tone,
              }))}
            />
          }
          search={<SearchInput value={state.search} onChange={(search) => setState({ search })} placeholder="ابحث برقم الحجز أو المغسلة" />}
          filters={
            <SelectFilter
              aria-label="المغسلة"
              icon={<Store className="size-4" />}
              value={state.washId}
              onChange={(washId) => setState({ washId })}
              allLabel="كل المغاسل"
              options={filteredWash || state.washId === "all" ? washOptions : [...washOptions, { value: state.washId, label: state.washId }]}
              className="min-w-44"
            />
          }
        />
        <DataTable
          columns={columns}
          rows={data?.items}
          rowKey={(t) => t.id}
          onRowClick={(t) => (t.flag === "discrepancy" ? investigate(t) : router.push(`/orders/${t.orderId}`))}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error}
          onRetry={() => refetch()}
          sort={{ key: state.sort, order: state.order as "asc" | "desc" }}
          onSortChange={(s) => setState({ sort: s.key, order: s.order })}
          rowClassName={(t) => (t.flag === "discrepancy" ? "bg-warning/[0.06] hover:bg-warning/10" : undefined)}
          empty={{
            icon: <Receipt />,
            title: state.filter === "discrepancy" ? "لا توجد فروقات مفتوحة" : "لا توجد معاملات مطابقة",
            description:
              state.filter === "discrepancy" ? "كل مبالغ التحصيل مطابقة لفواتير الحجوزات." : "جرّب حالة أو مغسلة أخرى أو امسح كلمة البحث.",
            action: hasFilters ? (
              <Button variant="outline" size="sm" onClick={() => setState({ filter: "all", washId: "all", search: "" })}>
                مسح الفلاتر
              </Button>
            ) : undefined,
          }}
          footer={
            <>
              {data && data.items.length ? <TotalsRow totals={data.meta.totals} count={data.pagination.total} /> : null}
              <TablePagination pagination={data?.pagination} onPageChange={(page) => setState({ page }, { resetPage: false })} />
            </>
          }
        />
      </section>

      <DiscrepancySheet
        transactionId={sheet.id}
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
      />
    </div>
  );
}
