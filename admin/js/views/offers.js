import { t, getLang } from "../../../shared/js/i18n.js";
import { formatDate } from "../../../shared/js/format.js";
import { getOffers, saveOffer } from "../../../shared/js/services/admin.js";
import { createDataTable } from "../components/table.js";
import { getCurrentAdmin, checkPermission } from "../auth.js";
import { get } from "../../../shared/js/db.js";

export async function renderOffers() {
  const container = document.createElement("div");
  const admin = getCurrentAdmin();
  const canManage = checkPermission("manage_offers");

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t("admin.nav.offers")}</h1>
        <div class="page-subtitle">${getLang() === "ar" ? "إدارة الحملات الترويجية والخصومات العامة على مستوى المنصة" : "Platform-wide promotional campaigns, discounts and promo rules"}</div>
      </div>
      <div class="page-actions">
        ${canManage ? `
          <button type="button" class="btn primary" id="btn-create-offer">
            <i data-lucide="plus" style="inline-size:16px;block-size:16px"></i>
            <span>${getLang() === "ar" ? "إنشاء عرض جديد" : "Create Offer"}</span>
          </button>
        ` : ""}
      </div>
    </div>
    <div id="offers-table-mount"></div>
  `;

  const offers = await getOffers();

  const table = createDataTable({
    data: offers,
    columns: [
      {
        key: "title",
        title: getLang() === "ar" ? "عنوان العرض" : "Offer Title",
        render: (o) => `
          <div style="font-weight:700;font-size:15px">${o.title?.[getLang()] || o.title?.ar || o.title}</div>
          <div class="muted" style="font-size:12px">${o.description?.[getLang()] || o.description?.ar || ""}</div>
        `,
      },
      {
        key: "discount",
        title: getLang() === "ar" ? "قيمة الخصم" : "Discount",
        render: (o) => `
          <strong style="color:var(--c-primary-600)">
            ${o.discountType === "percent" ? `${o.discountValue}%` : `${o.discountValue} EGP`}
          </strong>
        `,
      },
      {
        key: "scope",
        title: getLang() === "ar" ? "النطاق" : "Scope",
        render: (o) => `<span class="chip flat" style="font-size:11px">${o.scope || "platform"}</span>`,
      },
      {
        key: "status",
        title: getLang() === "ar" ? "الحالة" : "Status",
        render: (o) => {
          const colors = {
            active: "var(--c-success)",
            draft: "var(--c-ink-500)",
            scheduled: "var(--c-info)",
            expired: "var(--c-warning)",
            disabled: "var(--c-danger)",
          };
          const color = colors[o.status] || "var(--c-ink-500)";
          return `
            <span class="badge" style="background:color-mix(in srgb,${color} 12%,transparent);color:${color}">
              <span class="dot"></span>
              ${o.status}
            </span>
          `;
        },
      },
      {
        key: "dates",
        title: getLang() === "ar" ? "فترة الصلاحية" : "Validity",
        render: (o) => `${formatDate(o.startAt)} – ${formatDate(o.endAt)}`,
      },
    ],
    exportFileName: "carzen_offers",
  });

  container.querySelector("#offers-table-mount").appendChild(table.element);

  // Create offer modal form
  const createBtn = container.querySelector("#btn-create-offer");
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      openOfferEditorModal(null, admin);
    });
  }

  return container;
}

function openOfferEditorModal(existingOffer, admin) {
  const backdrop = document.createElement("div");
  backdrop.className = "admin-modal-backdrop";

  backdrop.innerHTML = `
    <div class="admin-modal" role="dialog" aria-modal="true" style="inline-size:min(100%,600px)">
      <div class="admin-modal-header">
        <h3 style="margin:0;font-size:18px;font-weight:800">
          ${existingOffer ? (getLang() === "ar" ? "تعديل العرض الترويجي" : "Edit Offer") : (getLang() === "ar" ? "إنشاء عرض ترويجي للمنصة" : "Create Platform Offer")}
        </h3>
        <button type="button" class="icon-btn sm" data-modal-close>
          <i data-lucide="x" style="inline-size:18px;block-size:18px"></i>
        </button>
      </div>
      <form id="offer-modal-form" class="admin-modal-body">
        <div class="field">
          <span class="label">${getLang() === "ar" ? "عنوان العرض (عربي)" : "Title (Arabic)"}</span>
          <input type="text" class="control" id="off-title-ar" value="${existingOffer?.title?.ar || ""}" required />
        </div>
        <div class="field">
          <span class="label">${getLang() === "ar" ? "عنوان العرض (إنجليزي)" : "Title (English)"}</span>
          <input type="text" class="control" id="off-title-en" value="${existingOffer?.title?.en || ""}" required />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="field">
            <span class="label">${getLang() === "ar" ? "نوع الخصم" : "Discount Type"}</span>
            <select class="select" id="off-type">
              <option value="percent" ${existingOffer?.discountType === "percent" ? "selected" : ""}>Percentage (%)</option>
              <option value="fixed" ${existingOffer?.discountType === "fixed" ? "selected" : ""}>Fixed Amount (EGP)</option>
            </select>
          </div>
          <div class="field">
            <span class="label">${getLang() === "ar" ? "قيمة الخصم" : "Discount Value"}</span>
            <input type="number" class="control" id="off-val" value="${existingOffer?.discountValue || "15"}" min="1" required />
          </div>
        </div>
        <div class="field">
          <span class="label">${getLang() === "ar" ? "الوصف" : "Description"}</span>
          <textarea class="textarea" id="off-desc">${existingOffer?.description?.[getLang()] || ""}</textarea>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-block-start:8px">
          <button type="button" class="btn ghost" data-modal-close>${getLang() === "ar" ? "إلغاء" : "Cancel"}</button>
          <button type="submit" class="btn primary">${getLang() === "ar" ? "حفظ وتفعيل" : "Save Offer"}</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(backdrop);
  if (window.lucide?.createIcons) window.lucide.createIcons({ root: backdrop });

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop || e.target.closest("[data-modal-close]")) backdrop.remove();
  });

  backdrop.querySelector("#offer-modal-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const titleAr = backdrop.querySelector("#off-title-ar").value.trim();
    const titleEn = backdrop.querySelector("#off-title-en").value.trim();
    const discountType = backdrop.querySelector("#off-type").value;
    const discountValue = Number(backdrop.querySelector("#off-val").value);
    const desc = backdrop.querySelector("#off-desc").value.trim();

    await saveOffer({
      id: existingOffer?.id,
      title: { ar: titleAr, en: titleEn },
      description: { ar: desc, en: desc },
      discountType,
      discountValue,
      scope: "platform",
      status: "active",
    }, { adminId: admin.id });

    backdrop.remove();
    location.reload();
  });
}
