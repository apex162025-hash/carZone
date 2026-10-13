"use client";

import Link from "next/link";
import { useState, type ComponentType, type CSSProperties } from "react";
import {
  AlertTriangle,
  BellOff,
  ChevronLeft,
  CircleDollarSign,
  FilePlus2,
  MessageSquareWarning,
  ShieldCheck,
  Star,
  Wallet,
  X,
} from "lucide-react";

import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { TONES } from "@/lib/constants/labels";
import type { AlertType, DashboardAlert } from "@/types/dashboard";

const ICON: Record<AlertType, ComponentType<{ className?: string }>> = {
  applications: FilePlus2,
  complaint_spike: MessageSquareWarning,
  discrepancy: CircleDollarSign,
  cancellation_rate: AlertTriangle,
  shift_difference: Wallet,
  reported_review: Star,
};

const SEVERITY_TONE = { danger: TONES.danger, warning: TONES.warning, info: TONES.info } as const;

const STORAGE_KEY = "carzen-sa-dismissed-alerts";

function readDismissed(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

/**
 * Action alerts (AD-08). Dismiss = hide until the count changes; snooze is a
 * per-viewer convenience kept in localStorage.
 */
export function AlertsPanel({ alerts }: { alerts: DashboardAlert[] }) {
  // Panel content only renders client-side (behind the auth gate), so storage is safe to read here.
  const [dismissed, setDismissed] = useState<Record<string, number>>(readDismissed);

  const dismiss = (alert: DashboardAlert) => {
    const next = { ...dismissed, [alert.id]: alert.count };
    setDismissed(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — dismissal lasts for this view only */
    }
  };

  const visible = alerts.filter((a) => dismissed[a.id] !== a.count);

  if (!visible.length) {
    return (
      <EmptyState
        icon={<ShieldCheck />}
        title="لا توجد تنبيهات تحتاج إجراء"
        description="كل شيء تحت السيطرة. سنعرض هنا أي طلبات أو شكاوى أو فروق مالية جديدة."
        className="py-8"
      />
    );
  }

  return (
    <ul className="space-y-2">
      {visible.map((alert) => {
        const Icon = ICON[alert.type];
        return (
          <li
            key={alert.id}
            style={{ "--tone": SEVERITY_TONE[alert.severity] } as CSSProperties}
            className="group relative flex items-start gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:bg-muted/40"
          >
            <span className="tone-soft flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Icon className="size-4" />
            </span>
            <Link href={alert.href} className="min-w-0 flex-1 after:absolute after:inset-0 focus-visible:outline-none">
              <p className="text-[13px] leading-snug font-semibold">{alert.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{alert.description}</p>
            </Link>
            <ChevronLeft className="mt-2 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
            <Button
              variant="ghost"
              size="icon-xs"
              className="absolute -top-2 -start-2 z-10 rounded-full border bg-card opacity-0 shadow-sm group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="إخفاء التنبيه"
              onClick={() => dismiss(alert)}
            >
              <X />
            </Button>
          </li>
        );
      })}
      {Object.keys(dismissed).length ? (
        <li>
          <button
            type="button"
            onClick={() => {
              setDismissed({});
              try {
                localStorage.removeItem(STORAGE_KEY);
              } catch {
                /* ignore */
              }
            }}
            className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <BellOff className="size-3" />
            إظهار التنبيهات المخفية
          </button>
        </li>
      ) : null}
    </ul>
  );
}
