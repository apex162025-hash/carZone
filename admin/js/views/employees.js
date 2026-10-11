import { t, getLang } from "../../../shared/js/i18n.js";
import { getEmployees, toggleStaffSuspended } from "../../../shared/js/services/admin.js";
import { createDataTable } from "../components/table.js";
import { promptReasonModal } from "../components/modal.js";
import { getCurrentAdmin, checkPermission } from "../auth.js";

export async function renderEmployees() {
  const container = document.createElement("div");
  const admin = getCurrentAdmin();
  const canManage = checkPermission("suspend_wash");

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t("admin.nav.employees")}</h1>
        <div class="page-subtitle">${getLang() === "ar" ? "قائمة موظفي ومديري فروع المغاسل المسجلين" : "Wash staff members, cashiers and branch managers"}</div>
      </div>
    </div>
    <div id="employees-table-mount"></div>
  `;

  const staff = await getEmployees();

  const table = createDataTable({
    data: staff,
    columns: [
      {
        key: "name",
        title: getLang() === "ar" ? "الموظف" : "Employee",
        render: (s) => `
          <div style="font-weight:700">${s.name}</div>
          <div class="muted" style="font-size:12px">${s.phone}</div>
        `,
      },
      {
        key: "role",
        title: getLang() === "ar" ? "الدور" : "Role",
        render: (s) => `<span class="chip on" style="font-size:12px">${s.role}</span>`,
      },
      {
        key: "businessName",
        title: getLang() === "ar" ? "المغسلة والفرع" : "Wash / Branch",
        render: (s) => `
          <div>${s.businessName ? (s.businessName[getLang()] || s.businessName.ar) : "—"}</div>
          <div class="muted" style="font-size:12px">${s.branchName ? (s.branchName[getLang()] || s.branchName.ar) : "—"}</div>
        `,
      },
      {
        key: "status",
        title: getLang() === "ar" ? "الحالة" : "Status",
        render: (s) => `
          <span class="badge" style="background:${s.status === "active" ? "color-mix(in srgb,var(--c-success) 12%,transparent)" : "color-mix(in srgb,var(--c-danger) 12%,transparent)"};color:${s.status === "active" ? "var(--c-success)" : "var(--c-danger)"}">
            ${s.status === "active" ? (getLang() === "ar" ? "نشط" : "Active") : (getLang() === "ar" ? "معلّق" : "Suspended")}
          </span>
        `,
      },
    ],
    actions: (s) => {
      if (!canManage) return "";
      return `
        <button type="button" class="btn sm ${s.status === "active" ? "ghost" : "secondary"}" data-action-staff="${s.id}">
          ${s.status === "active" ? (getLang() === "ar" ? "تعليق" : "Suspend") : (getLang() === "ar" ? "تفعيل" : "Reactivate")}
        </button>
      `;
    },
    exportFileName: "carzen_employees",
  });

  table.element.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action-staff]");
    if (!btn) return;
    const staffId = btn.dataset.actionStaff;
    const s = staff.find((m) => m.id === staffId);
    if (!s) return;

    const isSuspending = s.status === "active";
    const result = await promptReasonModal({
      title: isSuspending ? (getLang() === "ar" ? "تعليق حساب الموظف" : "Suspend Staff Account") : (getLang() === "ar" ? "إعادة تفعيل الحساب" : "Reactivate Account"),
      message: `${s.name} · ${s.role}`,
      danger: isSuspending,
    });

    if (result) {
      await toggleStaffSuspended(staffId, {
        adminId: admin.id,
        suspended: isSuspending,
        reason: result.reason,
      });
      location.reload();
    }
  });

  container.querySelector("#employees-table-mount").appendChild(table.element);
  return container;
}
