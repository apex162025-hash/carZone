import type { ReactNode } from "react";

export function Field({ id, label, error, hint, children }: { id?: string; label: ReactNode; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      {id ? (
        <label htmlFor={id} className="block text-xs font-medium">
          {label}
        </label>
      ) : (
        <p className="text-xs font-medium">{label}</p>
      )}
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function FormSection({ title, description, action, children }: { title: string; description?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-2xl border border-border/80 bg-card p-4">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-start justify-between gap-3">
        <div aria-hidden>
          <p className="text-sm font-semibold">{title}</p>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </fieldset>
  );
}

/** Numeric input with a trailing unit (logical `end`, RTL-safe). */
export const unitInputClass = "num h-9 pe-14";

export function Unit({ children }: { children: ReactNode }) {
  return <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{children}</span>;
}
