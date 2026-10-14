"use client";

import { useState } from "react";
import { CalendarRange, Crown, ShieldCheck, Star, UserPlus, UserRound, Users, UsersRound, X } from "lucide-react";

import { DataTable, type DataTableColumn } from "@carzen/ui/components/shared/data-table";
import { FilterTabs } from "@carzen/ui/components/shared/filter-tabs";
import { ListToolbar } from "@carzen/ui/components/shared/list-toolbar";
import { PageHeader } from "@carzen/ui/components/shared/page-header";
import { SearchInput } from "@carzen/ui/components/shared/search-input";
import { StatTile } from "@carzen/ui/components/shared/stat-tile";
import { StatusBadge } from "@carzen/ui/components/shared/status-badge";
import { UserAvatar } from "@carzen/ui/components/shared/user-avatar";
import { Button } from "@carzen/ui/components/ui/button";
import { Skeleton } from "@carzen/ui/components/ui/skeleton";
import { useUrlState } from "@carzen/ui/hooks/use-url-state";
import { STAFF_ROLE, STAFF_STATUS, TONES } from "@carzen/ui/lib/constants/labels";
import { formatMoney, formatNumber } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import { DurationVsExpected, PermissionMatrixDialog } from "@/components/modules/Staff/StaffBits";
import { ScheduleSheet } from "@/components/modules/Staff/ScheduleSheet";
import { StaffFormDialog } from "@/components/modules/Staff/StaffFormDialog";
import { StaffProfileSheet } from "@/components/modules/Staff/StaffProfileSheet";
import { PERIODS, canAddStaff, type StaffPeriod } from "@/components/modules/Staff/staff-constants";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useStaff } from "@/hooks/use-team";
import type { VendorStaffMember } from "@carzen/contracts/vendor/team";
import type { StaffRole } from "@carzen/contracts/washes";

const ROLE_TABS: { value: StaffRole | "all"; label: string; tone?: string }[] = [
  { value: "all", label: "الكل" },
  { value: "owner", label: "المالك", tone: STAFF_ROLE.owner.tone },
  { value: "manager", label: "مديرو الفروع", tone: STAFF_ROLE.manager.tone },
  { value: "employee", label: "الموظفون", tone: STAFF_ROLE.employee.tone },
];

