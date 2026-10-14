"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import { Car, ClipboardList, Loader2, PlusCircle, User } from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@carzen/ui/components/ui/command";
import { useDebouncedValue } from "@carzen/ui/hooks/use-debounced-value";
import { useGlobalSearch } from "@/hooks/use-insights";
import { useAuthStore } from "@/lib/store/auth-store";
import { useUIStore } from "@/lib/store/ui-store";
import { navFor } from "@/lib/vendor-nav";
import type { VendorSearchResult } from "@carzen/contracts/vendor/insights";

const GROUPS: Record<VendorSearchResult["group"], { label: string; icon: ComponentType<{ className?: string }> }> = {
  orders: { label: "الطلبات", icon: ClipboardList },
  plates: { label: "اللوحات", icon: Car },
  customers: { label: "العملاء", icon: User },
};

/** Global Ctrl+K: search by plate, phone or order number (spec B2 top bar) + quick navigation. */
export function CommandPalette() {
  const open = useUIStore((s) => s.commandOpen);
  const setOpen = useUIStore((s) => s.setCommandOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useUIStore.getState().commandOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="بحث شامل" description="ابحث برقم اللوحة أو الموبايل أو رقم الطلب" className="sm:max-w-xl">
      {/* Unmounts on close, so the query resets on every open. */}
      <PaletteBody onClose={() => setOpen(false)} />
    </CommandDialog>
  );
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const role = useAuthStore((s) => s.account?.role);
  const setNewOrderOpen = useUIStore((s) => s.setNewOrderOpen);
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 250);
  const { data, isFetching } = useGlobalSearch(debounced);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const term = debounced.trim();
  const results = term.length >= 2 ? data?.results ?? [] : [];
  const navItems = navFor(role).flatMap((g) => g.items);
  const navMatches = navItems.filter((i) => !query.trim() || i.label.includes(query.trim()));
  const grouped = (Object.keys(GROUPS) as VendorSearchResult["group"][])
    .map((g) => ({ group: g, items: results.filter((r) => r.group === g) }))
    .filter((g) => g.items.length);

  return (
    <Command shouldFilter={false} className="rounded-none!">
      <CommandInput value={query} onValueChange={setQuery} placeholder="رقم اللوحة، الموبايل، أو رقم الطلب CZ-…" />
      <CommandList className="max-h-[420px]">
        {term.length >= 2 && !isFetching && !grouped.length && !navMatches.length ? <CommandEmpty>لا توجد نتائج لـ «{term}»</CommandEmpty> : null}
        {isFetching && term.length >= 2 ? (
          <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> جاري البحث…
          </div>
        ) : null}
        {!term ? (
          <CommandGroup heading="إجراءات">
            <CommandItem
              value="new-order"
              onSelect={() => {
                onClose();
                setNewOrderOpen(true);
              }}
            >
              <PlusCircle className="text-primary" />
              طلب جديد (حضور مباشر أو حجز هاتفي)
            </CommandItem>
          </CommandGroup>
        ) : null}
        {grouped.map(({ group, items }) => {
          const Icon = GROUPS[group].icon;
          return (
            <CommandGroup key={group} heading={GROUPS[group].label}>
              {items.map((r) => (
                <CommandItem key={`${group}-${r.id}`} value={`${group}-${r.id}`} onSelect={() => go(r.href)}>
                  <Icon className="text-muted-foreground" />
                  <span className="num font-medium">{r.title}</span>
                  <span className="truncate text-xs text-muted-foreground">{r.subtitle}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
        {navMatches.length ? (
          <CommandGroup heading="انتقال سريع">
            {navMatches.slice(0, term ? 4 : 8).map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem key={item.href} value={`nav-${item.href}`} onSelect={() => go(item.href)}>
                  <Icon className="text-muted-foreground" />
                  {item.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ) : null}
      </CommandList>
      <div className="flex items-center gap-3 border-t px-3 py-2 text-[11px] text-muted-foreground">
        <span>
          <kbd className="num rounded border bg-muted px-1">↵</kbd> فتح
        </span>
        <span>
          <kbd className="num rounded border bg-muted px-1">↑↓</kbd> تنقل
        </span>
        <span>
          <kbd className="num rounded border bg-muted px-1">Esc</kbd> إغلاق
        </span>
      </div>
    </Command>
  );
}
