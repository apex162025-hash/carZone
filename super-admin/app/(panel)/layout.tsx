import { AdminAuthGate } from "@/components/shared/layout/admin-auth-gate";
import { AdminSidebar } from "@/components/shared/layout/admin-sidebar";
import { AdminTopbar } from "@/components/shared/layout/admin-topbar";
import { CommandPalette } from "@/components/shared/layout/command-palette";

export default function PanelLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AdminAuthGate>
      <div className="flex min-h-dvh">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar />
          <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
      <CommandPalette />
    </AdminAuthGate>
  );
}
