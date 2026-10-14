import type { ListParams, Localized } from "../common";
import type { PaymentMethod } from "../orders";
import type { ShiftPattern, Staff, StaffPermissions, StaffRole } from "../washes";

export interface StaffPerformance {
  completed: number;
  serviceValue: number;
  avgDurationMin: number | null;
  expectedDurationMin: number | null;
  rating: number | null;
  discountsCount: number;
  discountsAmount: number;
}

export interface VendorStaffMember extends Staff {
  branchName: Localized;
  onShiftNow: boolean;
  performance: StaffPerformance;
}

export interface VendorStaffListParams extends ListParams {
  branchId: string;
  role?: StaffRole | "all";
  period?: "today" | "7d" | "30d";
}

export interface StaffPayload {
  name: string;
  phone: string;
  role: Exclude<StaffRole, "owner">;
  branchId: string;
  maxDiscountPct: number;
  permissions: StaffPermissions;
}

export interface UpdateStaffPayload extends Partial<StaffPayload> {
  reason: string;
}

export interface UpdateSchedulePayload {
  shifts: ShiftPattern[];
}

export type ShiftClosingStatus = "open" | "submitted" | "reviewed" | "flagged";

export interface ShiftClosing {
  id: string;
  staffId: string;
  staffName: string;
  branchId: string;
  branchName: Localized;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  ordersCompleted: number;
  cashPayments: number;
  cardPayments: number;
  expectedCash: number;
  actualCash: number | null;
  difference: number | null;
  reason: string | null;
  status: ShiftClosingStatus;
  reviewNote: string | null;
  reviewedBy: string | null;
}

export interface ShiftListParams extends ListParams {
  branchId: string;
  filter?: "all" | "difference" | "open" | "submitted" | "reviewed" | "flagged";
}

export interface ReviewShiftPayload {
  status: "reviewed" | "flagged";
  note: string;
}

export type MethodTotals = Record<PaymentMethod, number> & { total: number };

export interface DayClosing {
  id: string;
  branchId: string;
  date: string;
  expected: MethodTotals;
  actual: MethodTotals;
  difference: number;
  reason: string | null;
  ordersLocked: number;
  closedBy: string;
  closedByName: string;
  closedAt: string;
}

export interface DayClosingSummary {
  branchId: string;
  branchName: Localized;
  date: string;
  closing: DayClosing | null;
  completedOrders: number;
  expected: MethodTotals;
  /** Blockers: orders that must be finished/paid before closing. */
  inServiceOrders: number;
  unpaidOrders: number;
  orders: { id: string; number: string; plate: string; total: number; method: PaymentMethod | null; paid: boolean }[];
  history: DayClosing[];
}

export interface DayClosingPayload {
  branchId: string;
  date: string;
  actual: Record<PaymentMethod, number>;
  reason?: string;
}
