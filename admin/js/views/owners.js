import { t, getLang } from "../../../shared/js/i18n.js";
import { getOwners, toggleStaffSuspended } from "../services/admin.js";
import { createDataTable } from "../components/table.js";
import { promptReasonModal } from "../components/modal.js";
import { getCurrentAdmin, checkPermission } from "../auth.js";

export async function renderOwners() {
  const container = document.createElement("div");
  const admin = getCurrentAdmin();
  const canManage = checkPermission("suspend_wash");

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t("admin.nav.owners")}</h1>
        <div class="page-subtitle">${getLang() === "ar" ? "قائمة أصحاب المغاسل والشركاء المسجلين على المنصة" : "Car wash business owners and partner administrators"}</div>
      </div>
    </div>
    <div id="owners-table-mount"></div>
  `;

  const owners = await getOwners();

  const table = createDataTable({
    data: owners,
    columns: [
      {
        key: "name",
        title: getLang() === "ar" ? "مالك المغسلة" : "Owner Name",
        render: (o) => `
          <div style="font-weight:700">${o.name}</div>
          <div class="muted" style="font-size:12px">${o.id}</div>
        `,
      },
      {
        key: "businessName",
        title: getLang() === "ar" ? "المغسلة المسجلة" : "Business",
        render: (o) => `<a href="#/washes/${o.businessId}" style="font-weight:700;color:var(--c-primary-600)">${o.businessName ? (o.businessName[getLang()] || o.businessName.ar) : "—"}</a>`,
      },
      {
        key: "branchesCount",
        title: getLang() === "ar" ? "الفروع" : "Branches",
        render: (o) => `<strong>${o.branchesCount}</strong> ${getLang() === "ar" ? "فروع" : "branches"}`,
      },
      {
        key: "status",
        title: getLang() === "ar" ? "الحالة" : "Status",
        render: (o) => `
          <span class="badge" style="background:${o.status === "active" ? "color-mix(in srgb,var(--c-success) 12%,transparent)" : "color-mix(in srgb,var(--c-danger) 12%,transparent)"};color:${o.status === "active" ? "var(--c-success)" : "var(--c-danger)"}">
            ${o.status === "active" ? (getLang() === "ar" ? "نشط" : "Active") : o.status}
          </span>
        `,
      },
    ],
    actions: (o) => {
      if (!canManage) return "";
      return `
        <button type="button" class="btn sm ${o.status === "active" ? "ghost" : "secondary"}" data-action-owner="${o.id}">
          ${o.status === "active" ? (getLang() === "ar" ? "تعليق" : "Suspend") : (getLang() === "ar" ? "تفعيل" : "Reactivate")}
        </button>
      `;
    },
    exportFileName: "carzen_owners",
  });

  table.element.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action-owner]");
    if (!btn) return;
    const ownerId = btn.dataset.actionOwner;
    const owner = owners.find((o) => o.id === ownerId);
    if (!owner) return;

    const isSuspending = owner.status === "active";
    const result = await promptReasonModal({
      title: isSuspending ? (getLang() === "ar" ? "تعليق حساب مالك المغسلة" : "Suspend Owner Account") : (getLang() === "ar" ? "إعادة تفعيل الحساب" : "Reactivate Account"),
      message: `${owner.name} · ${owner.businessName?.[getLang()] || ""}`,
      danger: isSuspending,
    });

    if (result) {
      await toggleStaffSuspended(ownerId, {
        adminId: admin.id,
        suspended: isSuspending,
        reason: result.reason,
      });
      location.reload();
    }
  });

  container.querySelector("#owners-table-mount").appendChild(table.element);
  return container;
}
