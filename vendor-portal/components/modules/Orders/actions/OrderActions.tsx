"use client";

import { useState } from "react";
import {
  BadgePercent,
  Ban,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Lock,
  LogIn,
  MoreHorizontal,
  PlayCircle,
  PlusCircle,
  StickyNote,
  Undo2,
  UserCheck,
  UserX,
} from "lucide-react";

import { ReasonDialog } from "@carzen/ui/components/shared/reason-dialog";
import { Button } from "@carzen/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@carzen/ui/components/ui/dropdown-menu";
import { ORDER_ACTION } from "@carzen/ui/lib/constants/labels";
import { cn } from "@carzen/ui/lib/utils";
import { AddServiceDialog, DiscountDialog, NoteDialog, PaymentDialog, StaffDialog, type ActionTarget } from "@/components/modules/Orders/actions/action-dialogs";
import { useOrderAction } from "@/hooks/use-operations";
import { useAuthStore } from "@/lib/store/auth-store";
import type { OrderStatus, PaymentStatus } from "@carzen/contracts/orders";
import type { OrderAction, OrderActionPayload, PrimaryAction } from "@carzen/contracts/vendor/operations";

export type ActionableOrder = ActionTarget & {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  nextAction: PrimaryAction | null;
  locked?: boolean;
};

const ICONS: Record<OrderAction, typeof CheckCircle2> = {
  confirm: ClipboardCheck,
  check_in: LogIn,
  start: PlayCircle,
  complete: CheckCircle2,
  collect_payment: CircleDollarSign,
  cancel: Ban,
  no_show: UserX,
  assign: UserCheck,
  add_service: PlusCircle,
  discount: BadgePercent,
  note: StickyNote,
  refund: Undo2,
};

/** Client-side mirror of the server rules — only decides what to *show*; the API is the authority. */
function deriveAllowed(o: ActionableOrder, p: { cancelOrder: boolean; refund: boolean }): OrderAction[] {
  if (o.locked) return ["note"];
  const out: OrderAction[] = [];
  if (o.nextAction) out.push(o.nextAction);
  if (["pending", "confirmed", "waiting", "in_service"].includes(o.status)) out.push("assign", "discount");
  if (o.status === "waiting" || o.status === "in_service") out.push("add_service");
  if (o.status === "completed" && o.paymentStatus === "pending") out.push("discount");
  out.push("note");
  if (o.status === "confirmed") out.push("no_show");
  if (["pending", "confirmed", "waiting"].includes(o.status) && p.cancelOrder) out.push("cancel");
  if (o.status === "completed" && o.paymentStatus === "paid" && p.refund) out.push("refund");
  return out;
}

type OrderActionsProps = {
  order: ActionableOrder;
  /** Server-computed actions (details page). Derived on the client when omitted (lists, board). */
  allowed?: OrderAction[];
  size?: "sm" | "default" | "lg";
  /** Stretch the primary button (board cards). */
  block?: boolean;
  showMenu?: boolean;
  className?: string;
};

type OpenDialog = Exclude<OrderAction, "confirm" | "check_in" | "complete"> | null;

/**
 * One obvious primary action per order (spec EM-06) + a menu for the rest.
 * Every action goes through the same API endpoint and audit trail.
 */
