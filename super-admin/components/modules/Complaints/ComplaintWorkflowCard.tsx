"use client";

import { useState, type ComponentType } from "react";
import { Archive, CheckCircle2, Hourglass, RotateCcw, ScanSearch, UserCheck, UserRound, Workflow } from "lucide-react";

import { ReasonDialog } from "@/components/shared/reason-dialog";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmins } from "@/hooks/use-admins";
import { useUpdateComplaint } from "@/hooks/use-complaints";
import { COMPLAINT_STATUS } from "@/lib/constants/labels";
import { useAuthStore } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils";
import type { Complaint, ComplaintStatus } from "@/types/complaints";

/** Mirrors the server-side TRANSITIONS map (the API rejects anything else with 409). */
const TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  open: ["in_review", "waiting", "resolved"],
  in_review: ["waiting", "resolved", "open"],
  waiting: ["in_review", "resolved"],
  resolved: ["closed", "in_review"],
  closed: [],
};

const LIFECYCLE: ComplaintStatus[] = ["open", "in_review", "waiting", "resolved", "closed"];

const ACTION: Record<ComplaintStatus, { label: string; icon: ComponentType<{ className?: string }> }> = {
  open: { label: "إعادة إلى مفتوحة", icon: RotateCcw },
  in_review: { label: "نقل إلى قيد المراجعة", icon: ScanSearch },
  waiting: { label: "بانتظار رد العميل أو المغسلة", icon: Hourglass },
  resolved: { label: "حل الشكوى", icon: CheckCircle2 },
  closed: { label: "إغلاق الشكوى نهائيًا", icon: Archive },
};

const UNASSIGNED = "unassigned";

type ComplaintWorkflowCardProps = {
  complaint: Complaint;
};

