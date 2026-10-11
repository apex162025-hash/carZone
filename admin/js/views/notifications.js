import { t, getLang } from "../../../shared/js/i18n.js";
import { formatDateTime } from "../../../shared/js/format.js";
import { getAdminNotifications, markNotificationRead } from "../../../shared/js/services/admin.js";

export async function renderNotifications() {
  const container = document.createElement("div");
  const notifs = await getAdminNotifications();

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t("admin.nav.notifications")}</h1>
        <div class="page-subtitle">${getLang() === "ar" ? "تنبيهات المنصة العاجلة وطلبات الانضمام وتحديثات العمليات" : "Platform system alerts, new partner applications and disputes"}</div>
      </div>
      <div class="page-actions">
        <button type="button" class="btn sm ghost" id="btn-mark-all-read">
          ${getLang() === "ar" ? "تحديد الكل كمقروء" : "Mark All as Read"}
        </button>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:10px">
      ${notifs.length === 0 ? `
        <div class="empty">
          <i data-lucide="bell-off" style="inline-size:48px;block-size:48px;color:var(--c-ink-300)"></i>
          <h3>${getLang() === "ar" ? "لا توجد إشعارات جديدة" : "No new notifications"}</h3>
        </div>
      ` : notifs.map((n) => `
        <div class="card pad" style="display:flex;align-items:center;justify-content:space-between;background:${n.read ? "var(--c-surface)" : "var(--c-primary-50)"}">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="inline-size:10px;block-size:10px;border-radius:50%;background:${n.read ? "transparent" : "var(--c-primary-600)"}"></div>
            <div>
              <div style="font-weight:700;font-size:14px">${n.title?.[getLang()] || n.title?.ar || n.title}</div>
              <div style="font-size:13px;color:var(--c-ink-700);margin-block-start:2px">${n.body?.[getLang()] || n.body?.ar || n.body}</div>
              <div class="muted" style="font-size:11px;margin-block-start:4px">${formatDateTime(n.createdAt)}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            ${n.link ? `<a href="${n.link}" class="btn sm ghost">${getLang() === "ar" ? "عرض" : "View"}</a>` : ""}
            ${!n.read ? `<button type="button" class="btn sm secondary" data-mark-read="${n.id}">✓</button>` : ""}
          </div>
        </div>
      `).join("")}
    </div>
  `;

  if (window.lucide?.createIcons) window.lucide.createIcons({ root: container });

  container.querySelectorAll("[data-mark-read]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await markNotificationRead(btn.dataset.markRead);
      location.reload();
    });
  });

  container.querySelector("#btn-mark-all-read")?.addEventListener("click", async () => {
    for (const n of notifs.filter((item) => !item.read)) {
      await markNotificationRead(n.id);
    }
    location.reload();
  });

  return container;
}
