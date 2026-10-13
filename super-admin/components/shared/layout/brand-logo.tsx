import { cn } from "@/lib/utils";

type BrandLogoProps = {
  collapsed?: boolean;
  className?: string;
};

export function BrandLogo({ collapsed, className }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="bg-brand-gradient flex size-9 shrink-0 items-center justify-center rounded-xl shadow-raised">
        <svg viewBox="0 0 64 64" className="size-6" aria-hidden>
          <path d="M18 38c6-14 10-18 14-18s8 4 14 18" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
          <circle cx="32" cy="26" r="4.5" fill="#fff" />
        </svg>
      </span>
      {!collapsed ? (
        <div className="min-w-0 leading-tight">
          <p className="num text-[15px] font-extrabold tracking-tight">Carzen</p>
          <p className="text-[11px] font-medium text-muted-foreground">لوحة السوبر أدمن</p>
        </div>
      ) : null}
    </div>
  );
}
