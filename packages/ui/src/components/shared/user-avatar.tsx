import { initials } from "../../lib/format";
import { cn } from "../../lib/utils";

type UserAvatarProps = {
  name: string | null | undefined;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
};

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
};

/** Stable hue per name so the same person always gets the same color. */
function hueFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export function UserAvatar({ name, size = "sm", className }: UserAvatarProps) {
  const hue = hueFor(name ?? "");
  return (
    <span
      aria-hidden
      style={{ backgroundColor: `hsl(${hue} 70% 94%)`, color: `hsl(${hue} 55% 32%)` }}
      className={cn(
        "num inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none dark:brightness-90",
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
