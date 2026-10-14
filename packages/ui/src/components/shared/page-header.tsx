import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "../../lib/utils";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Small label above the title (e.g. entity type or ID). */
  eyebrow?: ReactNode;
  /** Badges/meta rendered beside the title. */
  meta?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  className?: string;
};

export function PageHeader({ title, description, eyebrow, meta, actions, back, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-1.5">
        {back ? (
          <Link
            href={back.href}
            className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowRight className="size-3.5" />
            {back.label}
          </Link>
        ) : null}
        {eyebrow ? <div className="text-xs font-medium text-muted-foreground">{eyebrow}</div> : null}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-balance sm:text-2xl">{title}</h1>
          {meta}
        </div>
        {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
