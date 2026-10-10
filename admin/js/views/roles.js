import { t, getLang } from "../../../shared/js/i18n.js";
import { ADMIN_DEFAULTS } from "../../../shared/js/services/permissions.js";
import { getCurrentAdmin, checkPermission } from "../auth.js";
import { toast } from "../../../shared/js/ui.js";

const MODULES = [
  { id: "dashboard", label: { ar: "لوحة القيادة والمؤشرات", en: "Dashboard & KPIs" } },
  { id: "customers", label: { ar: "العملاء وسجل السيارات", en: "Customers & Vehicles" } },
  { id: "washes", label: { ar: "المغاسل والفروع", en: "Car Washes & Branches" } },
  { id: "applications", label: { ar: "فحص واعتماد الطلبات", en: "Wash Applications" } },
  { id: "orders", label: { ar: "الحجوزات والتدخل التشغيلي", en: "Orders & Bookings" } },
  { id: "reviews", label: { ar: "التقييمات وإخفاء التعليقات", en: "Review Moderation" } },
  { id: "complaints", label: { ar: "صندوق الشكاوى وحل النزاعات", en: "Complaints & Support" } },
  { id: "offers", label: { ar: "العروض الترويجية والتمييز", en: "Promotions & Featured" } },
  { id: "finance", label: { ar: "المالية والمعاملات والتسويات", en: "Financials & Payouts" } },
  { id: "reports", label: { ar: "التقارير وصحة السوق", en: "Reports & Analytics" } },
  { id: "admins", label: { ar: "إدارة مسؤولي النظام", en: "Admin Users Management" } },
  { id: "settings", label: { ar: "إعدادات المنصة والقواميس", en: "Platform Settings" } },
  { id: "audit", label: { ar: "سجل التدقيق الأمني", en: "Audit Log" } },
];

const ROLES = [
  { id: "super", label: "Super Admin", color: "var(--c-primary-600)" },
  { id: "operations", label: "Operations Admin", color: "var(--c-accent-500)" },
  { id: "finance", label: "Finance Admin", color: "var(--c-success)" },
  { id: "support", label: "Support Admin", color: "var(--c-info)" },
];

export function renderRoles() {
  const container = document.createElement("div");
  const currentAdmin = getCurrentAdmin();
  const canEdit = currentAdmin.role === "super";

  let matrix = ADMIN_DEFAULTS;
  try {
    const raw = localStorage.getItem("carzen_admin_roles_matrix");
    if (raw) matrix = JSON.parse(raw);
  } catch { /* use defaults */ }

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t("admin.nav.roles")}</h1>
        <div class="page-subtitle">${getLang() === "ar" ? "مصفوفة الصلاحيات وتحديد نطاق وصول كل دور للأقسام التشغيلية" : "Role-based access control (RBAC) matrix across platform modules"}</div>
      </div>
      <div class="page-actions">
        ${canEdit ? `
          <button type="button" class="btn secondary sm" id="btn-reset-matrix">
            ${getLang() === "ar" ? "استعادة الصلاحيات الافتراضية" : "Reset to Defaults"}
          </button>
        ` : ""}
      </div>
    </div>

    <div class="card pad" style="background:var(--c-surface)">
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th style="min-inline-size:240px">${getLang() === "ar" ? "القسم / الوحدة التشغيلية" : "Module / Section"}</th>
              ${ROLES.map((r) => `
                <th style="text-align:center">
                  <span class="badge" style="background:color-mix(in srgb,${r.color} 12%,transparent);color:${r.color};font-weight:700">
                    ${r.label}
                  </span>
                </th>
              `).join("")}
            </tr>
          </thead>
          <tbody>
            ${MODULES.map((m) => `
              <tr>
                <td><strong>${m.label[getLang()] || m.label.ar}</strong></td>
                ${ROLES.map((r) => {
                  const isSuper = r.id === "super";
                  const allowedList = matrix[r.id] || ADMIN_DEFAULTS[r.id] || [];
                  const isChecked = isSuper || allowedList.includes("*") || allowedList.includes(m.id);

                  return `
                    <td style="text-align:center">
                      <input type="checkbox"
                        class="perm-checkbox"
                        data-role="${r.id}"
                        data-module="${m.id}"
                        ${isChecked ? "checked" : ""}
                        ${isSuper || !canEdit ? "disabled title='Full access locked for Super Admin'" : ""}
                        style="inline-size:18px;block-size:18px;cursor:pointer"
                      />
                    </td>
                  `;
                }).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Bind checkbox changes (AD-44)
  container.querySelectorAll(".perm-checkbox:not(:disabled)").forEach((chk) => {
    chk.addEventListener("change", () => {
      const role = chk.dataset.role;
      const mod = chk.dataset.module;

      const currentList = new Set(matrix[role] || ADMIN_DEFAULTS[role] || []);
      if (chk.checked) {
        currentList.add(mod);
      } else {
        currentList.delete(mod);
      }

      matrix[role] = Array.from(currentList);
      localStorage.setItem("carzen_admin_roles_matrix", JSON.stringify(matrix));
      toast(getLang() === "ar" ? "تم تحديث الصلاحيات بنجاح" : "Permissions updated");
    });
  });

  // Reset to defaults
  const resetBtn = container.querySelector("#btn-reset-matrix");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      localStorage.removeItem("carzen_admin_roles_matrix");
      location.reload();
    });
  }

  return container;
}
