"use client";

import Link from "next/link";
import { PanelRightClose, PanelRightOpen } from "lucide-react";

import { BrandLogo } from "@/components/shared/layout/brand-logo";
import { SidebarNav } from "@/components/shared/layout/sidebar-nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useUIStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";

/** Desktop sidebar (collapsible to icons) + mobile sheet. */
export function AdminSidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const mobileOpen = useUIStore((s) => s.mobileNavOpen);
  const setMobileOpen = useUIStore((s) => s.setMobileNavOpen);

  return (
    <>
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-e border-sidebar-border bg-sidebar transition-[width] duration-200 ease-fluid lg:flex",
          collapsed ? "w-[76px]" : "w-[264px]",
        )}
      >
        <div className={cn("flex h-16 items-center border-b border-sidebar-border", collapsed ? "justify-center px-2" : "justify-between px-4")}>
          <Link href="/dashboard" aria-label="لوحة المؤشرات" className="rounded-xl focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none">
            <BrandLogo collapsed={collapsed} />
          </Link>
          {!collapsed ? (
            <Button variant="ghost" size="icon-sm" onClick={toggleSidebar} aria-label="طي القائمة">
              <PanelRightClose />
            </Button>
          ) : null}
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav collapsed={collapsed} />
        </div>
        {collapsed ? (
          <div className="border-t border-sidebar-border p-3">
            <Button variant="ghost" size="icon" className="w-full" onClick={toggleSidebar} aria-label="توسيع القائمة">
              <PanelRightOpen />
            </Button>
          </div>
        ) : (
          <div className="m-3 rounded-xl border border-sidebar-border bg-muted/50 p-3">
            <p className="text-xs font-semibold">بيئة العرض التجريبي</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">البيانات وهمية ويمكن إعادة ضبطها من قائمة الحساب.</p>
          </div>
        )}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-[280px] gap-0 p-0">
          <SheetTitle className="sr-only">القائمة الرئيسية</SheetTitle>
          <div className="flex h-16 items-center border-b px-4">
            <BrandLogo />
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
