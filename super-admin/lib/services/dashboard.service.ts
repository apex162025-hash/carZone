import { getData } from "@/lib/api/request";
import type { DashboardPeriod, DashboardSummary } from "@/types/dashboard";

export function fetchDashboard(period: DashboardPeriod) {
  return getData<DashboardSummary>("/admin/dashboard", { period }, "تعذر تحميل لوحة المؤشرات");
}
