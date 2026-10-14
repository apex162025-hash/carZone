"use client";

import { useRouter } from "next/navigation";
import { Building2, ChevronDown, LogOut, Settings } from "lucide-react";

import { UserAvatar } from "@carzen/ui/components/shared/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@carzen/ui/components/ui/dropdown-menu";
import { STAFF_ROLE } from "@carzen/ui/lib/constants/labels";
import { useLogout } from "@/hooks/use-auth";
import { useAuthStore } from "@/lib/store/auth-store";

export function UserMenu() {
  const router = useRouter();
  const account = useAuthStore((s) => s.account);
  const logout = useLogout();

  if (!account) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex cursor-pointer items-center gap-2 rounded-xl py-1 ps-1 pe-2 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label="قائمة الحساب"
      >
        <UserAvatar name={account.name} size="sm" />
        <span className="hidden text-start leading-tight md:block">
          <span className="block text-[13px] font-semibold">{account.name}</span>
          <span className="block text-[11px] text-muted-foreground">{STAFF_ROLE[account.role].label}</span>
        </span>
        <ChevronDown className="hidden size-3.5 text-muted-foreground md:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5">
            <span className="block text-sm font-semibold text-foreground">{account.name}</span>
            <span className="num block text-xs font-normal text-muted-foreground" dir="ltr">
              {account.phone}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/branches")}>
          <Building2 />
          {account.businessName.ar}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <Settings />
          الإعدادات
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => logout.mutate(undefined, { onSettled: () => router.replace("/login") })}>
          <LogOut />
          تسجيل الخروج
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
