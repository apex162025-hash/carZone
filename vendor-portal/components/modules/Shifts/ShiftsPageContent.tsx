"use client";

import { CalendarCheck2, ClipboardCheck } from "lucide-react";

import { PageHeader } from "@carzen/ui/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@carzen/ui/components/ui/tabs";
import { useUrlState } from "@carzen/ui/hooks/use-url-state";
import { DayClosingTab } from "@/components/modules/Shifts/DayClosingTab";
import { ShiftClosingsTab } from "@/components/modules/Shifts/ShiftClosingsTab";

export type ShiftsUrlState = {
  tab: string;
  filter: string;
  page: number;
  shift: string;
  branch: string;
  date: string;
};

export type SetShiftsUrlState = (patch: Partial<ShiftsUrlState>, options?: { resetPage?: boolean }) => void;

/** D11 — shift closings review (MG-07 / OW-15) + end-of-day reconciliation (MG-08). */
export default function ShiftsPageContent() {
  const [state, setState] = useUrlState<ShiftsUrlState>({ tab: "closings", filter: "submitted", page: 1, shift: "", branch: "", date: "" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="الورديات والإغلاق"
        description="راجع تقفيل كل وردية (المتوقع مقابل الفعلي في الصندوق)، ثم أغلق اليوم بتسوية النقدي والبطاقات والأونلاين — الإغلاق يقفل طلبات اليوم المدفوعة."
      />

      <Tabs value={state.tab} onValueChange={(tab) => setState({ tab: String(tab) })} className="gap-5">
        <TabsList className="h-10 w-full sm:w-fit">
          <TabsTrigger value="closings" className="px-4">
            <ClipboardCheck /> تقفيل الورديات
          </TabsTrigger>
          <TabsTrigger value="day" className="px-4">
            <CalendarCheck2 /> إغلاق اليوم
          </TabsTrigger>
        </TabsList>
        <TabsContent value="closings">
          <ShiftClosingsTab state={state} setState={setState} />
        </TabsContent>
        <TabsContent value="day">
          <DayClosingTab state={state} setState={setState} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
