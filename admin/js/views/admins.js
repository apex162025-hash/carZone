import { t, getLang } from "../../../shared/js/i18n.js";
import { getAdminUsers, saveAdminUser, toggleAdminUserStatus } from "../services/admin.js";
import { createDataTable } from "../components/table.js";
import { getCurrentAdmin, checkPermission } from "../auth.js";
import { confirmModal } from "../components/modal.js";

export async function renderAdmins() {
  const container = document.createElement("div");
  const currentAdmin = getCurrentAdmin();
  const canManage = checkPermission("super") || currentAdmin.role === "super";

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t("admin.nav.admins")}</h1>
        <div class="page-subtitle">${getLang() === "ar" ? "إدارة حسابات مسؤولي المنصة وتوزيع الأدوار والصلاحيات" : "Platform back-office administrators and security permissions"}</div>
      </div>
      <div class="page-actions">
        ${canManage ? `
          <button type="button" class="btn primary" id="btn-invite-admin">
            <i data-lucide="user-plus" style="inline-size:16px;block-size:16px"></i>
            <span>${getLang() === "ar" ? "إضافة مسؤول جديد" : "Invite Admin"}</span>
          </button>
        ` : ""}
      </div>
    </div>
    <div id="admins-table-mount"></div>
  `;

  const admins = await getAdminUsers();

  const table = createDataTable({
    data: admins,
    columns: [
      {
        key: "name",
        title: getLang() === "ar" ? "المسؤول" : "Admin Name",
        render: (u) => `
          <div style="font-weight:700">${u.name}</div>
          <div class="muted" style="font-size:12px">${u.email}</div>
        `,
      },
      {
        key: "role",
        title: getLang() === "ar" ? "الدور الوظيفي" : "Role",
        render: (u) => {
          const colors = {
            super: "var(--c-primary-600)",
            operations: "var(--c-accent-500)",
            finance: "var(--c-success)",
            support: "var(--c-info)",
          };
          const color = colors[u.role] || "var(--c-primary-600)";
          return `<span class="badge" style="background:color-mix(in srgb,${color} 14%,transparent);color:${color};font-weight:700">${u.role.toUpperCase()}</span>`;
        },
      },
      {
        key: "status",
        title: getLang() === "ar" ? "الحالة" : "Status",
        render: (u) => `
          <span class="badge" style="background:${u.status === "active" ? "color-mix(in srgb,var(--c-success) 12%,transparent)" : "var(--c-bg)"};color:${u.status === "active" ? "var(--c-success)" : "var(--c-ink-500)"}">
            ${u.status}
          </span>
        `,
      },
    ],
    actions: (u) => {
      if (!canManage) return "";
      const isSelf = u.id === currentAdmin.id;
      return `
        <button type="button" class="btn sm ${u.status === "active" ? "ghost danger" : "secondary"}" data-toggle-admin="${u.id}" ${isSelf ? "disabled title='Cannot deactivate yourself'" : ""}>
          ${u.status === "active" ? (getLang() === "ar" ? "تعطيل" : "Deactivate") : (getLang() === "ar" ? "تفعيل" : "Activate")}
        </button>
      `;
    },
    exportFileName: "carzen_admin_users",
  });

  table.element.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-toggle-admin]");
    if (!btn || btn.disabled) return;
    const targetId = btn.dataset.toggleAdmin;
    const targetUser = admins.find((u) => u.id === targetId);
    if (!targetUser) return;

    const newStatus = targetUser.status === "active" ? "suspended" : "active";
    const ok = await confirmModal({
      title: newStatus === "suspended" ? (getLang() === "ar" ? "تعطيل حساب المسؤول" : "Deactivate Admin") : (getLang() === "ar" ? "تفعيل حساب المسؤول" : "Activate Admin"),
      message: `${targetUser.name} (${targetUser.email})`,
      danger: newStatus === "suspended",
    });

    if (ok) {
      try {
        await toggleAdminUserStatus(targetId, {
          adminId: currentAdmin.id,
          status: newStatus,
        });
        location.reload();
      } catch (err) {
        alert(err.message);
      }
    }
  });

  container.querySelector("#admins-table-mount").appendChild(table.element);

  // Invite Admin modal
  const inviteBtn = container.querySelector("#btn-invite-admin");
  if (inviteBtn) {
    inviteBtn.addEventListener("click", () => {
      openAdminInviteModal(currentAdmin);
    });
  }

  return container;
}

function openAdminInviteModal(currentAdmin) {
  const backdrop = document.createElement("div");
  backdrop.className = "admin-modal-backdrop";

  backdrop.innerHTML = `
    <div class="admin-modal" role="dialog" aria-modal="true" style="inline-size:min(100%,480px)">
      <div class="admin-modal-header">
        <h3 style="margin:0;font-size:18px;font-weight:800">${getLang() === "ar" ? "إضافة حساب مسؤول جديد" : "Invite Admin User"}</h3>
        <button type="button" class="icon-btn sm" data-modal-close>
          <i data-lucide="x" style="inline-size:18px;block-size:18px"></i>
        </button>
      </div>
      <form id="admin-invite-form" class="admin-modal-body">
        <div class="field">
          <span class="label">${getLang() === "ar" ? "الاسم بالكامل" : "Full Name"}</span>
          <input type="text" class="control" id="adm-name" required />
        </div>
        <div class="field">
          <span class="label">${getLang() === "ar" ? "البريد الإلكتروني" : "Email Address"}</span>
          <input type="email" class="control" id="adm-email" required />
        </div>
        <div class="field">
          <span class="label">${getLang() === "ar" ? "الدور الوظيفي" : "Role"}</span>
          <select class="select" id="adm-role">
            <option value="support">Support Admin (دعم العملاء والشكاوى)</option>
            <option value="operations">Operations Admin (إدارة العمليات والمغاسل)</option>
            <option value="finance">Finance Admin (الإدارة المالية والتسويات)</option>
            <option value="super">Super Admin (صلاحية كاملة للنظام)</option>
          </select>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-block-start:8px">
          <button type="button" class="btn ghost" data-modal-close>${getLang() === "ar" ? "إلغاء" : "Cancel"}</button>
          <button type="submit" class="btn primary">${getLang() === "ar" ? "إنشاء الحساب" : "Create Account"}</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(backdrop);
  if (window.lucide?.createIcons) window.lucide.createIcons({ root: backdrop });

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop || e.target.closest("[data-modal-close]")) backdrop.remove();
  });

  backdrop.querySelector("#admin-invite-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = backdrop.querySelector("#adm-name").value.trim();
    const email = backdrop.querySelector("#adm-email").value.trim();
    const role = backdrop.querySelector("#adm-role").value;

    await saveAdminUser({ name, email, role, status: "active" }, { adminId: currentAdmin.id });
    backdrop.remove();
    location.reload();
  });
}
