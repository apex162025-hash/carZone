"use client";

import { MessageSquareWarning, Tags, UserRound } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { SelectFilter } from "@/components/shared/select-filter";
import { StatusBadge } from "@/components/shared/status-badge";
import { TablePagination } from "@/components/shared/table-pagination";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useAdmins } from "@/hooks/use-admins";
import { useComplaints } from "@/hooks/use-complaints";
import { useUrlState } from "@/hooks/use-url-state";
import { COMPLAINT_CATEGORY, COMPLAINT_STATUS } from "@/lib/constants/labels";
import { daysBetween, formatDateTime, formatRelative } from "@/lib/format";
import type { CsvColumn } from "@/lib/export-csv";
import { cn } from "@/lib/utils";
import type { ComplaintCategory, ComplaintListItem, ComplaintStatus } from "@/types/complaints";

const TAB_ORDER: (ComplaintStatus | "all")[] = ["all", "open", "in_review", "waiting", "resolved", "closed"];

/** Open tickets older than this are highlighted as overdue. */
const OVERDUE_DAYS = 3;

function isOverdue(c: ComplaintListItem) {
  return c.status === "open" && daysBetween(c.createdAt) > OVERDUE_DAYS;
}

const COLUMNS: DataTableColumn<ComplaintListItem>[] = [
  {
    key: "ticket",
    header: "التذكرة",
    sortKey: "ticket",
    cell: (c) => (
      <div className="min-w-0">
        <p className="num font-semibold">{c.ticket}</p>
        <p className="max-w-56 truncate text-xs text-muted-foreground">{c.description}</p>
      </div>
    ),
  },
  {
    key: "customer",
    header: "العميل",
    cell: (c) => (
      <span className="flex items-center gap-2 text-sm">
        <UserAvatar name={c.customerName} size="xs" />
        <span className="truncate">{c.customerName}</span>
      </span>
    ),
  },
  {
    key: "wash",
    header: "المغسلة / الفرع",
    hideBelow: "md",
    cell: (c) => (
      <div className="min-w-0 text-xs">
        <p className="truncate font-medium text-foreground">{c.businessName.ar}</p>
        <p className="truncate text-muted-foreground">{c.branchName.ar}</p>
      </div>
    ),
  },
  {
    key: "order",
    header: "الحجز",
    hideBelow: "xl",
    cell: (c) =>
      c.orderNumber ? <span className="num text-xs font-medium">{c.orderNumber}</span> : <span className="text-xs text-muted-foreground">—</span>,
  },
  {
    key: "category",
    header: "التصنيف",
    hideBelow: "lg",
    cell: (c) => <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] whitespace-nowrap text-muted-foreground">{COMPLAINT_CATEGORY[c.category]}</span>,
  },
  { key: "status", header: "الحالة", sortKey: "status", cell: (c) => <StatusBadge meta={COMPLAINT_STATUS[c.status]} size="sm" /> },
  {
    key: "assignee",
    header: "المسؤول",
    hideBelow: "lg",
    cell: (c) =>
      c.assigneeName ? (
        <span className="flex items-center gap-1.5 text-xs">
          <UserAvatar name={c.assigneeName} size="xs" />
          {c.assigneeName}
        </span>
      ) : (
        <span className="rounded-md border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground">غير معين</span>
      ),
  },
  {
    key: "age",
    header: "العمر",
    sortKey: "createdAt",
    align: "end",
    cell: (c) => (
      <span
        title={formatDateTime(c.createdAt)}
        className={cn(
          "text-xs whitespace-nowrap",
          isOverdue(c) ? "rounded-md bg-destructive/10 px-2 py-0.5 font-semibold text-destructive" : "text-muted-foreground",
        )}
      >
        {formatRelative(c.createdAt)}
      </span>
    ),
  },
];

