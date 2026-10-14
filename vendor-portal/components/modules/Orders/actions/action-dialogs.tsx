"use client";

import { useMemo, useState } from "react";
import { Banknote, Check, CreditCard, Info } from "lucide-react";

import { UserAvatar } from "@carzen/ui/components/shared/user-avatar";
import { Button } from "@carzen/ui/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@carzen/ui/components/ui/dialog";
import { Skeleton } from "@carzen/ui/components/ui/skeleton";
import { Textarea } from "@carzen/ui/components/ui/textarea";
import { formatDuration, formatMoney } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import { useServices } from "@/hooks/use-catalog";
import { useStaff } from "@/hooks/use-team";
import type { OrderActionPayload } from "@carzen/contracts/vendor/operations";

export type ActionTarget = {
  id: string;
  number: string;
  plate: string;
  branchId: string;
  total: number;
  subtotal: number;
  assignedStaffId: string | null;
  items: { serviceId: string }[];
};

type BaseProps = {
  order: ActionTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onSubmit: (payload: Omit<OrderActionPayload, "action">) => void;
};

function Shell({ title, description, children, footer, open, onOpenChange, isPending, wide }: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  isPending: boolean;
  wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
      <DialogContent className={cn("gap-5", wide ? "sm:max-w-lg" : "sm:max-w-md")}>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        <DialogFooter className="-mx-4 -mb-4">{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Staff picker (start service / assign) ──────────────────

function StaffPicker({ branchId, value, onChange }: { branchId: string; value: string | null; onChange: (id: string) => void }) {
  const { data, isLoading } = useStaff({ branchId, role: "all", period: "today" });
  const staff = (data?.items ?? []).filter((s) => s.role !== "owner" && s.status === "active").sort((a, b) => Number(b.onShiftNow) - Number(a.onShiftNow));
  if (isLoading) return <Skeleton className="h-32 rounded-xl" />;
  return (
    <div role="radiogroup" aria-label="الموظف" className="grid max-h-72 gap-2 overflow-y-auto">
      {staff.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={value === s.id}
          onClick={() => onChange(s.id)}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-start transition-colors",
            value === s.id ? "border-primary bg-secondary" : "border-border hover:bg-muted/60",
          )}
        >
          <UserAvatar name={s.name} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{s.name}</span>
            <span className="block text-[11px] text-muted-foreground">
              {s.onShiftNow ? "في الوردية الآن" : "خارج الوردية"} · <span className="num">{s.performance.completed}</span> مكتمل اليوم
            </span>
          </span>
          {s.onShiftNow ? <span className="size-2 rounded-full bg-success" aria-hidden /> : null}
          {value === s.id ? <Check className="size-4 text-primary" /> : null}
        </button>
      ))}
      {!staff.length ? <p className="py-6 text-center text-xs text-muted-foreground">لا يوجد موظفون نشطون في هذا الفرع</p> : null}
    </div>
  );
}

export function StaffDialog({ mode, order, open, onOpenChange, isPending, onSubmit }: BaseProps & { mode: "start" | "assign" }) {
  const [staffId, setStaffId] = useState<string | null>(order.assignedStaffId);
  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      isPending={isPending}
      title={mode === "start" ? `بدء الخدمة — ${order.plate || order.number}` : `تعيين موظف — ${order.number}`}
      description={mode === "start" ? "اختر الموظف المسؤول. يبدأ احتساب وقت الخدمة الآن ويُشغل مكانًا في الفرع." : "سيظهر الطلب في قائمة الموظف المختار."}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            إلغاء
          </Button>
          <Button disabled={!staffId} loading={isPending} onClick={() => staffId && onSubmit({ staffId })}>
            {mode === "start" ? "بدء الخدمة" : "تعيين"}
          </Button>
        </>
      }
    >
      <StaffPicker branchId={order.branchId} value={staffId} onChange={setStaffId} />
    </Shell>
  );
}

// ── Collect payment (EM-24) ─────────────────────────────────

