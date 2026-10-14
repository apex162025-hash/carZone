"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { AlertCircle, Eye, EyeOff, LockKeyhole, Smartphone, Store, UserCog } from "lucide-react";

import { Button } from "@carzen/ui/components/ui/button";
import { cn } from "@carzen/ui/lib/utils";
import { useAuthReady, useLogin } from "@/hooks/use-auth";
import { resolveUserFacingError } from "@/lib/api/api-error-handler";

/** Egyptian mobile: local `01…` (11 digits) or the 10 digits after +20 — same rule as the platform. */
const loginSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, "رقم الموبايل مطلوب")
    .refine((v) => {
      const d = v.replace(/\D/g, "");
      return d.length === 10 || (d.length === 11 && d.startsWith("01")) || (d.length === 12 && d.startsWith("20"));
    }, "رقم موبايل مصري غير صحيح"),
  password: z.string().min(1, "كلمة المرور مطلوبة").min(6, "كلمة المرور 6 أحرف على الأقل"),
});

type LoginValues = z.infer<typeof loginSchema>;

/** Demo personas from spec 02 B1 (prefilled, one tap). */
const PERSONAS = [
  { key: "owner", name: "خالد منصور", role: "مالك — كل الفروع", phone: "+20 120 000 0000", icon: Store },
  { key: "manager", name: "محمد عادل", role: "مدير فرع — مدينة نصر", phone: "+20 100 555 0102", icon: UserCog },
] as const;

function safeNext(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const { isAuthenticated } = useAuthReady();
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: PERSONAS[0].phone, password: "demo1234" },
  });

  useEffect(() => {
    if (isAuthenticated) router.replace(next);
  }, [isAuthenticated, next, router]);

  const onSubmit = handleSubmit((values) => login.mutate(values));
  const serverError = login.error ? resolveUserFacingError(login.error, "تعذر تسجيل الدخول") : null;
  const currentPhone = useWatch({ control, name: "phone" });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {serverError ? (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="phone" className="text-sm font-medium">
          رقم الموبايل
        </label>
        <div className="relative">
          <Smartphone className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="phone"
            type="tel"
            dir="ltr"
            autoComplete="username"
            aria-invalid={Boolean(errors.phone)}
            {...register("phone")}
            className={cn(
              "num h-11 w-full rounded-xl border bg-card ps-10 pe-3 text-start text-sm transition-colors outline-none focus-visible:ring-3",
              errors.phone ? "border-destructive focus-visible:ring-destructive/20" : "border-input focus-visible:border-ring focus-visible:ring-ring/25",
            )}
          />
        </div>
        {errors.phone ? <p className="text-xs text-destructive">{errors.phone.message}</p> : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          كلمة المرور
        </label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            dir="ltr"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
            className={cn(
              "num h-11 w-full rounded-xl border bg-card ps-10 pe-11 text-start text-sm transition-colors outline-none focus-visible:ring-3",
              errors.password ? "border-destructive focus-visible:ring-destructive/20" : "border-input focus-visible:border-ring focus-visible:ring-ring/25",
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            className="absolute end-2 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
      </div>

      <Button type="submit" size="lg" className="h-11 w-full rounded-xl text-sm font-semibold" loading={login.isPending}>
        تسجيل الدخول
      </Button>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">حسابات العرض التجريبي (كلمة المرور demo1234)</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PERSONAS.map((p) => {
            const Icon = p.icon;
            const active = currentPhone === p.phone;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setValue("phone", p.phone, { shouldValidate: true });
                  setValue("password", "demo1234", { shouldValidate: true });
                  void onSubmit();
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-start transition-colors",
                  active ? "border-primary/40 bg-secondary" : "border-dashed border-border hover:bg-muted/60",
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-primary shadow-soft">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">{p.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{p.role}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </form>
  );
}
