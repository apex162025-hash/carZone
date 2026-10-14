import type { ListParams, Localized, StatusCounts } from "./common";
import type { AuditLog } from "./audit";
import type { AdminUser } from "./auth";
import type { Customer } from "./customers";
import type { Order } from "./orders";
import type { Branch, Business } from "./washes";

export type ComplaintStatus =
  | "open"
  | "in_review"
  | "waiting"
  | "resolved"
  | "closed";

export type ComplaintCategory =
  | "quality"
  | "pricing"
  | "behavior"
  | "booking"
  | "refund"
  | "other";

export interface ComplaintNote {
  authorId: string;
  text: string;
  at: string;
}

export interface Complaint {
  id: string;
  ticket: string;
  customerId: string;
  businessId: string;
  branchId: string;
  orderId: string | null;
  category: ComplaintCategory;
  description: string;
  status: ComplaintStatus;
  assignedAdminId: string | null;
  notes: ComplaintNote[];
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintListItem extends Complaint {
  customerName: string;
  businessName: Localized;
  branchName: Localized;
  orderNumber: string | null;
  assigneeName: string | null;
}

export type ComplaintListMeta = {
  counts: StatusCounts<ComplaintStatus>;
};

export interface ComplaintListParams extends ListParams {
  status?: ComplaintStatus | "all";
  category?: ComplaintCategory | "all";
  assignee?: string;
}

export interface ComplaintDetails {
  complaint: Complaint;
  customer: Customer;
  business: Business;
  branch: Branch;
  order: Order | null;
  assignee: AdminUser | null;
  washComplaintCount: number;
  washOpenComplaints: number;
  noteAuthors: Record<string, string>;
  auditLogs: AuditLog[];
}

export interface UpdateComplaintPayload {
  status?: ComplaintStatus;
  assignedAdminId?: string | null;
  note?: string;
  resolution?: string;
}
