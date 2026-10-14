import type { ReactNode } from "react";
import { CloudOff, Inbox, RotateCw } from "lucide-react";

import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { cn } from "../../lib/utils";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

/** Empty = explanation + a useful next step, never a blank area (spec A10). */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      <div className="relative flex size-14 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground [&_svg]:size-6">
        <span className="absolute inset-0 rounded-2xl bg-grid-faint opacity-60" aria-hidden />
        <span className="relative">{icon ?? <Inbox />}</span>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        {description ? <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
};

export function ErrorState({ message, onRetry, isRetrying, className }: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <CloudOff className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">تعذر تحميل البيانات</p>
        <p className="mx-auto max-w-sm text-xs text-muted-foreground">
          {message ?? "حدث خطأ أثناء الاتصال بالخادم. تحقق من الاتصال وحاول مرة أخرى."}
        </p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} loading={isRetrying}>
          {!isRetrying ? <RotateCw /> : null}
          إعادة المحاولة
        </Button>
      ) : null}
    </div>
  );
}

/** Generic detail-page skeleton: header + stat row + two columns. */
export function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="جاري التحميل">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}
