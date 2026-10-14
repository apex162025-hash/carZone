import type { VendorAccount } from "@carzen/contracts/vendor/auth";
import type { VendorStaffMember } from "@carzen/contracts/vendor/team";
import type { ShiftPattern, StaffPermissions, StaffRole } from "@carzen/contracts/washes";

export type StaffPeriod = "today" | "7d" | "30d";

export const PERIODS: { value: StaffPeriod; label: string }[] = [
  { value: "today", label: "اليوم" },
  { value: "7d", label: "7 أيام" },
  { value: "30d", label: "30 يوم" },
];

/** Arabic labels for the per-person permission toggles (spec 02 §4 wash matrix). */
export const PERMISSIONS: { key: keyof StaffPermissions; label: string; hint: string }[] = [
  { key: "runService", label: "تنفيذ الخدمة", hint: "بدء وإنهاء الخدمة على السيارات" },
  { key: "collectPayment", label: "تحصيل الدفع", hint: "تسجيل الدفع نقدًا أو بالبطاقة" },
  { key: "confirmBooking", label: "تأكيد الحجوزات", hint: "قبول حجوزات التطبيق والهاتف" },
  { key: "cancelOrder", label: "إلغاء الطلبات", hint: "إلغاء طلب مع ذكر السبب" },
  { key: "refund", label: "الاسترداد", hint: "استرداد طلب مدفوع" },
  { key: "closeShift", label: "تقفيل الورديات وإغلاق اليوم", hint: "مراجعة الورديات وتسوية نهاية اليوم" },
  { key: "manageStaff", label: "إدارة الموظفين والورديات", hint: "إضافة موظفين وتعديل الجداول" },
  { key: "editServices", label: "تعديل الخدمات والأسعار", hint: "قائمة الخدمات والإضافات" },
];

/** Defaults per role — same rule as the platform: employee = run + collect, manager = all except services. */
export function defaultPermissions(role: StaffRole): StaffPermissions {
  const lead = role !== "employee";
  return {
    confirmBooking: lead,
    cancelOrder: lead,
    closeShift: lead,
    editServices: role === "owner",
    refund: lead,
    collectPayment: true,
    runService: true,
    manageStaff: lead,
  };
}

export const MAX_DISCOUNT_CAP = 50;

/** Egyptian mobile: local `01…` (11 digits) or the 10 digits after +20. */
export function isEgyptianMobile(value: string) {
  const d = value.replace(/\D/g, "");
  const local = d.length === 11 && d.startsWith("01") ? d.slice(1) : d.length === 12 && d.startsWith("20") ? d.slice(2) : d.length === 10 ? d : "";
  return /^1[0125]\d{8}$/.test(local);
}

/** "09:00" → "9:00 ص" (12-hour, same style as `formatTime`). */
export function formatClock(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const hh = h % 24;
  return `${hh % 12 || 12}:${String(m).padStart(2, "0")} ${hh >= 12 ? "م" : "ص"}`;
}

export function clockToMin(hhmm: string, isEnd = false) {
  const [h, m] = hhmm.split(":").map(Number);
  const v = h * 60 + m;
  return isEnd && v === 0 ? 1440 : v;
}

/** Patterns covering a given weekday (0 = Sunday). */
export function shiftsOnDay(patterns: ShiftPattern[], day: number) {
  return patterns.filter((p) => p.days.includes(day)).sort((a, b) => a.start.localeCompare(b.start));
}

export function weeklyHours(patterns: ShiftPattern[]) {
  const mins = patterns.reduce((s, p) => s + Math.max(0, clockToMin(p.end, true) - clockToMin(p.start)) * new Set(p.days).size, 0);
  return Math.round(mins / 6) / 10;
}

// ── Client mirror of the server rules (the API stays the authority) ──

type Account = Pick<VendorAccount, "id" | "role" | "permissions">;

export function canAddStaff(account: Account | null) {
  return Boolean(account?.permissions.manageStaff);
}

/** OW-11: only the owner edits role, branch, discount limit and permissions (MG-09). */
export function canEditMember(account: Account | null, member: Pick<VendorStaffMember, "role">) {
  return account?.role === "owner" && member.role !== "owner";
}

/** Why the toggle is unavailable, or null when allowed. */
export function toggleBlockedReason(account: Account | null, member: Pick<VendorStaffMember, "id" | "role">): string | null {
  if (!account?.permissions.manageStaff) return "ليس لديك صلاحية إدارة الموظفين";
  if (member.role === "owner") return "لا يمكن إيقاف حساب المالك";
  if (member.id === account.id) return "لا يمكنك إيقاف حسابك";
  if (member.role === "manager" && account.role !== "owner") return "إيقاف مدير فرع للمالك فقط";
  return null;
}

export function canEditSchedule(account: Account | null, member: Pick<VendorStaffMember, "role">) {
  return Boolean(account?.permissions.manageStaff) && member.role !== "owner";
}
