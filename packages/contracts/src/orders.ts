import type { ListParams, Localized, StatusCounts } from "./common";
import type { AuditLog } from "./audit";
import type { Complaint } from "./complaints";
import type { Payment, Transaction } from "./finance";
import type { Review } from "./reviews";
import type { Customer, Vehicle } from "./customers";
import type { Branch, Business, Staff } from "./washes";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "waiting"
  | "in_service"
  | "completed"
  | "cancelled"
  | "no_show";

export type PaymentStatus = "pending" | "paid" | "refunded";

export type OrderSource = "app" | "walk_in" | "phone";

export type PaymentMethod = "cash" | "card" | "online";

export type ActorType = "customer" | "staff" | "admin" | "system";

export interface OrderItem {
  serviceId: string;
  name: Localized;
  type: "primary" | "addon";
  price: number;
  durationMin: number;
}

export interface TimelineEntry {
  status: OrderStatus;
  at: string;
  byType: ActorType;
  byId: string;
}

export interface OrderNote {
  text: string;
  at: string;
  authorId?: string;
}

export interface OrderCancel {
  reason: string;
  byType: ActorType;
  byId: string;
  at: string;
}

export interface Order {
  id: string;
  number: string;
  code: string;
  source: OrderSource;
  customerId: string | null;
  vehicleId: string | null;
  plate: string;
  businessId: string;
  branchId: string;
  items: OrderItem[];
  subtotal: number;
  discount: { amount: number; pct: number; reason: string } | null;
  offerId: string | null;
  total: number;
  durationMin: number;
  scheduledAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  assignedStaffId: string | null;
  timeline: TimelineEntry[];
  notes: OrderNote[];
  cancel: OrderCancel | null;
  flag: "finance_review" | null;
  createdAt: string;
  /** Set when an end-of-day closing locked this order (spec MG-08). */
  closedInDayId?: string | null;
}

export interface OrderListItem extends Order {
  customerName: string | null;
  businessName: Localized;
  branchName: Localized;
  serviceName: Localized;
}

export type OrderListMeta = {
  counts: StatusCounts<OrderStatus>;
  totalAmount: number;
};

export interface OrderListParams extends ListParams {
  status?: OrderStatus | "all";
  source?: OrderSource | "all";
  payment?: PaymentStatus | "all";
  washId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface OrderDetails {
  order: Order;
  customer: Customer | null;
  vehicle: Vehicle | null;
  business: Business;
  branch: Branch;
  staff: Staff | null;
  payment: Payment | null;
  transaction: Transaction | null;
  review: Review | null;
  complaint: Complaint | null;
  auditLogs: AuditLog[];
}
