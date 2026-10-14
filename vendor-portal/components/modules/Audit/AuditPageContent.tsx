"use client";

import Link from "next/link";
import { History, Lock, UserRound, X, Zap } from "lucide-react";

import { DataTable, type DataTableColumn } from "@carzen/ui/components/shared/data-table";
import { ExportCsvButton } from "@carzen/ui/components/shared/export-csv-button";
import { ListToolbar } from "@carzen/ui/components/shared/list-toolbar";
import { PageHeader } from "@carzen/ui/components/shared/page-header";
import { SearchInput } from "@carzen/ui/components/shared/search-input";
import { SelectFilter } from "@carzen/ui/components/shared/select-filter";
import { StatusBadge } from "@carzen/ui/components/shared/status-badge";
import { TablePagination } from "@carzen/ui/components/shared/table-pagination";
import { UserAvatar } from "@carzen/ui/components/shared/user-avatar";
import { Button } from "@carzen/ui/components/ui/button";
import { useUrlState } from "@carzen/ui/hooks/use-url-state";
import { AUDIT_ACTION, AUDIT_ENTITY, TONES } from "@carzen/ui/lib/constants/labels";
import type { CsvColumn } from "@carzen/ui/lib/export-csv";
import { formatDateTime, formatRelative } from "@carzen/ui/lib/format";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useAudit } from "@/hooks/use-insights";
import type { VendorAuditItem } from "@carzen/contracts/vendor/insights";

const CARZEN_ADMIN = "إدارة كارزن";

function actorLabel(l: VendorAuditItem) {
  if (l.actorType === "admin") return CARZEN_ADMIN;
  if (l.actorType === "system") return "النظام";
  return l.actorName;
}

function actorRole(l: VendorAuditItem) {
  switch (l.actorType) {
    case "admin":
      return "فريق منصة كارزن";
    case "system":
      return "إجراء تلقائي";
    case "customer":
      return "عميل (من التطبيق)";
    default:
      return "طاقم المغسلة";
  }
}

/** Deep link for entities that have a screen in the portal. */
function entityHref(l: VendorAuditItem): string | null {
  switch (l.entity) {
    case "orders":
      return `/orders/${l.entityId}`;
    case "customers":
      return `/customers/${l.entityId}`;
    case "reviews":
      return "/reviews";
    default:
      return null;
  }
}

function truncate(v: string | null, max = 40) {
  if (!v) return null;
  return v.length > max ? `${v.slice(0, max)}…` : v;
}

const CSV: CsvColumn<VendorAuditItem>[] = [
  { header: "الوقت", value: (l) => l.at },
  { header: "المنفّذ", value: (l) => actorLabel(l) },
  { header: "نوع المنفّذ", value: (l) => actorRole(l) },
  { header: "الإجراء", value: (l) => AUDIT_ACTION[l.action] ?? l.action },
  { header: "Action", value: (l) => l.action },
  { header: "الكيان", value: (l) => AUDIT_ENTITY[l.entity] ?? l.entity },
  { header: "معرف الكيان", value: (l) => l.entityId },
  { header: "الفرع", value: (l) => l.branchName?.ar ?? "" },
  { header: "القيمة القديمة", value: (l) => l.oldValue },
  { header: "القيمة الجديدة", value: (l) => l.newValue },
  { header: "السبب", value: (l) => l.reason },
];

const DATE_INPUT =
  "num h-9 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";

