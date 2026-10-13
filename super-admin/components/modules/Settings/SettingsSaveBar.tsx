"use client";

import type { ReactNode } from "react";
import { CheckCircle2, RotateCcw, Save } from "lucide-react";

import { ReasonDialog } from "@/components/shared/reason-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SettingsSaveBarProps = {
  dirty: boolean;
  /** Optional "N تغييرات" count shown when dirty. */
  changeCount?: number;
  /** Blocks saving (e.g. invalid rows) and explains why. */
  blockedReason?: string | null;
  isPending: boolean;
  onReset: () => void;
  /** Omit inside a <form>: the button then submits it (validation runs first). */
  onSave?: () => void;
};

/**
 * Footer for each editable settings tab. Quiet when everything is saved;
 * sticks to the viewport bottom while there are unsaved edits.
 */
export function SettingsSaveBar({ dirty, changeCount, blockedReason, isPending, onReset, onSave }: SettingsSaveBarProps) {
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
                {blockedReason ? <span className="ms-2 text-xs text-destructive">{blockedReason}</span> : null}
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
          <Button type={onSave ? "button" : "submit"} onClick={onSave} disabled={!dirty || Boolean(blockedReason)} loading={isPending}>
            {!isPending ? <Save /> : null}
            حفظ التغييرات
          </Button>
        </div>
      </div>
    </div>
  );
}

type SaveSectionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionLabel: string;
  impact: ReactNode;
  isPending: boolean;
  onConfirm: (reason: string) => void;
  children?: ReactNode;
};

/** Mandatory reason before any settings write (stored with old → new values in the audit log). */
export function SaveSectionDialog({ open, onOpenChange, sectionLabel, impact, isPending, onConfirm, children }: SaveSectionDialogProps) {
  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`حفظ ${sectionLabel}`}
      description={impact}
      textLabel="سبب التعديل (يُسجل في سجل التدقيق)"
      textPlaceholder="مثال: تحديث رقم الدعم بعد تغيير مزود الخدمة"
      confirmLabel="حفظ الإعدادات"
      isPending={isPending}
      onConfirm={({ text }) => onConfirm(text)}
    >
      {children}
    </ReasonDialog>
  );
}
