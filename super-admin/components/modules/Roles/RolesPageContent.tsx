"use client";

import { Fragment, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Lock, RotateCcw, Save, ShieldCheck, ShieldQuestion } from "lucide-react";

import { LockedPermission, PermissionSegmented, PERMISSION_LEVELS } from "@/components/modules/Roles/PermissionSegmented";
import { PageHeader } from "@/components/shared/page-header";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRoles, useUpdateRoles } from "@/hooks/use-admins";
import { ADMIN_ROLE, PERMISSION_LEVEL, PERMISSION_MODULES } from "@/lib/constants/labels";
import { formatNumber } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import type { PermissionKey, PermissionLevel, RolesMatrix } from "@/types/admins";
import type { AdminRole } from "@/types/auth";

const ROLES = Object.keys(ADMIN_ROLE) as AdminRole[];
const LOCKED_ROLE: AdminRole = "super";
const EDITABLE_ROLES = ROLES.filter((r) => r !== LOCKED_ROLE);

/** The audit log is immutable by design: nobody can "manage" it. */
const VIEW_ONLY_MODULES: PermissionKey[] = ["audit"];
const VIEW_ONLY_HINT = "سجل التدقيق للعرض فقط — لا يمكن تعديله أو حذفه لأي دور";
const LOCKED_HINT = "صلاحيات كاملة دائمًا";

const MODULE_LABEL = Object.fromEntries(PERMISSION_MODULES.map((m) => [m.key, m.label])) as Record<PermissionKey, string>;

const GROUPS = PERMISSION_MODULES.reduce<{ group: string; modules: typeof PERMISSION_MODULES }[]>((acc, m) => {
  const last = acc[acc.length - 1];
  if (last && last.group === m.group) last.modules.push(m);
  else acc.push({ group: m.group, modules: [m] });
  return acc;
}, []);

const LEVEL_HELP: Record<PermissionLevel, string> = {
  none: "لا تظهر الوحدة في القائمة الجانبية ولا يمكن فتحها.",
  view: "يرى البيانات والتقارير دون أي إجراء.",
  manage: "يرى وينفّذ الإجراءات (مع سبب يُسجل في سجل التدقيق).",
};

type Change = { role: AdminRole; key: PermissionKey; from: PermissionLevel; to: PermissionLevel };

function diff(base: RolesMatrix, next: RolesMatrix): Change[] {
  const out: Change[] = [];
  for (const m of PERMISSION_MODULES) {
    for (const role of EDITABLE_ROLES) {
      const from = base[role]?.[m.key] ?? "none";
      const to = next[role]?.[m.key] ?? "none";
      if (from !== to) out.push({ role, key: m.key, from, to });
    }
  }
  return out;
}

