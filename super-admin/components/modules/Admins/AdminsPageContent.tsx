"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { AlertTriangle, Info, MoreHorizontal, Power, PowerOff, ShieldCheck, UserCog, UserPlus, UsersRound } from "lucide-react";

import { ChangeRoleDialog } from "@/components/modules/Admins/ChangeRoleDialog";
import { InviteAdminDialog } from "@/components/modules/Admins/InviteAdminDialog";
import { ADMIN_ROLES } from "@/components/modules/Admins/RoleRadioCards";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { PageHeader } from "@/components/shared/page-header";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmins, useToggleAdminStatus } from "@/hooks/use-admins";
import { ADMIN_ROLE, TONES, type StatusMeta } from "@/lib/constants/labels";
import { formatDate, formatDateTime, formatNumber, formatRelative } from "@/lib/format";
import { useAuthStore } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils";
import type { AdminRole, AdminStatus, AdminUser } from "@/types/auth";

const ADMIN_STATUS: Record<AdminStatus, StatusMeta> = {
  active: { label: "نشط", tone: TONES.success },
  inactive: { label: "موقوف", tone: TONES.neutral },
};

type StatusFilter = AdminStatus | "all";

const STATUS_TABS: StatusFilter[] = ["all", "active", "inactive"];

export default function AdminsPageContent() {
  const me = useAuthStore((s) => s.admin);
  const { data, isLoading, isFetching, error, refetch } = useAdmins();

  const [status, setStatus] = useState<StatusFilter>("all");
  const [role, setRole] = useState<AdminRole | null>(null);
  const [search, setSearch] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [roleOpen, setRoleOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<AdminUser | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const toggleStatus = useToggleAdminStatus(() => setStatusOpen(false));

  const activeSupers = useMemo(() => data?.filter((a) => a.role === "super" && a.status === "active").length ?? 0, [data]);
  const isLastSuper = (a: AdminUser) => a.role === "super" && a.status === "active" && activeSupers <= 1;

  const counts = useMemo(() => {
    const list = data ?? [];
    return {
      all: list.length,
      active: list.filter((a) => a.status === "active").length,
      inactive: list.filter((a) => a.status === "inactive").length,
    };
  }, [data]);

  const byRole = useMemo(
    () =>
      ADMIN_ROLES.map((r) => {
        const members = data?.filter((a) => a.role === r) ?? [];
        return { role: r, active: members.filter((a) => a.status === "active").length, inactive: members.filter((a) => a.status === "inactive").length };
      }),
    [data],
  );

  const rows = useMemo(() => {
    if (!data) return undefined;
    const term = search.trim().toLowerCase();
    return data.filter(
      (a) =>
        (status === "all" || a.status === status) &&
        (!role || a.role === role) &&
        (!term || a.name.toLowerCase().includes(term) || a.email.toLowerCase().includes(term)),
    );
  }, [data, status, role, search]);

  const filtered = status !== "all" || role !== null || search.trim() !== "";

  const openRole = (a: AdminUser) => {
    setRoleTarget(a);
    setRoleOpen(true);
  };
  const openStatus = (a: AdminUser) => {
    setStatusTarget(a);
    setStatusOpen(true);
  };

  const columns: DataTableColumn<AdminUser>[] = [
    {
      key: "admin",
      header: "المسؤول",
      cell: (a) => {
        const isMe = a.id === me?.id;
        return (
          <div className="flex items-center gap-3">
            <UserAvatar name={a.name} className={cn(a.status === "inactive" && "opacity-60 grayscale")} />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate font-semibold">
                {a.name}
                {isMe ? <span className="text-xs font-medium text-primary">(أنت)</span> : null}
              </p>
              <p className="num truncate text-xs text-muted-foreground" dir="ltr">
                {a.email}
              </p>
            </div>
          </div>
        );
      },
    },
    { key: "role", header: "الدور", cell: (a) => <StatusBadge meta={ADMIN_ROLE[a.role]} /> },
    { key: "status", header: "الحالة", cell: (a) => <StatusBadge meta={ADMIN_STATUS[a.status]} size="sm" /> },
    {
      key: "lastLogin",
      header: "آخر دخول",
      hideBelow: "md",
      cell: (a) =>
        a.lastLoginAt ? (
          <time className="text-xs text-muted-foreground" dateTime={a.lastLoginAt} title={formatDateTime(a.lastLoginAt)}>
            {formatRelative(a.lastLoginAt)}
          </time>
        ) : (
          <span className="text-xs text-muted-foreground/80">لم يسجل دخول</span>
        ),
    },
    {
      key: "created",
      header: "تاريخ الإضافة",
      hideBelow: "lg",
      cell: (a) => (
        <time className="num text-xs text-muted-foreground" dateTime={a.createdAt}>
          {formatDate(a.createdAt, { withYear: true })}
        </time>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">الإجراءات</span>,
      align: "end",
      headClassName: "w-14",
      cell: (a) => {
        const isMe = a.id === me?.id;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`إجراءات ${a.name}`} />}>
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="truncate">{a.name}</DropdownMenuLabel>
                {isMe ? (
                  <p className="mx-1.5 mb-1 flex items-start gap-1.5 rounded-md bg-muted px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    <Info className="mt-px size-3.5 shrink-0" />
                    لا يمكنك تغيير دورك أو إيقاف حسابك بنفسك — اطلب ذلك من Super Admin آخر.
                  </p>
                ) : null}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={isMe} onClick={() => openRole(a)}>
                <UserCog />
                تغيير الدور
              </DropdownMenuItem>
              {a.status === "active" ? (
                <DropdownMenuItem variant="destructive" disabled={isMe} onClick={() => openStatus(a)}>
                  <PowerOff />
                  إيقاف الحساب
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem disabled={isMe} onClick={() => openStatus(a)}>
                  <Power />
                  تفعيل الحساب
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const deactivating = statusTarget?.status === "active";

  return (
    <div className="space-y-6">
      <PageHeader
        title="المسؤولون"
        description="حسابات فريق إدارة المنصة وأدوارهم. لا يمكن إيقاف حسابك أو تغيير دورك بنفسك، ويجب أن يبقى Super Admin نشط واحد على الأقل."
        actions={
          <Button size="lg" onClick={() => setInviteOpen(true)}>
            <UserPlus />
            دعوة مسؤول
          </Button>
        }
      />

      {isLoading && !data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy aria-label="جاري التحميل">
          {ADMIN_ROLES.map((r) => (
            <Skeleton key={r} className="h-[118px] rounded-2xl" />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {byRole.map(({ role: r, active, inactive }) => {
            const meta = ADMIN_ROLE[r];
            const selected = role === r;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={selected}
                onClick={() => setRole(selected ? null : r)}
                style={{ "--tone": meta.tone } as CSSProperties}
                className={cn(
                  "group cursor-pointer rounded-2xl border bg-card p-4 text-start shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-raised focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
                  selected ? "border-[var(--tone)] ring-1 ring-[var(--tone)]" : "border-border/80",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <span className="tone-soft flex size-7 items-center justify-center rounded-lg">
                      <ShieldCheck className="size-3.5" />
                    </span>
                    {meta.label}
                  </span>
                  {selected ? <span className="text-[11px] font-medium text-[var(--tone)]">مُصفّى</span> : null}
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="num text-xl font-bold tracking-tight">{formatNumber(active)}</span>
                  <span className="text-xs text-muted-foreground">نشط</span>
                  {inactive ? <span className="num ms-auto text-[11px] text-muted-foreground">+{inactive} موقوف</span> : null}
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{meta.description}</p>
              </button>
            );
          })}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        <ListToolbar
          tabs={
            <FilterTabs
              aria-label="حالة الحساب"
              value={status}
              onChange={setStatus}
              items={STATUS_TABS.map((s) => ({
                value: s,
                label: s === "all" ? "الكل" : ADMIN_STATUS[s].label,
                count: data ? counts[s] : undefined,
                tone: s === "all" ? undefined : ADMIN_STATUS[s].tone,
              }))}
            />
          }
          search={<SearchInput value={search} onChange={setSearch} placeholder="ابحث بالاسم أو البريد" />}
          actions={
            role ? (
              <Button variant="ghost" size="sm" onClick={() => setRole(null)}>
                إلغاء تصفية الدور ({ADMIN_ROLE[role].label})
              </Button>
            ) : null
          }
        />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(a) => a.id}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error}
          onRetry={() => refetch()}
          skeletonRows={5}
          rowClassName={(a) => cn(a.id === me?.id && "bg-primary/[0.03]", a.status === "inactive" && "text-muted-foreground")}
          empty={
            filtered
              ? {
                  icon: <UsersRound />,
                  title: "لا يوجد مسؤولون مطابقون",
                  description: "جرّب حالة أو دورًا آخر أو امسح كلمة البحث.",
                  action: (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStatus("all");
                        setRole(null);
                        setSearch("");
                      }}
                    >
                      مسح الفلاتر
                    </Button>
                  ),
                }
              : {
                  icon: <UsersRound />,
                  title: "لا يوجد مسؤولون بعد",
                  description: "ادعُ أول عضو في فريق الإدارة وحدد دوره.",
                  action: (
                    <Button size="sm" onClick={() => setInviteOpen(true)}>
                      <UserPlus />
                      دعوة مسؤول
                    </Button>
                  ),
                }
          }
        />
      </section>

      <InviteAdminDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      {roleTarget ? (
        <ChangeRoleDialog key={roleTarget.id} admin={roleTarget} isLastSuper={isLastSuper(roleTarget)} open={roleOpen} onOpenChange={setRoleOpen} />
      ) : null}

      <ReasonDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        title={statusTarget ? `${deactivating ? "إيقاف" : "تفعيل"} حساب ${statusTarget.name}` : ""}
        description={
          deactivating
            ? "يُمنع المسؤول من الدخول فورًا وتُنهى كل جلساته المفتوحة. يمكنك إعادة تفعيل الحساب لاحقًا."
            : `يستعيد المسؤول الدخول فورًا بصلاحيات دوره الحالي${statusTarget ? ` (${ADMIN_ROLE[statusTarget.role].label})` : ""}.`
        }
        textLabel={deactivating ? "سبب الإيقاف (يُسجل في سجل التدقيق)" : "سبب التفعيل (يُسجل في سجل التدقيق)"}
        textPlaceholder={deactivating ? "مثال: انتهاء التعاقد مع الموظف" : "مثال: عودة الموظف من إجازة"}
        confirmLabel={deactivating ? "إيقاف الحساب" : "تفعيل الحساب"}
        variant={deactivating ? "destructive" : "default"}
        isPending={toggleStatus.isPending}
        onConfirm={({ text }) => {
          if (!statusTarget) return;
          toggleStatus.mutate({ id: statusTarget.id, status: deactivating ? "inactive" : "active", reason: text });
        }}
      >
        {statusTarget && deactivating && isLastSuper(statusTarget) ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <p>
              <span className="font-semibold">هذا آخر Super Admin نشط.</span> لن يسمح النظام بإيقافه قبل تعيين Super Admin آخر.
            </p>
          </div>
        ) : null}
      </ReasonDialog>
    </div>
  );
}
