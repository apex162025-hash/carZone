"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { ADMIN_NAV, isNavActive } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

type SidebarNavProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
};

export function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const badges = useNavBadges();

  return (
    <nav aria-label="القائمة الرئيسية" className="space-y-5">
      {ADMIN_NAV.map((group, gi) => (
        <div key={group.title ?? gi} className="space-y-1">
          {group.title ? (
            collapsed ? (
              <div className="mx-auto my-2 h-px w-6 bg-sidebar-border" aria-hidden />
            ) : (
              <p className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground/80">{group.title}</p>
            )
          ) : null}
          {group.items.map((item) => {
            const active = isNavActive(pathname, item);
            const count = item.badge ? badges[item.badge] : 0;
            const Icon = item.icon;

            const link = (
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring/50 focus-visible:outline-none",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {active ? (
                  <span className="absolute inset-y-2 start-0 w-[3px] rounded-e-full bg-sidebar-primary" aria-hidden />
                ) : null}
                <Icon className={cn("size-[18px] shrink-0", active ? "text-sidebar-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
                {count > 0 ? (
                  collapsed ? (
                    <span className="absolute top-1.5 end-2 size-2 rounded-full bg-destructive ring-2 ring-sidebar" aria-hidden />
                  ) : (
                    <span
                      className={cn(
                        "num ms-auto min-w-5 rounded-md px-1.5 text-center text-[11px] leading-5 font-semibold",
                        item.badge === "complaints" ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning",
                      )}
                    >
                      {count}
                    </span>
                  )
                ) : null}
              </Link>
            );

            if (!collapsed) return <div key={item.href}>{link}</div>;
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger render={<div />}>{link}</TooltipTrigger>
                <TooltipContent side="left">
                  {item.label}
                  {count > 0 ? ` (${count})` : ""}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
