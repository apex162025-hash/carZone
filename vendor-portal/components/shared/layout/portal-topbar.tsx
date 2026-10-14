"use client";

import { usePathname } from "next/navigation";
import { Menu, Plus, Search } from "lucide-react";

import { ThemeToggle } from "@carzen/ui/components/shared/theme-toggle";
import { Button } from "@carzen/ui/components/ui/button";
import { formatDate } from "@carzen/ui/lib/format";
import { BranchSwitcher } from "@/components/shared/layout/branch-switcher";
import { NotificationsMenu } from "@/components/shared/layout/notifications-menu";
import { UserMenu } from "@/components/shared/layout/user-menu";
import { useAuthStore } from "@/lib/store/auth-store";
import { useUIStore } from "@/lib/store/ui-store";
import { VENDOR_NAV, isNavActive } from "@/lib/vendor-nav";

function useCurrentLabel() {
  const pathname = usePathname();
  for (const group of VENDOR_NAV) {
    const item = group.items.find((i) => isNavActive(pathname, i));
    if (item) return item.label;
  }
  return "";
}

/** Top bar (spec B2): branch switcher, date, global search, new order, notifications, user menu. */
export function PortalTopbar() {
  const setMobileOpen = useUIStore((s) => s.setMobileNavOpen);
  const setCommandOpen = useUIStore((s) => s.setCommandOpen);
  const setNewOrderOpen = useUIStore((s) => s.setNewOrderOpen);
  const suspended = useAuthStore((s) => s.account?.businessStatus === "suspended");
  const label = useCurrentLabel();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl sm:gap-3 sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="فتح القائمة">
        <Menu className="size-5" />
      </Button>

      <div className="hidden min-w-0 flex-col leading-tight xl:flex">
        <span className="truncate text-sm font-semibold">{label}</span>
        <span className="text-[11px] text-muted-foreground">{formatDate(new Date(), { withDay: true })}</span>
      </div>

      <BranchSwitcher />

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="ms-auto flex h-9 w-full max-w-[300px] cursor-pointer items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">لوحة، موبايل، رقم طلب…</span>
        <kbd className="num ms-auto hidden rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:block">Ctrl K</kbd>
      </button>

      <Button size="lg" onClick={() => setNewOrderOpen(true)} disabled={suspended} className="hidden sm:inline-flex">
        <Plus />
        طلب جديد
      </Button>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <NotificationsMenu />
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />
        <UserMenu />
      </div>
    </header>
  );
}
