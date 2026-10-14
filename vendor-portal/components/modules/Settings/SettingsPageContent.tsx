"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BellRing, Building2, KeyRound, Lock, SlidersHorizontal } from "lucide-react";

import { BusinessTab } from "@/components/modules/Settings/BusinessTab";
import { NotificationsTab } from "@/components/modules/Settings/NotificationsTab";
import { PermissionsTab } from "@/components/modules/Settings/PermissionsTab";
import { PageHeader } from "@carzen/ui/components/shared/page-header";
import { SectionCard } from "@carzen/ui/components/shared/section-card";
import { EmptyState, ErrorState } from "@carzen/ui/components/shared/states";
import { Button } from "@carzen/ui/components/ui/button";
import { Skeleton } from "@carzen/ui/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@carzen/ui/components/ui/tabs";
import { useUrlState } from "@carzen/ui/hooks/use-url-state";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useSettings } from "@/hooks/use-catalog";

type TabValue = "business" | "permissions" | "notifications";

const TABS: { value: TabValue; label: string; icon: ReactNode }[] = [
  { value: "business", label: "بيانات المغسلة", icon: <Building2 /> },
  { value: "permissions", label: "الصلاحيات", icon: <KeyRound /> },
  { value: "notifications", label: "الإشعارات", icon: <BellRing /> },
];

function SettingsSkeleton() {
  return (
    <div className="space-y-4" aria-busy aria-label="جاري التحميل">
      <div className="flex gap-4 border-b border-border pb-2">
        {TABS.map((t) => (
          <Skeleton key={t.value} className="h-6 w-24" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
      <Skeleton className="h-16 rounded-2xl" />
    </div>
  );
}

/** D19 / OW-11 — business data, manager permissions and notification preferences (owner-only edits). */
export default function SettingsPageContent() {
  const { account } = useBranchScope();
  const readOnly = account?.role !== "owner";
  const { data, isLoading, error, refetch, isRefetching } = useSettings();
  const [url, setUrl] = useUrlState({ tab: "business" });
  const tab: TabValue = TABS.some((t) => t.value === url.tab) ? (url.tab as TabValue) : "business";
  const [dirty, setDirty] = useState<Partial<Record<TabValue, boolean>>>({});

  // One stable callback per tab so the tabs' effects don't re-run every render.
  const onDirty = useMemo(
    () =>
      Object.fromEntries(
        TABS.map((t) => [t.value, (d: boolean) => setDirty((prev) => (Boolean(prev[t.value]) === d ? prev : { ...prev, [t.value]: d }))]),
      ) as Record<TabValue, (dirty: boolean) => void>,
    [],
  );

  const anyDirty = TABS.some((t) => dirty[t.value]);
  useEffect(() => {
    if (!anyDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [anyDirty]);

  const header = (
    <PageHeader
      title="الإعدادات"
      description="بيانات المغسلة، صلاحيات مديري الفروع وتفضيلات الإشعارات. كل قسم يُحفظ وحده، وكل حفظ يتطلب سببًا يُسجل في سجل التدقيق."
    />
  );

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        {header}
        <SettingsSkeleton />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        {header}
        <SectionCard>
          <ErrorState message={error.message} onRetry={() => refetch()} isRetrying={isRefetching} />
        </SectionCard>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        {header}
        <SectionCard>
          <EmptyState
            icon={<SlidersHorizontal />}
            title="لا توجد إعدادات"
            description="لم يُرجع الخادم إعدادات المغسلة. أعد المحاولة بعد قليل."
            action={
              <Button variant="outline" size="sm" onClick={() => refetch()} loading={isRefetching}>
                إعادة المحاولة
              </Button>
            }
          />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      {readOnly ? (
        <div role="note" className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <p className="font-semibold">الإعدادات للعرض فقط</p>
            <p className="mt-0.5 text-xs text-muted-foreground">تعديل بيانات المغسلة والصلاحيات والإشعارات متاح لمالك المغسلة وحده.</p>
          </div>
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={(v) => setUrl({ tab: String(v) })} className="gap-4">
        <div className="scrollbar-none overflow-x-auto border-b border-border">
          <TabsList variant="line" className="h-10 gap-4">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.icon}
                {t.label}
                {dirty[t.value] ? <span className="size-1.5 rounded-full bg-warning" role="img" aria-label="تغييرات غير محفوظة" /> : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* keepMounted: unsaved edits survive switching tabs. Keys remount a tab when the saved value changes. */}
        <TabsContent value="business" keepMounted>
          <BusinessTab key={JSON.stringify(data.business)} value={data.business} readOnly={readOnly} onDirtyChange={onDirty.business} />
        </TabsContent>
        <TabsContent value="permissions" keepMounted>
          <PermissionsTab
            key={String(data.managerCanEditServices)}
            managerCanEditServices={data.managerCanEditServices}
            roleMatrix={data.roleMatrix}
            readOnly={readOnly}
            onDirtyChange={onDirty.permissions}
          />
        </TabsContent>
        <TabsContent value="notifications" keepMounted>
          <NotificationsTab key={JSON.stringify(data.notificationPrefs)} value={data.notificationPrefs} readOnly={readOnly} onDirtyChange={onDirty.notifications} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
