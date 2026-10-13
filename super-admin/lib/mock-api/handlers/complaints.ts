import "server-only";

import type { ComplaintDetails, ComplaintListItem, ComplaintStatus } from "@/types/complaints";
import { logAudit } from "@/lib/mock-api/db";
import { MockApiError, countBy, matchesSearch, ok, paginate, sortBy } from "@/lib/mock-api/http";
import { adminName, branchName, businessName, customerName, findOrThrow } from "@/lib/mock-api/lookups";
import { route } from "@/lib/mock-api/router";

const STATUSES: ComplaintStatus[] = ["open", "in_review", "waiting", "resolved", "closed"];

/** Allowed forward moves; reopening a closed ticket is not part of the MVP flow. */
const TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  open: ["in_review", "waiting", "resolved"],
  in_review: ["waiting", "resolved", "open"],
  waiting: ["in_review", "resolved"],
  resolved: ["closed", "in_review"],
  closed: [],
};

export const complaintRoutes = [
  route("GET", "/admin/complaints", ({ db, query }) => {
    const status = query.get("status");
    const category = query.get("category");
    const assignee = query.get("assignee");

    const list: ComplaintListItem[] = db.complaints.map((c) => ({
      ...c,
      customerName: customerName(db, c.customerId) ?? "—",
      businessName: businessName(db, c.businessId),
      branchName: branchName(db, c.branchId),
      orderNumber: db.orders.find((o) => o.id === c.orderId)?.number ?? null,
      assigneeName: adminName(db, c.assignedAdminId),
    }));
    const base = list.filter((c) => {
      if (category && category !== "all" && c.category !== category) return false;
      if (assignee === "unassigned" && c.assignedAdminId) return false;
      if (assignee && assignee !== "all" && assignee !== "unassigned" && c.assignedAdminId !== assignee) return false;
      return matchesSearch(query, c.ticket, c.customerName, c.businessName.ar, c.orderNumber, c.description);
    });
    const counts = countBy(base, STATUSES, (c) => c.status);
    const filtered = status && status !== "all" ? base.filter((c) => c.status === status) : base;
    const sorted = sortBy(filtered, query, { createdAt: (c) => c.createdAt, ticket: (c) => c.ticket, status: (c) => c.status }, { key: "createdAt", order: "asc" });
    const { items, pagination } = paginate(sorted, query, 12);
    return ok(items, "OK", { pagination, meta: { counts } });
  }),

  route("GET", "/admin/complaints/:id", ({ db, params }) => {
    const complaint = findOrThrow(db.complaints, params.id, "الشكوى");
    const washComplaints = db.complaints.filter((c) => c.businessId === complaint.businessId);
    const noteAuthors = Object.fromEntries(
      complaint.notes.map((n) => [n.authorId, adminName(db, n.authorId) ?? n.authorId]),
    );
    const details: ComplaintDetails = {
      complaint,
      customer: findOrThrow(db.customers, complaint.customerId, "العميل"),
      business: findOrThrow(db.businesses, complaint.businessId, "المغسلة"),
      branch: findOrThrow(db.branches, complaint.branchId, "الفرع"),
      order: db.orders.find((o) => o.id === complaint.orderId) ?? null,
      assignee: (() => {
        const a = db.admins.find((x) => x.id === complaint.assignedAdminId);
        if (!a) return null;
        const { password: _p, ...rest } = a;
        void _p;
        return rest;
      })(),
      washComplaintCount: washComplaints.length,
      washOpenComplaints: washComplaints.filter((c) => c.status !== "resolved" && c.status !== "closed").length,
      noteAuthors,
      auditLogs: db.auditLogs.filter((a) => a.entityId === complaint.id),
    };
    return ok(details);
  }),

  route("PATCH", "/admin/complaints/:id", ({ db, params, body, admin }) => {
    const complaint = findOrThrow(db.complaints, params.id, "الشكوى");
    const at = new Date().toISOString();
    const changes: string[] = [];

    if (body.assignedAdminId !== undefined) {
      const next = body.assignedAdminId === null ? null : String(body.assignedAdminId);
      if (next && !db.admins.some((a) => a.id === next && a.status === "active")) {
        throw new MockApiError("المسؤول المختار غير متاح", 422);
      }
      if (next !== complaint.assignedAdminId) {
        logAudit(db, { actorId: admin.id, action: "assign_complaint", entity: "complaints", entityId: complaint.id, oldValue: adminName(db, complaint.assignedAdminId), newValue: adminName(db, next) });
        complaint.assignedAdminId = next;
        changes.push("assign");
      }
    }

    if (typeof body.note === "string" && body.note.trim()) {
      complaint.notes.push({ authorId: admin.id, text: body.note.trim(), at });
      logAudit(db, { actorId: admin.id, action: "add_complaint_note", entity: "complaints", entityId: complaint.id, reason: body.note.trim() });
      changes.push("note");
    }

    if (body.status !== undefined) {
      const next = String(body.status) as ComplaintStatus;
      if (!STATUSES.includes(next)) throw new MockApiError("حالة غير صالحة", 422);
      if (next !== complaint.status) {
        if (!TRANSITIONS[complaint.status].includes(next)) {
          throw new MockApiError("لا يمكن الانتقال لهذه الحالة من الحالة الحالية", 409);
        }
        if (next === "resolved") {
          const resolution = typeof body.resolution === "string" ? body.resolution.trim() : "";
          if (resolution.length < 5) throw new MockApiError("اكتب قرار الحل قبل إغلاق الشكوى كمحلولة", 422, { resolution: ["قرار الحل مطلوب"] });
          complaint.resolution = resolution;
        }
        if (next !== "open" && !complaint.assignedAdminId) complaint.assignedAdminId = admin.id;
        logAudit(db, { actorId: admin.id, action: "update_complaint_status", entity: "complaints", entityId: complaint.id, oldValue: complaint.status, newValue: next, reason: next === "resolved" ? complaint.resolution : null });
        complaint.status = next;
        changes.push("status");
      }
    }

    if (!changes.length) throw new MockApiError("لا توجد تغييرات للحفظ", 422);
    complaint.updatedAt = at;
    const message = changes.includes("status")
      ? complaint.status === "resolved"
        ? "تم حل الشكوى وإبلاغ العميل"
        : "تم تحديث حالة الشكوى"
      : changes.includes("assign")
        ? "تم تعيين المسؤول"
        : "تمت إضافة الملاحظة";
    return ok(complaint, message);
  }),
];
