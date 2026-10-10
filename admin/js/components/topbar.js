import { t, getLang, setLang } from "../../../shared/js/i18n.js";
import { getCurrentAdmin, setCurrentAdmin, logout } from "../auth.js";
import { get } from "../../../shared/js/db.js";

export function renderTopbar() {
  const admin = getCurrentAdmin();
  const db = get();
  const unreadNotifs = db.notifications?.filter((n) => n.audience === "admin" && !n.read).length || 0;
  const isDark = document.documentElement.dataset.theme === "dark";

  return `
    <button class="topbar-search-btn" id="btn-global-search">
      <i data-lucide="search" style="inline-size:18px;block-size:18px"></i>
      <span>${t("admin.search.ph")}</span>
      <span class="kbd-shortcut">Ctrl K</span>
    </button>

    <div class="topbar-actions">
      <!-- Language Switch -->
      <button class="icon-btn" id="btn-toggle-lang" title="${getLang() === "ar" ? "English" : "العربية"}">
        <span style="font-weight:700;font-size:12px">${getLang() === "ar" ? "EN" : "ع"}</span>
      </button>

      <!-- Theme Switch -->
      <button class="icon-btn" id="btn-toggle-theme" title="Theme">
        <i data-lucide="${isDark ? "sun" : "moon"}" style="inline-size:18px;block-size:18px"></i>
      </button>

      <!-- Notifications -->
      <a href="#/notifications" class="icon-btn" title="${t("admin.nav.notifications")}">
        <i data-lucide="bell" style="inline-size:18px;block-size:18px"></i>
        ${unreadNotifs > 0 ? `<span class="notif-badge">${unreadNotifs}</span>` : ""}
      </a>

      <!-- Persona Dropdown -->
      <div style="position:relative">
        <button class="admin-user-menu" id="btn-user-menu">
          <div class="avatar sm" style="inline-size:32px;block-size:32px;font-size:12px;background:var(--c-primary-100);color:var(--c-primary-700)">
            ${admin.name.slice(0, 2).toUpperCase()}
          </div>
          <span style="font-size:var(--fs-14);font-weight:700">${admin.name}</span>
          <i data-lucide="chevron-down" style="inline-size:16px;block-size:16px;color:var(--c-ink-500)"></i>
        </button>

        <div id="user-menu-dropdown" class="card" style="display:none;position:absolute;inset-inline-end:0;inset-block-start:calc(100% + 8px);inline-size:240px;padding:var(--s-2);box-shadow:var(--sh-3);z-index:40">
          <div style="padding:var(--s-2) var(--s-3);border-block-end:1px solid var(--c-line);margin-block-end:var(--s-2)">
            <div style="font-weight:700;font-size:var(--fs-14)">${admin.name}</div>
            <div style="font-size:var(--fs-12);color:var(--c-ink-500)">${admin.email}</div>
          </div>
          <div style="font-size:11px;font-weight:700;color:var(--c-ink-500);padding:4px 8px;text-transform:uppercase">
            ${getLang() === "ar" ? "تبديل الشخصية (تجريبي)" : "Switch Persona (Demo)"}
          </div>
          <button class="menu-row" data-switch-persona="au_sara" style="border:0;padding:6px 8px;font-size:13px;cursor:pointer;width:100%;text-align:start;${admin.id === "au_sara" ? "font-weight:700;color:var(--c-primary-600)" : ""}">
            Sara Nabil · Super Admin
          </button>
          <button class="menu-row" data-switch-persona="au_omar" style="border:0;padding:6px 8px;font-size:13px;cursor:pointer;width:100%;text-align:start;${admin.id === "au_omar" ? "font-weight:700;color:var(--c-primary-600)" : ""}">
            Omar Fathy · Operations
          </button>
          <button class="menu-row" data-switch-persona="au_nour" style="border:0;padding:6px 8px;font-size:13px;cursor:pointer;width:100%;text-align:start;${admin.id === "au_nour" ? "font-weight:700;color:var(--c-primary-600)" : ""}">
            Nour Salem · Finance
          </button>
          <button class="menu-row" data-switch-persona="au_mona" style="border:0;padding:6px 8px;font-size:13px;cursor:pointer;width:100%;text-align:start;${admin.id === "au_mona" ? "font-weight:700;color:var(--c-primary-600)" : ""}">
            Mona Adel · Support
          </button>
          <div style="border-block-start:1px solid var(--c-line);margin-block:var(--s-2)"></div>
          <button class="menu-row" id="btn-logout" style="border:0;padding:6px 8px;font-size:13px;color:var(--c-danger);cursor:pointer;width:100%;text-align:start">
            <i data-lucide="log-out" style="inline-size:14px;block-size:14px;margin-inline-end:6px"></i>
            ${getLang() === "ar" ? "تسجيل الخروج" : "Sign Out"}
          </button>
        </div>
      </div>
    </div>
  `;
}

export function bindTopbarEvents(container) {
  const userMenuBtn = container.querySelector("#btn-user-menu");
  const userMenuDropdown = container.querySelector("#user-menu-dropdown");

  if (userMenuBtn && userMenuDropdown) {
    userMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      userMenuDropdown.style.display = userMenuDropdown.style.display === "none" ? "block" : "none";
    });

    document.addEventListener("click", () => {
      userMenuDropdown.style.display = "none";
    });

    userMenuDropdown.addEventListener("click", (e) => {
      const switchBtn = e.target.closest("[data-switch-persona]");
      if (switchBtn) {
        const targetId = switchBtn.dataset.switchPersona;
        setCurrentAdmin(targetId);
        location.reload();
      }
    });

    const logoutBtn = container.querySelector("#btn-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => logout());
    }
  }

  const langBtn = container.querySelector("#btn-toggle-lang");
  if (langBtn) {
    langBtn.addEventListener("click", () => {
      const next = getLang() === "ar" ? "en" : "ar";
      setLang(next);
      location.reload();
    });
  }

  const themeBtn = container.querySelector("#btn-toggle-theme");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const isDark = document.documentElement.dataset.theme === "dark";
      const next = isDark ? "light" : "dark";
      if (next === "dark") document.documentElement.dataset.theme = "dark";
      else delete document.documentElement.dataset.theme;
      localStorage.setItem("carzen_theme", next);
      location.reload();
    });
  }
}