function MatrixSkeleton() {
  return (
    <div className="space-y-4" aria-busy aria-label="جاري التحميل">
      <Skeleton className="h-24 rounded-2xl" />
      <div className="space-y-2 rounded-2xl border border-border/80 bg-card p-5 shadow-soft">
        <div className="grid grid-cols-5 gap-4 pb-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="grid grid-cols-5 items-center gap-4">
            <Skeleton className="h-4 w-28" />
            {Array.from({ length: 4 }, (_, j) => (
              <Skeleton key={j} className="mx-auto h-7 w-32" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RolesPageContent() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch, isRefetching } = useRoles();
  const update = useUpdateRoles();
  const [draft, setDraft] = useState<RolesMatrix | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);

  const matrix = draft ?? data;
  const changes = useMemo(() => (data && draft ? diff(data, draft) : []), [data, draft]);
  const dirty = changes.length > 0;
  const changedSet = useMemo(() => new Set(changes.map((c) => `${c.role}.${c.key}`)), [changes]);

  // Guard against losing unsaved permission edits on reload / tab close.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const setLevel = (role: AdminRole, key: PermissionKey, level: PermissionLevel) => {
    if (!matrix) return;
    setDraft({ ...matrix, [role]: { ...matrix[role], [key]: level } });
  };

  const summary = (role: AdminRole) => {
    const levels = PERMISSION_MODULES.map((m) => matrix?.[role]?.[m.key] ?? "none");
    return { manage: levels.filter((l) => l === "manage").length, view: levels.filter((l) => l === "view").length };
  };

  const save = (reason: string) => {
    if (!draft) return;
    update.mutate(
      { matrix: draft, reason },
      {
        onSuccess: (result) => {
          // Show the saved matrix right away instead of flashing the old one until the refetch lands.
          queryClient.setQueryData(queryKeys.roles, result.data);
          setDraft(null);
          setSaveOpen(false);
        },
      },
    );
  };

  const header = (
    <PageHeader
      title="الأدوار والصلاحيات"
      description="حدّد ما يمكن لكل دور رؤيته وإدارته في كل وحدة. التعديلات تسري فورًا على كل المسؤولين بهذا الدور — القائمة الجانبية والإجراءات المتاحة لهم."
    />
  );

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        {header}
        <MatrixSkeleton />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        {header}
        <SectionCard>
          <ErrorState message={error.message} onRetry={() => refetch()} isRetrying={isRefetching} />
        </SectionCard>
      </div>
    );
  }

  if (!matrix || !ROLES.some((r) => matrix[r])) {
    return (
      <div className="space-y-6">
        {header}
        <SectionCard>
          <EmptyState
            icon={<ShieldQuestion />}
            title="لا توجد مصفوفة صلاحيات"
            description="لم يُرجع الخادم أي أدوار. أعد المحاولة، وإن استمرت المشكلة أعد ضبط بيانات العرض."
            action={
              <Button variant="outline" size="sm" onClick={() => refetch()} loading={isRefetching}>
                إعادة المحاولة
              </Button>
            }
          />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <SectionCard title="دليل المستويات" icon={<ShieldCheck />} contentClassName="pt-1">
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PERMISSION_LEVELS.map((level) => (
            <li key={level} className="flex items-start gap-2.5 rounded-xl bg-muted/50 p-3">
              <StatusBadge meta={PERMISSION_LEVEL[level]} size="sm" className="mt-px" />
              <p className="text-xs leading-relaxed text-muted-foreground">{LEVEL_HELP[level]}</p>
            </li>
          ))}
          <li className="flex items-start gap-2.5 rounded-xl bg-muted/50 p-3">
            <span className="mt-0.5 flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-warning">
              <span className="size-2 rounded-full bg-warning" aria-hidden />
              معدّل
            </span>
            <p className="text-xs leading-relaxed text-muted-foreground">
              خلية تغيّرت ولم تُحفظ بعد. <Lock className="inline size-3 align-[-1px]" aria-hidden /> Super Admin ثابت بصلاحيات كاملة.
            </p>
          </li>
        </ul>
      </SectionCard>

      <SectionCard
        flush
        title="مصفوفة الأدوار × الوحدات"
        description={`${PERMISSION_MODULES.length} وحدة · ${ROLES.length} أدوار`}
        action={
          dirty ? (
            <span className="num rounded-md bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">{changes.length} تعديل غير محفوظ</span>
          ) : null
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
            <caption className="sr-only">صلاحيات كل دور على كل وحدة من وحدات لوحة الإدارة</caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky start-0 z-10 w-48 border-y border-border bg-muted px-5 py-3 text-start align-bottom text-xs font-medium text-muted-foreground"
                >
                  الوحدة
                </th>
                {ROLES.map((role) => {
                  const meta = ADMIN_ROLE[role];
                  const s = summary(role);
                  return (
                    <th key={role} scope="col" className="border-y border-border bg-muted/60 px-3 py-3 text-center align-top font-normal">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="flex items-center gap-1">
                          {role === LOCKED_ROLE ? <Lock className="size-3 text-muted-foreground" aria-label="مقفل" /> : null}
                          <StatusBadge meta={meta} size="sm" />
                        </span>
                        <span className="hidden max-w-40 text-[11px] leading-snug text-muted-foreground lg:block">{meta.description}</span>
                        <span className="flex flex-wrap justify-center gap-1">
                          <span
                            style={{ "--tone": PERMISSION_LEVEL.manage.tone } as CSSProperties}
                            className="tone-soft num rounded px-1.5 py-px text-[10px] font-semibold"
                          >
                            {formatNumber(s.manage)} إدارة
                          </span>
                          <span
                            style={{ "--tone": PERMISSION_LEVEL.view.tone } as CSSProperties}
                            className="tone-soft num rounded px-1.5 py-px text-[10px] font-semibold"
                          >
                            {formatNumber(s.view)} عرض
                          </span>
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {GROUPS.map(({ group, modules }) => (
                <Fragment key={group}>
                  <tr>
                    <th
                      scope="colgroup"
                      colSpan={ROLES.length + 1}
                      className="border-b border-border/60 bg-muted/30 px-5 py-1.5 text-start text-[11px] font-semibold tracking-wide text-muted-foreground"
                    >
                      {group}
                    </th>
                  </tr>
                  {modules.map((m) => {
                    const viewOnly = VIEW_ONLY_MODULES.includes(m.key);
                    const rowChanged = EDITABLE_ROLES.some((r) => changedSet.has(`${r}.${m.key}`));
                    return (
                      <tr key={m.key} className={cn("transition-colors hover:bg-muted/30", rowChanged && "bg-warning/[0.04]")}>
                        <th
                          scope="row"
                          className={cn(
                            "sticky start-0 z-[1] border-b border-border/60 bg-card px-5 py-2.5 text-start text-[13px] font-medium",
                            rowChanged && "bg-[color-mix(in_oklab,var(--warning)_4%,var(--card))]",
                          )}
                        >
                          {m.label}
                        </th>
                        {ROLES.map((role) => {
                          const level = matrix[role]?.[m.key] ?? "none";
                          const cellLabel = `${m.label} — ${ADMIN_ROLE[role].label}`;
                          return (
                            <td key={role} className="border-b border-border/60 px-3 py-2 text-center">
                              {role === LOCKED_ROLE ? (
                                <LockedPermission value={level} label={cellLabel} hint={viewOnly && level !== "manage" ? VIEW_ONLY_HINT : LOCKED_HINT} />
                              ) : (
                                <PermissionSegmented
                                  name={`perm-${role}-${m.key}`}
                                  label={cellLabel}
                                  value={level}
                                  changed={changedSet.has(`${role}.${m.key}`)}
                                  onChange={(next) => setLevel(role, m.key, next)}
                                  disabledLevels={viewOnly ? ["manage"] : undefined}
                                  disabledHint={VIEW_ONLY_HINT}
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {dirty ? (
        <div className="sticky bottom-4 z-20">
          <div
            role="region"
            aria-label="تعديلات غير محفوظة"
            className="flex flex-col gap-3 rounded-2xl border border-warning/40 bg-card/95 p-3 shadow-floating backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:ps-5"
          >
            <p className="flex items-center gap-2 text-sm" aria-live="polite">
              <span className="size-2 shrink-0 animate-pulse-ring rounded-full bg-warning [--tone:var(--warning)]" aria-hidden />
              <span>
                <span className="num font-semibold">{changes.length}</span> تعديل غير محفوظ على الصلاحيات
              </span>
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setDraft(null)} disabled={update.isPending}>
                <RotateCcw />
                تراجع
              </Button>
              <Button onClick={() => setSaveOpen(true)} loading={update.isPending}>
                {!update.isPending ? <Save /> : null}
                حفظ التعديلات
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ReasonDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        title="حفظ تعديلات الصلاحيات"
        description="تسري الصلاحيات الجديدة فورًا على كل المسؤولين بالأدوار المعدّلة، وتُسجل التعديلات وسببها في سجل التدقيق."
        textLabel="سبب التعديل (يُسجل في سجل التدقيق)"
        textPlaceholder="مثال: منح فريق الدعم صلاحية عرض الحجوزات لمتابعة الشكاوى"
        confirmLabel={`حفظ ${changes.length} تعديل`}
        isPending={update.isPending}
        onConfirm={({ text }) => save(text)}
      >
        <div className="rounded-xl border border-border bg-muted/40">
          <p className="border-b border-border/60 px-3.5 py-2 text-xs font-semibold">
            التعديلات (<span className="num">{changes.length}</span>)
          </p>
          <ul className="max-h-52 divide-y divide-border/60 overflow-y-auto">
            {changes.map((c) => (
              <li key={`${c.role}.${c.key}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3.5 py-2 text-xs">
                <span className="font-medium">{MODULE_LABEL[c.key]}</span>
                <span className="text-muted-foreground">· {ADMIN_ROLE[c.role].label}</span>
                <span className="ms-auto flex items-center gap-1.5">
                  <StatusBadge meta={PERMISSION_LEVEL[c.from]} size="sm" className="opacity-70" />
                  <ArrowLeft className="size-3 text-muted-foreground" aria-label="إلى" />
                  <StatusBadge meta={PERMISSION_LEVEL[c.to]} size="sm" />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </ReasonDialog>
    </div>
  );
}
