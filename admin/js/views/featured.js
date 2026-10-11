import { t, getLang } from "../../../shared/js/i18n.js";
import { formatDate } from "../../../shared/js/format.js";
import { getFeaturedListings, saveFeaturedListing, getWashes, getBranches } from "../../../shared/js/services/admin.js";
import { createDataTable } from "../components/table.js";
import { getCurrentAdmin, checkPermission } from "../auth.js";

export async function renderFeatured() {
  const container = document.createElement("div");
  const admin = getCurrentAdmin();
  const canManage = checkPermission("manage_featured");

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t("admin.nav.featured")}</h1>
        <div class="page-subtitle">${getLang() === "ar" ? "إدارة مواضع الظهور المميز والمغاسل المروّجة على المنصة" : "Sponsored and featured car wash placements management"}</div>
      </div>
      <div class="page-actions">
        ${canManage ? `
          <button type="button" class="btn primary" id="btn-add-featured">
            <i data-lucide="sparkles" style="inline-size:16px;block-size:16px"></i>
            <span>${getLang() === "ar" ? "إضافة مغسلة مميزة" : "Feature a Wash"}</span>
          </button>
        ` : ""}
      </div>
    </div>
    <div id="featured-table-mount"></div>
  `;

  const listings = await getFeaturedListings();

  const table = createDataTable({
    data: listings,
    columns: [
      {
        key: "business",
        title: getLang() === "ar" ? "المغسلة المميزة" : "Featured Wash",
        render: (f) => `
          <div style="font-weight:700">${f.business ? (f.business.name[getLang()] || f.business.name.ar) : f.businessId}</div>
          <div class="muted" style="font-size:12px">${f.branch ? (f.branch.name[getLang()] || f.branch.name.ar) : ""}</div>
        `,
      },
      {
        key: "placement",
        title: getLang() === "ar" ? "موضع الترويج" : "Placement",
        render: (f) => `<span class="chip on" style="font-size:11px">${f.placement === "home" ? (getLang() === "ar" ? "أعلى الرئيسية (محيط المستخدم)" : "Home Nearby Top") : "Search Top"}</span>`,
      },
      {
        key: "dates",
        title: getLang() === "ar" ? "الفترة" : "Duration",
        render: (f) => `${formatDate(f.startAt)} – ${formatDate(f.endAt)}`,
      },
      {
        key: "status",
        title: getLang() === "ar" ? "الحالة" : "Status",
        render: (f) => `<span class="badge" style="background:var(--c-accent-100);color:var(--c-primary-700)">مُروَّج / Sponsored</span>`,
      },
    ],
    exportFileName: "carzen_featured",
  });

  container.querySelector("#featured-table-mount").appendChild(table.element);

  const addBtn = container.querySelector("#btn-add-featured");
  if (addBtn) {
    addBtn.addEventListener("click", async () => {
      const washes = await getWashes("active");
      const branches = await getBranches();
      openFeaturedModal(washes, branches, admin);
    });
  }

  return container;
}

function openFeaturedModal(washes, branches, admin) {
  const backdrop = document.createElement("div");
  backdrop.className = "admin-modal-backdrop";

  backdrop.innerHTML = `
    <div class="admin-modal" role="dialog" aria-modal="true" style="inline-size:min(100%,500px)">
      <div class="admin-modal-header">
        <h3 style="margin:0;font-size:18px;font-weight:800">${getLang() === "ar" ? "إضافة مغسلة في قسم الترويج" : "Schedule Featured Wash"}</h3>
        <button type="button" class="icon-btn sm" data-modal-close>
          <i data-lucide="x" style="inline-size:18px;block-size:18px"></i>
        </button>
      </div>
      <form id="featured-modal-form" class="admin-modal-body">
        <div class="field">
          <span class="label">${getLang() === "ar" ? "اختر المغسلة:" : "Select Wash:"}</span>
          <select class="select" id="feat-biz" required>
            ${washes.map((w) => `<option value="${w.id}">${w.name[getLang()] || w.name.ar}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <span class="label">${getLang() === "ar" ? "موضع الظهور:" : "Placement Slot:"}</span>
          <select class="select" id="feat-place">
            <option value="home">${getLang() === "ar" ? "أعلى شاشة الرئيسية (الأقرب إليك)" : "Home Screen Top (Nearby)"}</option>
            <option value="search">${getLang() === "ar" ? "أعلى نتائج البحث" : "Search Results Top"}</option>
          </select>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-block-start:8px">
          <button type="button" class="btn ghost" data-modal-close>${getLang() === "ar" ? "إلغاء" : "Cancel"}</button>
          <button type="submit" class="btn primary">${getLang() === "ar" ? "تأكيد الجدولة" : "Confirm"}</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(backdrop);
  if (window.lucide?.createIcons) window.lucide.createIcons({ root: backdrop });

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop || e.target.closest("[data-modal-close]")) backdrop.remove();
  });

  backdrop.querySelector("#featured-modal-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const bizId = backdrop.querySelector("#feat-biz").value;
    const placement = backdrop.querySelector("#feat-place").value;
    const branch = branches.find((b) => b.businessId === bizId) || branches[0];

    await saveFeaturedListing({
      businessId: bizId,
      branchId: branch?.id || null,
      placement,
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 14 * 86400000).toISOString(),
    }, { adminId: admin.id });

    backdrop.remove();
    location.reload();
  });
}