export function PaymentDialog({ order, open, onOpenChange, isPending, onSubmit }: BaseProps) {
  const [method, setMethod] = useState<"cash" | "card">("cash");
  const [received, setReceived] = useState(String(order.total));
  const amount = Number(received) || 0;
  const change = method === "cash" ? amount - order.total : 0;
  const quick = useMemo(() => {
    const t = order.total;
    return [...new Set([t, Math.ceil(t / 50) * 50, Math.ceil(t / 100) * 100, Math.ceil(t / 100) * 100 + 100, 500])].filter((v) => v >= t).slice(0, 4);
  }, [order.total]);
  const invalid = method === "cash" && amount < order.total;

  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      isPending={isPending}
      title={`تحصيل الدفع — ${order.number}`}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            إلغاء
          </Button>
          <Button
            disabled={invalid}
            loading={isPending}
            className="bg-success text-white hover:bg-success/90"
            onClick={() => onSubmit({ method, amountReceived: method === "cash" ? amount : order.total })}
          >
            تأكيد الدفع
          </Button>
        </>
      }
    >
      <div className="rounded-xl bg-muted/60 py-4 text-center">
        <p className="text-xs text-muted-foreground">الإجمالي المستحق</p>
        <p className="num mt-1 text-3xl font-bold">{formatMoney(order.total)}</p>
      </div>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="طريقة الدفع">
        {([
          ["cash", "نقدي", Banknote],
          ["card", "بطاقة (POS)", CreditCard],
        ] as const).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={method === value}
            onClick={() => setMethod(value)}
            className={cn(
              "flex h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border text-sm font-medium transition-colors",
              method === value ? "border-primary bg-secondary text-secondary-foreground" : "border-border hover:bg-muted/60",
            )}
          >
            <Icon className="size-5" />
            {label}
          </button>
        ))}
      </div>
      {method === "cash" ? (
        <div className="space-y-2">
          <label htmlFor="received" className="text-xs font-medium">
            المبلغ المستلم
          </label>
          <input
            id="received"
            inputMode="numeric"
            value={received}
            onChange={(e) => setReceived(e.target.value.replace(/[^\d]/g, ""))}
            className="num h-11 w-full rounded-xl border border-input bg-card px-3 text-center text-lg font-semibold outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
          />
          <div className="flex flex-wrap gap-1.5">
            {quick.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setReceived(String(v))}
                className="num cursor-pointer rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted"
              >
                {v}
              </button>
            ))}
          </div>
          <div className={cn("flex items-center justify-between rounded-xl px-3 py-2.5 text-sm", invalid ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success")}>
            <span>{invalid ? "المبلغ أقل من الإجمالي" : "الباقي للعميل"}</span>
            <span className="num font-bold">{invalid ? formatMoney(order.total - amount) : formatMoney(change)}</span>
          </div>
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
          <Info className="size-4 shrink-0" /> مرّر البطاقة على جهاز الـ POS ثم أكّد هنا.
        </p>
      )}
    </Shell>
  );
}

// ── Discount within limit (EM-20 / MG-06) ───────────────────

const DISCOUNT_REASONS = ["عميل دائم", "تأخير في الخدمة", "تعويض عن ملاحظة", "عرض افتتاح"];