export default function AuditPageContent() {
  const { branchId, isAll } = useBranchScope();
  const [state, setState] = useUrlState({ actorId: "all", action: "all", from: "", to: "", search: "", page: 1 });

  const { data, isLoading, isFetching, error, refetch } = useAudit({
    branchId,
    actorId: state.actorId,
    action: state.action,
    from: state.from || undefined,
    to: state.to || undefined,
    search: state.search,
    page: state.page,
  });

  const meta = data?.meta;
  const hasFilters = state.actorId !== "all" || state.action !== "all" || Boolean(state.from || state.to || state.search);
  const clear = () => setState({ actorId: "all", action: "all", from: "", to: "", search: "" });

  const columns: DataTableColumn<VendorAuditItem>[] = [
    {
      key: "at",
      header: "الوقت",
      cell: (l) => (
        <div className="whitespace-nowrap">
          <time className="num block text-xs font-medium" dateTime={l.at}>
            {formatDateTime(l.at)}
          </time>
          <span className="text-[11px] text-muted-foreground">{formatRelative(l.at)}</span>
        </div>
      ),
    },
    {
      key: "actor",
      header: "المنفّذ",
      cell: (l) => (
        <div className="flex min-w-0 items-center gap-2">
          <UserAvatar name={actorLabel(l)} size="xs" />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-sm font-medium">
              {actorLabel(l)}
              {l.actorType === "admin" ? <StatusBadge label="كارزن" tone={TONES.primary} size="sm" /> : null}
            </p>
            <p className="text-[11px] text-muted-foreground">{actorRole(l)}</p>
          </div>
        </div>
      ),
    },
    { key: "action", header: "الإجراء", cell: (l) => <span className="text-sm font-medium whitespace-nowrap">{AUDIT_ACTION[l.action] ?? l.action}</span> },
    {
      key: "entity",
      header: "الكيان",
      cell: (l) => {
        const href = entityHref(l);
        return (
          <div className="min-w-0 text-xs">
            <p className="text-muted-foreground">{AUDIT_ENTITY[l.entity] ?? l.entity}</p>
            {href ? (
              <Link href={href} className="num font-medium text-primary hover:underline" dir="ltr">
                {l.entityId}
              </Link>
            ) : (
              <span className="num font-medium" dir="ltr">
                {l.entityId}
              </span>
            )}
          </div>
        );
      },
    },
    ...(isAll
      ? [
          {
            key: "branch",
            header: "الفرع",
            hideBelow: "xl" as const,
            cell: (l: VendorAuditItem) => <span className="text-xs text-muted-foreground">{l.branchName?.ar ?? "كل الفروع"}</span>,
          },
        ]
      : []),
    {
      key: "change",
      header: "القديمة ← الجديدة",
      hideBelow: "lg",
      cell: (l) => {
        const oldV = truncate(l.oldValue);
        const newV = truncate(l.newValue);
        if (!oldV && !newV) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <p className="num max-w-64 text-xs leading-relaxed text-muted-foreground" dir="auto" title={[l.oldValue ?? "—", l.newValue ?? "—"].join(" ← ")}>
            {oldV ? <span className="line-through decoration-destructive/50">{oldV}</span> : null}
            {oldV && newV ? <span className="mx-1.5">←</span> : null}
            {newV ? <span className="text-foreground">{newV}</span> : null}
          </p>
        );
      },
    },
    {
      key: "reason",
      header: "السبب",
      hideBelow: "md",
      cell: (l) =>
        l.reason ? (
          <p className="line-clamp-2 max-w-56 text-xs leading-relaxed" dir="auto" title={l.reason}>
            {l.reason}
          </p>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="سجل التدقيق"
        description="كل إجراء على الطلبات والأسعار والخصومات والإلغاءات والتحصيل والورديات — من نفّذه، متى، في أي فرع، القيمة قبل وبعد، والسبب."
        actions={<ExportCsvButton filename="carzen-wash-audit" columns={CSV} rows={data?.items} />}
      />

      <div className="flex items-start gap-3 rounded-2xl border border-info/30 bg-info/5 p-4" role="note">
        <Lock className="mt-0.5 size-5 shrink-0 text-info" />
        <div className="text-sm">
          <p className="font-semibold">سجل للقراءة فقط — لا يمكن تعديله أو حذفه</p>
          <p className="mt-0.5 text-muted-foreground">تُكتب الإدخالات تلقائيًا عند كل إجراء، ولا يملك أي مستخدم — بما فيهم المالك وإدارة كارزن — صلاحية تعديلها.</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        <ListToolbar
          search={<SearchInput value={state.search} onChange={(search) => setState({ search })} placeholder="رقم الكيان، المنفّذ، القيمة أو السبب" />}
          filters={
            <>
              <SelectFilter
                aria-label="المنفّذ"
                icon={<UserRound className="size-4" />}
                value={state.actorId}
                onChange={(actorId) => setState({ actorId })}
                allLabel="كل المنفّذين"
                options={(meta?.actors ?? []).map((a) => ({ value: a.id, label: a.name }))}
              />
              <SelectFilter
                aria-label="الإجراء"
                icon={<Zap className="size-4" />}
                value={state.action}
                onChange={(action) => setState({ action })}
                allLabel="كل الإجراءات"
                options={(meta?.actions ?? []).map((a) => ({ value: a, label: AUDIT_ACTION[a] ?? a }))}
              />
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  aria-label="من تاريخ"
                  value={state.from}
                  max={state.to || undefined}
                  onChange={(e) => setState({ from: e.target.value })}
                  className={DATE_INPUT}
                />
                <span className="text-xs text-muted-foreground">إلى</span>
                <input
                  type="date"
                  aria-label="إلى تاريخ"
                  value={state.to}
                  min={state.from || undefined}
                  onChange={(e) => setState({ to: e.target.value })}
                  className={DATE_INPUT}
                />
              </div>
            </>
          }
          actions={
            hasFilters ? (
              <Button variant="ghost" size="lg" onClick={clear}>
                <X /> مسح الفلاتر
              </Button>
            ) : null
          }
        />
        <DataTable
          columns={columns}
          rows={data?.items}
          rowKey={(l) => l.id}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error}
          onRetry={() => refetch()}
          empty={{
            icon: <History />,
            title: hasFilters ? "لا توجد إدخالات مطابقة" : "لا توجد إدخالات بعد",
            description: hasFilters ? "جرّب فلاتر أخرى أو امسح البحث." : "تظهر هنا كل الإجراءات فور تنفيذها.",
            action: hasFilters ? (
              <Button variant="outline" size="sm" onClick={clear}>
                مسح الفلاتر
              </Button>
            ) : undefined,
          }}
          footer={<TablePagination pagination={data?.pagination} onPageChange={(page) => setState({ page }, { resetPage: false })} />}
        />
      </section>

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <StatusBadge size="sm" label="للقراءة فقط" tone={TONES.info} />
        يُعرض الأحدث أولًا
      </p>
    </div>
  );
}
