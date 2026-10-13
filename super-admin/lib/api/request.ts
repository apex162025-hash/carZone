"use client";

import { apiClient } from "@/lib/axios";
import { throwApiError } from "@/lib/api/api-error-handler";
import type { ApiEnvelope, Paginated } from "@/types/common";

/** Result of a mutation: payload + the backend's user-facing message (used for toasts). */
export type MutationResult<T> = {
  data: T;
  message: string;
};

type QueryValue = string | number | boolean | undefined | null;

/** Drops empty values and the "all" sentinel so URLs stay clean and cache keys stable. */
export function cleanParams<P extends object>(params?: P): Record<string, string | number | boolean> {
  if (!params) return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params as Record<string, QueryValue>)) {
    if (value === undefined || value === null || value === "" || value === "all") continue;
    out[key] = value;
  }
  return out;
}

export async function getData<T>(url: string, params?: object, fallback = "تعذر تحميل البيانات"): Promise<T> {
  try {
    const { data } = await apiClient.get<ApiEnvelope<T>>(url, { params: cleanParams(params) });
    return data.data;
  } catch (error) {
    throwApiError(error, fallback);
  }
}

export async function getPaginated<T, M = undefined>(
  url: string,
  params?: object,
  fallback = "تعذر تحميل البيانات",
): Promise<Paginated<T, M>> {
  try {
    const { data } = await apiClient.get<ApiEnvelope<T[], M>>(url, { params: cleanParams(params) });
    return {
      items: data.data,
      pagination: data.pagination ?? {
        current_page: 1,
        per_page: data.data.length,
        total: data.data.length,
        last_page: 1,
        from: data.data.length ? 1 : 0,
        to: data.data.length,
        has_next: false,
      },
      meta: data.meta as M,
    };
  } catch (error) {
    throwApiError(error, fallback);
  }
}

export async function send<T>(
  method: "post" | "put" | "patch" | "delete",
  url: string,
  body?: unknown,
  fallback = "تعذر تنفيذ العملية",
): Promise<MutationResult<T>> {
  try {
    const { data } = await apiClient.request<ApiEnvelope<T>>({ method, url, data: body });
    return { data: data.data, message: data.message };
  } catch (error) {
    throwApiError(error, fallback);
  }
}