export default function StaffPageContent() {
  const { account, branchId, isAll } = useBranchScope();
  const [state, setState] = useUrlState({ role: "all", period: "30d", search: "", sort: "completed", order: "desc" });
  const period = state.period as StaffPeriod;
  const [profileId, setProfileId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);

  const { data, isLoading, isFetching, error, refetch } = useStaff({
    branchId,
    role: state.role as StaffRole | "all",
    period,
    search: state.search,
    sort: state.sort,
    order: state.order as "asc" | "desc",
  });
  // Unfiltered roster for the stat tiles and tab counts (the list's `counts` follow the role/search filters).
  const roster = useStaff({ branchId, role: "all", period: "today" });
  const counts = roster.data?.counts;

  const canAdd = canAddStaff(account);
  const hasFilters = Boolean(state.search) || state.role !== "all";
  const isPerfSort = state.sort !== "name";

  const columns: DataTableColumn<VendorStaffMember>[] = [
    {
      key: "rank",
      header: "#",
      className: "w-12",
      headClassName: "w-12",
      cell: (m) => {
        const rank = (data?.items.indexOf(m) ?? 0) + 1;
        return isPerfSort ? (
          <span
            className={cn(
              "num inline-flex size-6 items-center justify-center rounded-md text-[11px] font-bold",
              rank <= 3 && state.order === "desc" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground",
            )}
          >
            {rank}
          </span>
        ) : (
          <span className="num text-xs text-muted-foreground">{rank}</span>
        );
      },
    },
    {
      key: "name",
      header: "الموظف",
      sortKey: "name",
      cell: (m) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative">
            <UserAvatar name={m.name} size="sm" />
            {m.onShiftNow ? <span className="absolute -end-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-card bg-success" aria-hidden /> : null}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{m.name}</p>
            <p className="num truncate text-xs text-muted-foreground" dir="ltr">
              {m.phone}
            </p>
            {m.onShiftNow ? <p className="text-[11px] font-medium text-success">في الوردية الآن</p> : null}
          </div>
        </div>
      ),
    },
    { key: "role", header: "الدور", cell: (m) => <StatusBadge meta={STAFF_ROLE[m.role]} size="sm" /> },
    ...(isAll
      ? [{ key: "branch", header: "الفرع", hideBelow: "xl" as const, cell: (m: VendorStaffMember) => <span className="text-xs text-muted-foreground">{m.branchName.ar}</span> }]
      : []),
    { key: "status", header: "الحالة", hideBelow: "lg", cell: (m) => <StatusBadge meta={STAFF_STATUS[m.status]} size="sm" /> },
    { key: "completed", header: "مكتمل", sortKey: "completed", align: "end", cell: (m) => <span className="num font-semibold">{formatNumber(m.performance.completed)}</span> },
    { key: "serviceValue", header: "قيمة الخدمات", sortKey: "serviceValue", align: "end", cell: (m) => <span className="num">{formatMoney(m.performance.serviceValue)}</span> },
    {
      key: "avgDuration",
      header: "متوسط المدة",
      sortKey: "avgDuration",
      align: "end",
      hideBelow: "md",
      cell: (m) => <DurationVsExpected avg={m.performance.avgDurationMin} expected={m.performance.expectedDurationMin} />,
    },
    {
      key: "rating",
      header: "التقييم",
      sortKey: "rating",
      align: "end",
      cell: (m) =>
        m.performance.rating !== null ? (
          <span className="num inline-flex items-center gap-1 font-medium">
            <Star className="size-3.5 fill-warning text-warning" aria-hidden />
            {formatNumber(m.performance.rating, true)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "discounts",
      header: "الخصومات",
      sortKey: "discounts",
      align: "end",
      hideBelow: "lg",
      cell: (m) =>
        m.performance.discountsCount ? (
          <span className="num inline-flex flex-col items-end leading-tight">
            <span className="font-medium">{formatMoney(m.performance.discountsAmount)}</span>
            <span className="text-[11px] text-muted-foreground">{formatNumber(m.performance.discountsCount)} خصم</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">لا يوجد</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="الموظفون"
        description="فريق المغسلة وأداؤه — من في الوردية الآن، من الأسرع والأعلى تقييمًا، ومن يمنح خصومات. اضغط على أي موظف لعرض ملفه."
        actions={
          <>
            <Button variant="outline" size="lg" onClick={() => setMatrixOpen(true)}>
              <ShieldCheck /> مصفوفة الصلاحيات
            </Button>
            <Button variant="outline" size="lg" onClick={() => setScheduleOpen(true)}>
              <CalendarRange /> جدول الورديات
            </Button>
            {canAdd ? (
              <Button size="lg" onClick={() => setAddOpen(true)}>
                <UserPlus /> إضافة موظف
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {counts ? (
          <>
            <StatTile label="حجم الفريق" icon={<UsersRound />} value={formatNumber(counts.all)} hint={isAll ? "في كل الفروع" : "في هذا الفرع"} />
            <StatTile
              label="في الوردية الآن"
              icon={<span className="size-2 rounded-full bg-current" />}
              tone={TONES.success}
              value={formatNumber(roster.data?.onShift ?? 0)}
              hint="حسب جدول الورديات"
            />
            <StatTile label="مديرو الفروع" icon={<Crown />} tone={STAFF_ROLE.manager.tone} value={formatNumber(counts.manager ?? 0)} />
            <StatTile label="الموظفون" icon={<Users />} tone={TONES.aqua} value={formatNumber(counts.employee ?? 0)} />
          </>
        ) : (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[98px] rounded-2xl" />)
        )}
      </div>

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        <ListToolbar
          tabs={
            <FilterTabs
              aria-label="الدور"
              value={state.role}
              onChange={(role) => setState({ role })}
              items={ROLE_TABS.filter((t) => t.value !== "owner" || account?.role === "owner").map((t) => ({ ...t, count: counts?.[t.value] }))}
            />
          }
          search={<SearchInput value={state.search} onChange={(search) => setState({ search })} placeholder="الاسم أو رقم الموبايل" />}
          filters={
            <>
              <FilterTabs aria-label="فترة الأداء" items={PERIODS} value={period} onChange={(p) => setState({ period: p })} className="mx-0 w-fit rounded-lg bg-muted/60 p-0.5" />
              {hasFilters ? (
                <Button variant="ghost" size="lg" onClick={() => setState({ role: "all", search: "" })}>
                  <X /> مسح الفلاتر
                </Button>
              ) : null}
            </>
          }
          actions={<span className="text-xs text-muted-foreground">أرقام الأداء عن {PERIODS.find((p) => p.value === period)?.label}</span>}
        />

        <DataTable
          columns={columns}
          rows={data?.items}
          rowKey={(m) => m.id}
          onRowClick={(m) => setProfileId(m.id)}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error}
          onRetry={() => refetch()}
          sort={{ key: state.sort, order: state.order as "asc" | "desc" }}
          onSortChange={(s) => setState({ sort: s.key, order: s.order })}
          rowClassName={(m) => (m.status === "suspended" ? "opacity-60" : undefined)}
          skeletonRows={6}
          empty={{
            icon: <UserRound />,
            title: hasFilters ? "لا يوجد موظفون مطابقون" : "لا يوجد موظفون بعد",
            description: hasFilters ? "جرّب تغيير الدور أو مسح البحث." : "أضف أول موظف ليبدأ استخدام تطبيق الموظفين.",
            action:
              !hasFilters && canAdd ? (
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <UserPlus /> إضافة موظف
                </Button>
              ) : undefined,
          }}
        />
      </section>

      <StaffProfileSheet
        member={data?.items.find((m) => m.id === profileId) ?? null}
        period={period}
        onClose={() => setProfileId(null)}
      />
      <StaffFormDialog mode="create" open={addOpen} onOpenChange={setAddOpen} />
      <ScheduleSheet open={scheduleOpen} onOpenChange={setScheduleOpen} />
      <PermissionMatrixDialog open={matrixOpen} onOpenChange={setMatrixOpen} />
    </div>
  );
}
