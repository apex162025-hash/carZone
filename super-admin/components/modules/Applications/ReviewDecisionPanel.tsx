"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { CheckCircle2, FilePen, Gavel, ListChecks, XCircle } from "lucide-react";

import { REVIEW_CHECKLIST, type ChecklistKey } from "@/components/modules/Applications/review-utils";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useApproveApplication, useRejectApplication, useRequestApplicationChanges } from "@/hooks/use-applications";
import { APPLICATION_STATUS } from "@/lib/constants/labels";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WashApplication } from "@/types/applications";

type ReviewDecisionPanelProps = {
  application: WashApplication;
  className?: string;
};

/**
 * AD-15/16/17 decision panel: a 6-item verification checklist gates approval;
 * reject / request changes always go through a reason dialog (audited, shown to the owner).
 */
export function ReviewDecisionPanel({ application, className }: ReviewDecisionPanelProps) {
  const router = useRouter();
  const notesId = useId();
  const [checked, setChecked] = useState<Set<ChecklistKey>>(() => new Set());
  const [notes, setNotes] = useState("");
  const [activateNow, setActivateNow] = useState(true);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);

  const approve = useApproveApplication(application.id, (businessId) => router.push(`/washes/${businessId}`));
  const reject = useRejectApplication(application.id);
  const requestChanges = useRequestApplicationChanges(application.id);

  const decided = application.status === "approved" || application.status === "rejected";
  const total = REVIEW_CHECKLIST.length;
  const done = checked.size;
  const complete = done === total;
  const busy = approve.isPending || reject.isPending || requestChanges.isPending;

  const toggle = (key: ChecklistKey, on: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  if (decided) {
    const approved = application.status === "approved";
    return (
      <SectionCard
        title="قرار المراجعة"
        icon={<Gavel />}
        className={className}
        action={<StatusBadge meta={APPLICATION_STATUS[application.status]} size="sm" />}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
            {approved ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" /> : <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />}
            <div className="space-y-1 text-xs">
              <p className="text-sm font-semibold">{approved ? "تم اعتماد المغسلة" : "تم رفض الطلب"}</p>
              {application.reviewedAt ? <p className="num text-muted-foreground">{formatDateTime(application.reviewedAt)}</p> : null}
              <p className="leading-relaxed text-muted-foreground">
                {approved ? "تم إنشاء المغسلة وفرعها وخدماتها وحساب المالك." : "تم إبلاغ المالك بسبب الرفض. لا توجد إجراءات إضافية على هذا الطلب."}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {approved ? (
              <Button size="lg" render={<Link href={application.businessId ? `/washes/${application.businessId}` : `/washes?search=${encodeURIComponent(application.businessName)}`} />}>
                عرض المغسلة
              </Button>
            ) : null}
            <Button variant="outline" size="lg" render={<Link href="/applications" />}>
              العودة لقائمة الطلبات
            </Button>
          </div>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="قرار المراجعة"
      description="راجع كل بند قبل الموافقة — القرار يُسجل في سجل التدقيق"
      icon={<Gavel />}
      className={className}
      contentClassName="space-y-5"
    >
      <fieldset className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <legend className="flex items-center gap-1.5 text-xs font-semibold">
            <ListChecks className="size-3.5 text-muted-foreground" />
            قائمة التحقق
          </legend>
          <span className={cn("num text-xs font-semibold", complete ? "text-success" : "text-muted-foreground")}>
            {done}/{total}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className={cn("h-full rounded-full transition-[width] duration-300 ease-fluid", complete ? "bg-success" : "bg-primary")}
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
        <ul className="space-y-1 pt-1">
          {REVIEW_CHECKLIST.map((item) => {
            const on = checked.has(item.key);
            return (
              <li key={item.key}>
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-muted/60",
                    on && "bg-success/5",
                  )}
                >
                  <Checkbox checked={on} onCheckedChange={(v) => toggle(item.key, Boolean(v))} disabled={busy} className="mt-0.5" />
                  <span className="min-w-0 text-xs">
                    <span className={cn("block font-medium text-foreground", on && "text-success")}>{item.label}</span>
                    <span className="text-muted-foreground">{item.hint}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor={notesId} className="text-xs font-semibold">
          ملاحظات داخلية <span className="font-normal text-muted-foreground">(اختياري — تُحفظ مع قرار الموافقة)</span>
        </label>
        <Textarea
          id={notesId}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          disabled={busy}
          placeholder="مثال: تم التواصل مع المالك هاتفيًا للتأكد من العنوان"
          className="min-h-20 resize-none text-sm"
        />
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
        <span className="text-xs">
          <span className="block font-semibold">تفعيل فورًا</span>
          <span className="text-muted-foreground">
            {activateNow ? "تظهر المغسلة للعملاء وتستقبل الحجوزات فور الموافقة." : "تبقى «معتمدة – قيد الإعداد» حتى يُكمل المالك الإعداد."}
          </span>
        </span>
        <Switch checked={activateNow} onCheckedChange={setActivateNow} disabled={busy} aria-label="تفعيل المغسلة فورًا بعد الموافقة" />
      </label>

      <div className="space-y-2 border-t border-border/60 pt-4">
        <Button
          size="lg"
          className="w-full"
          disabled={!complete || reject.isPending || requestChanges.isPending}
          loading={approve.isPending}
          onClick={() =>
            approve.mutate({
              activateImmediately: activateNow,
              note: notes.trim(),
              checklist: REVIEW_CHECKLIST.filter((c) => checked.has(c.key)).map((c) => c.key),
            })
          }
        >
          {!approve.isPending ? <CheckCircle2 /> : null}
          الموافقة على الطلب
        </Button>
        {!complete ? (
          <p className="text-center text-[11px] text-muted-foreground">
            أكمل قائمة التحقق (<span className="num">{total - done}</span> متبقية) لتفعيل زر الموافقة
          </p>
        ) : null}
        <div className={cn("grid gap-2", application.status === "pending" ? "grid-cols-2" : "grid-cols-1")}>
          {application.status === "pending" ? (
            <Button variant="outline" size="lg" disabled={busy} onClick={() => setChangesOpen(true)}>
              <FilePen />
              طلب تعديلات
            </Button>
          ) : null}
          <Button variant="destructive" size="lg" disabled={busy} onClick={() => setRejectOpen(true)}>
            <XCircle />
            رفض الطلب
          </Button>
        </div>
      </div>

      <ReasonDialog
        open={changesOpen}
        onOpenChange={setChangesOpen}
        title={`طلب تعديلات من ${application.businessName}`}
        description="يتحول الطلب إلى «مطلوب تعديلات» ويصل للمالك ما يجب تعديله قبل إعادة المراجعة."
        textLabel="المطلوب تعديله (يُرسل للمالك ويُسجل)"
        textPlaceholder="مثال: يرجى رفع صورة البطاقة الضريبية وتحديد الموقع بدقة على الخريطة"
        confirmLabel="إرسال طلب التعديل"
        isPending={requestChanges.isPending}
        onConfirm={({ text }) => requestChanges.mutate({ note: text }, { onSuccess: () => setChangesOpen(false) })}
      />
      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={`رفض طلب ${application.businessName}`}
        description="الرفض نهائي لهذا الطلب: سيظهر السبب للمالك ولن تُنشأ المغسلة. يمكن للمالك التقديم بطلب جديد لاحقًا."
        textLabel="سبب الرفض (يظهر للمالك ويُسجل)"
        textPlaceholder="اكتب سببًا واضحًا يساعد المالك على فهم القرار"
        confirmLabel="تأكيد الرفض"
        variant="destructive"
        isPending={reject.isPending}
        onConfirm={({ text }) => reject.mutate({ reason: text }, { onSuccess: () => setRejectOpen(false) })}
      />
    </SectionCard>
  );
}
