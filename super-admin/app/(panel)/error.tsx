"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Route-level error boundary for the panel: keeps the shell, offers a retry. */
export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <TriangleAlert className="size-7" />
      </span>
      <div className="space-y-1">
        <h1 className="text-lg font-bold">حدث خطأ غير متوقع</h1>
        <p className="max-w-sm text-sm text-muted-foreground">لم نتمكن من عرض هذه الصفحة. حاول مرة أخرى، وإن تكررت المشكلة تواصل مع الفريق التقني.</p>
      </div>
      <Button size="lg" onClick={reset}>
        إعادة المحاولة
      </Button>
    </div>
  );
}
