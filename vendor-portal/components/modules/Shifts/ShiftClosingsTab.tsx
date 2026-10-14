"use client";

import { Banknote, ClipboardCheck, CreditCard, Scale, Wallet } from "lucide-react";

import { DataTable, type DataTableColumn } from "@carzen/ui/components/shared/data-table";
import { FilterTabs } from "@carzen/ui/components/shared/filter-tabs";
import { ListToolbar } from "@carzen/ui/components/shared/list-toolbar";
import { StatusBadge } from "@carzen/ui/components/shared/status-badge";
import { TablePagination } from "@carzen/ui/components/shared/table-pagination";
import { UserAvatar } from "@carzen/ui/components/shared/user-avatar";
import { Skeleton } from "@carzen/ui/components/ui/skeleton";
import { SHIFT_STATUS, TONES } from "@carzen/ui/lib/constants/labels";
import { formatDate, formatMoney, formatNumber } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import { ShiftDetailSheet } from "@/components/modules/Shifts/ShiftDetailSheet";
import type { SetShiftsUrlState, ShiftsUrlState } from "@/components/modules/Shifts/ShiftsPageContent";
import { DiffValue, timeRange } from "@/components/modules/Shifts/shift-utils";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useShifts } from "@/hooks/use-team";
import type { ShiftClosing, ShiftListParams } from "@carzen/contracts/vendor/team";

type Filter = NonNullable<ShiftListParams["filter"]>;

const FILTERS: { value: Filter; label: string; tone?: string }[] = [
  { value: "submitted", label: "بانتظار المراجعة", tone: SHIFT_STATUS.submitted.tone },
  { value: "difference", label: "فيها فرق", tone: TONES.danger },
  { value: "open", label: "جارية", tone: SHIFT_STATUS.open.tone },
  { value: "flagged", label: "للمتابعة", tone: SHIFT_STATUS.flagged.tone },
  { value: "reviewed", label: "تمت المراجعة", tone: SHIFT_STATUS.reviewed.tone },
  { value: "all", label: "الكل" },
];

const EMPTY: Record<Filter, string> = {
  submitted: "لا توجد ورديات بانتظار المراجعة — كل شيء تمت مراجعته",
  difference: "لا توجد ورديات فيها فرق في الصندوق",
  open: "لا توجد ورديات جارية الآن",
  flagged: "لا توجد ورديات مميزة للمتابعة",
  reviewed: "لا توجد ورديات تمت مراجعتها",
  all: "لا توجد ورديات مسجلة",
};

function lateStartMin(s: ShiftClosing) {
  if (!s.actualStart) return 0;
  return Math.round((new Date(s.actualStart).getTime() - new Date(s.scheduledStart).getTime()) / 60000);
}

