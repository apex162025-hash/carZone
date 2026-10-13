import { Suspense } from "react";
import { BadgeCheck, ChartNoAxesCombined, History, ShieldCheck } from "lucide-react";

import LoginForm from "@/components/modules/Auth/LoginForm";
import { BrandLogo } from "@/components/shared/layout/brand-logo";
import { getStaticPageMetadata } from "@/lib/config/pages";

export const metadata = getStaticPageMetadata("/login");

const HIGHLIGHTS = [
  { icon: ChartNoAxesCombined, title: "مؤشرات لحظية", text: "إجمالي المبيعات والعمولة والحجوزات لحظة بلحظة" },
  { icon: BadgeCheck, title: "تحكم كامل في السوق", text: "قبول المغاسل، التعليق، والعروض على مستوى المنصة" },
  { icon: History, title: "سجل تدقيق ثابت", text: "كل إجراء حساس يُسجل بسببه ولا يمكن تعديله" },
];

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <section className="bg-brand-gradient relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="bg-grid-faint absolute inset-0 opacity-20 [--foreground:#fff]" aria-hidden />
        <svg className="absolute -bottom-24 -start-24 size-[520px] text-white/10" viewBox="0 0 200 200" aria-hidden>
          <path fill="currentColor" d="M44.7,-58.7C56.6,-49.8,64.1,-34.6,68.5,-18.4C72.9,-2.3,74.1,14.8,67.6,28.3C61.1,41.8,46.9,51.7,31.6,58.6C16.4,65.5,0.1,69.4,-17,67.5C-34.1,65.6,-52,57.9,-62.8,44.3C-73.6,30.7,-77.3,11.2,-73.6,-6.1C-69.9,-23.5,-58.8,-38.7,-45,-47.4C-31.1,-56.2,-15.6,-58.4,0.6,-59.2C16.8,-60,33.6,-67.5,44.7,-58.7Z" transform="translate(100 100)" />
        </svg>
        <div className="relative flex items-center gap-2.5 text-white">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <svg viewBox="0 0 64 64" className="size-6" aria-hidden>
              <path d="M18 38c6-14 10-18 14-18s8 4 14 18" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
              <circle cx="32" cy="26" r="4.5" fill="#fff" />
            </svg>
          </span>
          <span className="num text-xl font-extrabold">Carzen</span>
        </div>

        <div className="relative max-w-lg space-y-8 text-white">
          <div className="space-y-3">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <ShieldCheck className="size-3.5" />
              مخصص لمديري النظام فقط
            </p>
            <h1 className="text-4xl leading-tight font-bold text-balance">
              إدارة سوق ومغاسل كارزن من مكان واحد
            </h1>
            <p className="text-base leading-relaxed text-white/80">
              راقب أداء المنصة، اعتمد المغاسل الجديدة، وحلّ الشكاوى وتابع المالية — بقرارات موثقة.
            </p>
          </div>
          <ul className="space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block text-sm text-white/75">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="num relative text-xs text-white/60">© 2026 Carzen · Cairo</p>
      </section>

      <section className="flex flex-col items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm space-y-8">
          <BrandLogo className="lg:hidden" />
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight">مرحبًا بعودتك</h2>
            <p className="text-sm text-muted-foreground">سجّل الدخول بحساب Super Admin للمتابعة.</p>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
