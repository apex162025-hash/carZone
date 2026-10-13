import "server-only";

import type { RolesMatrix } from "@/types/admins";
import type { WashApplication } from "@/types/applications";
import type { AuditLog } from "@/types/audit";
import type { AdminUser } from "@/types/auth";
import type { Localized } from "@/types/common";
import type { Complaint } from "@/types/complaints";
import type { Customer, Vehicle } from "@/types/customers";
import type { Payment, Payout, Transaction } from "@/types/finance";
import type { AdminNotification } from "@/types/notifications";
import type { Offer } from "@/types/offers";
import type { Order } from "@/types/orders";
import type { Review } from "@/types/reviews";
import type { PlatformSettings } from "@/types/settings";
import type { Branch, Business, Staff, WashService } from "@/types/washes";

export interface StoredAdmin extends AdminUser {
  password: string;
}

export interface Shift {
  id: string;
  staffId: string;
  branchId: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  ordersCompleted: number;
  expectedCash: number;
  actualCash: number | null;
  difference: number | null;
  reason: Localized | null;
  reviewStatus: "open" | "reviewed";
}

/** Headline numbers that represent the whole platform (the seed is a sample). */
export interface PlatformBaseline {
  customers: number;
  activeWashes: number;
  branches: number;
  bookingsToday: number;
  completedToday: number;
  gmvToday: number;
  platformRevenueToday: number;
}

export interface MockDatabase {
  seededAt: string;
  customers: Customer[];
  vehicles: Vehicle[];
  businesses: Business[];
  branches: Branch[];
  services: WashService[];
  staff: Staff[];
  shifts: Shift[];
  orders: Order[];
  payments: Payment[];
  transactions: Transaction[];
  payouts: Payout[];
  reviews: Review[];
  offers: Offer[];
  complaints: Complaint[];
  applications: WashApplication[];
  admins: StoredAdmin[];
  notifications: AdminNotification[];
  auditLogs: AuditLog[];
  settings: PlatformSettings;
  defaultCommissionPct: number;
  roles: RolesMatrix;
  /** access token → admin id */
  sessions: Record<string, string>;
  counters: { nextTicket: number };
  baseline: PlatformBaseline;
}
