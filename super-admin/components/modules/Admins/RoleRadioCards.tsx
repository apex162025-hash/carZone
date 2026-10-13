"use client";

import type { CSSProperties } from "react";
import { Check } from "lucide-react";

import { ADMIN_ROLE } from "@/lib/constants/labels";
import { cn } from "@/lib/utils";
import type { AdminRole } from "@/types/auth";

export const ADMIN_ROLES = Object.keys(ADMIN_ROLE) as AdminRole[];

type RoleRadioCardsProps = {
  name: string;
  value: AdminRole | null | undefined;
  onChange: (role: AdminRole) => void;
  legend?: string;
  /** Marks the admin's current role with a "الحالي" tag. */
  currentRole?: AdminRole;
  error?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Role picker as radio cards: each role shows its tone and what it can access,
 * so the admin understands the impact before assigning it.
 */
export function RoleRadioCards({ name, value, onChange, legend = "الدور", currentRole, error, disabled, className }: RoleRadioCardsProps) {
  const errorId = error ? `${name}-error` : undefined;

  return (
    <fieldset className={cn("space-y-2", className)} aria-describedby={errorId} disabled={disabled}>
      <legend className="mb-2 text-xs font-medium">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {ADMIN_ROLES.map((role) => {
          const meta = ADMIN_ROLE[role];
          const checked = value === role;
          return (
            <label
              key={role}
              style={{ "--tone": meta.tone } as CSSProperties}
              className={cn(
                "relative flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60",
                checked ? "border-[var(--tone)] bg-[color-mix(in_oklab,var(--tone)_6%,transparent)]" : "border-border hover:bg-muted/60",
                error && !value && "border-destructive/50",
              )}
            >
              <input
                type="radio"
                name={name}
                value={role}
                checked={checked}
                onChange={() => onChange(role)}
                className="sr-only"
              />
              <span
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                  checked ? "border-[var(--tone)] bg-[var(--tone)] text-white" : "border-input bg-card",
                )}
                aria-hidden
              >
                {checked ? <Check className="size-2.5" strokeWidth={3.5} /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="tone-dot size-2 rounded-full" aria-hidden />
                  <span className="text-sm font-semibold">{meta.label}</span>
                  {currentRole === role ? (
                    <span className="rounded bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">الحالي</span>
                  ) : null}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{meta.description}</span>
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
