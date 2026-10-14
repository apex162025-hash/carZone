"use client";

import type { ReactNode } from "react";
import { CheckCircle2, RotateCcw, Save } from "lucide-react";

import { ReasonDialog } from "@carzen/ui/components/shared/reason-dialog";
import { Button } from "@carzen/ui/components/ui/button";
import { cn } from "@carzen/ui/lib/utils";

type SettingsSaveBarProps = {
  dirty: boolean;
  /** Optional "N تغيير" count shown when dirty. */
  changeCount?: number;
  isPending: boolean;
  onReset: () => void;
  /** Omit inside a <form>: the button then submits it (validation runs first). */
  onSave?: () => void;
};

/**
 * Footer for each editable settings tab (same pattern as the Super Admin):
 * quiet when everything is saved, sticks to the bottom while there are edits.
 */
export function SettingsSaveBar({ dirty, changeCount, isPending, onReset, onSave }: SettingsSaveBarProps) {
  return (
    <div className={cn(dirty && "sticky bottom-4 z-20")}>
      <div
        role="region"
        aria-label="حفظ الإعدادات"
        className={cn(
          "flex flex-col gap-3 rounded-2xl border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between sm:ps-5",
          dirty ? "border-warning/40 bg-card/95 shadow-floating backdrop-blur" : "border-border/80 bg-card shadow-soft",
        )}
      >
        <p className="flex items-center gap-2 text-sm" aria-live="polite">
          {dirty ? (
            <>
              <span className="size-2 shrink-0 animate-pulse-ring rounded-full bg-warning [--tone:var(--warning)]" aria-hidden />
              <span>
                {changeCount ? (
                  <>
                    <span className="num font-semibold">{changeCount}</span> تغيير غير محفوظ
                  </>
                ) : (
                  "لديك تغييرات غير محفوظة"
                )}
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4 text-success" aria-hidden />
              <span className="text-muted-foreground">كل التغييرات محفوظة</span>
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={onReset} disabled={!dirty || isPending}>
            <RotateCcw />
            تراجع
          </Button>
          <Button type={onSave ? "button" : "submit"} onClick={onSave} disabled={!dirty} loading={isPending}>
            {!isPending ? <Save /> : null}
            حفظ التغييرات
          </Button>
        </div>
      </div>
    </div>
  );
}

type SaveReasonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionLabel: string;
  impact: ReactNode;
  isPending: boolean;
  onConfirm: (reason: string) => void;
};

/** Every settings write needs a reason (min 3 chars) — stored in the wash audit log. */
export function SaveReasonDialog({ open, onOpenChange, sectionLabel, impact, isPending, onConfirm }: SaveReasonDialogProps) {
  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`حفظ ${sectionLabel}`}
      description={impact}
      textLabel="سبب التعديل (يُسجل في سجل التدقيق)"
      textPlaceholder="مثال: تغيير رقم التواصل مع العملاء"
      minLength={3}
      confirmLabel="حفظ الإعدادات"
      isPending={isPending}
      onConfirm={({ text }) => onConfirm(text)}
    />
  );
}
