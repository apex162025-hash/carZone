import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="relative flex size-20 items-center justify-center rounded-3xl bg-secondary text-secondary-foreground">
        <span className="bg-grid-faint absolute inset-0 rounded-3xl opacity-70" aria-hidden />
        <Compass className="relative size-9" />
      </div>
      <div className="space-y-1.5">
        <p className="num text-sm font-semibold text-primary">404</p>
        <h1 className="text-2xl font-bold">الصفحة غير موجودة</h1>
        <p className="max-w-sm text-sm text-muted-foreground">ربما تم نقل الصفحة أو أن الرابط غير صحيح. يمكنك البحث بـ Ctrl K أو العودة للوحة المؤشرات.</p>
      </div>
      <Button size="lg" render={<Link href="/dashboard" />}>
        العودة للوحة المؤشرات
      </Button>
    </div>
  );
}