const CSV: CsvColumn<ComplaintListItem>[] = [
  { header: "التذكرة", value: (c) => c.ticket },
  { header: "العميل", value: (c) => c.customerName },
  { header: "المغسلة", value: (c) => c.businessName.ar },
  { header: "الفرع", value: (c) => c.branchName.ar },
  { header: "رقم الحجز", value: (c) => c.orderNumber },
  { header: "التصنيف", value: (c) => COMPLAINT_CATEGORY[c.category] },
  { header: "الحالة", value: (c) => COMPLAINT_STATUS[c.status].label },
  { header: "المسؤول", value: (c) => c.assigneeName ?? "غير معين" },
  { header: "تاريخ الإنشاء", value: (c) => c.createdAt },
  { header: "الوصف", value: (c) => c.description },
  { header: "قرار الحل", value: (c) => c.resolution },
];

export default function ComplaintsPageContent() {
  const [state, setState] = useUrlState({
    status: "all",
    category: "all",
    assignee: "all",
    search: "",
    sort: "createdAt",
    order: "asc",
    page: 1,
  });
  const admins = useAdmins();
  const { data, isLoading, isFetching, error, refetch } = useComplaints({
    status: state.status as ComplaintStatus | "all",
    category: state.category as ComplaintCategory | "all",
    assignee: state.assignee,
    search: state.search,
    sort: state.sort,
    order: state.order as "asc" | "desc",
    page: state.page,
  });

  const counts = data?.meta.counts;

  return (
    <div className="space-y-6">
      <PageHeader
        title="الشكاوى"
        description="صندوق شكاوى العملاء — الأقدم أولًا. عيّن المسؤول، تابع الحالة، ولا تترك شكوى مفتوحة أكثر من ٣ أيام."
        actions={<ExportCsvButton filename="carzen-complaints" columns={CSV} rows={data?.items} />}
      />

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        <ListToolbar
          tabs={
            <FilterTabs
              aria-label="حالة الشكوى"
              value={state.status}
              onChange={(status) => setState({ status })}
              items={TAB_ORDER.map((s) => ({
                value: s,
                label: s === "all" ? "الكل" : COMPLAINT_STATUS[s].label,
                count: counts?.[s],
                tone: s === "all" ? undefined : COMPLAINT_STATUS[s].tone,
              }))}
            />
          }
          search={<SearchInput value={state.search} onChange={(search) => setState({ search })} placeholder="ابحث بالتذكرة، العميل، المغسلة أو رقم الحجز" />}
          filters={
            <>
              <SelectFilter
                aria-label="التصنيف"
                icon={<Tags className="size-4" />}
                value={state.category}
                onChange={(category) => setState({ category })}
                allLabel="كل التصنيفات"
                options={Object.entries(COMPLAINT_CATEGORY).map(([value, label]) => ({ value, label }))}
              />
              <SelectFilter
                aria-label="المسؤول"
                icon={<UserRound className="size-4" />}
                value={state.assignee}
                onChange={(assignee) => setState({ assignee })}
                allLabel="كل المسؤولين"
                options={[
                  { value: "unassigned", label: "غير معين" },
                  ...(admins.data ?? []).map((a) => ({ value: a.id, label: a.name })),
                ]}
              />
            </>
          }
        />
        <DataTable
          columns={COLUMNS}
          rows={data?.items}
          rowKey={(c) => c.id}
          rowHref={(c) => `/complaints/${c.id}`}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error}
          onRetry={() => refetch()}
          sort={{ key: state.sort, order: state.order as "asc" | "desc" }}
          onSortChange={(s) => setState({ sort: s.key, order: s.order })}
          rowClassName={(c) => (isOverdue(c) ? "bg-destructive/[0.03]" : undefined)}
          empty={{
            icon: <MessageSquareWarning />,
            title: "لا توجد شكاوى مطابقة",
            description: "جرّب حالة أو تصنيفًا آخر، أو امسح كلمة البحث.",
          }}
          footer={<TablePagination pagination={data?.pagination} onPageChange={(page) => setState({ page }, { resetPage: false })} />}
        />
      </section>
    </div>
  );
}