/** AD-32: status lifecycle control + assignee selector for a single ticket. */
export function ComplaintWorkflowCard({ complaint }: ComplaintWorkflowCardProps) {
  const me = useAuthStore((s) => s.admin);
  const admins = useAdmins();
  const statusMutation = useUpdateComplaint(complaint.id);
  const assignMutation = useUpdateComplaint(complaint.id);
  const [pendingTarget, setPendingTarget] = useState<ComplaintStatus | null>(null);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  const next = TRANSITIONS[complaint.status];
  const currentStep = LIFECYCLE.indexOf(complaint.status);
  const activeAdmins = (admins.data ?? []).filter((a) => a.status === "active" || a.id === complaint.assignedAdminId);
  const assigneeItems: Record<string, string> = {
    [UNASSIGNED]: "غير معين",
    ...Object.fromEntries(activeAdmins.map((a) => [a.id, a.name])),
  };
  const canAssignMe = Boolean(me && me.id !== complaint.assignedAdminId);

  const move = (status: ComplaintStatus) => {
    if (status === "resolved") return setResolveOpen(true);
    if (status === "closed") return setCloseOpen(true);
    setPendingTarget(status);
    statusMutation.mutate({ status }, { onSettled: () => setPendingTarget(null) });
  };

  const assign = (adminId: string | null) => assignMutation.mutate({ assignedAdminId: adminId });

  return (
    <>
      <SectionCard title="سير المعالجة" description="انقل الشكوى بين المراحل — كل تغيير يُسجل ويُبلَّغ به العميل" icon={<Workflow />}>
        <div className="space-y-4">
          <ol className="flex items-center gap-1" aria-label="مراحل الشكوى">
            {LIFECYCLE.map((s, i) => (
              <li key={s} className="flex-1" title={COMPLAINT_STATUS[s].label}>
                <span
                  className={cn("block h-1.5 rounded-full", i <= currentStep ? "bg-primary" : "bg-muted")}
                  style={i === currentStep ? { backgroundColor: COMPLAINT_STATUS[s].tone } : undefined}
                  aria-current={i === currentStep ? "step" : undefined}
                />
                <span className="sr-only">{COMPLAINT_STATUS[s].label}</span>
              </li>
            ))}
          </ol>

          <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2.5">
            <span className="text-xs text-muted-foreground">الحالة الحالية</span>
            <StatusBadge meta={COMPLAINT_STATUS[complaint.status]} />
          </div>

          {next.length ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">الانتقالات المتاحة</p>
              <div className="grid gap-2">
                {next.map((s) => {
                  const { label, icon: Icon } = ACTION[s];
                  const primary = s === "resolved";
                  const loading = statusMutation.isPending && pendingTarget === s;
                  return (
                    <Button
                      key={s}
                      variant={primary ? "default" : "outline"}
                      size="lg"
                      className="justify-start"
                      disabled={statusMutation.isPending && !loading}
                      loading={loading}
                      onClick={() => move(s)}
                    >
                      {!loading ? <Icon /> : null}
                      {label}
                    </Button>
                  );
                })}
              </div>
              {!complaint.assignedAdminId ? (
                <p className="text-[11px] leading-relaxed text-muted-foreground">سيتم تعيينك تلقائيًا كمسؤول عند نقل الشكوى من حالة «مفتوحة».</p>
              ) : null}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">
              الشكوى مغلقة نهائيًا — لا توجد انتقالات متاحة.
            </p>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="المسؤول عن الشكوى"
        icon={<UserRound />}
        action={
          canAssignMe ? (
            <Button variant="ghost" size="sm" onClick={() => me && assign(me.id)} disabled={assignMutation.isPending}>
              <UserCheck />
              تعيين لي
            </Button>
          ) : null
        }
      >
        {admins.isLoading ? (
          <Skeleton className="h-9 rounded-lg" />
        ) : (
          <Select
            value={complaint.assignedAdminId ?? UNASSIGNED}
            onValueChange={(v) => {
              const value = String(v ?? UNASSIGNED);
              const target = value === UNASSIGNED ? null : value;
              if (target !== complaint.assignedAdminId) assign(target);
            }}
            items={assigneeItems}
            disabled={assignMutation.isPending}
          >
            <SelectTrigger aria-label="المسؤول عن الشكوى" className="h-9 w-full bg-card data-[size=default]:h-9">
              {complaint.assignedAdminId ? (
                <UserAvatar name={assigneeItems[complaint.assignedAdminId]} size="xs" className="size-5 text-[9px]" />
              ) : (
                <UserRound className="text-muted-foreground" />
              )}
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(assigneeItems).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {admins.error ? <p className="mt-2 text-xs text-destructive">تعذر تحميل قائمة المسؤولين.</p> : null}
      </SectionCard>

      <ReasonDialog
        open={resolveOpen}
        onOpenChange={setResolveOpen}
        title="حل الشكوى"
        description="اكتب قرار الحل بوضوح: يظهر للعميل على حجزه ويُرسل له إشعار، ويُسجل في سجل التدقيق."
        textLabel="قرار الحل"
        textPlaceholder="مثال: تم الاتفاق مع الفرع على إعادة الغسيل مجانًا وتعويض العميل بخصم ٢٠٪ على الحجز القادم."
        minLength={5}
        confirmLabel="تأكيد الحل"
        isPending={statusMutation.isPending}
        onConfirm={({ text }) =>
          statusMutation.mutate({ status: "resolved", resolution: text }, { onSuccess: () => setResolveOpen(false) })
        }
      />

      <ReasonDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        title="إغلاق الشكوى نهائيًا"
        description="الإغلاق نهائي: لا يمكن إعادة فتح الشكوى بعده. يمكنك إضافة ملاحظة داخلية ختامية."
        textLabel="ملاحظة ختامية (داخلية)"
        textPlaceholder="مثال: أكد العميل رضاه عن الحل."
        textRequired={false}
        confirmLabel="إغلاق الشكوى"
        isPending={statusMutation.isPending}
        onConfirm={({ text }) =>
          statusMutation.mutate({ status: "closed", ...(text ? { note: text } : {}) }, { onSuccess: () => setCloseOpen(false) })
        }
      />
    </>
  );
}
