"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { Bell, CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/hooks/use-platform";
import { NOTIFICATION_TYPE } from "@/lib/constants/labels";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export function NotificationsMenu() {
  const router = useRouter();
  const { data, isLoading } = useNotifications("all");
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const unread = data?.meta.unread ?? 0;
  const items = data?.items.slice(0, 6) ?? [];

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label={`الإشعارات${unread ? ` (${unread} غير مقروءة)` : ""}`} />
        }
      >
        <Bell className="size-[18px]" />
        {unread > 0 ? (
          <span className="num absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white ring-2 ring-background">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] gap-0 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">الإشعارات</p>
          {unread > 0 ? (
            <Button variant="ghost" size="xs" onClick={() => markAll.mutate()} loading={markAll.isPending}>
              <CheckCheck />
              تعليم الكل كمقروء
            </Button>
          ) : null}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {isLoading
            ? Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="space-y-2 border-b px-4 py-3">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              ))
            : items.map((n) => {
                const meta = NOTIFICATION_TYPE[n.type];
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      if (!n.read) markRead.mutate(n.id);
                      router.push(n.href);
                    }}
                    className={cn(
                      "flex w-full cursor-pointer gap-3 border-b px-4 py-3 text-start transition-colors last:border-b-0 hover:bg-muted/60",
                      !n.read && "bg-secondary/40",
                    )}
                  >
                    <span style={{ "--tone": meta.tone } as CSSProperties} className="tone-dot mt-1.5 size-2 shrink-0 rounded-full" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13px] font-medium">{n.title.ar}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelative(n.createdAt)}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.body.ar}</span>
                    </span>
                  </button>
                );
              })}
          {!isLoading && !items.length ? <p className="px-4 py-8 text-center text-xs text-muted-foreground">لا توجد إشعارات</p> : null}
        </div>
        <Link href="/notifications" className="block border-t px-4 py-2.5 text-center text-xs font-medium text-primary hover:bg-muted/60">
          عرض كل الإشعارات
        </Link>
      </PopoverContent>
    </Popover>
  );
}
