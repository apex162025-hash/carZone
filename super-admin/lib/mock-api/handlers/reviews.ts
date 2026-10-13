import "server-only";

import type { HideReviewReason, ReviewListItem } from "@/types/reviews";
import { logAudit, round2 } from "@/lib/mock-api/db";
import { MockApiError, matchesSearch, ok, paginate, requireText, sortBy } from "@/lib/mock-api/http";
import { branchName, businessName, customerName, findOrThrow } from "@/lib/mock-api/lookups";
import { route } from "@/lib/mock-api/router";
import { recomputeRatings } from "@/lib/mock-api/seed";

const HIDE_REASONS: Record<HideReviewReason, string> = {
  abusive_language: "ألفاظ مسيئة",
  spam: "محتوى دعائي (سبام)",
  off_topic: "خارج الموضوع",
  personal_data: "بيانات شخصية",
};

export const reviewRoutes = [
  route("GET", "/admin/reviews", ({ db, query }) => {
    const filter = query.get("filter") ?? "all";
    const list: ReviewListItem[] = db.reviews.map((r) => ({
      ...r,
      customerName: customerName(db, r.customerId) ?? "—",
      businessName: businessName(db, r.businessId),
      branchName: branchName(db, r.branchId),
      serviceName: db.services.find((s) => s.id === r.serviceId)?.name ?? { ar: "—", en: "—" },
      orderNumber: db.orders.find((o) => o.id === r.orderId)?.number ?? null,
    }));
    const searched = list.filter((r) => matchesSearch(query, r.comment.ar, r.comment.en, r.customerName, r.businessName.ar, r.orderNumber));
    const counts = {
      all: searched.length,
      low: searched.filter((r) => r.stars <= 2).length,
      reported: searched.filter((r) => r.reportedByWash).length,
      hidden: searched.filter((r) => r.status === "hidden").length,
    };
    const filtered = searched.filter((r) => {
      if (filter === "low") return r.stars <= 2;
      if (filter === "reported") return r.reportedByWash;
      if (filter === "hidden") return r.status === "hidden";
      return true;
    });
    const visible = list.filter((r) => r.status === "visible");
    const sorted = sortBy(filtered, query, { createdAt: (r) => r.createdAt, stars: (r) => r.stars }, { key: "createdAt", order: "desc" });
    const { items, pagination } = paginate(sorted, query, 12);
    return ok(items, "OK", {
      pagination,
      meta: { counts, averageRating: visible.length ? round2(visible.reduce((s, r) => s + r.stars, 0) / visible.length) : 0 },
    });
  }),

  route("POST", "/admin/reviews/:id/visibility", ({ db, params, body, admin }) => {
    const review = findOrThrow(db.reviews, params.id, "التقييم");
    const hidden = Boolean(body.hidden);
    if ((review.status === "hidden") === hidden) {
      throw new MockApiError(hidden ? "التقييم مخفي بالفعل" : "التقييم ظاهر بالفعل", 409);
    }
    let reason: string;
    if (hidden) {
      const key = String(body.reason ?? "") as HideReviewReason;
      if (!HIDE_REASONS[key]) throw new MockApiError("اختر سبب الإخفاء", 422);
      const note = typeof body.note === "string" ? body.note.trim() : "";
      reason = note ? `${HIDE_REASONS[key]} — ${note}` : HIDE_REASONS[key];
      review.hiddenReason = key;
    } else {
      reason = requireText(body.reason, "reason", "سبب الاستعادة");
      review.hiddenReason = null;
    }
    const old = review.status;
    review.status = hidden ? "hidden" : "visible";
    recomputeRatings(db.branches, db.businesses, db.reviews);
    logAudit(db, {
      actorId: admin.id,
      action: hidden ? "hide_review" : "restore_review",
      entity: "reviews",
      entityId: review.id,
      branchId: review.branchId,
      oldValue: old,
      newValue: review.status,
      reason,
    });
    const rating = db.businesses.find((b) => b.id === review.businessId)?.rating ?? 0;
    return ok(review, `${hidden ? "تم إخفاء التقييم" : "تمت استعادة التقييم"} — تقييم المغسلة الآن ${rating}`);
  }),
];
