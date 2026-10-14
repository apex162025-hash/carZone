import type { Localized } from "../common";
import type { BusinessStatus, StaffPermissions } from "../washes";

/** Roles that can sign in to the vendor portal (employees use the employee app). */
export type VendorRole = "owner" | "manager";

export interface VendorBranchRef {
  id: string;
  name: Localized;
  area: string;
  active: boolean;
  capacity: number;
}

/**
 * The signed-in wash account and its scope. Owners see every branch of the
 * business; managers are locked to their own branch (spec MG-01).
 */
export interface VendorAccount {
  id: string;
  name: string;
  phone: string;
  role: VendorRole;
  businessId: string;
  businessName: Localized;
  businessStatus: BusinessStatus;
  businessStatusReason: string | null;
  homeBranchId: string;
  branches: VendorBranchRef[];
  permissions: StaffPermissions;
  maxDiscountPct: number;
  /** Owner always; managers only when the owner enabled it (spec MG-11). */
  canEditServices: boolean;
  lastLoginAt: string | null;
}

export interface VendorLoginPayload {
  phone: string;
  password: string;
}

export interface VendorLoginResponse {
  access_token: string;
  token_type: string;
  account: VendorAccount;
}

/** Branch filter shared by every vendor list: a branch id, or "all" (owners only). */
export type BranchScope = string;
