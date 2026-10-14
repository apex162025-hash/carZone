import type { ListParams, StatusCounts } from "./common";
import type { AuditLog } from "./audit";
import type { Complaint } from "./complaints";
import type { OrderListItem } from "./orders";
import type { Review } from "./reviews";

export type CustomerStatus = "active" | "suspended";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  status: CustomerStatus;
  statusReason?: string | null;
  createdAt: string;
  lastActiveAt: string;
}

export interface Vehicle {
  id: string;
  customerId: string;
  make: string;
  model: string;
  year: number | null;
  color: string;
  plate: string;
  plateNormalized: string;
  isDefault: boolean;
}

export interface CustomerListItem extends Customer {
  vehiclesCount: number;
  plates: string[];
  ordersCount: number;
  completedCount: number;
  totalSpent: number;
}

export type CustomerFilter = "all" | "active" | "suspended" | "new" | "high_activity";

export type CustomerListMeta = {
  counts: StatusCounts<Exclude<CustomerFilter, "all">>;
};

export interface CustomerListParams extends ListParams {
  filter?: CustomerFilter;
}

export interface CustomerDetails {
  customer: Customer;
  vehicles: Vehicle[];
  orders: OrderListItem[];
  reviews: Review[];
  complaints: Complaint[];
  auditLogs: AuditLog[];
  stats: {
    ordersCount: number;
    completedCount: number;
    cancelledCount: number;
    noShowCount: number;
    totalSpent: number;
    avgRating: number | null;
  };
}

export interface ToggleCustomerPayload {
  suspended: boolean;
  reason: string;
}
