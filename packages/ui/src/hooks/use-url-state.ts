"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

type Primitive = string | number;

/**
 * List filters live in the URL (shareable, survives refresh/back) — preferred
 * over global state per the project rules. Values equal to their default are
 * omitted to keep URLs clean. Components using this must sit under <Suspense>.
 */
export function useUrlState<T extends Record<string, Primitive>>(defaults: T) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Call sites pass an inline literal; a serialized key keeps memo deps stable.
  const defaultsKey = JSON.stringify(defaults);
  const base = useMemo(() => JSON.parse(defaultsKey) as T, [defaultsKey]);

  const state = useMemo(() => {
    const out = { ...base };
    for (const key of Object.keys(base) as (keyof T)[]) {
      const raw = searchParams.get(String(key));
      if (raw === null) continue;
      out[key] = (typeof base[key] === "number" ? Number(raw) || base[key] : raw) as T[keyof T];
    }
    return out;
  }, [searchParams, base]);

  const setState = useCallback(
    (patch: Partial<T>, options: { resetPage?: boolean } = { resetPage: true }) => {
      const next = new URLSearchParams(searchParams.toString());
      const merged: Record<string, Primitive | undefined> = { ...patch };
      // Any filter change sends the user back to page 1.
      if (options.resetPage && "page" in base && !("page" in patch)) {
        merged.page = base.page;
      }
      for (const [key, value] of Object.entries(merged)) {
        if (value === undefined || value === "" || value === base[key]) next.delete(key);
        else next.set(key, String(value));
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, base],
  );

  return [state, setState] as const;
}
