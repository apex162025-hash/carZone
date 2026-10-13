import { getData, getPaginated, send } from "@/lib/api/request";
import type {
  Customer,
  CustomerDetails,
  CustomerListItem,
  CustomerListMeta,
  CustomerListParams,
  ToggleCustomerPayload,
} from "@/types/customers";

export function fetchCustomers(params: CustomerListParams) {
  return getPaginated<CustomerListItem, CustomerListMeta>("/admin/customers", params, "تعذر تحميل العملاء");
}

export function fetchCustomer(id: string) {
  return getData<CustomerDetails>(`/admin/customers/${id}`, undefined, "تعذر تحميل بيانات العميل");
}

export function toggleCustomerStatus(id: string, payload: ToggleCustomerPayload) {
  return send<Customer>("post", `/admin/customers/${id}/status`, payload);
}
