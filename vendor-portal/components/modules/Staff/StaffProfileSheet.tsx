"use client";

import { useState } from "react";
import { BadgePercent, CalendarClock, Check, Info, Minus, PencilLine, Phone, Power, ShieldCheck, Star, TrendingUp } from "lucide-react";

import { InfoList } from "@carzen/ui/components/shared/info-list";
import { ReasonDialog } from "@carzen/ui/components/shared/reason-dialog";
import { StatusBadge } from "@carzen/ui/components/shared/status-badge";
import { UserAvatar } from "@carzen/ui/components/shared/user-avatar";
import { Button } from "@carzen/ui/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@carzen/ui/components/ui/sheet";
import { STAFF_ROLE, STAFF_STATUS, WEEK_DAYS } from "@carzen/ui/lib/constants/labels";
import { formatDate, formatMoney, formatNumber } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import { PatternEditorDialog } from "@/components/modules/Staff/ScheduleSheet";
import { StaffFormDialog } from "@/components/modules/Staff/StaffFormDialog";
import { DurationVsExpected } from "@/components/modules/Staff/StaffBits";
import {
  PERIODS,
  PERMISSIONS,
  canEditMember,
  canEditSchedule,
  formatClock,
  shiftsOnDay,
  toggleBlockedReason,
  weeklyHours,
  type StaffPeriod,
} from "@/components/modules/Staff/staff-constants";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useToggleStaff } from "@/hooks/use-team";
import type { VendorStaffMember } from "@carzen/contracts/vendor/team";

const DEACTIVATE_REASONS = [
  { value: "انتهاء التعاقد", label: "انتهاء التعاقد" },
  { value: "غياب متكرر", label: "غياب متكرر" },
  { value: "مخالفة تشغيلية", label: "مخالفة تشغيلية" },
  { value: "إجازة طويلة", label: "إجازة طويلة" },
];

function Block({ icon, title, action, children }: { icon: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold [&_svg]:size-4 [&_svg]:text-muted-foreground">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <div className="num mt-1 text-base font-bold">{children}</div>
    </div>
  );
}

type Dialog = "edit" | "toggle" | "schedule" | null;

