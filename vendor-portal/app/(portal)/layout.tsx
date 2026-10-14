import { NewOrderSheet } from "@/components/modules/Orders/NewOrderSheet";
import { CommandPalette } from "@/components/shared/layout/command-palette";
import { PortalAuthGate } from "@/components/shared/layout/portal-auth-gate";
import { PortalSidebar } from "@/components/shared/layout/portal-sidebar";
import { PortalTopbar } from "@/components/shared/layout/portal-topbar";
import { SuspensionBanner } from "@/components/shared/layout/suspension-banner";

export default function PortalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <PortalAuthGate>
      <div className="flex min-h-dvh">
        <PortalSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <PortalTopbar />
          <SuspensionBanner />
          <main id="main" className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
      <CommandPalette />
      <NewOrderSheet />
    </PortalAuthGate>
  );
}