export function OrderActions({ order, allowed, size = "sm", block, showMenu = true, className }: OrderActionsProps) {
  const account = useAuthStore((s) => s.account);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const action = useOrderAction(() => setDialog(null));
  const actions = allowed ?? deriveAllowed(order, account?.permissions ?? { cancelOrder: false, refund: false });
  const primary = order.nextAction && actions.includes(order.nextAction) ? order.nextAction : null;
  const secondary = actions.filter((a) => a !== primary);

  const run = (a: OrderAction, payload: Omit<OrderActionPayload, "action"> = {}) => action.mutate({ id: order.id, action: a, ...payload });
  const trigger = (a: OrderAction) => {
    if (a === "confirm" || a === "check_in" || a === "complete") run(a);
    else setDialog(a);
  };
  const busy = (a: OrderAction) => action.isPending && action.variables?.action === a;
  const common = { order, isPending: action.isPending, onOpenChange: (o: boolean) => !o && setDialog(null), open: true };

  if (order.locked) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3.5" /> مقفل بإغلاق اليوم
      </span>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5", block && "w-full", className)} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      {primary ? (
        (() => {
          const Icon = ICONS[primary];
          return (
            <Button
              size={size}
              loading={busy(primary)}
              onClick={() => trigger(primary)}
              className={cn(block && "flex-1", primary === "collect_payment" && "bg-success text-white hover:bg-success/90")}
            >
              {!busy(primary) ? <Icon /> : null}
              {ORDER_ACTION[primary].label}
            </Button>
          );
        })()
      ) : null}

      {showMenu && secondary.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" size={size === "lg" ? "icon-lg" : size === "default" ? "icon" : "icon-sm"} aria-label="إجراءات أخرى" />}
          >
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {secondary.map((a, i) => {
              const Icon = ICONS[a];
              const destructive = a === "cancel" || a === "refund" || a === "no_show";
              const prevSafe = i > 0 && !["cancel", "refund", "no_show"].includes(secondary[i - 1]);
              return (
                <div key={a}>
                  {destructive && prevSafe ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuItem variant={destructive ? "destructive" : "default"} onClick={() => trigger(a)}>
                    <Icon />
                    {ORDER_ACTION[a].label}
                  </DropdownMenuItem>
                </div>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {/* Mounted only while open so each dialog starts fresh. */}
      {dialog === "start" || dialog === "assign" ? (
        <StaffDialog {...common} mode={dialog} onSubmit={(p) => run(dialog, p)} />
      ) : null}
      {dialog === "collect_payment" ? <PaymentDialog {...common} onSubmit={(p) => run("collect_payment", p)} /> : null}
      {dialog === "discount" ? <DiscountDialog {...common} maxPct={account?.maxDiscountPct ?? 0} onSubmit={(p) => run("discount", p)} /> : null}
      {dialog === "add_service" ? <AddServiceDialog {...common} onSubmit={(p) => run("add_service", p)} /> : null}
      {dialog === "note" ? <NoteDialog {...common} onSubmit={(p) => run("note", p)} /> : null}
      <ReasonDialog
        open={dialog === "cancel"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`إلغاء الطلب ${order.number}`}
        description="سيتم إبلاغ العميل بالإلغاء وتحرير الموعد. يُسجل السبب في سجل التدقيق."
        presets={[
          { value: "طلب العميل", label: "بطلب العميل" },
          { value: "عطل في المعدات", label: "عطل في المعدات" },
          { value: "ازدحام الفرع", label: "ازدحام الفرع" },
          { value: "بيانات غير صحيحة", label: "بيانات غير صحيحة" },
        ]}
        textRequired={false}
        textLabel="تفاصيل إضافية"
        confirmLabel="إلغاء الطلب"
        variant="destructive"
        isPending={action.isPending}
        onConfirm={({ preset, text }) => run("cancel", { reason: [preset, text].filter(Boolean).join(" — ") })}
      />
      <ReasonDialog
        open={dialog === "no_show"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`تسجيل عدم حضور — ${order.number}`}
        description="انتهت مهلة الانتظار. سيتم إبلاغ العميل وتحرير المكان."
        textRequired={false}
        textLabel="ملاحظة"
        confirmLabel="تأكيد عدم الحضور"
        variant="destructive"
        isPending={action.isPending}
        onConfirm={() => run("no_show")}
      />
      <ReasonDialog
        open={dialog === "refund"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`استرداد ${order.number}`}
        description="سيتحول الطلب إلى «مسترد» ويُخصم من إيراد اليوم. هذا الإجراء للمدير والمالك فقط."
        textLabel="سبب الاسترداد"
        confirmLabel="تأكيد الاسترداد"
        variant="destructive"
        isPending={action.isPending}
        onConfirm={({ text }) => run("refund", { reason: text })}
      />
    </div>
  );
}
