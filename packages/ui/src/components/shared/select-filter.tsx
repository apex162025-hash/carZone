"use client";

import type { ReactNode } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { cn } from "../../lib/utils";

export type SelectOption = { value: string; label: string };

type SelectFilterProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Label for the "all" option (value `all`). Omit to not offer one. */
  allLabel?: string;
  icon?: ReactNode;
  className?: string;
  "aria-label": string;
};

/** Compact dropdown filter for list toolbars. */
export function SelectFilter({ value, onChange, options, allLabel, icon, className, ...rest }: SelectFilterProps) {
  const all = allLabel ? [{ value: "all", label: allLabel }, ...options] : options;
  const items = Object.fromEntries(all.map((o) => [o.value, o.label]));

  return (
    <Select value={value} onValueChange={(v) => onChange(String(v ?? "all"))} items={items}>
      <SelectTrigger
        aria-label={rest["aria-label"]}
        className={cn("h-9 min-w-36 bg-card data-[size=default]:h-9 [&_svg:first-child]:text-muted-foreground", className)}
      >
        {icon}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {all.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
