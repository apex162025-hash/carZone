import type { ListParams, Localized, StatusCounts } from "./common";
import type { AuditLog } from "./audit";
import type { Complaint } from "./complaints";
import type { OrderStatus } from "./orders";
import type { Review } from "./reviews";
import type { Transaction } from "./finance";

export type BusinessStatus =
  | "pending"
  | "approved"
  | "active"
  | "suspended"
  | "rejected";

export interface Business {
  id: string;
  name: Localized;
  ownerId: string;
  ownerName: string;
  status: BusinessStatus;
  statusReason: string | null;
  commissionRate: number | null;
  rating: number;
  createdAt: string;
}

export interface WorkingDay {
  open: string;
  close: string;
  closed: boolean;
}

export interface BranchSettings {
  autoConfirm: boolean;
  slotIntervalMin: number;
  leadTimeMin: number;
  maxAdvanceDays: number;
  freeCancelMin: number;
  noShowGraceMin: number;
  reminderMin: number;
}

/** A time range removed from customer availability (spec MG-05). */
export interface BlockedSlot {
  id: string;
  start: string;
  end: string;
  reason: string;
  createdBy: string;
}

export interface Branch {
  id: string;
  businessId: string;
  name: Localized;
  area: string;
  address: Localized;
  lat: number;
  lng: number;
  phone: string;
  amenities: string[];
  capacity: number;
  active: boolean;
  featured: boolean;
  workingHours: WorkingDay[];
  settings: BranchSettings;
  rating: number;
  reviewCount: number;
  blockedSlots: BlockedSlot[];
}

export type ServiceType = "primary" | "addon";

export interface WashService {
  id: string;
  branchId: string;
  type: ServiceType;
  category: string;
  name: Localized;
  price: number;
  durationMin: number;
  active: boolean;
}

export type StaffRole = "owner" | "manager" | "employee";

export type StaffStatus = "active" | "suspended";

/** Per-person permission toggles (spec 02 §4 wash matrix). */
export interface StaffPermissions {
  confirmBooking: boolean;
  cancelOrder: boolean;
  closeShift: boolean;
  editServices: boolean;
  refund: boolean;
  collectPayment: boolean;
  runService: boolean;
  manageStaff: boolean;
}

/** Recurring weekly shift: days are 0 (Sunday) … 6 (Saturday). */
export interface ShiftPattern {
  start: string;
  end: string;
  days: number[];
}

export interface Staff {
  id: string;
  businessId: string;
  branchId: string;
  name: string;
  phone: string;
  role: StaffRole;
  status: StaffStatus;
  maxDiscountPct: number;
  permissions: StaffPermissions;
  scheduledShifts: ShiftPattern[];
  joinedAt: string;
}

export interface WashListItem extends Business {
  branchesCount: number;
  areas: string[];
  ordersCount: number;
  completedCount: number;
  activeOrders: number;
  complaintsCount: number;
  openComplaints: number;
  gmv: number;
  lastActivityAt: string | null;
}

export type WashListMeta = {
  counts: StatusCounts<BusinessStatus>;
};

export interface WashListParams extends ListParams {
  status?: BusinessStatus | "all";
  area?: string;
}

export interface WashBranchSummary extends Branch {
  todayOrders: number;
  servicesCount: number;
}

export interface WashOrderSummary {
  id: string;
  number: string;
  branchName: Localized;
  serviceName: Localized;
  scheduledAt: string;
  status: OrderStatus;
  total: number;
}

export interface WashFinancials {
  gross: number;
  commission: number;
  netToWash: number;
  pendingPayout: number;
  effectiveRate: number;
}

export interface WashBookingStats {
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  upcoming: number;
}

export interface WashDetails {
  business: Business;
  branches: WashBranchSummary[];
  services: WashService[];
  staff: Staff[];
  bookingStats: WashBookingStats;
  recentOrders: WashOrderSummary[];
  reviews: Review[];
  complaints: Complaint[];
  transactions: Transaction[];
  financials: WashFinancials;
  auditLogs: AuditLog[];
}

export type SuspendReason =
  | "repeated_complaints"
  | "incorrect_information"
  | "operational_issue"
  | "policy_violation"
  | "owner_request";

export interface SuspendWashPayload {
  reason: SuspendReason;
  note: string;
  cancelUpcoming: boolean;
}

export interface ReactivateWashPayload {
  note: string;
}

export interface SuspensionImpact {
  upcomingOrders: WashOrderSummary[];
  activeBranches: number;
}

export interface UpdateWashPayload {
  patch: Partial<Pick<Business, "name" | "ownerName" | "commissionRate">>;
  reason: string;
}

export interface BranchListItem extends Branch {
  businessName: Localized;
  businessStatus: BusinessStatus;
  todayOrders: number;
}

export interface BranchListParams extends ListParams {
  area?: string;
  status?: "all" | "active" | "inactive";
}

export interface ToggleBranchPayload {
  active: boolean;
  reason: string;
}

export interface StaffListItem extends Staff {
  businessName: Localized;
  branchName: Localized | null;
  businessStatus: BusinessStatus;
}

export interface StaffListParams extends ListParams {
  role?: StaffRole | "all";
}

export interface ToggleStaffPayload {
  suspended: boolean;
  reason: string;
}
