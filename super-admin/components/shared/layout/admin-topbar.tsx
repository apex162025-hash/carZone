"use client";

import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";

import { NotificationsMenu } from "@/components/shared/layout/notifications-menu";
import { ThemeToggle } from "@/components/shared/layout/theme-toggle";
import { UserMenu } from "@/components/shared/layout/user-menu";
import { Button } from "@/components/ui/button";
import { ADMIN_NAV, isNavActive } from "@/lib/admin-nav";
import { useUIStore } from "@/lib/store/ui-store";

function useCurrentSection() {
  const pathname = usePathname();
  for (const group of ADMIN_NAV) {
    const item = group.items.find((i) => isNavActive(pathname, i));
    if (item) return { group: group.title, label: item.label };
  }
  return { group: null, label: "" };
}

export function AdminTopbar() {
  const setMobileOpen = useUIStore((s) => s.setMobileNavOpen);
  const setCommandOpen = useUIStore((s) => s.setCommandOpen);
  const section = useCurrentSection();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="فتح القائمة">
        <Menu className="size-5" />
      </Button>

      <nav aria-label="مسار التنقل" className="hidden min-w-0 items-center gap-1.5 text-sm md:flex">
        {section.group ? (
          <>
            <span className="text-muted-foreground">{section.group}</span>
            <span className="text-muted-foreground/50">/</span>
          </>
        ) : null}
        <span className="truncate font-medium">{section.label}</span>
      </nav>

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="ms-auto flex h-9 w-full max-w-[340px] cursor-pointer items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none md:ms-6"
      >
        <Search className="size-4" />
        <span className="truncate">بحث عن عميل، مغسلة، حجز…</span>
        <kbd className="num ms-auto hidden rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:block">Ctrl K</kbd>
      </button>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <NotificationsMenu />
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />
        <UserMenu />
      </div>
    </header>
  );
}
