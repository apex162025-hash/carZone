import { getData, getPaginated, send } from "@/lib/api/request";
import type { ListParams } from "@/types/common";
import type {
  CommissionSettings,
  DiscrepancyDetails,
  FinanceOverview,
  FinancePeriod,
  MarkPayoutPaidPayload,
  Payout,
  PayoutListItem,
  PayoutListMeta,
  Transaction,
  TransactionListItem,
  TransactionListMeta,
  TransactionListParams,
  UpdateCommissionPayload,
} from "@/types/finance";

export function fetchFinanceOverview(period: FinancePeriod) {
  return getData<FinanceOverview>("/admin/finance/overview", { period }, "تعذر تحميل الملخص المالي");
}

export function fetchTransactions(params: TransactionListParams) {
  return getPaginated<TransactionListItem, TransactionListMeta>("/admin/finance/transactions", params, "تعذر تحميل المعاملات");
}

export function fetchTransaction(id: string) {
  return getData<DiscrepancyDetails>(`/admin/finance/transactions/${id}`, undefined, "تعذر تحميل المعاملة");
}

export function resolveDiscrepancy(id: string, note: string) {
  return send<Transaction>("post", `/admin/finance/transactions/${id}/resolve`, { note });
}

export function fetchCommission() {
  return getData<CommissionSettings>("/admin/finance/commission", undefined, "تعذر تحميل إعدادات العمولة");
}

export function updateCommission(payload: UpdateCommissionPayload) {
  return send<null>("put", "/admin/finance/commission", payload);
}

export function fetchPayouts(params: ListParams & { status?: string }) {
  return getPaginated<PayoutListItem, PayoutListMeta>("/admin/finance/payouts", params, "تعذر تحميل المدفوعات");
}

export function markPayoutPaid(id: string, payload: MarkPayoutPaidPayload) {
  return send<Payout>("post", `/admin/finance/payouts/${id}/pay`, payload);
}
