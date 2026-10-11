import { t, getLang } from "../../../shared/js/i18n.js";
import { formatDate } from "../../../shared/js/format.js";
import { getReviews, toggleReviewHidden } from "../../../shared/js/services/admin.js";
import { createDataTable } from "../components/table.js";
import { promptReasonModal } from "../components/modal.js";
import { getCurrentAdmin, checkPermission } from "../auth.js";

export async function renderReviews() {
  const container = document.createElement("div");
  const admin = getCurrentAdmin();
  const canModerate = checkPermission("hide_review");

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t("admin.nav.reviews")}</h1>
        <div class="page-subtitle">${getLang() === "ar" ? "مراقبة تقييمات العملاء والتحقق من الشكاوى والبلاغات" : "Customer review moderation, reported content and quality control"}</div>
      </div>
    </div>
    <div id="reviews-table-mount"></div>
  `;

  const reviews = await getReviews();

  const table = createDataTable({
    data: reviews,
    quickChips: [
      { id: "all", label: getLang() === "ar" ? "الكل" : "All", active: true, predicate: () => true },
      { id: "reported", label: getLang() === "ar" ? "مبلّغ عنها من المغسلة" : "Reported by Wash", predicate: (r) => r.reportedByWash },
      { id: "low", label: getLang() === "ar" ? "تقييمات منخفضة (≤ ٢)" : "Low Ratings (≤2★)", predicate: (r) => r.stars <= 2 },
      { id: "hidden", label: getLang() === "ar" ? "مخفية" : "Hidden", predicate: (r) => r.status === "hidden" },
    ],
    columns: [
      {
        key: "stars",
        title: getLang() === "ar" ? "التقييم" : "Rating",
        render: (r) => `
          <div style="color:var(--c-warning);font-weight:700">${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)}</div>
          <div class="muted" style="font-size:11px">${r.stars}/5</div>
        `,
      },
      {
        key: "comment",
        title: getLang() === "ar" ? "التعليق" : "Comment",
        render: (r) => `
          <div style="max-inline-size:320px;white-space:normal;font-size:13px">${r.comment || "—"}</div>
          ${r.reportedByWash ? `<span class="badge" style="background:color-mix(in srgb,var(--c-warning) 15%,transparent);color:var(--c-warning);font-size:10px;margin-block-start:4px">⚠️ Reported by Wash</span>` : ""}
          ${r.hiddenReason ? `<div class="muted" style="font-size:11px;color:var(--c-danger)">Hidden: ${r.hiddenReason}</div>` : ""}
        `,
      },
      {
        key: "customer",
        title: getLang() === "ar" ? "العميل" : "Customer",
        render: (r) => r.customer ? `<a href="#/customers/${r.customer.id}">${r.customer.name}</a>` : "Guest",
      },
      {
        key: "wash",
        title: getLang() === "ar" ? "المغسلة" : "Wash",
        render: (r) => r.business ? `<a href="#/washes/${r.business.id}">${r.business.name[getLang()] || r.business.name.ar}</a>` : r.businessId,
      },
      {
        key: "status",
        title: getLang() === "ar" ? "الحالة" : "Status",
        render: (r) => `
          <span class="badge" style="background:${r.status === "visible" ? "color-mix(in srgb,var(--c-success) 12%,transparent)" : "var(--c-bg)"};color:${r.status === "visible" ? "var(--c-success)" : "var(--c-ink-500)"}">
            ${r.status === "visible" ? (getLang() === "ar" ? "ظاهر" : "Visible") : (getLang() === "ar" ? "مخفي" : "Hidden")}
          </span>
        `,
      },
      {
        key: "createdAt",
        title: getLang() === "ar" ? "التاريخ" : "Date",
        render: (r) => formatDate(r.createdAt),
      },
    ],
    actions: (r) => {
      if (!canModerate) return "";
      return `
        <button type="button" class="btn sm ${r.status === "visible" ? "ghost danger" : "secondary"}" data-toggle-review="${r.id}">
          ${r.status === "visible" ? t("admin.action.hideReview") : t("admin.action.restoreReview")}
        </button>
      `;
    },
    exportFileName: "carzen_reviews",
  });

  table.element.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-toggle-review]");
    if (!btn) return;
    const revId = btn.dataset.toggleReview;
    const r = reviews.find((item) => item.id === revId);
    if (!r) return;

    const isHiding = r.status === "visible";
    if (isHiding) {
      const result = await promptReasonModal({
        title: getLang() === "ar" ? "إخفاء التقييم من المنصة" : "Hide Review from Platform",
        message: getLang() === "ar" ? "سيختفي التقييم فوراً من تطبيق العملاء ويُعاد حساب متوسط تقييم المغسلة." : "The review will be removed from customer app and rating will be recalculated.",
        danger: true,
        options: [
          { value: "abusive_language", label: getLang() === "ar" ? "ألفاظ مسيئة أو غير لائقة" : "Abusive language" },
          { value: "spam", label: getLang() === "ar" ? "محتوى دعائي أو مكرر (سبام)" : "Spam or promotional" },
          { value: "off_topic", label: getLang() === "ar" ? "غير متعلق بخدمة الغسيل المقدمة" : "Off-topic content" },
          { value: "personal_data", label: getLang() === "ar" ? "يتضمن بيانات شخصية أو أرقام هواتف" : "Contains personal data" },
        ],
      });

      if (result) {
        await toggleReviewHidden(revId, {
          adminId: admin.id,
          hidden: true,
          reason: result.option || result.reason,
        });
        location.reload();
      }
    } else {
      const result = await promptReasonModal({
        title: getLang() === "ar" ? "استعادة التقييم" : "Restore Review",
        message: getLang() === "ar" ? "سيعود التقييم للظهور في التطبيق ويُعاد احتسابه في متوسط المغسلة." : "The review will be made visible again.",
      });

      if (result) {
        await toggleReviewHidden(revId, {
          adminId: admin.id,
          hidden: false,
          reason: result.reason,
        });
        location.reload();
      }
    }
  });

  container.querySelector("#reviews-table-mount").appendChild(table.element);
  return container;
}
