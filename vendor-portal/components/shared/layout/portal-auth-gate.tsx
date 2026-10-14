"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { BrandLogo } from "@carzen/ui/components/shared/brand-logo";
import { useAuthReady, useMe } from "@/hooks/use-auth";

/**
 * Client-side gate (aroma's DashboardAuthGate model): the Bearer token lives
 * in the persisted Zustand store, so we wait for rehydration, then render the
 * portal or send the visitor to /login with a return path.
 */
export function PortalAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isReady, isAuthenticated } = useAuthReady();

  // Validates the token and refreshes the account (suspension, branches…); a 401 clears it.
  useMe(isAuthenticated);

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isReady, isAuthenticated, pathname, router]);

  if (!isReady || !isAuthenticated) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5">
        <BrandLogo subtitle="بوابة الشركاء" />
        <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
          <div className="bg-brand-gradient h-full w-1/2 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full" />
        </div>
        <span className="sr-only">جاري التحقق من الجلسة</span>
      </div>
    );
  }

  return <>{children}</>;
}