export function DiscountDialog({ order, open, onOpenChange, isPending, onSubmit, maxPct }: BaseProps & { maxPct: number }) {
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("10");
  const [reason, setReason] = useState("");
  const v = Number(value) || 0;
  const pct = type === "percent" ? v : order.subtotal ? (v / order.subtotal) * 100 : 0;
  const amount = type === "percent" ? Math.round((order.subtotal * v) / 100) : v;
  const overLimit = pct > maxPct;
  const invalid = v <= 0 || reason.trim().length < 3 || overLimit;

  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      isPending={isPending}
      title={`خصم على ${order.number}`}
      description={`حد الخصم المسموح لك ${maxPct}٪ — يُسجل الخصم باسمك وسببه في سجل التدقيق.`}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            إلغاء
          </Button>
          <Button disabled={invalid} loading={isPending} onClick={() => onSubmit({ discountType: type, discountValue: v, reason: reason.trim() })}>
            تطبيق الخصم
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {([
          ["percent", "نسبة ٪"],
          ["fixed", "مبلغ ثابت"],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setType(k)}
            aria-pressed={type === k}
            className={cn("h-8 cursor-pointer rounded-md text-sm font-medium transition-colors", type === k ? "bg-card shadow-sm" : "text-muted-foreground")}
          >
            {label}
          </button>
        ))}
      </div>
      <input
        aria-label="قيمة الخصم"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
        className="num h-11 w-full rounded-xl border border-input bg-card px-3 text-center text-lg font-semibold outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
      />
      <div className={cn("flex items-center justify-between rounded-xl px-3 py-2.5 text-sm", overLimit ? "bg-destructive/10 text-destructive" : "bg-muted/60")}>
        <span>{overLimit ? `يتجاوز حدك (${Math.round(pct)}٪ > ${maxPct}٪)` : "الإجمالي بعد الخصم"}</span>
        {!overLimit ? <span className="num font-bold">{formatMoney(Math.max(0, order.subtotal - amount))}</span> : null}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium">السبب</p>
        <div className="flex flex-wrap gap-1.5">
          {DISCOUNT_REASONS.map((r) => (
            <button key={r} type="button" onClick={() => setReason(r)} className={cn("cursor-pointer rounded-lg border px-2.5 py-1 text-xs", reason === r ? "border-primary bg-secondary" : "border-border hover:bg-muted")}>
              {r}
            </button>
          ))}
        </div>
        <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="أو اكتب السبب…" className="resize-none" />
      </div>
    </Shell>
  );
}

// ── Add an approved extra service (EM-19) ───────────────────

export function AddServiceDialog({ order, open, onOpenChange, isPending, onSubmit }: BaseProps) {
  const { data, isLoading } = useServices(order.branchId);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const addons = (data?.items ?? []).filter((s) => s.type === "addon" && s.active && !order.items.some((i) => i.serviceId === s.id));
  const chosen = addons.find((a) => a.id === serviceId);

  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      isPending={isPending}
      title={`إضافة خدمة — ${order.number}`}
      description="فقط الإضافات المفعّلة في الفرع. السعر من قائمة الخدمات ولا يُكتب يدويًا."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            إلغاء
          </Button>
          <Button disabled={!serviceId} loading={isPending} onClick={() => serviceId && onSubmit({ serviceId })}>
            {chosen ? `إضافة (${formatMoney(order.total + chosen.price)})` : "إضافة"}
          </Button>
        </>
      }
    >
      {isLoading ? (
        <Skeleton className="h-28 rounded-xl" />
      ) : addons.length ? (
        <div role="radiogroup" className="grid gap-2">
          {addons.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={serviceId === a.id}
              onClick={() => setServiceId(a.id)}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-xl border px-3 py-3 text-start transition-colors",
                serviceId === a.id ? "border-primary bg-secondary" : "border-border hover:bg-muted/60",
              )}
            >
              <span>
                <span className="block text-sm font-medium">{a.name.ar}</span>
                <span className="num text-[11px] text-muted-foreground">+{formatDuration(a.durationMin)}</span>
              </span>
              <span className="num text-sm font-semibold">+{formatMoney(a.price)}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="py-6 text-center text-xs text-muted-foreground">كل الإضافات المتاحة موجودة على الطلب بالفعل</p>
      )}
    </Shell>
  );
}

// ── Notes (EM-21) ───────────────────────────────────────────

const NOTE_CHIPS = ["خدش في الباب الأيسر", "العميل منتظر", "المفاتيح عند الاستقبال", "طلب عناية بالجنوط"];

export function NoteDialog({ order, open, onOpenChange, isPending, onSubmit }: BaseProps) {
  const [text, setText] = useState("");
  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      isPending={isPending}
      title={`ملاحظة على ${order.number}`}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            إلغاء
          </Button>
          <Button disabled={text.trim().length < 2} loading={isPending} onClick={() => onSubmit({ text: text.trim() })}>
            حفظ الملاحظة
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-1.5">
        {NOTE_CHIPS.map((c) => (
          <button key={c} type="button" onClick={() => setText((t) => (t ? `${t}، ${c}` : c))} className="cursor-pointer rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-muted">
            {c}
          </button>
        ))}
      </div>
      <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب الملاحظة…" className="resize-none" aria-label="الملاحظة" />
    </Shell>
  );
}
