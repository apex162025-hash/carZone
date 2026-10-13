"use client";

import { useState } from "react";
import { Lock, MessagesSquare, SendHorizontal } from "lucide-react";

import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateComplaint } from "@/hooks/use-complaints";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { ComplaintNote } from "@/types/complaints";

type ComplaintNotesProps = {
  complaintId: string;
  notes: ComplaintNote[];
  noteAuthors: Record<string, string>;
};

const MAX_LENGTH = 1000;

/** Internal notes thread (AD-31) — visible to the admin team only, never to the customer. */
export function ComplaintNotes({ complaintId, notes, noteAuthors }: ComplaintNotesProps) {
  const [text, setText] = useState("");
  const addNote = useUpdateComplaint(complaintId);
  const trimmed = text.trim();

  const submit = () => {
    if (!trimmed || addNote.isPending) return;
    addNote.mutate({ note: trimmed }, { onSuccess: () => setText("") });
  };

  return (
    <SectionCard
      title="الملاحظات الداخلية"
      description="تظهر لفريق الإدارة فقط — لا يراها العميل أو المغسلة"
      icon={<MessagesSquare />}
      action={<span className="num rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{notes.length}</span>}
    >
      {notes.length ? (
        <ol className="space-y-3">
          {notes.map((n, i) => {
            const author = noteAuthors[n.authorId] ?? n.authorId;
            return (
              <li key={`${n.at}-${i}`} className="flex gap-3">
                <UserAvatar name={author} size="sm" className="mt-0.5" />
                <div className="min-w-0 flex-1 rounded-xl rounded-ss-sm bg-muted/60 px-3.5 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                    <p className="text-xs font-semibold">{author}</p>
                    <time className="num text-[11px] text-muted-foreground" dateTime={n.at} title={formatDateTime(n.at)}>
                      {formatRelative(n.at)}
                    </time>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed break-words whitespace-pre-line" dir="auto">
                    {n.text}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <EmptyState
          icon={<MessagesSquare />}
          title="لا توجد ملاحظات بعد"
          description="دوّن ما تم من تواصل أو إجراءات ليعرف الفريق آخر المستجدات."
          className="py-6"
        />
      )}

      <form
        className="mt-4 space-y-2 border-t border-border/60 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="complaint-note" className="sr-only">
          ملاحظة داخلية جديدة
        </label>
        <Textarea
          id="complaint-note"
          value={text}
          maxLength={MAX_LENGTH}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              submit();
            }
          }}
          rows={3}
          placeholder="اكتب ملاحظة داخلية… (Ctrl + Enter للإرسال)"
          className="min-h-20 resize-none"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="size-3" />
            تُسجل الملاحظة باسمك في سجل التدقيق
          </p>
          <Button type="submit" size="sm" disabled={!trimmed} loading={addNote.isPending}>
            {!addNote.isPending ? <SendHorizontal className="rtl:-scale-x-100" /> : null}
            إضافة ملاحظة
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