/** Employee profile (D10 / OW-11): details, permissions, weekly shifts, performance + owner/manager actions. */
export function StaffProfileSheet({ member, period, onClose }: { member: VendorStaffMember | null; period: StaffPeriod; onClose: () => void }) {
  return (
    <Sheet open={Boolean(member)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="left" className="gap-0 p-0 data-[side=left]:w-full data-[side=left]:sm:max-w-lg">
        {member ? <ProfileBody member={member} period={period} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function ProfileBody({ member, period }: { member: VendorStaffMember; period: StaffPeriod }) {
  const { account } = useBranchScope();
  const [dialog, setDialog] = useState<Dialog>(null);
  const toggle = useToggleStaff(() => setDialog(null));

  const perf = member.performance;
  const editable = canEditMember(account, member);
  const toggleBlocked = toggleBlockedReason(account, member);
  const scheduleEditable = canEditSchedule(account, member);
  const active = member.status === "active";
  const isOwnerViewer = account?.role === "owner";

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-b px-5 py-5">
        <div className="flex items-start gap-3 pe-8">
          <span className="relative">
            <UserAvatar name={member.name} size="lg" />
            {member.onShiftNow ? <span className="absolute -end-0.5 -bottom-0.5 size-3.5 rounded-full border-2 border-popover bg-success" aria-hidden /> : null}
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <SheetTitle className="text-lg font-bold">{member.name}</SheetTitle>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge meta={STAFF_ROLE[member.role]} size="sm" />
              <StatusBadge meta={STAFF_STATUS[member.status]} size="sm" />
              {member.onShiftNow ? <StatusBadge label="في الوردية الآن" tone="var(--success)" size="sm" live /> : null}
            </div>
            <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
              <a href={`tel:${member.phone.replace(/\s/g, "")}`} className="num inline-flex items-center gap-1 hover:text-foreground" dir="ltr">
                <Phone className="size-3" /> {member.phone}
              </a>
              <span>{member.branchName.ar}</span>
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        {!active ? (
          <p className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
            <Power className="mt-0.5 size-3.5 shrink-0" /> الحساب موقوف — لا يستطيع تسجيل الدخول لتطبيق الموظفين ولا يظهر في قوائم التعيين.
          </p>
        ) : null}

        <Block icon={<TrendingUp />} title={`الأداء — ${PERIODS.find((p) => p.value === period)?.label}`}>
          <div className="grid grid-cols-2 gap-2">
            <Metric label="طلبات مكتملة">{formatNumber(perf.completed)}</Metric>
            <Metric label="قيمة الخدمات">{formatMoney(perf.serviceValue)}</Metric>
            <Metric label="متوسط مدة الخدمة">
              <DurationVsExpected avg={perf.avgDurationMin} expected={perf.expectedDurationMin} align="start" />
            </Metric>
            <Metric label="تقييم العملاء">
              {perf.rating !== null ? (
                <span className="inline-flex items-center gap-1">
                  <Star className="size-4 fill-warning text-warning" aria-hidden />
                  {formatNumber(perf.rating, true)}
                </span>
              ) : (
                <span className="text-sm font-normal text-muted-foreground">لا تقييمات</span>
              )}
            </Metric>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <BadgePercent className="size-3.5" /> الخصومات الممنوحة
            </span>
            <span className="num font-semibold">
              {perf.discountsCount ? `${formatNumber(perf.discountsCount)} خصم · ${formatMoney(perf.discountsAmount)}` : "لا يوجد"}
            </span>
          </div>
        </Block>

        <Block icon={<Info />} title="البيانات">
          <InfoList
            items={[
              { label: "الفرع", value: member.branchName.ar },
              { label: "تاريخ الانضمام", value: <span className="num">{formatDate(member.joinedAt, { withYear: true })}</span> },
              { label: "حد الخصم", value: <span className="num">{member.maxDiscountPct}٪</span> },
              { label: "ساعات أسبوعية", value: <span className="num">{formatNumber(weeklyHours(member.scheduledShifts), true)} ساعة</span> },
            ]}
          />
        </Block>

        <Block icon={<ShieldCheck />} title="الصلاحيات">
          {member.role === "owner" ? (
            <p className="rounded-xl bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">المالك يملك كل الصلاحيات على كل الفروع.</p>
          ) : (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {PERMISSIONS.map((p) => {
                const on = member.permissions[p.key];
                return (
                  <li key={p.key} className={cn("flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs", on ? "bg-success/8" : "bg-muted/40 text-muted-foreground")}>
                    {on ? <Check className="size-3.5 shrink-0 text-success" aria-label="مسموح" /> : <Minus className="size-3.5 shrink-0" aria-label="غير مسموح" />}
                    {p.label}
                  </li>
                );
              })}
            </ul>
          )}
        </Block>

        <Block
          icon={<CalendarClock />}
          title="الورديات الأسبوعية"
          action={
            scheduleEditable ? (
              <Button variant="ghost" size="sm" onClick={() => setDialog("schedule")}>
                <PencilLine /> تعديل
              </Button>
            ) : null
          }
        >
          <ul className="divide-y divide-border/60 rounded-xl border border-border/70">
            {WEEK_DAYS.map((day, i) => {
              const shifts = shiftsOnDay(member.scheduledShifts, i);
              return (
                <li key={day} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                  <span className="font-medium">{day}</span>
                  {shifts.length ? (
                    <span className="num flex flex-wrap justify-end gap-1">
                      {shifts.map((s) => (
                        <span key={`${s.start}-${s.end}`} className="rounded-md bg-secondary px-1.5 py-0.5 text-secondary-foreground">
                          {formatClock(s.start)} – {formatClock(s.end)}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">راحة</span>
                  )}
                </li>
              );
            })}
          </ul>
        </Block>

        {!isOwnerViewer && member.role !== "owner" ? (
          <p className="flex items-start gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            يمكنك تفعيل وإيقاف موظفي فرعك وتعديل وردياتهم. تغيير الدور والفرع وحد الخصم والصلاحيات للمالك فقط.
          </p>
        ) : null}
      </div>

      {member.role !== "owner" && (editable || !toggleBlocked) ? (
        <div className="flex flex-wrap gap-2 border-t bg-card px-5 py-4">
          {editable ? (
            <Button variant="outline" size="lg" className="flex-1" onClick={() => setDialog("edit")}>
              <PencilLine /> تعديل
            </Button>
          ) : null}
          {!toggleBlocked ? (
            <Button
              size="lg"
              variant={active ? "destructive" : "default"}
              className={cn("flex-1", !active && "bg-success text-white hover:bg-success/90")}
              onClick={() => setDialog("toggle")}
            >
              <Power /> {active ? "إيقاف الحساب" : "تفعيل الحساب"}
            </Button>
          ) : null}
        </div>
      ) : member.role !== "owner" && toggleBlocked && account?.permissions.manageStaff ? (
        <p className="border-t bg-card px-5 py-3 text-center text-xs text-muted-foreground">{toggleBlocked}</p>
      ) : null}

      {dialog === "edit" ? <StaffFormDialog mode="edit" member={member} open onOpenChange={(o) => !o && setDialog(null)} /> : null}
      {dialog === "schedule" ? <PatternEditorDialog member={member} open onOpenChange={(o) => !o && setDialog(null)} /> : null}
      <ReasonDialog
        open={dialog === "toggle"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={active ? `إيقاف حساب ${member.name}` : `تفعيل حساب ${member.name}`}
        description={
          active
            ? "سيتم تسجيل خروجه فورًا ولن يستطيع الدخول لتطبيق الموظفين حتى إعادة التفعيل. يُسجل السبب في سجل التدقيق."
            : "سيستطيع تسجيل الدخول واستلام الطلبات من جديد. يُسجل السبب في سجل التدقيق."
        }
        presets={active ? DEACTIVATE_REASONS : undefined}
        textRequired={!active}
        minLength={3}
        textLabel={active ? "تفاصيل إضافية" : "سبب التفعيل"}
        confirmLabel={active ? "إيقاف الحساب" : "تفعيل الحساب"}
        variant={active ? "destructive" : "default"}
        isPending={toggle.isPending}
        onConfirm={({ preset, text }) => toggle.mutate({ id: member.id, active: !active, reason: [preset, text].filter(Boolean).join(" — ") })}
      />
    </div>
  );
}
