"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, CalendarClock, FileText, Layers, Settings2, SlidersHorizontal } from "lucide-react";

import { BookingDefaultsTab } from "@/components/modules/Settings/BookingDefaultsTab";
import { CatalogsSettingsTab } from "@/components/modules/Settings/CatalogsSettingsTab";
import { GeneralSettingsTab } from "@/components/modules/Settings/GeneralSettingsTab";
import { LegalSettingsTab } from "@/components/modules/Settings/LegalSettingsTab";
import { NotificationTemplatesTab } from "@/components/modules/Settings/NotificationTemplatesTab";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/hooks/use-platform";
import { useUrlState } from "@/hooks/use-url-state";
import type { SettingsSection } from "@/types/settings";

type TabValue = SettingsSection | "notificationTemplates";

const TABS: { value: TabValue; label: string; icon: React.ReactNode }[] = [
  { value: "general", label: "عام", icon: <Settings2 /> },
  { value: "catalogs", label: "الكتالوجات", icon: <Layers /> },
  { value: "bookingDefaults", label: "إعدادات الحجز", icon: <CalendarClock /> },
  { value: "legal", label: "النصوص القانونية", icon: <FileText /> },
  { value: "notificationTemplates", label: "قوالب الإشعارات", icon: <BellRing /> },
];

const EDITABLE: SettingsSection[] = ["general", "catalogs", "bookingDefaults", "legal"];

function SettingsSkeleton() {
  return (
    <div className="space-y-4" aria-busy aria-label="جاري التحميل">
      <div className="flex gap-4 border-b border-border pb-2">
        {TABS.map((t) => (
          <Skeleton key={t.value} className="h-6 w-24" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <Skeleton className="h-16 rounded-2xl" />
    </div>
  );
}

export default function SettingsPageContent() {
  const { data, isLoading, error, refetch, isRefetching } = useSettings();
  const [url, setUrl] = useUrlState({ tab: "general" });
  const tab = TABS.some((t) => t.value === url.tab) ? url.tab : "general";
  const [dirty, setDirty] = useState<Partial<Record<SettingsSection, boolean>>>({});

  // One stable callback per section so the tabs' effects don't re-run every render.
  const onDirty = useMemo(
    () =>
      Object.fromEntries(
        EDITABLE.map((s) => [s, (d: boolean) => setDirty((prev) => (Boolean(prev[s]) === d ? prev : { ...prev, [s]: d }))]),
      ) as Record<SettingsSection, (dirty: boolean) => void>,
    [],
  );

  const anyDirty = EDITABLE.some((s) => dirty[s]);
  useEffect(() => {
    if (!anyDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [anyDirty]);

  const header = (
    <PageHeader
      title="إعدادات المنصة"
      description="إعدادات تسري على المنصة كلها وتطبيق العميل. كل تبويب يُحفظ وحده، وكل حفظ يتطلب سببًا يُسجل مع القيم القديمة والجديدة في سجل التدقيق."
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
            description="لم يُرجع الخادم إعدادات المنصة. أعد المحاولة بعد قليل."
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

      <Tabs value={tab} onValueChange={(v) => setUrl({ tab: String(v) })} className="gap-4">
        <div className="scrollbar-none overflow-x-auto border-b border-border">
          <TabsList variant="line" className="h-10 gap-4">
            {TABS.map((t) => {
              const isDirty = t.value !== "notificationTemplates" && dirty[t.value];
              return (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.icon}
                  {t.label}
                  {isDirty ? (
                    <span className="size-1.5 rounded-full bg-warning" role="img" aria-label="تغييرات غير محفوظة" />
                  ) : null}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* keepMounted: unsaved edits survive switching tabs. */}
        <TabsContent value="general" keepMounted>
          <GeneralSettingsTab value={data.general} onDirtyChange={onDirty.general} />
        </TabsContent>
        <TabsContent value="catalogs" keepMounted>
          <CatalogsSettingsTab value={data.catalogs} onDirtyChange={onDirty.catalogs} />
        </TabsContent>
        <TabsContent value="bookingDefaults" keepMounted>
          <BookingDefaultsTab value={data.bookingDefaults} onDirtyChange={onDirty.bookingDefaults} />
        </TabsContent>
        <TabsContent value="legal" keepMounted>
          <LegalSettingsTab value={data.legal} onDirtyChange={onDirty.legal} />
        </TabsContent>
        <TabsContent value="notificationTemplates">
          <NotificationTemplatesTab templates={data.notificationTemplates ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
