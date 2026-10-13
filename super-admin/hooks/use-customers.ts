"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { queryKeys } from "@/lib/query-keys";
import { fetchCustomer, fetchCustomers, toggleCustomerStatus } from "@/lib/services/customers.service";
import type { CustomerListParams, ToggleCustomerPayload } from "@/types/customers";

export function useCustomers(params: CustomerListParams) {
  return useQuery({
    queryKey: queryKeys.customers(params),
    queryFn: () => fetchCustomers(params),
    placeholderData: keepPreviousData,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: queryKeys.customer(id),
    queryFn: () => fetchCustomer(id),
    enabled: Boolean(id),
  });
}

export function useToggleCustomer(id: string) {
  return useAdminMutation((payload: ToggleCustomerPayload) => toggleCustomerStatus(id, payload), {
    invalidate: [queryKeys.customersRoot],
  });
}
