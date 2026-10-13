"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarClock, CircleCheckBig, HandCoins, Wallet } from "lucide-react";

import { FinanceMetricCard } from "@/components/modules/Finance/FinanceMetricCard";
import { MarkPayoutPaidDialog } from "@/components/modules/Finance/MarkPayoutPaidDialog";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { TablePagination } from "@/components/shared/table-pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePayouts } from "@/hooks/use-finance";
import { useUrlState } from "@/hooks/use-url-state";
import { PAYOUT_STATUS } from "@/lib/constants/labels";
import { formatDate, formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import type { CsvColumn } from "@/lib/export-csv";
import type { PayoutListItem, PayoutStatus } from "@/types/finance";

const TAB_ORDER: (PayoutStatus | "all")[] = ["all", "due", "paid"];

const remainingOf = (p: PayoutListItem) => Math.max(0, p.amountDue - p.amountPaid);

const CSV: CsvColumn<PayoutListItem>[] = [
  { header: "المعرف", value: (p) => p.id },
  { header: "المغسلة", value: (p) => p.businessName.ar },
  { header: "بداية الفترة", value: (p) => p.periodStart.slice(0, 10) },
  { header: "نهاية الفترة", value: (p) => p.periodEnd.slice(0, 10) },
  { header: "المستحق", value: (p) => p.amountDue },
  { header: "المدفوع", value: (p) => p.amountPaid },
  { header: "المتبقي", value: (p) => remainingOf(p) },
  { header: "الحالة", value: (p) => PAYOUT_STATUS[p.status].label },
  { header: "المرجع", value: (p) => p.reference },
  { header: "تاريخ الدفع", value: (p) => (p.paidAt ? p.paidAt.slice(0, 10) : "") },
];

function buildColumns(onPay: (p: PayoutListItem) => void): DataTableColumn<PayoutListItem>[] {
  return [
    {
      key: "wash",
      header: "المغسلة",
      cell: (p) => (
        <Link href={`/washes/${p.businessId}`} className="group/link flex min-w-0 items-center gap-3">
          <span className="bg-brand-gradient flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white">
            {p.businessName.en.slice(0, 2).toUpperCase()}
          </span>
          <span className="truncate font-semibold group-hover/link:text-primary">{p.businessName.ar}</span>
        </Link>
      ),
    },
    {
      key: "period",
      header: "الفترة",
      sortKey: "periodEnd",
      cell: (p) => (
        <span className="num text-xs whitespace-nowrap">
          {formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
        </span>
      ),
    },
    { key: "due", header: "المستحق", sortKey: "amountDue", align: "end", cell: (p) => <span className="num font-semibold">{formatMoney(p.amountDue)}</span> },
    {
      key: "paid",
      header: "المدفوع",
      align: "end",
      hideBelow: "md",
      cell: (p) => <span className="num text-muted-foreground">{formatMoney(p.amountPaid)}</span>,
    },
    {
      key: "remaining",
      header: "المتبقي",
      align: "end",
      cell: (p) => {
        const r = remainingOf(p);
        return r > 0 ? (
          <span className="num font-semibold text-warning">
            {formatMoney(r)}
            {p.amountPaid > 0 ? <span className="block text-[11px] font-normal text-muted-foreground">دفعة جزئية</span> : null}
          </span>
        ) : (
          <span className="num text-muted-foreground">{formatMoney(0)}</span>
        );
      },
    },
    { key: "status", header: "الحالة", cell: (p) => <StatusBadge meta={PAYOUT_STATUS[p.status]} size="sm" /> },
    {
      key: "reference",
      header: "المرجع",
      hideBelow: "lg",
      cell: (p) =>
        p.reference ? (
          <span className="num rounded-md bg-muted px-1.5 py-0.5 text-xs" dir="ltr">
            {p.reference}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "paidAt",
      header: "تاريخ الدفع",
      hideBelow: "xl",
      cell: (p) => <span className="num text-xs text-muted-foreground">{p.paidAt ? formatDateTime(p.paidAt) : "—"}</span>,
    },
    {
      key: "actions",
      header: <span className="sr-only">إجراءات</span>,
      align: "end",
      cell: (p) =>
        p.status === "due" ? (
          <Button size="sm" onClick={() => onPay(p)}>
            <HandCoins />
            تسجيل الدفع
          </Button>
        ) : null,
    },
  ];
}

export default function PayoutsPageContent() {
  const [state, setState] = useUrlState({
    status: "all",
    search: "",
    sort: "periodEnd",
    order: "desc",
    page: 1,
  });
  const [dialog, setDialog] = useState<{ payout: PayoutListItem | null; open: boolean }>({ payout: null, open: false });

  const { data, isLoading, isFetching, error, refetch } = usePayouts({
    status: state.status,
    search: state.search,
    sort: state.sort,
    order: state.order as "asc" | "desc",
    page: state.page,
  });

  const counts = data?.meta.counts;
  const totals = data?.meta.totals;
  const columns = buildColumns((payout) => setDialog({ payout, open: true }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدفوعات المغاسل"
        description="مستحقات المغاسل عن كل فترة تسوية — سجّل التحويلات يدويًا بالمرجع لتسوية المعاملات المرتبطة."
        actions={<ExportCsvButton filename="carzen-payouts" columns={CSV} rows={data?.items} />}
      />

      {error && !data ? null : (
        <div className="grid gap-3 sm:grid-cols-3">
          {totals && counts ? (
            <>
              <FinanceMetricCard
                label="مستحق غير مدفوع"
                definition="إجمالي المتبقي للمغاسل في الدفعات المستحقة (المستحق ناقص المدفوع)."
                value={formatMoney(totals.due)}
                icon={<Wallet />}
                tone="var(--warning)"
                highlight={totals.due > 0}
                hint={`${formatNumber(counts.due)} دفعة مستحقة`}
              />
              <FinanceMetricCard
                label="إجمالي المدفوع"
                definition="مجموع ما تم تحويله للمغاسل في كل الدفعات المسجلة، بما فيها الدفعات الجزئية."
                value={formatMoney(totals.paid)}
                icon={<CircleCheckBig />}
                tone="var(--success)"
                hint={`${formatNumber(counts.paid)} دفعة مسددة بالكامل`}
              />
              <FinanceMetricCard
                label="دورات التسوية"
                definition="عدد فترات التسوية المسجلة لكل المغاسل (مستحقة ومدفوعة)."
                value={formatNumber(counts.all)}
                icon={<CalendarClock />}
                tone="var(--primary)"
                hint="كل الفترات"
              />
            </>
          ) : (
            Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[106px] rounded-2xl" />)
          )}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        <ListToolbar
          tabs={
            <FilterTabs
              aria-label="حالة الدفعة"
              value={state.status as PayoutStatus | "all"}
              onChange={(status) => setState({ status })}
              items={TAB_ORDER.map((s) => ({
                value: s,
                label: s === "all" ? "الكل" : PAYOUT_STATUS[s].label,
                count: counts?.[s],
                tone: s === "all" ? undefined : PAYOUT_STATUS[s].tone,
              }))}
            />
          }
          search={<SearchInput value={state.search} onChange={(search) => setState({ search })} placeholder="ابحث باسم المغسلة أو المرجع" />}
        />
        <DataTable
          columns={columns}
          rows={data?.items}
          rowKey={(p) => p.id}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error}
          onRetry={() => refetch()}
          sort={{ key: state.sort, order: state.order as "asc" | "desc" }}
          onSortChange={(s) => setState({ sort: s.key, order: s.order })}
          rowClassName={(p) => (p.status === "due" ? "bg-warning/[0.03]" : undefined)}
          empty={{
            icon: <Wallet />,
            title: state.status === "due" ? "لا توجد مستحقات معلّقة" : "لا توجد دفعات مطابقة",
            description: state.status === "due" ? "كل مستحقات المغاسل مسددة." : "جرّب حالة أخرى أو امسح كلمة البحث.",
          }}
          footer={<TablePagination pagination={data?.pagination} onPageChange={(page) => setState({ page }, { resetPage: false })} />}
        />
      </section>

      <MarkPayoutPaidDialog
        payout={dialog.payout}
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />
    </div>
  );
}
