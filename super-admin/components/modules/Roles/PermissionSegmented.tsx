"use client";

import type { CSSProperties } from "react";
import { Lock } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PERMISSION_LEVEL } from "@/lib/constants/labels";
import { cn } from "@/lib/utils";
import type { PermissionLevel } from "@/types/admins";

export const PERMISSION_LEVELS = Object.keys(PERMISSION_LEVEL) as PermissionLevel[];

type PermissionSegmentedProps = {
  /** Unique radio group name (role + module). */
  name: string;
  /** Accessible group label, e.g. "المغاسل — العمليات". */
  label: string;
  value: PermissionLevel;
  changed?: boolean;
  onChange: (level: PermissionLevel) => void;
  /** Levels that can't be picked for this module (with the reason as a hint). */
  disabledLevels?: PermissionLevel[];
  disabledHint?: string;
};

/**
 * 3-state segmented control (none / view / manage) built on native radios so
 * arrow keys move between levels and screen readers announce the choice.
 */
export function PermissionSegmented({ name, label, value, changed, onChange, disabledLevels, disabledHint }: PermissionSegmentedProps) {
  return (
    <div
      role="radiogroup"
      aria-label={changed ? `${label} — معدّل` : label}
      className={cn(
        "relative inline-flex items-center gap-0.5 rounded-lg border p-0.5 transition-colors",
        changed ? "border-warning/70 bg-warning/10 ring-2 ring-warning/25" : "border-border bg-muted/50",
      )}
    >
      {changed ? <span className="absolute -end-1 -top-1 size-2 rounded-full bg-warning ring-2 ring-card" aria-hidden /> : null}
      {PERMISSION_LEVELS.map((level) => {
        const meta = PERMISSION_LEVEL[level];
        const checked = value === level;
        const disabled = disabledLevels?.includes(level) ?? false;
        return (
          <label
            key={level}
            title={disabled ? disabledHint : undefined}
            style={{ "--tone": meta.tone } as CSSProperties}
            className={cn(
              "relative min-w-10 rounded-md px-2 py-1 text-center text-[11px] leading-4 font-medium whitespace-nowrap transition-colors select-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50",
              checked ? "tone-soft tone-ring" : "text-muted-foreground",
              disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
              !checked && !disabled && "hover:bg-card hover:text-foreground",
            )}
          >
            <input
              type="radio"
              name={name}
              value={level}
              checked={checked}
              disabled={disabled}
              onChange={() => onChange(level)}
              className="sr-only"
            />
            {meta.label}
          </label>
        );
      })}
    </div>
  );
}

type LockedPermissionProps = {
  value: PermissionLevel;
  hint: string;
  label: string;
};

/** Read-only cell (Super Admin column): level badge + lock with an explanatory tooltip. */
export function LockedPermission({ value, hint, label }: LockedPermissionProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            aria-label={`${label}: ${PERMISSION_LEVEL[value].label} — ${hint}`}
            className="inline-flex cursor-help items-center gap-1.5 rounded-lg px-1.5 py-1 text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        }
      >
        <Lock className="size-3" aria-hidden />
        <StatusBadge meta={PERMISSION_LEVEL[value]} size="sm" />
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
}
