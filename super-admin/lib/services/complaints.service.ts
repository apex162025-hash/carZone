import { getData, getPaginated, send } from "@/lib/api/request";
import type {
  Complaint,
  ComplaintDetails,
  ComplaintListItem,
  ComplaintListMeta,
  ComplaintListParams,
  UpdateComplaintPayload,
} from "@/types/complaints";

export function fetchComplaints(params: ComplaintListParams) {
  return getPaginated<ComplaintListItem, ComplaintListMeta>("/admin/complaints", params, "تعذر تحميل الشكاوى");
}

export function fetchComplaint(id: string) {
  return getData<ComplaintDetails>(`/admin/complaints/${id}`, undefined, "تعذر تحميل الشكوى");
}

export function updateComplaint(id: string, payload: UpdateComplaintPayload) {
  return send<Complaint>("patch", `/admin/complaints/${id}`, payload);
}
