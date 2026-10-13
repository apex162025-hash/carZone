import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FormFieldProps = {
  id: string;
  label: ReactNode;
  /** One-line helper explaining the effect of the field. */
  hint?: ReactNode;
  error?: string;
  /** Right-aligned extra (e.g. a character counter). */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** Label + control + helper/error line, with ids wired for `aria-describedby`. */
export function FormField({ id, label, hint, error, aside, className, children }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-end justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[11px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** `aria-describedby` value matching FormField's helper/error line. */
export function describedBy(id: string, error?: string, hasHint = true) {
  if (error) return `${id}-error`;
  return hasHint ? `${id}-hint` : undefined;
}
