import { parseHash } from "../../shared/js/router.js";
import { getCurrentAdmin, getCurrentAdminId, checkPermission, initActivityWatcher, logout } from "./auth.js";
import { renderSidebar } from "./components/sidebar.js";
import { renderTopbar, bindTopbarEvents } from "./components/topbar.js";
import { initGlobalSearchShortcut } from "./components/search-modal.js";
import { showSessionTimeoutModal } from "./components/modal.js";
import { subscribe } from "../../shared/js/db.js";
import { toast } from "../../shared/js/ui.js";
import { t, getLang, applyLang } from "../../shared/js/i18n.js";

// Import Views
import { renderLogin } from "./views/login.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderCustomers } from "./views/customers.js";
import { renderOwners } from "./views/owners.js";
import { renderEmployees } from "./views/employees.js";
import { renderWashes } from "./views/washes.js";
import { renderApplications } from "./views/applications.js";
import { renderBranches } from "./views/branches.js";
import { renderOrders } from "./views/orders.js";
import { renderReviews } from "./views/reviews.js";
import { renderComplaints } from "./views/complaints.js";
import { renderOffers } from "./views/offers.js";
import { renderFeatured } from "./views/featured.js";
import { renderFinance } from "./views/finance.js";
import { renderReports } from "./views/reports.js";
import { renderNotifications } from "./views/notifications.js";
import { renderAdmins } from "./views/admins.js";
import { renderRoles } from "./views/roles.js";
import { renderSettings } from "./views/settings.js";
import { renderAudit } from "./views/audit.js";

// Route to permission module map
const ROUTE_PERMS = {
  "#/dashboard": "dashboard",
  "#/customers": "customers",
  "#/owners": "washes",
  "#/employees": "washes",
  "#/washes": "washes",
  "#/applications": "applications",
  "#/branches": "branches",
  "#/orders": "orders",
  "#/reviews": "reviews",
  "#/complaints": "complaints",
  "#/offers": "offers",
  "#/featured": "featured",
  "#/finance": "finance",
  "#/finance/transactions": "transactions",
  "#/finance/commission": "commission",
  "#/finance/payouts": "payouts",
  "#/reports": "reports",
  "#/admins": "admins",
  "#/roles": "roles",
  "#/settings": "settings",
  "#/audit": "audit",
};

export function initApp() {
  applyLang();
  initGlobalSearchShortcut();

  initActivityWatcher((dismissModal) => {
    showSessionTimeoutModal(
      () => dismissModal(),
      () => logout()
    );
  });

  // Cross-tab live sync
  let lastOrderCount = null;
  subscribe((db) => {
    const currentOrderCount = db.orders?.length || 0;
    if (lastOrderCount !== null && currentOrderCount > lastOrderCount) {
      toast(getLang() === "ar" ? "تم استلام حجز جديد في النظام!" : "New booking received on platform!");
    }
    lastOrderCount = currentOrderCount;

    // Refresh current view if not on login
    const { path } = parseHash();
    if (path !== "/login") {
      navigate();
    }
  });

  window.addEventListener("hashchange", () => navigate());
  window.addEventListener("carzen-admin-session", () => navigate());

  navigate();
}

