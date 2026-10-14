"use client";

import { useState, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";

import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { cn } from "../../lib/utils";

export type ReasonPreset = { value: string; label: string };

type ReasonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  /** Optional preset picker (e.g. suspension reasons). */
  presets?: ReasonPreset[];
  presetLabel?: string;
  /** Free-text field label; set `textRequired={false}` to make it optional when a preset is picked. */
  textLabel?: string;
  textPlaceholder?: string;
  textRequired?: boolean;
  minLength?: number;
  confirmLabel: string;
  variant?: "default" | "destructive";
  isPending?: boolean;
  /** Extra content between the description and the form (impact previews, summaries). */
  children?: ReactNode;
  onConfirm: (values: { preset: string | null; text: string }) => void;
};

/**
 * Every sensitive admin action goes through this dialog: the reason is
 * mandatory and is written to the immutable audit log (spec AD-46).
 */
export function ReasonDialog(props: ReasonDialogProps) {
  const { open, onOpenChange, isPending } = props;
  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent className="gap-5 sm:max-w-lg">
        {/* Popup content unmounts on close, so the form state resets every time it opens. */}
        <ReasonForm {...props} />
      </DialogContent>
    </Dialog>
  );
}

function ReasonForm({
  onOpenChange,
  title,
  description,
  presets,
  presetLabel = "السبب",
  textLabel = "السبب (يُسجل في سجل التدقيق)",
  textPlaceholder = "اكتب السبب بوضوح…",
  textRequired = true,
  minLength = 5,
  confirmLabel,
  variant = "default",
  isPending,
  children,
  onConfirm,
}: ReasonDialogProps) {
  const [preset, setPreset] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);

  const presetError = presets && !preset ? "اختر سببًا" : null;
  const textError =
    textRequired && text.trim().length < minLength ? `اكتب ${minLength} أحرف على الأقل` : null;
  const invalid = Boolean(presetError || textError);

  const submit = () => {
    setTouched(true);
    if (invalid) return;
    onConfirm({ preset, text: text.trim() });
  };

  return (
    <>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                variant === "destructive" ? "bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground",
              )}
            >
              <ShieldAlert className="size-5" />
            </span>
            <div className="space-y-1.5 pt-0.5">
              <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
              {description ? <DialogDescription className="leading-relaxed">{description}</DialogDescription> : null}
            </div>
          </div>
        </DialogHeader>

        {children}

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {presets ? (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-xs font-medium">{presetLabel}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {presets.map((p) => (
                  <label
                    key={p.value}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                      preset === p.value ? "border-primary bg-secondary text-secondary-foreground" : "border-border hover:bg-muted",
                    )}
                  >
                    <input
                      type="radio"
                      name="reason-preset"
                      value={p.value}
                      checked={preset === p.value}
                      onChange={() => setPreset(p.value)}
                      className="size-3.5 accent-primary"
                    />
                    {p.label}
                  </label>
                ))}
              </div>
              {touched && presetError ? <p className="text-xs text-destructive">{presetError}</p> : null}
            </fieldset>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="reason-text" className="text-xs font-medium">
              {textLabel}
              {!textRequired ? <span className="ms-1 text-muted-foreground">(اختياري)</span> : null}
            </label>
            <Textarea
              id="reason-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={textPlaceholder}
              rows={3}
              aria-invalid={touched && Boolean(textError)}
              className="min-h-20 resize-none"
            />
            {touched && textError ? <p className="text-xs text-destructive">{textError}</p> : null}
          </div>

          <DialogFooter className="-mx-4 -mb-4 mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              إلغاء
            </Button>
            <Button
              type="submit"
              loading={isPending}
              className={cn(variant === "destructive" && "bg-destructive text-white hover:bg-destructive/90")}
            >
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
    </>
  );
}
