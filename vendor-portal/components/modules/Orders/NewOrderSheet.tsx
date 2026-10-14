"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CalendarClock, Car, Check, Footprints, History, Loader2, Phone, Sparkles, UserRound } from "lucide-react";

import { Button } from "@carzen/ui/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@carzen/ui/components/ui/sheet";
import { Skeleton } from "@carzen/ui/components/ui/skeleton";
import { Textarea } from "@carzen/ui/components/ui/textarea";
import { useDebouncedValue } from "@carzen/ui/hooks/use-debounced-value";
import { formatDate, formatDuration, formatMoney, formatRelative, formatTime, serverNow } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useServices } from "@/hooks/use-catalog";
import { useAvailability, useCreateOrder, usePricePreview, useRecognition } from "@/hooks/use-operations";
import { useUIStore, type NewOrderPrefill } from "@/lib/store/ui-store";

type Mode = "walk_in" | "phone";

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Global "new order" sheet — walk-in (EM-10) or phone booking (EM-27), with recognition (EM-11). */
export function NewOrderSheet() {
  const open = useUIStore((s) => s.newOrderOpen);
  const setOpen = useUIStore((s) => s.setNewOrderOpen);
  const prefill = useUIStore((s) => s.newOrderPrefill);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-full gap-0 p-0 sm:max-w-xl">
        {/* Body unmounts on close → the form starts clean every time. */}
        {open ? <NewOrderForm prefill={prefill} onDone={() => setOpen(false)} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function NewOrderForm({ prefill, onDone }: { prefill: NewOrderPrefill | null; onDone: () => void }) {
  const router = useRouter();
  const { branches, singleBranchId, isLocked } = useBranchScope();
  const [mode, setMode] = useState<Mode>("walk_in");
  const [branchId, setBranchId] = useState(singleBranchId);
  const [plate, setPlate] = useState(prefill?.plate ?? "");
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  const [name, setName] = useState(prefill?.name ?? "");
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [day, setDay] = useState(() => toDateKey(serverNow()));
  const [slot, setSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [usedRecognition, setUsedRecognition] = useState(false);

  const services = useServices(branchId);
  const primaries = (services.data?.items ?? []).filter((s) => s.type === "primary" && s.active);
  const addons = (services.data?.items ?? []).filter((s) => s.type === "addon" && s.active);
  const serviceIds = useMemo(() => (primaryId ? [primaryId, ...addonIds] : []), [primaryId, addonIds]);

  const dPlate = useDebouncedValue(plate, 350);
  const dPhone = useDebouncedValue(phone, 350);
  const recognition = useRecognition(dPlate, dPhone);
  const rec = recognition.data?.customer ? recognition.data : null;

  const price = usePricePreview(branchId, serviceIds);
  const slots = useAvailability(branchId, day, serviceIds, mode === "phone");
  const create = useCreateOrder((id) => {
    onDone();
    router.push(`/orders/${id}`);
  });

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = serverNow();
    d.setDate(d.getDate() + i);
    return d;
  });

  const plateOk = plate.replace(/[\s-]/g, "").length >= 3;
  const phoneDigits = phone.replace(/\D/g, "");
  const phoneOk = phoneDigits.length >= 10;
  const canSubmit = plateOk && Boolean(primaryId) && (mode === "walk_in" || (phoneOk && Boolean(slot)));

  const applyRecognition = () => {
    if (!rec?.customer) return;
    setPhone(rec.customer.phone);
    setName(rec.customer.name);
    if (rec.vehicle && !plateOk) setPlate(rec.vehicle.plate);
    if (rec.usualServiceId && primaries.some((p) => p.id === rec.usualServiceId)) setPrimaryId(rec.usualServiceId);
    setUsedRecognition(true);
  };

  const submit = () =>
    create.mutate({
      branchId,
      source: mode,
      plate,
      customerPhone: phone || undefined,
      customerName: name || undefined,
      serviceIds,
      scheduledAt: mode === "phone" ? slot ?? undefined : undefined,
      notes: notes || undefined,
    });

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-b px-5 py-4">
        <SheetTitle className="text-lg font-bold">طلب جديد</SheetTitle>
        <SheetDescription>كل سيارة تدخل الفرع لازم يكون لها طلب — السعر يُحسب تلقائيًا من قائمة الخدمات.</SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="نوع الطلب">
          {([
            ["walk_in", "حضور مباشر", "السيارة في الفرع الآن", Footprints],
            ["phone", "حجز هاتفي", "عميل اتصل لحجز موعد", Phone],
          ] as const).map(([value, label, hint, Icon]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-start transition-colors",
                mode === value ? "border-primary bg-secondary" : "border-border hover:bg-muted/60",
              )}
            >
              <span className={cn("flex size-9 items-center justify-center rounded-lg", mode === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                <Icon className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block text-[11px] text-muted-foreground">{hint}</span>
              </span>
            </button>
          ))}
        </div>

        {!isLocked && branches.length > 1 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium">الفرع</p>
            <div className="flex flex-wrap gap-2">
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setBranchId(b.id);
                    setPrimaryId(null);
                    setAddonIds([]);
                    setSlot(null);
                  }}
                  aria-pressed={branchId === b.id}
                  className={cn("cursor-pointer rounded-lg border px-3 py-1.5 text-sm", branchId === b.id ? "border-primary bg-secondary font-medium" : "border-border hover:bg-muted")}
                >
                  {b.name.ar}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <section className="space-y-3">
          <label htmlFor="plate" className="flex items-center gap-1.5 text-xs font-medium">
            <Car className="size-3.5" /> رقم اللوحة <span className="text-destructive">*</span>
          </label>
          <input
            id="plate"
            autoFocus
            value={plate}
            onChange={(e) => {
              setPlate(e.target.value.toUpperCase());
              setUsedRecognition(false);
            }}
            placeholder="ABC 123"
            dir="ltr"
            className="num h-14 w-full rounded-2xl border-2 border-input bg-card px-4 text-center text-2xl font-bold tracking-[0.2em] uppercase outline-none placeholder:text-muted-foreground/40 focus-visible:border-primary"
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-xs font-medium">
                الموبايل {mode === "phone" ? <span className="text-destructive">*</span> : <span className="text-muted-foreground">(اختياري)</span>}
              </label>
              <input
                id="phone"
                inputMode="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xx xxx xxxx"
                className="num h-10 w-full rounded-lg border border-input bg-card px-3 text-start text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cname" className="text-xs font-medium">
                اسم العميل <span className="text-muted-foreground">(اختياري)</span>
              </label>
              <input
                id="cname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
              />
            </div>
          </div>

          {recognition.isFetching && !rec ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> جاري البحث عن العميل…
            </p>
          ) : null}
          {rec?.customer ? (
            <div className={cn("rounded-2xl border p-4 transition-colors", usedRecognition ? "border-success/40 bg-success/5" : "border-primary/30 bg-secondary/60")}>
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-primary shadow-soft">
                  <UserRound className="size-5" />
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">
                    عميل سابق: {rec.customer.name}
                    {rec.vehicle ? <span className="font-normal text-muted-foreground"> · {rec.vehicle.make} {rec.vehicle.model} · <span className="num">{rec.vehicle.plate}</span></span> : null}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <History className="size-3" /> زيارات سابقة <span className="num font-semibold text-foreground">{rec.visits}</span>
                    </span>
                    {rec.lastVisitAt ? <span>آخر زيارة {formatRelative(rec.lastVisitAt)}</span> : null}
                    {rec.usualServiceName ? <span>المعتاد: {rec.usualServiceName.ar}</span> : null}
                  </p>
                </div>
              </div>
              {!usedRecognition ? (
                <Button size="sm" className="mt-3 w-full" onClick={applyRecognition}>
                  <Check /> استخدم هذا العميل
                </Button>
              ) : (
                <p className="mt-2 text-xs font-medium text-success">✓ تم ملء بيانات العميل واختيار خدمته المعتادة</p>
              )}
            </div>
          ) : null}
        </section>

        <section className="space-y-3">
          <p className="flex items-center gap-1.5 text-xs font-medium">
            <Sparkles className="size-3.5" /> الخدمة <span className="text-destructive">*</span>
          </p>
          {services.isLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="الخدمة الأساسية">
              {primaries.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={primaryId === s.id}
                  onClick={() => setPrimaryId(s.id)}
                  className={cn(
                    "cursor-pointer rounded-xl border p-3 text-start transition-colors",
                    primaryId === s.id ? "border-primary bg-secondary ring-1 ring-primary/30" : "border-border hover:bg-muted/60",
                  )}
                >
                  <span className="block text-sm font-semibold">{s.name.ar}</span>
                  <span className="mt-1 flex items-center justify-between text-xs">
                    <span className="num font-semibold">{formatMoney(s.price)}</span>
                    <span className="num text-muted-foreground">{formatDuration(s.durationMin)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {addons.length ? (
            <div className="flex flex-wrap gap-2">
              {addons.map((a) => {
                const on = addonIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setAddonIds((ids) => (on ? ids.filter((x) => x !== a.id) : [...ids, a.id]))}
                    className={cn("cursor-pointer rounded-lg border px-3 py-1.5 text-xs transition-colors", on ? "border-aqua bg-aqua-soft font-medium" : "border-border hover:bg-muted")}
                  >
                    {a.name.ar} <span className="num">+{a.price}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>

        {mode === "phone" ? (
          <section className="space-y-3">
            <p className="flex items-center gap-1.5 text-xs font-medium">
              <CalendarClock className="size-3.5" /> الموعد <span className="text-destructive">*</span>
            </p>
            <div className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1">
              {days.map((d, i) => {
                const key = toDateKey(d);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setDay(key);
                      setSlot(null);
                    }}
                    aria-pressed={day === key}
                    className={cn("shrink-0 cursor-pointer rounded-lg border px-3 py-1.5 text-xs", day === key ? "border-primary bg-secondary font-semibold" : "border-border hover:bg-muted")}
                  >
                    {i === 0 ? "اليوم" : i === 1 ? "غدًا" : formatDate(d, { withDay: true })}
                  </button>
                );
              })}
            </div>
            {!primaryId ? (
              <p className="rounded-xl bg-muted/60 px-3 py-4 text-center text-xs text-muted-foreground">اختر الخدمة أولًا لعرض المواعيد المتاحة</p>
            ) : slots.isLoading ? (
              <Skeleton className="h-24 rounded-xl" />
            ) : (
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                {(slots.data ?? []).map((s) => {
                  const disabled = s.past || s.blocked || s.free <= 0;
                  return (
                    <button
                      key={s.start}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSlot(s.start)}
                      aria-pressed={slot === s.start}
                      title={s.blocked ? "فترة محجوبة" : s.free <= 0 ? "مكتمل" : `${s.free} أماكن متاحة`}
                      className={cn(
                        "num cursor-pointer rounded-lg border py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-35",
                        slot === s.start ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-border hover:bg-muted",
                        s.blocked && "line-through",
                      )}
                    >
                      {formatTime(s.start)}
                    </button>
                  );
                })}
                {!slots.data?.length ? <p className="col-span-full py-4 text-center text-xs text-muted-foreground">الفرع مغلق في هذا اليوم</p> : null}
              </div>
            )}
          </section>
        ) : null}

        <section className="space-y-1.5">
          <label htmlFor="notes" className="text-xs font-medium">
            ملاحظات <span className="text-muted-foreground">(اختياري)</span>
          </label>
          <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="resize-none" />
        </section>
      </div>

      <div className="border-t bg-card px-5 py-4">
        {price.data && serviceIds.length ? (
          <div className="mb-3 space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>الخدمات · <span className="num">{formatDuration(price.data.durationMin)}</span></span>
              <span className="num">{formatMoney(price.data.subtotal)}</span>
            </div>
            {price.data.offerDiscount ? (
              <div className="flex justify-between text-success">
                <span>{price.data.offerTitle?.ar}</span>
                <span className="num">-{formatMoney(price.data.offerDiscount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-base font-bold">
              <span>الإجمالي</span>
              <span className="num">{formatMoney(price.data.total)}</span>
            </div>
          </div>
        ) : null}
        <Button size="lg" className="h-11 w-full text-sm font-semibold" disabled={!canSubmit} loading={create.isPending} onClick={submit}>
          {mode === "walk_in" ? "إنشاء الطلب" : "تأكيد الحجز"}
        </Button>
      </div>
    </div>
  );
}
