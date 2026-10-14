"use client";

import { useState } from "react";
import { Info, MapPinned, RefreshCw } from "lucide-react";

import { PageHeader } from "@carzen/ui/components/shared/page-header";
import { SectionCard } from "@carzen/ui/components/shared/section-card";
import { EmptyState, ErrorState } from "@carzen/ui/components/shared/states";
import { Button } from "@carzen/ui/components/ui/button";
import { Skeleton } from "@carzen/ui/components/ui/skeleton";
import { formatNumber, serverNow } from "@carzen/ui/lib/format";
import { cn } from "@carzen/ui/lib/utils";
import { BookingRulesDialog } from "@/components/modules/Branches/BookingRulesDialog";
import { BranchCard } from "@/components/modules/Branches/BranchCard";
import { BranchEditorSheet } from "@/components/modules/Branches/BranchEditorSheet";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useBranches } from "@/hooks/use-catalog";

export default function BranchesPageContent() {
  const { account } = useBranchScope();
  const isOwner = account?.role === "owner";
  const { data, isLoading, isFetching, error, refetch } = useBranches();
  const [editId, setEditId] = useState<string | null>(null);
  const [rulesId, setRulesId] = useState<string | null>(null);

  const branches = data ?? [];
  const activeCount = branches.filter((b) => b.active).length;
  // Resolve from the live list so the open editor always sees fresh data.
  const editing = isOwner ? branches.find((b) => b.id === editId) ?? null : null;
  const rulesFor = isOwner ? branches.find((b) => b.id === rulesId) ?? null : null;
  const nowMs = serverNow().getTime();

  return (
    <div className="space-y-6">
      <PageHeader
        title="الفروع"
        description={
          isOwner
            ? "بيانات كل فرع كما يراها العملاء — العنوان والسعة والمرافق وساعات العمل، وقواعد الحجز الخاصة به."
            : "بيانات فرعك وساعات العمل وقواعد الحجز كما يراها العملاء."
        }
        meta={
          data ? (
            <span className="num rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {formatNumber(activeCount)} نشط من {formatNumber(branches.length)}
            </span>
          ) : null
        }
        actions={
          <Button variant="outline" size="icon-lg" onClick={() => refetch()} disabled={isFetching} aria-label="تحديث">
            <RefreshCw className={cn(isFetching && "animate-spin")} />
          </Button>
        }
      />

      {!isOwner && account ? (
        <p className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          التعديل للمالك فقط — تعديل بيانات الفرع وساعات العمل وقواعد الحجز من صلاحيات مالك المغسلة. تواصل معه لأي تغيير.
        </p>
      ) : null}

      {error && !data ? (
        <SectionCard>
          <ErrorState message={error.message} onRetry={() => refetch()} isRetrying={isFetching} />
        </SectionCard>
      ) : isLoading ? (
        <div className="grid gap-6 xl:grid-cols-2" aria-busy aria-label="جاري تحميل الفروع">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-[520px] rounded-2xl" />
          ))}
        </div>
      ) : !branches.length ? (
        <SectionCard>
          <EmptyState
            icon={<MapPinned />}
            title="لا توجد فروع مرتبطة بحسابك"
            description="تُضاف الفروع الجديدة بعد مراجعة فريق كارزن لبياناتها. إن كان لديك فرع غير ظاهر تواصل مع الدعم."
          />
        </SectionCard>
      ) : (
        <div className="grid items-stretch gap-6 xl:grid-cols-2">
          {branches.map((b) => (
            <BranchCard key={b.id} branch={b} canEdit={isOwner} nowMs={nowMs} onEdit={() => setEditId(b.id)} onRules={() => setRulesId(b.id)} />
          ))}
        </div>
      )}

      <BranchEditorSheet branch={editing} onOpenChange={(o) => !o && setEditId(null)} />
      <BookingRulesDialog branch={rulesFor} onOpenChange={(o) => !o && setRulesId(null)} />
    </div>
  );
}
