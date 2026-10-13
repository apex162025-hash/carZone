"use client";

import Link from "next/link";
import { ClipboardList, Store } from "lucide-react";

import { OnboardingPipeline } from "@/components/modules/Applications/OnboardingPipeline";
import { arCount, SERVICES_FORMS, SPOTS_FORMS, waitingLabel, waitingTone } from "@/components/modules/Applications/review-utils";
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
import { useApplications } from "@/hooks/use-applications";
import { useUrlState } from "@/hooks/use-url-state";
import { APPLICATION_STATUS, AREAS } from "@/lib/constants/labels";
import { daysBetween, formatDate, formatMoney, formatRelative } from "@/lib/format";
import type { CsvColumn } from "@/lib/export-csv";
import type { ApplicationStatus, WashApplication } from "@/types/applications";

const TAB_ORDER: (ApplicationStatus | "all")[] = ["all", "pending", "needs_changes", "approved", "rejected"];

const COLUMNS: DataTableColumn<WashApplication>[] = [
  {
    key: "business",
    header: "المغسلة والمالك",
    sortKey: "name",
    cell: (a) => (
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
          <Store className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{a.businessName}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserAvatar name={a.ownerName} size="xs" className="size-4 text-[8px]" />
            {a.ownerName}
          </p>
        </div>
      </div>
    ),
  },
  { key: "area", header: "المنطقة", hideBelow: "md", cell: (a) => <span className="text-sm">{AREAS[a.area] ?? a.area}</span> },
  {
    key: "services",
    header: "الخدمات",
    hideBelow: "lg",
    cell: (a) => {
      const prices = a.services.map((s) => s.price);
      return (
        <div className="text-xs">
          <span className="num font-medium text-foreground">{arCount(a.services.length, SERVICES_FORMS)}</span>
          {prices.length ? <span className="num ms-1.5 text-muted-foreground">· من {formatMoney(Math.min(...prices))}</span> : null}
        </div>
      );
    },
  },
  {
    key: "capacity",
    header: "السعة",
    align: "center",
    hideBelow: "lg",
    cell: (a) => (
      <span className="num text-xs font-medium">{arCount(a.capacity, SPOTS_FORMS)}</span>
    ),
  },
  {
    key: "submitted",
    header: "تاريخ التقديم",
    sortKey: "submittedAt",
    cell: (a) => {
      const days = daysBetween(a.submittedAt);
      return (
        <div className="flex flex-col items-start gap-1">
          <span className="text-xs text-muted-foreground" title={formatDate(a.submittedAt, { withYear: true })}>
            {formatRelative(a.submittedAt)}
          </span>
          {a.status === "pending" ? <StatusBadge size="sm" label={waitingLabel(days)} tone={waitingTone(days)} /> : null}
        </div>
      );
    },
  },
  { key: "status", header: "الحالة", cell: (a) => <StatusBadge meta={APPLICATION_STATUS[a.status]} /> },
];

const CSV: CsvColumn<WashApplication>[] = [
  { header: "رقم الطلب", value: (a) => a.id },
  { header: "المغسلة", value: (a) => a.businessName },
  { header: "المالك", value: (a) => a.ownerName },
  { header: "الهاتف", value: (a) => a.phone },
  { header: "البريد", value: (a) => a.email },
  { header: "المنطقة", value: (a) => AREAS[a.area] ?? a.area },
  { header: "عدد الخدمات", value: (a) => a.services.length },
  { header: "السعة", value: (a) => a.capacity },
  { header: "تاريخ التقديم", value: (a) => a.submittedAt },
  { header: "الحالة", value: (a) => APPLICATION_STATUS[a.status].label },
];

export default function ApplicationsPageContent() {
  const [state, setState] = useUrlState({
    status: "pending",
    search: "",
    sort: "submittedAt",
    order: "asc",
    page: 1,
  });
  const { data, isLoading, isFetching, error, refetch } = useApplications({
    status: state.status as ApplicationStatus | "all",
    search: state.search,
    sort: state.sort,
    order: state.order as "asc" | "desc",
    page: state.page,
  });

  const counts = data?.meta.counts;
  const filtered = Boolean(state.search) || state.status !== "all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="طلبات الانضمام"
        description="راجع طلبات المغاسل الجديدة بالأقدم أولًا — وافق أو اطلب تعديلات أو ارفض مع توضيح السبب للمالك."
        actions={
          <>
            <ExportCsvButton filename="carzen-applications" columns={CSV} rows={data?.items} />
            <Button variant="outline" size="lg" render={<Link href="/washes" />}>
              <Store />
              كل المغاسل
            </Button>
          </>
        }
      />

      <OnboardingPipeline
        pipeline={data?.meta.pipeline}
        isLoading={isLoading}
        activeStatus={state.status}
        onSelectStatus={(status) => setState({ status })}
      />

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        <ListToolbar
          tabs={
            <FilterTabs
              aria-label="حالة الطلب"
              value={state.status}
              onChange={(status) => setState({ status })}
              items={TAB_ORDER.map((s) => ({
                value: s,
                label: s === "all" ? "الكل" : APPLICATION_STATUS[s].label,
                count: counts?.[s],
                tone: s === "all" ? undefined : APPLICATION_STATUS[s].tone,
              }))}
            />
          }
          search={
            <SearchInput value={state.search} onChange={(search) => setState({ search })} placeholder="ابحث باسم المغسلة أو المالك أو الهاتف" />
          }
        />
        <DataTable
          columns={COLUMNS}
          rows={data?.items}
          rowKey={(a) => a.id}
          rowHref={(a) => `/applications/${a.id}`}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error}
          onRetry={() => refetch()}
          sort={{ key: state.sort, order: state.order as "asc" | "desc" }}
          onSortChange={(s) => setState({ sort: s.key, order: s.order })}
          rowClassName={(a) => (a.status === "pending" && daysBetween(a.submittedAt) >= 5 ? "bg-destructive/[0.03]" : undefined)}
          empty={
            filtered
              ? {
                  icon: <ClipboardList />,
                  title: state.status === "pending" && !state.search ? "لا توجد طلبات بانتظار المراجعة" : "لا توجد طلبات مطابقة",
                  description:
                    state.status === "pending" && !state.search
                      ? "قائمة المراجعة فارغة — أي مغسلة تسجّل من تطبيق الملاك ستظهر هنا تلقائيًا."
                      : "جرّب حالة أخرى أو امسح كلمة البحث.",
                  action: (
                    <Button variant="outline" size="sm" onClick={() => setState({ status: "all", search: "" })}>
                      عرض كل الطلبات
                    </Button>
                  ),
                }
              : {
                  icon: <ClipboardList />,
                  title: "لا توجد طلبات انضمام بعد",
                  description: "عندما تسجّل مغسلة جديدة من تطبيق الملاك يظهر طلبها هنا للمراجعة.",
                }
          }
          footer={<TablePagination pagination={data?.pagination} onPageChange={(page) => setState({ page }, { resetPage: false })} />}
        />
      </section>
    </div>
  );
}
