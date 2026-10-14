import { getData, getPaginated, send } from "@/lib/api/request";
import type { BlockedSlot } from "@carzen/contracts/washes";
import type { VendorDashboard, VendorPeriod } from "@carzen/contracts/vendor/dashboard";
import type {
  AvailabilitySlot,
  CreateBlockPayload,
  CreateOrderPayload,
  CustomerRecognition,
  LiveBoard,
  OrderActionPayload,
  PricePreview,
  ScheduleDay,
  VendorOrderDetails,
  VendorOrderListItem,
  VendorOrderListMeta,
  VendorOrderListParams,
} from "@carzen/contracts/vendor/operations";

export function fetchDashboard(branchId: string, period: VendorPeriod) {
  return getData<VendorDashboard>("/vendor/dashboard", { branchId, period }, "تعذر تحميل الرئيسية");
}

export function fetchOrders(params: VendorOrderListParams) {
  return getPaginated<VendorOrderListItem, VendorOrderListMeta>("/vendor/orders", params, "تعذر تحميل الطلبات");
}

export function fetchOrder(id: string) {
  return getData<VendorOrderDetails>(`/vendor/orders/${id}`, undefined, "تعذر تحميل الطلب");
}

export function createOrder(payload: CreateOrderPayload) {
  return send<VendorOrderListItem>("post", "/vendor/orders", payload, "تعذر إنشاء الطلب");
}

export function runOrderAction(id: string, payload: OrderActionPayload) {
  return send<VendorOrderListItem>("post", `/vendor/orders/${id}/actions`, payload);
}

export function bulkConfirm(ids: string[]) {
  return send<{ confirmed: number }>("post", "/vendor/orders/bulk-confirm", { ids });
}

export function fetchPricePreview(branchId: string, serviceIds: string[]) {
  return getData<PricePreview>("/vendor/price-preview", { branchId, serviceIds: serviceIds.join(",") });
}

export function fetchRecognition(plate: string, phone: string) {
  return getData<CustomerRecognition>("/vendor/recognize", { plate, phone });
}

export function fetchAvailability(branchId: string, date: string, serviceIds: string[]) {
  return getData<AvailabilitySlot[]>("/vendor/availability", { branchId, date, serviceIds: serviceIds.join(",") }, "تعذر تحميل المواعيد المتاحة");
}

export function fetchLive(branchId: string) {
  return getData<LiveBoard>("/vendor/live", { branchId }, "تعذر تحميل اللوحة المباشرة");
}

export function fetchSchedule(branchId: string, date: string) {
  return getData<ScheduleDay>("/vendor/schedule", { branchId, date }, "تعذر تحميل الجدول");
}

export function createBlock(payload: CreateBlockPayload) {
  return send<BlockedSlot>("post", "/vendor/schedule/blocks", payload);
}

export function deleteBlock(id: string) {
  return send<null>("delete", `/vendor/schedule/blocks/${id}`);
}
