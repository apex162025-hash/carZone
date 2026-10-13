import { Ban, UserX } from "lucide-react";

import { formatNumber, formatPercent } from "@/lib/format";
import type { DashboardFunnel } from "@/types/dashboard";

const STEP_LABEL: Record<DashboardFunnel["steps"][number]["key"], string> = {
  created: "حجوزات منشأة",
  confirmed: "مؤكدة",
  waiting: "وصل العميل",
  in_service: "بدأت الخدمة",
  completed: "مكتملة",
};

/** Horizontal funnel (single hue, magnitude only) with drop-offs called out below. */
export function BookingFunnel({ funnel }: { funnel: DashboardFunnel }) {
  const top = funnel.steps[0]?.value || 1;

  return (
    <div className="space-y-4">
      <ol className="space-y-3">
        {funnel.steps.map((step, i) => {
          const pct = (step.value / top) * 100;
          const prev = funnel.steps[i - 1];
          const conv = prev && prev.value ? (step.value / prev.value) * 100 : null;
          return (
            <li key={step.key} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-medium">{STEP_LABEL[step.key]}</span>
                <span className="flex items-baseline gap-2">
                  {conv !== null ? <span className="num text-muted-foreground">{formatPercent(conv, 0)}</span> : null}
                  <span className="num text-sm font-semibold">{formatNumber(step.value)}</span>
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500 ease-fluid"
                  style={{ width: `${Math.max(pct, 2)}%`, opacity: 1 - i * 0.12 }}
                />
              </div>
            </li>
          );
        })}
      </ol>
      <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-4">
        <div className="flex items-center gap-2.5 rounded-xl bg-destructive/5 px-3 py-2.5">
          <Ban className="size-4 text-destructive" />
          <div className="text-xs">
            <p className="text-muted-foreground">ملغاة</p>
            <p className="num text-sm font-semibold">{formatNumber(funnel.cancelled)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl bg-muted px-3 py-2.5">
          <UserX className="size-4 text-muted-foreground" />
          <div className="text-xs">
            <p className="text-muted-foreground">لم يحضر</p>
            <p className="num text-sm font-semibold">{formatNumber(funnel.noShow)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
