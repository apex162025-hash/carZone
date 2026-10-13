import { getData, getPaginated, send } from "@/lib/api/request";
import type {
  ApplicationListMeta,
  ApplicationListParams,
  ApproveApplicationPayload,
  ApproveApplicationResult,
  RejectApplicationPayload,
  RequestChangesPayload,
  WashApplication,
} from "@/types/applications";

export function fetchApplications(params: ApplicationListParams) {
  return getPaginated<WashApplication, ApplicationListMeta>("/admin/applications", params, "تعذر تحميل طلبات الانضمام");
}

export function fetchApplication(id: string) {
  return getData<WashApplication>(`/admin/applications/${id}`, undefined, "تعذر تحميل الطلب");
}

export function approveApplication(id: string, payload: ApproveApplicationPayload) {
  return send<ApproveApplicationResult>("post", `/admin/applications/${id}/approve`, payload);
}

export function rejectApplication(id: string, payload: RejectApplicationPayload) {
  return send<WashApplication>("post", `/admin/applications/${id}/reject`, payload);
}

export function requestApplicationChanges(id: string, payload: RequestChangesPayload) {
  return send<WashApplication>("post", `/admin/applications/${id}/request-changes`, payload);
}
