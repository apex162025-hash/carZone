import { History } from "lucide-react";

import { EmptyState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { AUDIT_ACTION } from "@/lib/constants/labels";
import { formatDateTime } from "@/lib/format";
import type { AuditLog } from "@/types/audit";

type AuditTrailProps = {
  logs: (AuditLog & { actorName?: string })[];
  /** Map actor ids to names when the list endpoint doesn't include them. */
  actorNames?: Record<string, string>;
  emptyText?: string;
};

function formatValue(v: string | null) {
  if (!v) return null;
  return v.length > 80 ? `${v.slice(0, 80)}…` : v;
}

/** Compact, read-only audit history for detail pages. */
export function AuditTrail({ logs, actorNames, emptyText = "لا توجد إجراءات مسجلة بعد" }: AuditTrailProps) {
  if (!logs.length) {
    return <EmptyState icon={<History />} title={emptyText} className="py-8" />;
  }

  return (
    <ul className="divide-y divide-border/60">
      {logs.map((log) => {
        const name = log.actorName ?? actorNames?.[log.actorId] ?? (log.actorType === "system" ? "النظام" : log.actorId);
        const oldV = formatValue(log.oldValue);
        const newV = formatValue(log.newValue);
        return (
          <li key={log.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <UserAvatar name={name} size="xs" className="mt-0.5" />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-x-3">
                <p className="text-sm">
                  <span className="font-medium">{name}</span>
                  <span className="text-muted-foreground"> — {AUDIT_ACTION[log.action] ?? log.action}</span>
                </p>
                <time className="num text-[11px] text-muted-foreground" dateTime={log.at}>
                  {formatDateTime(log.at)}
                </time>
              </div>
              {oldV || newV ? (
                <p className="num text-xs text-muted-foreground" dir="auto">
                  {oldV ? <span className="line-through decoration-destructive/50">{oldV}</span> : null}
                  {oldV && newV ? <span className="mx-1.5">←</span> : null}
                  {newV ? <span className="text-foreground">{newV}</span> : null}
                </p>
              ) : null}
              {log.reason ? (
                <p className="rounded-md bg-muted/70 px-2 py-1 text-xs leading-relaxed">
                  <span className="text-muted-foreground">السبب: </span>
                  {log.reason}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