async function navigate() {
  const hash = location.hash || "#/dashboard";
  const { path, query } = parseHash(hash);
  const admin = getCurrentAdmin();

  // Root or login check
  if (path === "/" || path === "/home") {
    location.hash = "#/dashboard";
    return;
  }

  if (path === "/login") {
    document.body.innerHTML = "";
    document.body.appendChild(renderLogin());
    if (window.lucide?.createIcons) window.lucide.createIcons();
    return;
  }

  // Ensure main layout container exists
  let layout = document.querySelector(".admin-layout");
  if (!layout) {
    document.body.innerHTML = `
      <div class="admin-layout">
        <aside class="admin-sidebar" id="app-sidebar"></aside>
        <div class="admin-main">
          <header class="admin-topbar" id="app-topbar"></header>
          <main class="admin-content" id="app-content"></main>
        </div>
      </div>
    `;
    layout = document.querySelector(".admin-layout");
  }

  const sidebarEl = layout.querySelector("#app-sidebar");
  const topbarEl = layout.querySelector("#app-topbar");
  const contentEl = layout.querySelector("#app-content");

  // Render navigation & topbar
  sidebarEl.innerHTML = renderSidebar(hash);
  topbarEl.innerHTML = renderTopbar();
  bindTopbarEvents(topbarEl);

  // Check role access guard
  const baseRoute = `#/${path.split("/")[1]}`;
  const permKey = ROUTE_PERMS[hash.split("?")[0]] || ROUTE_PERMS[baseRoute];

  if (permKey && !checkPermission(permKey)) {
    contentEl.innerHTML = `
      <div class="card pad" style="max-inline-size:540px;margin:48px auto;text-align:center;padding:48px 24px">
        <div style="inline-size:56px;block-size:56px;border-radius:50%;background:color-mix(in srgb,var(--c-danger) 12%,transparent);color:var(--c-danger);display:inline-flex;align-items:center;justify-content:center;margin-block-end:16px">
          <i data-lucide="shield-alert" style="inline-size:32px;block-size:32px"></i>
        </div>
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:800">${t("admin.noAccess.title")}</h2>
        <p class="muted" style="margin:0 0 24px;font-size:14px;line-height:1.5">${t("admin.noAccess.desc")}</p>
        <a href="#/dashboard" class="btn primary">
          ${getLang() === "ar" ? "العودة للوحة القيادة" : "Back to Dashboard"}
        </a>
      </div>
    `;
    if (window.lucide?.createIcons) window.lucide.createIcons({ root: contentEl });
    return;
  }

  // Render Route View
  contentEl.innerHTML = "";
  let viewEl = null;

  try {
    const parts = path.split("/").filter(Boolean); // e.g. ["orders", "CZ-10001"]

    if (parts[0] === "dashboard") {
      viewEl = await renderDashboard();
    } else if (parts[0] === "customers") {
      viewEl = await renderCustomers({ id: parts[1] });
    } else if (parts[0] === "owners") {
      viewEl = await renderOwners();
    } else if (parts[0] === "employees") {
      viewEl = await renderEmployees();
    } else if (parts[0] === "washes") {
      viewEl = await renderWashes({ id: parts[1] }, query);
    } else if (parts[0] === "applications") {
      viewEl = await renderApplications({ id: parts[1] });
    } else if (parts[0] === "branches") {
      viewEl = await renderBranches({ id: parts[1] });
    } else if (parts[0] === "orders") {
      viewEl = await renderOrders({ id: parts[1] }, query);
    } else if (parts[0] === "reviews") {
      viewEl = await renderReviews();
    } else if (parts[0] === "complaints") {
      viewEl = await renderComplaints({ id: parts[1] }, query);
    } else if (parts[0] === "offers") {
      viewEl = await renderOffers();
    } else if (parts[0] === "featured") {
      viewEl = await renderFeatured();
    } else if (parts[0] === "finance") {
      viewEl = await renderFinance(parts[1] || "overview", query);
    } else if (parts[0] === "reports") {
      viewEl = await renderReports(parts[1] || "users");
    } else if (parts[0] === "notifications") {
      viewEl = await renderNotifications();
    } else if (parts[0] === "admins") {
      viewEl = await renderAdmins();
    } else if (parts[0] === "roles") {
      viewEl = await renderRoles();
    } else if (parts[0] === "settings") {
      viewEl = await renderSettings();
    } else if (parts[0] === "audit") {
      viewEl = await renderAudit();
    } else {
      location.hash = "#/dashboard";
      return;
    }

    if (viewEl) {
      contentEl.appendChild(viewEl);
    }
  } catch (err) {
    console.error("View render error:", err);
    contentEl.innerHTML = `
      <div class="card pad" style="text-align:center;padding:48px 24px">
        <h3 style="color:var(--c-danger)">Error loading screen</h3>
        <p class="muted">${err.message}</p>
        <button class="btn secondary" onclick="location.reload()">Retry</button>
      </div>
    `;
  }

  // Paint icons on new elements
  if (window.lucide?.createIcons) {
    window.lucide.createIcons({ root: layout });
  }
}
