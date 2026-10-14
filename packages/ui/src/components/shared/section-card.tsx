import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

type SectionCardProps = {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Remove inner padding (e.g. for edge-to-edge tables). */
  flush?: boolean;
};

/** The standard surface for every block of content in the panel. */
export function SectionCard({
  title,
  description,
  action,
  icon,
  children,
  className,
  contentClassName,
  flush,
}: SectionCardProps) {
  return (
    <section className={cn("rounded-2xl border border-border/80 bg-card text-card-foreground shadow-soft", className)}>
      {title || action ? (
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="flex min-w-0 items-start gap-2.5">
            {icon ? (
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground [&_svg]:size-4">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0">
              {title ? <h2 className="text-sm font-semibold">{title}</h2> : null}
              {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
            </div>
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn(!flush && "px-5 pb-5", !title && !action && !flush && "pt-5", contentClassName)}>{children}</div>
    </section>
  );
}
