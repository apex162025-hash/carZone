"use client";

import Link from "next/link";
import { Boxes, History, Lock, UserCog, UserRound, Zap } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { SelectFilter } from "@/components/shared/select-filter";
import { StatusBadge } from "@/components/shared/status-badge";
import { TablePagination } from "@/components/shared/table-pagination";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { useAuditLogs } from "@/hooks/use-platform";
import { useUrlState } from "@/hooks/use-url-state";
import { AUDIT_ACTION, AUDIT_ENTITY, TONES, auditEntityHref, type StatusMeta } from "@/lib/constants/labels";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { CsvColumn } from "@/lib/export-csv";
import type { AuditLogListItem } from "@/types/audit";
import type { ActorType } from "@/types/orders";

const ACTOR_TYPE: Record<ActorType, StatusMeta> = {
  admin: { label: "مسؤول", tone: TONES.primary },
  system: { label: "النظام", tone: TONES.neutral },
  staff: { label: "طاقم المغسلة", tone: TONES.aqua },
  customer: { label: "عميل", tone: TONES.violet },
};

const DEFAULTS = { actorId: "all", action: "all", entity: "all", actorType: "all", search: "", page: 1 };

function actorLabel(log: AuditLogListItem) {
  return log.actorType === "system" ? "النظام" : log.actorName;
}

function truncate(v: string | null, max = 48) {
  if (!v) return null;
  return v.length > max ? `${v.slice(0, max)}…` : v;
}

const COLUMNS: DataTableColumn<AuditLogListItem>[] = [
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
          <p className="truncate text-sm font-medium">{actorLabel(l)}</p>
          <p className="text-[11px] text-muted-foreground">{ACTOR_TYPE[l.actorType]?.label ?? l.actorType}</p>
        </div>
      </div>
    ),
  },
  {
    key: "action",
    header: "الإجراء",
    cell: (l) => <span className="text-sm font-medium whitespace-nowrap">{AUDIT_ACTION[l.action] ?? l.action}</span>,
  },
  {
    key: "entity",
    header: "الكيان",
    cell: (l) => {
      const href = auditEntityHref(l.entity, l.entityId);
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
  {
    key: "change",
    header: "القيمة القديمة ← الجديدة",
    hideBelow: "lg",
    cell: (l) => {
      const oldV = truncate(l.oldValue);
      const newV = truncate(l.newValue);
      if (!oldV && !newV) return <span className="text-xs text-muted-foreground">—</span>;
      return (
        <p className="num max-w-72 text-xs leading-relaxed text-muted-foreground" dir="auto" title={[l.oldValue, l.newValue].filter(Boolean).join(" ← ")}>
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
        <p className="line-clamp-2 max-w-64 text-xs leading-relaxed" dir="auto" title={l.reason}>
          {l.reason}
        </p>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
];

const CSV: CsvColumn<AuditLogListItem>[] = [
  { header: "المعرف", value: (l) => l.id },
  { header: "الوقت", value: (l) => l.at },
  { header: "المنفّذ", value: (l) => actorLabel(l) },
  { header: "نوع المنفّذ", value: (l) => ACTOR_TYPE[l.actorType]?.label ?? l.actorType },
  { header: "الإجراء", value: (l) => AUDIT_ACTION[l.action] ?? l.action },
  { header: "Action", value: (l) => l.action },
  { header: "الكيان", value: (l) => AUDIT_ENTITY[l.entity] ?? l.entity },
  { header: "معرف الكيان", value: (l) => l.entityId },
  { header: "القيمة القديمة", value: (l) => l.oldValue },
  { header: "القيمة الجديدة", value: (l) => l.newValue },
  { header: "السبب", value: (l) => l.reason },
];

export default function AuditPageContent() {
  const [state, setState] = useUrlState(DEFAULTS);
  const { data, isLoading, isFetching, error, refetch } = useAuditLogs({
    actorId: state.actorId,
    action: state.action,
    entity: state.entity,
    actorType: state.actorType as ActorType | "all",
    search: state.search,
    page: state.page,
  });

  const meta = data?.meta;
  const hasFilters =
    state.actorId !== "all" || state.action !== "all" || state.entity !== "all" || state.actorType !== "all" || state.search !== "";
  const clearFilters = () => setState({ actorId: "all", action: "all", entity: "all", actorType: "all", search: "" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="سجل التدقيق"
        description="كل إجراء حساس على المنصة: من نفّذه، على أي كيان، القيمة قبل وبعد، والسبب."
        actions={<ExportCsvButton filename="carzen-audit-log" columns={CSV} rows={data?.items} />}
      />

      <div className="flex items-start gap-3 rounded-2xl border border-info/30 bg-info/5 p-4" role="note">
        <Lock className="mt-0.5 size-5 shrink-0 text-info" />
        <div className="text-sm">
          <p className="font-semibold">سجل غير قابل للتعديل أو الحذف</p>
          <p className="mt-0.5 text-muted-foreground">
            تُكتب الإدخالات تلقائيًا عند كل إجراء ولا يمكن لأي مسؤول — بما فيهم Super Admin — تعديلها أو حذفها.
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        <ListToolbar
          search={<SearchInput value={state.search} onChange={(search) => setState({ search })} placeholder="ابحث بمعرف الكيان، المنفّذ أو السبب" />}
          filters={
            <>
              <SelectFilter
                aria-label="المنفّذ"
                icon={<UserRound className="size-4" />}
                value={state.actorId}
                onChange={(actorId) => setState({ actorId })}
                allLabel="كل المسؤولين"
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
              <SelectFilter
                aria-label="نوع الكيان"
                icon={<Boxes className="size-4" />}
                value={state.entity}
                onChange={(entity) => setState({ entity })}
                allLabel="كل الكيانات"
                options={(meta?.entities ?? []).map((e) => ({ value: e, label: AUDIT_ENTITY[e] ?? e }))}
              />
              <SelectFilter
                aria-label="نوع المنفّذ"
                icon={<UserCog className="size-4" />}
                value={state.actorType}
                onChange={(actorType) => setState({ actorType })}
                allLabel="كل الأنواع"
                options={(Object.keys(ACTOR_TYPE) as ActorType[]).map((t) => ({ value: t, label: ACTOR_TYPE[t].label }))}
              />
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
          rowKey={(l) => l.id}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error}
          onRetry={() => refetch()}
          empty={{
            icon: <History />,
            title: "لا توجد إدخالات مطابقة",
            description: "جرّب فلاتر أخرى أو امسح كلمة البحث.",
            action: hasFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                مسح الفلاتر
              </Button>
            ) : undefined,
          }}
          footer={<TablePagination pagination={data?.pagination} onPageChange={(page) => setState({ page }, { resetPage: false })} />}
        />
      </section>

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <StatusBadge size="sm" label="للقراءة فقط" tone="var(--info)" />
        يُعرض الأحدث أولًا
      </p>
    </div>
  );
}