export function ShiftClosingsTab({ state, setState }: { state: ShiftsUrlState; setState: SetShiftsUrlState }) {
  const { branchId, isAll } = useBranchScope();
  const filter = state.filter as Filter;
  const { data, isLoading, isFetching, error, refetch } = useShifts({ branchId, filter, page: state.page });

  const columns: DataTableColumn<ShiftClosing>[] = [
    {
      key: "staff",
      header: "الموظف",
      cell: (s) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <UserAvatar name={s.staffName} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium">{s.staffName}</p>
            <p className="text-xs text-muted-foreground">{formatDate(s.scheduledStart, { withDay: true })}</p>
          </div>
        </div>
      ),
    },
    ...(isAll ? [{ key: "branch", header: "الفرع", hideBelow: "xl" as const, cell: (s: ShiftClosing) => <span className="text-xs text-muted-foreground">{s.branchName.ar}</span> }] : []),
    {
      key: "times",
      header: "المجدول / الفعلي",
      hideBelow: "md",
      cell: (s) => {
        const late = lateStartMin(s);
        return (
          <div className="num text-xs leading-relaxed">
            <span className="block text-muted-foreground">{timeRange(s.scheduledStart, s.scheduledEnd)}</span>
            <span className={cn("block font-medium", late > 10 && "text-warning")}>
              {timeRange(s.actualStart, s.actualEnd)}
              {late > 10 ? <span className="ms-1 text-[11px]">(تأخر {late} د)</span> : null}
            </span>
          </div>
        );
      },
    },
    { key: "orders", header: "الطلبات", align: "end", cell: (s) => <span className="num font-medium">{formatNumber(s.ordersCompleted)}</span> },
    {
      key: "payments",
      header: "نقدي / بطاقة",
      align: "end",
      hideBelow: "lg",
      cell: (s) => (
        <div className="num text-xs leading-relaxed">
          <span className="flex items-center justify-end gap-1">
            {formatMoney(s.cashPayments)} <Banknote className="size-3 text-muted-foreground" aria-label="نقدي" />
          </span>
          <span className="flex items-center justify-end gap-1 text-muted-foreground">
            {formatMoney(s.cardPayments)} <CreditCard className="size-3" aria-label="بطاقة" />
          </span>
        </div>
      ),
    },
    { key: "expected", header: "النقدي المتوقع", align: "end", cell: (s) => <span className="num">{formatMoney(s.expectedCash)}</span> },
    {
      key: "actual",
      header: "النقدي الفعلي",
      align: "end",
      cell: (s) => (s.actualCash !== null ? <span className="num font-medium">{formatMoney(s.actualCash)}</span> : <span className="text-xs text-muted-foreground">لم يُسلَّم</span>),
    },
    { key: "difference", header: "الفرق", align: "end", cell: (s) => <DiffValue value={s.difference} /> },
    {
      key: "reason",
      header: "السبب",
      hideBelow: "xl",
      cell: (s) => (s.reason ? <span className="line-clamp-2 max-w-48 text-xs">{s.reason}</span> : <span className="text-xs text-muted-foreground">—</span>),
    },
    {
      key: "status",
      header: "الحالة",
      cell: (s) => (
        <div className="space-y-1">
          <StatusBadge meta={SHIFT_STATUS[s.status]} size="sm" live={s.status === "open"} />
          {s.reviewedBy ? <p className="text-[11px] text-muted-foreground xl:hidden">{s.reviewedBy}</p> : null}
        </div>
      ),
    },
    {
      key: "reviewedBy",
      header: "راجعها",
      hideBelow: "xl",
      cell: (s) => (s.reviewedBy ? <span className="text-xs">{s.reviewedBy}</span> : <span className="text-xs text-muted-foreground">—</span>),
    },
  ];

  const totals = data?.meta.totals;

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        <ListToolbar
          tabs={
            <FilterTabs
              aria-label="حالة الوردية"
              value={filter}
              onChange={(f) => setState({ filter: f })}
              items={FILTERS.map((f) => ({ ...f, count: data?.meta.counts[f.value] }))}
            />
          }
        />

        <div className="grid grid-cols-1 divide-y divide-border/60 border-b border-border/60 bg-muted/20 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {totals ? (
            <>
              <div className="flex items-center gap-3 px-5 py-3">
                <Wallet className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-[11px] text-muted-foreground">النقدي المتوقع</p>
                  <p className="num text-base font-bold">{formatMoney(totals.expected)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 py-3">
                <Scale className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-[11px] text-muted-foreground">إجمالي الفرق</p>
                  <DiffValue value={totals.difference} className="text-base" showLabel />
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 py-3">
                <ClipboardCheck className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-[11px] text-muted-foreground">عدد الورديات</p>
                  <p className="num text-base font-bold">{formatNumber(data?.pagination.total ?? 0)}</p>
                </div>
              </div>
            </>
          ) : (
            Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="px-5 py-3">
                <Skeleton className="h-10 w-32" />
              </div>
            ))
          )}
        </div>

        <DataTable
          columns={columns}
          rows={data?.items}
          rowKey={(s) => s.id}
          onRowClick={(s) => setState({ shift: s.id }, { resetPage: false })}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error}
          onRetry={() => refetch()}
          rowClassName={(s) => cn((s.difference ?? 0) < 0 && "bg-destructive/[0.03]", s.status === "flagged" && "bg-destructive/[0.05]")}
          empty={{
            icon: <ClipboardCheck />,
            title: EMPTY[filter] ?? EMPTY.all,
            description: filter !== "all" ? "جرّب تبويبًا آخر أو اعرض كل الورديات." : "تظهر الورديات هنا عندما يبدأ الموظفون العمل من التطبيق.",
          }}
          footer={<TablePagination pagination={data?.pagination} onPageChange={(page) => setState({ page }, { resetPage: false })} />}
        />
      </section>

      <ShiftDetailSheet id={state.shift || null} onClose={() => setState({ shift: "" }, { resetPage: false })} />
    </>
  );
}
