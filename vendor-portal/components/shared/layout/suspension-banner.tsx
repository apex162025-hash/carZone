"use client";

import { Ban } from "lucide-react";

import { useAuthStore } from "@/lib/store/auth-store";

/**
 * Shown on every page while Carzen has suspended the wash (set from the super
 * admin). The account is refreshed every minute, so it appears/disappears live.
 */
export function SuspensionBanner() {
  const account = useAuthStore((s) => s.account);
  if (account?.businessStatus !== "suspended") return null;
  return (
    <div role="alert" className="flex items-start gap-3 border-b border-destructive/30 bg-destructive/[0.06] px-4 py-3 sm:px-6 lg:px-8">
      <Ban className="mt-0.5 size-5 shrink-0 text-destructive" />
      <div className="text-sm">
        <p className="font-semibold text-destructive">مغسلتك معلّقة حاليًا من إدارة كارزن</p>
        <p className="mt-0.5 text-muted-foreground">
          لا تظهر للعملاء ولا يمكن إنشاء طلبات جديدة. يمكنك إكمال الطلبات القائمة.
          {account.businessStatusReason ? ` السبب: ${account.businessStatusReason}` : ""}
        </p>
      </div>
    </div>
  );
}
