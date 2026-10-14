import type { ListParams, Localized, StatusCounts } from "./common";
import type { AuditLog } from "./audit";
import type { PaymentMethod } from "./orders";

export type TransactionStatus = "pending" | "paid" | "refunded" | "settled";

export interface Transaction {
  id: string;
  orderId: string;
  businessId: string;
  gross: number;
  commissionRate: number;
  commission: number;
  netToWash: number;
  date: string;
  status: TransactionStatus;
  flag: "discrepancy" | null;
  reviewNote: string | null;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  collectedBy: string;
  collectedAt: string;
  status: "paid" | "refunded";
}

export interface TransactionListItem extends Transaction {
  businessName: Localized;
  orderNumber: string;
  paymentMethod: PaymentMethod | null;
  collectedAmount: number | null;
}

export type TransactionFilter = TransactionStatus | "all" | "discrepancy";

export type TransactionListMeta = {
  counts: StatusCounts<TransactionStatus | "discrepancy">;
  totals: { gross: number; commission: number; netToWash: number };
};

export interface TransactionListParams extends ListParams {
  filter?: TransactionFilter;
  washId?: string;
}

export interface DiscrepancyDetails {
  transaction: TransactionListItem;
  orderTotal: number;
  collected: number;
  difference: number;
  cashier: string | null;
  collectedAt: string | null;
  auditLogs: AuditLog[];
}

export type FinancePeriod = "today" | "7d" | "30d";

export interface FinanceSeriesPoint {
  label: string;
  date: string;
  gmv: number;
  commission: number;
}

export interface FinanceOverview {
  period: FinancePeriod;
  gmv: number;
  commission: number;
  netToWashes: number;
  refunds: number;
  paidOrders: number;
  averageOrderValue: number;
  pendingPayouts: number;
  discrepancies: number;
  series: FinanceSeriesPoint[];
  topWashes: { id: string; name: Localized; gmv: number; commission: number; orders: number }[];
}

export interface CommissionWash {
  id: string;
  name: Localized;
  rate: number;
  isOverride: boolean;
  gmv30d: number;
}

export interface CommissionSettings {
  defaultCommissionPct: number;
  washes: CommissionWash[];
}

export interface UpdateCommissionPayload {
  defaultCommissionPct: number;
  overrides: Record<string, number | null>;
  reason: string;
}

export type PayoutStatus = "due" | "paid";

export interface Payout {
  id: string;
  businessId: string;
  periodStart: string;
  periodEnd: string;
  amountDue: number;
  amountPaid: number;
  status: PayoutStatus;
  reference: string | null;
  paidAt: string | null;
}

export interface PayoutListItem extends Payout {
  businessName: Localized;
}

export type PayoutListMeta = {
  counts: StatusCounts<PayoutStatus>;
  totals: { due: number; paid: number };
};

export interface MarkPayoutPaidPayload {
  amountPaid: number;
  reference: string;
  date: string;
}
