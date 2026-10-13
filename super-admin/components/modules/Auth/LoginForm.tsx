"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AlertCircle, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuthReady, useLogin } from "@/hooks/use-auth";
import { resolveUserFacingError } from "@/lib/api/api-error-handler";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().trim().min(1, "البريد الإلكتروني مطلوب").email("صيغة البريد الإلكتروني غير صحيحة"),
  password: z.string().min(1, "كلمة المرور مطلوبة").min(6, "كلمة المرور 6 أحرف على الأقل"),
});

type LoginValues = z.infer<typeof loginSchema>;

const DEMO = { email: "sara@carzen.demo", password: "demo1234" };

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
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: DEMO,
  });

  useEffect(() => {
    if (isAuthenticated) router.replace(next);
  }, [isAuthenticated, next, router]);

  const onSubmit = handleSubmit((values) => login.mutate(values));
  const serverError = login.error ? resolveUserFacingError(login.error, "تعذر تسجيل الدخول") : null;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {serverError ? (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          البريد الإلكتروني
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="email"
            type="email"
            dir="ltr"
            autoComplete="username"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
            className={cn(
              "num h-11 w-full rounded-xl border bg-card ps-10 pe-3 text-start text-sm transition-colors outline-none focus-visible:ring-3",
              errors.email ? "border-destructive focus-visible:ring-destructive/20" : "border-input focus-visible:border-ring focus-visible:ring-ring/25",
            )}
          />
        </div>
        {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
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

      <div className="flex items-center justify-between rounded-xl border border-dashed border-border bg-muted/40 px-3.5 py-3">
        <div className="text-xs leading-relaxed">
          <p className="font-medium">حساب العرض التجريبي</p>
          <p className="num text-muted-foreground" dir="ltr">sara@carzen.demo · demo1234</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setValue("email", DEMO.email, { shouldValidate: true });
            setValue("password", DEMO.password, { shouldValidate: true });
            void onSubmit();
          }}
        >
          دخول سريع
        </Button>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="size-3.5" />
        التحقق بخطوتين (2FA) — قريبًا
      </p>
    </form>
  );
}
