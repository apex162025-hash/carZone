import { getData, getPaginated, send } from "@/lib/api/request";
import type { ReasonPayload } from "@/types/common";
import type { Order, OrderDetails, OrderListItem, OrderListMeta, OrderListParams } from "@/types/orders";

export function fetchOrders(params: OrderListParams) {
  return getPaginated<OrderListItem, OrderListMeta>("/admin/orders", params, "تعذر تحميل الحجوزات");
}

export function fetchOrder(id: string) {
  return getData<OrderDetails>(`/admin/orders/${id}`, undefined, "تعذر تحميل تفاصيل الحجز");
}

export function cancelOrder(id: string, payload: ReasonPayload) {
  return send<Order>("post", `/admin/orders/${id}/cancel`, payload);
}

export function flagOrderForFinance(id: string, payload: ReasonPayload) {
  return send<Order>("post", `/admin/orders/${id}/flag`, payload);
}
