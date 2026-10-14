"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

import { useDebouncedValue } from "../../hooks/use-debounced-value";
import { cn } from "../../lib/utils";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  delayMs?: number;
};

/** Debounced search box; keeps typing instant while the URL/query updates lazily. */
export function SearchInput({ value, onChange, placeholder = "بحث…", className, delayMs = 350 }: SearchInputProps) {
  const [draft, setDraft] = useState(value);
  const debounced = useDebouncedValue(draft, delayMs);

  // External resets (e.g. "clear filters") flow back into the input — adjusted during render.
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(value);
  }

  useEffect(() => {
    if (debounced !== value) onChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className={cn("relative w-full sm:w-72", className)}>
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-lg border border-input bg-card ps-9 pe-8 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
      />
      {draft ? (
        <button
          type="button"
          onClick={() => setDraft("")}
          aria-label="مسح البحث"
          className="absolute end-2 top-1/2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
