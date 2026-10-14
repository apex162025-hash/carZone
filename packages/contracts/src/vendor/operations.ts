import type { AuditLog } from "../audit";
import type { ListParams, Localized, StatusCounts } from "../common";
import type { Customer, Vehicle } from "../customers";
import type { Payment } from "../finance";
import type { Order, OrderListItem, OrderSource, OrderStatus, PaymentMethod } from "../orders";
import type { Review } from "../reviews";
import type { BlockedSlot, Branch, WashService, WorkingDay } from "../washes";
import type { StaffRef } from "./dashboard";

/** Every state-changing action an owner/manager can take on an order. */
export type OrderAction =
  | "confirm"
  | "check_in"
  | "start"
  | "complete"
  | "collect_payment"
  | "cancel"
  | "no_show"
  | "assign"
  | "add_service"
  | "discount"
  | "note"
  | "refund";

/** The single "next step" an order card offers (spec EM-06). */
export type PrimaryAction = Extract<OrderAction, "confirm" | "check_in" | "start" | "complete" | "collect_payment">;

export interface VendorOrderListItem extends OrderListItem {
  staffName: string | null;
  vehicleLabel: string | null;
  nextAction: PrimaryAction | null;
  /** Minutes past the expected end (in service) or past the slot (confirmed). */
  overdueMin: number;
  /** True when the order is locked by a day closing. */
  locked: boolean;
}

export type BookingsTab = "today" | "upcoming" | "completed" | "cancelled" | "no_show";
export type OrdersTab = "active" | "waiting" | "in_service" | "payment_pending" | "paid" | "all";

export interface VendorOrderListParams extends ListParams {
  branchId: string;
  view: "bookings" | "orders";
  tab?: BookingsTab | OrdersTab;
  source?: OrderSource | "all";
  staffId?: string;
  date?: string;
}

export type VendorOrderListMeta = {
  counts: Record<string, number>;
  totalAmount: number;
};

export interface VendorOrderDetails {
  order: Order;
  customer: Customer | null;
  vehicle: Vehicle | null;
  branch: Branch;
  staff: StaffRef | null;
  payment: Payment | null;
  review: Review | null;
  auditLogs: AuditLog[];
  noteAuthors: Record<string, string>;
  /** Active add-ons of the branch that are not on the order yet. */
  availableAddons: WashService[];
  /** Active staff of the branch that can be assigned. */
  assignableStaff: StaffRef[];
  /** Actions this account may perform now (server-computed). */
  allowedActions: OrderAction[];
  nextAction: PrimaryAction | null;
  maxDiscountPct: number;
  locked: boolean;
}

export interface OrderActionPayload {
  action: OrderAction;
  staffId?: string;
  serviceId?: string;
  discountType?: "percent" | "fixed";
  discountValue?: number;
  reason?: string;
  text?: string;
  method?: PaymentMethod;
  amountReceived?: number;
}

export interface CreateOrderPayload {
  branchId: string;
  source: Extract<OrderSource, "phone" | "walk_in">;
  plate: string;
  customerPhone?: string;
  customerName?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  serviceIds: string[];
  /** Required for phone bookings; walk-ins start now. */
  scheduledAt?: string;
  notes?: string;
}

export interface PricePreview {
  items: { serviceId: string; name: Localized; type: "primary" | "addon"; price: number; durationMin: number }[];
  subtotal: number;
  offerDiscount: number;
  offerTitle: Localized | null;
  total: number;
  durationMin: number;
}

/** Returning-customer recognition by plate or phone (spec EM-11). */
export interface CustomerRecognition {
  customer: Customer | null;
  vehicle: Vehicle | null;
  visits: number;
  lastVisitAt: string | null;
  usualServiceId: string | null;
  usualServiceName: Localized | null;
}

export interface AvailabilitySlot {
  start: string;
  free: number;
  capacity: number;
  blocked: boolean;
  past: boolean;
}

export type LiveColumnKey = "upcoming" | "waiting" | "in_service" | "payment_pending" | "done";

export interface LiveBoard {
  branchId: string;
  generatedAt: string;
  columns: Record<LiveColumnKey, VendorOrderListItem[]>;
  bays: { busy: number; capacity: number };
  staffOnShift: StaffRef[];
}

export interface ScheduleSlot {
  start: string;
  occupied: number;
  capacity: number;
  blocked: BlockedSlot | null;
  past: boolean;
  orders: { id: string; number: string; plate: string; status: OrderStatus; serviceName: Localized }[];
}

export interface ScheduleDay {
  branchId: string;
  date: string;
  capacity: number;
  slotIntervalMin: number;
  hours: WorkingDay;
  slots: ScheduleSlot[];
  blocks: BlockedSlot[];
}

export interface CreateBlockPayload {
  branchId: string;
  start: string;
  end: string;
  reason: string;
}

export type VendorOrderCounts = StatusCounts<OrderStatus>;
