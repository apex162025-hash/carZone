"use client";

import Link from "next/link";
import { useState } from "react";
import { PauseCircle, PlayCircle, UsersRound } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { PageHeader } from "@/components/shared/page-header";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { TablePagination } from "@/components/shared/table-pagination";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { useUrlState } from "@/hooks/use-url-state";
import { useStaff, useToggleStaff } from "@/hooks/use-washes";
import { BUSINESS_STATUS, STAFF_ROLE, TONES } from "@/lib/constants/labels";
import type { CsvColumn } from "@/lib/export-csv";
import type { StaffListItem, StaffRole, StaffStatus } from "@/types/washes";

const TAB_ORDER: (StaffRole | "all")[] = ["all", "owner", "manager", "employee"];

const ACCOUNT_STATUS: Record<StaffStatus, { label: string; tone: string }> = {
  active: { label: "نشط", tone: TONES.success },
  suspended: { label: "موقوف", tone: TONES.danger },
};

const CSV: CsvColumn<StaffListItem>[] = [
  { header: "المعرف", value: (s) => s.id },
  { header: "الاسم", value: (s) => s.name },
  { header: "الهاتف", value: (s) => s.phone },
  { header: "الدور", value: (s) => STAFF_ROLE[s.role].label },
  { header: "المغسلة", value: (s) => s.businessName.ar },
  { header: "الفرع", value: (s) => s.branchName?.ar ?? "" },
  { header: "حالة المغسلة", value: (s) => BUSINESS_STATUS[s.businessStatus].label },
  { header: "حالة الحساب", value: (s) => ACCOUNT_STATUS[s.status].label },
];

export default function StaffPageContent() {
  const [state, setState] = useUrlState({
    role: "all",
    search: "",
    sort: "business",
    order: "asc",
    page: 1,
  });
  const { data, isLoading, isFetching, error, refetch } = useStaff({
    role: state.role as StaffRole | "all",
    search: state.search,
    sort: state.sort,
    order: state.order as "asc" | "desc",
    page: state.page,
  });
  const toggle = useToggleStaff();
  const [target, setTarget] = useState<StaffListItem | null>(null);
  // Kept separate from `target` so the dialog copy stays stable during its close animation.
  const [dialogOpen, setDialogOpen] = useState(false);
  const openFor = (s: StaffListItem) => {
    setTarget(s);
    setDialogOpen(true);
  };

  const counts = data?.meta.counts;
  const hasFilters = state.role !== "all" || Boolean(state.search);
  const targetSuspended = target?.status === "suspended";

  const columns: DataTableColumn<StaffListItem>[] = [
    {
      key: "name",
      header: "الاسم",
      sortKey: "name",
      cell: (s) => (
        <div className="flex items-center gap-3">
          <UserAvatar name={s.name} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{s.name}</p>
            <p className="num text-xs text-muted-foreground" dir="ltr">
              {s.phone}
            </p>
          </div>
        </div>
      ),
    },
    { key: "role", header: "الدور", sortKey: "role", cell: (s) => <StatusBadge meta={STAFF_ROLE[s.role]} size="sm" /> },
    {
      key: "business",
      header: "المغسلة",
      sortKey: "business",
      cell: (s) => (
        <Link href={`/washes/${s.businessId}`} className="font-medium hover:text-primary hover:underline">
          {s.businessName.ar}
        </Link>
      ),
    },
    {
      key: "branch",
      header: "الفرع",
      hideBelow: "lg",
      cell: (s) => <span className="text-xs text-muted-foreground">{s.branchName?.ar ?? "كل الفروع"}</span>,
    },
    {
      key: "businessStatus",
      header: "حالة المغسلة",
      hideBelow: "xl",
      cell: (s) => <StatusBadge meta={BUSINESS_STATUS[s.businessStatus]} size="sm" />,
    },
    { key: "status", header: "حالة الحساب", cell: (s) => <StatusBadge meta={ACCOUNT_STATUS[s.status]} size="sm" /> },
    {
      key: "actions",
      header: <span className="sr-only">إجراءات</span>,
      align: "end",
      cell: (s) =>
        s.status === "active" ? (
          <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => openFor(s)} aria-label={`إيقاف حساب ${s.name}`}>
            <PauseCircle />
            إيقاف
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => openFor(s)} aria-label={`إعادة تفعيل حساب ${s.name}`}>
            <PlayCircle />
            تفعيل
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="الملاك والموظفون"
        description="حسابات ملاك ومديري وموظفي المغاسل — عرض فقط، مع إمكانية إيقاف الحساب أو إعادة تفعيله بسبب موثّق."
        actions={<ExportCsvButton filename="carzen-staff" columns={CSV} rows={data?.items} />}
      />

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        <ListToolbar
          tabs={
            <FilterTabs
              aria-label="الدور"
              value={state.role}
              onChange={(role) => setState({ role })}
              items={TAB_ORDER.map((r) => ({
                value: r,
                label: r === "all" ? "الكل" : STAFF_ROLE[r].label,
                count: counts?.[r],
                tone: r === "all" ? undefined : STAFF_ROLE[r].tone,
              }))}
            />
          }
          search={<SearchInput value={state.search} onChange={(search) => setState({ search })} placeholder="ابحث بالاسم أو الهاتف أو المغسلة" />}
        />
        <DataTable
          columns={columns}
          rows={data?.items}
          rowKey={(s) => s.id}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error}
          onRetry={() => refetch()}
          sort={{ key: state.sort, order: state.order as "asc" | "desc" }}
          onSortChange={(s) => setState({ sort: s.key, order: s.order })}
          rowClassName={(s) => (s.status === "suspended" ? "bg-destructive/[0.03]" : undefined)}
          empty={{
            icon: <UsersRound />,
            title: "لا توجد حسابات مطابقة",
            description: hasFilters ? "جرّب دورًا آخر أو امسح كلمة البحث." : "لا توجد حسابات ملاك أو موظفين بعد.",
            action: hasFilters ? (
              <Button variant="outline" size="sm" onClick={() => setState({ role: "all", search: "" })}>
                مسح الفلاتر
              </Button>
            ) : undefined,
          }}
          footer={<TablePagination pagination={data?.pagination} onPageChange={(page) => setState({ page }, { resetPage: false })} />}
        />
      </section>

      <ReasonDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={target ? (targetSuspended ? `إعادة تفعيل حساب ${target.name}` : `إيقاف حساب ${target.name}`) : ""}
        description={
          !target
            ? undefined
            : targetSuspended
              ? `سيتمكن ${STAFF_ROLE[target.role].label} من تسجيل الدخول لتطبيق المغسلة (${target.businessName.ar}) فورًا.`
              : target.role === "owner"
                ? `إيقاف حساب المالك يمنعه من الدخول لتطبيق المغسلة وإدارة ${target.businessName.ar}، وسيتم تنبيه فريق الإدارة. المغسلة نفسها تبقى متاحة للعملاء.`
                : `لن يتمكن ${STAFF_ROLE[target.role].label} من تسجيل الدخول لتطبيق المغسلة أو تنفيذ أي حجز حتى إعادة التفعيل.`
        }
        textLabel="السبب (يُسجل في سجل التدقيق)"
        confirmLabel={targetSuspended ? "إعادة التفعيل" : "تأكيد الإيقاف"}
        variant={targetSuspended ? "default" : "destructive"}
        isPending={toggle.isPending}
        onConfirm={({ text }) => {
          if (!target) return;
          toggle.mutate({ id: target.id, suspended: !targetSuspended, reason: text }, { onSuccess: () => setDialogOpen(false) });
        }}
      />
    </div>
  );
}
