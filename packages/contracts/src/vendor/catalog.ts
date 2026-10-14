import type { Localized } from "../common";
import type { DiscountType, OfferStatus } from "../offers";
import type { Branch, BranchSettings, ServiceType, StaffPermissions, StaffRole, WashService, WorkingDay } from "../washes";

export interface VendorService extends WashService {
  branchName: Localized;
  description: Localized;
  ordersCount: number;
  revenue30d: number;
}

export interface ServicePayload {
  branchId: string;
  name: Localized;
  description: Localized;
  category: string;
  type: ServiceType;
  price: number;
  durationMin: number;
  active: boolean;
}

export interface VendorOffer {
  id: string;
  scope: "platform" | "wash";
  businessId: string | null;
  branchIds: string[];
  serviceCategories: string[];
  title: Localized;
  description: Localized;
  discountType: DiscountType;
  discountValue: number;
  startAt: string;
  endAt: string;
  status: OfferStatus;
  /** Platform offers are run by Carzen and are read-only here. */
  editable: boolean;
  redemptions: number;
}

export interface VendorOfferPayload {
  title: Localized;
  description: Localized;
  discountType: DiscountType;
  discountValue: number;
  startAt: string;
  endAt: string;
  branchIds: string[];
  serviceCategories: string[];
  publish: boolean;
}

export interface VendorBranch extends Branch {
  todayOrders: number;
  upcomingOrders: number;
  servicesCount: number;
  staffCount: number;
}

export interface UpdateBranchPayload {
  name: Localized;
  address: Localized;
  phone: string;
  amenities: string[];
  capacity: number;
  workingHours: WorkingDay[];
  active: boolean;
  reason: string;
}

export interface UpdateBookingRulesPayload {
  settings: BranchSettings;
  reason: string;
}

export type VendorNotificationType =
  | "new_booking"
  | "booking_cancelled"
  | "cash_difference"
  | "high_cancellation"
  | "branch_issue"
  | "daily_summary"
  | "review"
  | "platform"
  | "payout";

export interface VendorSettings {
  business: {
    id: string;
    name: Localized;
    ownerName: string;
    phone: string;
    email: string;
    commissionRate: number;
    status: string;
  };
  managerCanEditServices: boolean;
  notificationPrefs: Record<VendorNotificationType, boolean>;
  /** Read-only reference of what each role can do. */
  roleMatrix: { role: StaffRole; permissions: StaffPermissions; maxDiscountPct: number }[];
}

export interface UpdateVendorSettingsPayload {
  business?: { name: Localized; phone: string; email: string };
  managerCanEditServices?: boolean;
  notificationPrefs?: Record<VendorNotificationType, boolean>;
  reason: string;
}
