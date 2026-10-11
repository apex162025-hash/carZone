import { applyLang, onLang, t } from "../../../shared/js/i18n.js";
import { get, subscribe, now, load } from "../../../shared/js/db.js";
import { parseHash, matchRoute } from "../../../shared/js/router.js";
import { paintIcons } from "../../../shared/js/dom.js";
import { toast } from "../../../shared/js/ui.js";
import { formatTime } from "../../../shared/js/format.js";
import { mountDemoBar } from "../../../shared/js/demo-bar.js";
import {
  currentStaff,
  isOwner,
  isManager,
  selectedBranchId,
  setSelectedBranchId,
} from "./state.js";

import { dashLoginScreen } from "./screens/auth.js";
import { dashboardScreen } from "./screens/dash.js";
import { liveOperationsScreen } from "./screens/live.js";
import { bookingsScreen, ordersScreen, openOrderDetailsDrawer } from "./screens/orders.js";
import { scheduleScreen } from "./screens/schedule.js";
import {
  servicesScreen,
  offersScreen,
  employeesScreen,
  branchesScreen,
  settingsScreen,
} from "./screens/config.js";
import { shiftsClosingScreen } from "./screens/shifts.js";
import { customersCrmScreen, reviewsScreen } from "./screens/crm.js";
import { reportsScreen, financialsScreen } from "./screens/reports.js";
import { auditLogScreen, dashNotificationsScreen } from "./screens/audit.js";

const routes = [
  { path: "/login", name: "login" },
  { path: "/dashboard", name: "dashboard" },
  { path: "/live", name: "live" },
  { path: "/bookings", name: "bookings" },
  { path: "/orders", name: "orders" },
  { path: "/schedule", name: "schedule" },
  { path: "/services", name: "services" },
  { path: "/offers", name: "offers" },
  { path: "/employees", name: "employees" },
  { path: "/shifts", name: "shifts" },
  { path: "/customers", name: "customers" },
  { path: "/reviews", name: "reviews" },
  { path: "/reports", name: "reports" },
  { path: "/financials", name: "financials" },
  { path: "/branches", name: "branches" },
  { path: "/audit", name: "audit" },
  { path: "/notifications", name: "notifications" },
  { path: "/settings", name: "settings" },
];

function renderSidebar(activeName) {
  const sidebar = document.getElementById("dash-sidebar");
  if (!sidebar) return;

  const staff = currentStaff();

  sidebar.innerHTML = `
    <div class="dash-brand">
      <img src="../../shared/assets/logo.svg" alt="" />
      <div>
        <div class="dash-brand-title">Carzen Wash</div>
        <div class="dash-brand-sub">${isOwner() ? "لوحة المالك (Owner)" : "مدير الفرع (Manager)"}</div>
      </div>
    </div>

    <nav class="dash-nav">
      <a class="${activeName === "dashboard" ? "active" : ""}" href="#/dashboard">
        <i data-lucide="layout-dashboard"></i> <span>${t("dash.nav.dashboard")}</span>
      </a>
      <a class="${activeName === "live" ? "active" : ""}" href="#/live">
        <i data-lucide="kanban"></i> <span>${t("dash.nav.live")}</span>
      </a>
      <a class="${activeName === "bookings" ? "active" : ""}" href="#/bookings">
        <i data-lucide="calendar"></i> <span>${t("dash.nav.bookings")}</span>
      </a>
      <a class="${activeName === "orders" ? "active" : ""}" href="#/orders">
        <i data-lucide="list-ordered"></i> <span>${t("dash.nav.orders")}</span>
      </a>
      <a class="${activeName === "schedule" ? "active" : ""}" href="#/schedule">
        <i data-lucide="clock"></i> <span>${t("dash.nav.schedule")}</span>
      </a>
      <a class="${activeName === "services" ? "active" : ""}" href="#/services">
        <i data-lucide="wrench"></i> <span>${t("dash.nav.services")}</span>
      </a>
      <a class="${activeName === "offers" ? "active" : ""}" href="#/offers">
        <i data-lucide="tag"></i> <span>${t("dash.nav.offers")}</span>
      </a>
      <a class="${activeName === "employees" ? "active" : ""}" href="#/employees">
        <i data-lucide="users"></i> <span>${t("dash.nav.employees")}</span>
      </a>
      <a class="${activeName === "shifts" ? "active" : ""}" href="#/shifts">
        <i data-lucide="file-check"></i> <span>${t("dash.nav.shifts")}</span>
      </a>
      <a class="${activeName === "customers" ? "active" : ""}" href="#/customers">
        <i data-lucide="user-check"></i> <span>${t("dash.nav.customers")}</span>
      </a>
      <a class="${activeName === "reviews" ? "active" : ""}" href="#/reviews">
        <i data-lucide="star"></i> <span>${t("dash.nav.reviews")}</span>
      </a>
      <a class="${activeName === "reports" ? "active" : ""}" href="#/reports">
        <i data-lucide="bar-chart-3"></i> <span>${t("dash.nav.reports")}</span>
      </a>
      <a class="${activeName === "financials" ? "active" : ""}" href="#/financials">
        <i data-lucide="wallet"></i> <span>${t("dash.nav.financials")}</span>
      </a>
      <a class="${activeName === "branches" ? "active" : ""}" href="#/branches">
        <i data-lucide="map-pin"></i> <span>${t("dash.nav.branches")}</span>
      </a>
      <a class="${activeName === "audit" ? "active" : ""}" href="#/audit">
        <i data-lucide="shield-check"></i> <span>${t("dash.nav.audit")}</span>
      </a>
      <a class="${activeName === "notifications" ? "active" : ""}" href="#/notifications">
        <i data-lucide="bell"></i> <span>الإشعارات</span>
      </a>
      <a class="${activeName === "settings" ? "active" : ""}" href="#/settings">
        <i data-lucide="settings"></i> <span>${t("dash.nav.settings")}</span>
      </a>
    </nav>

    <div class="dash-user-badge between">
      <div class="row">
        <div class="avatar">${staff.name.slice(0, 1)}</div>
        <div>
          <b>${staff.name}</b>
          <div class="small muted">${staff.role === "owner" ? "مالك" : "مدير فرع"}</div>
        </div>
      </div>
      <a class="icon-btn" href="#/login" title="تبديل الحساب" style="width:32px;height:32px">
        <i data-lucide="log-out"></i>
      </a>
    </div>
  `;

  paintIcons(sidebar);
}

function renderTopBar() {
  const topbar = document.getElementById("dash-topbar");
  if (!topbar) return;

  const currentBranch = selectedBranchId();
  const managerLocked = isManager();

  topbar.innerHTML = `
    <!-- Left / Start: Branch Switcher -->
    <div class="row">
      ${managerLocked ? `
        <div class="chip on" style="gap:6px">
          <i data-lucide="lock" style="width:14px;height:14px"></i>
          <span>كارزن ووش – مدينة نصر (مغلق للمدير)</span>
        </div>
      ` : `
        <div class="row">
          <span class="small muted">الفرع:</span>
          <select class="control" id="dash-branch-switcher" style="height:38px;padding-inline:10px;font-weight:700">
            <option value="all" ${currentBranch === "all" ? "selected" : ""}>جميع الفروع (All Branches)</option>
            <option value="br_nasr" ${currentBranch === "br_nasr" ? "selected" : ""}>كارزن ووش – مدينة نصر</option>
            <option value="br_helio" ${currentBranch === "br_helio" ? "selected" : ""}>كارزن ووش – مصر الجديدة</option>
          </select>
        </div>
      `}
    </div>

    <!-- Center: Global Search -->
    <div class="row" style="flex:1;max-width:380px;margin-inline:20px">
      <input class="control" id="dash-global-search" placeholder="بحث باللوحة، رقم الطلب، أو الهاتف..." style="height:38px;border-radius:var(--r-pill)" />
    </div>

    <!-- Right: Clock, Notifications & User -->
    <div class="row">
      <div class="chip flat num small" id="dash-clock-badge">
        🕒 ${formatTime(now())}
      </div>

      <a class="icon-btn" href="#/notifications" title="الإشعارات" style="width:38px;height:38px">
        <i data-lucide="bell"></i>
      </a>
    </div>
  `;

  paintIcons(topbar);

  // Branch switcher event
  const branchSelect = document.getElementById("dash-branch-switcher");
  if (branchSelect) {
    branchSelect.onchange = (e) => {
      setSelectedBranchId(e.target.value);
      renderRoute();
    };
  }

  // Global search input
  const searchInput = document.getElementById("dash-global-search");
  if (searchInput) {
    searchInput.onkeydown = (e) => {
      if (e.key === "Enter") {
        const val = searchInput.value.trim();
        if (val) {
          location.hash = `#/orders?q=${encodeURIComponent(val)}`;
        }
      }
    };
  }
}

function renderRoute() {
  const hash = location.hash || "#/dashboard";
  const { path, query } = parseHash(hash);
  const matched = matchRoute(path, routes);
  const content = document.getElementById("dash-content");
  if (!content) return;

  load();

  // If not staff, default to owner
  if (!localStorage.getItem("carzen_staff_id")) {
    localStorage.setItem("carzen_staff_id", "st_owner_biz_carzen");
  }

  if (matched?.name === "login") {
    document.getElementById("dash-sidebar").style.display = "none";
    document.getElementById("dash-topbar").style.display = "none";
    dashLoginScreen(content);
    return;
  }

  document.getElementById("dash-sidebar").style.display = "flex";
  document.getElementById("dash-topbar").style.display = "flex";

  renderSidebar(matched?.name || "dashboard");
  renderTopBar();

  if (!matched || matched.name === "dashboard") {
    dashboardScreen(content);
  } else if (matched.name === "live") {
    liveOperationsScreen(content);
  } else if (matched.name === "bookings") {
    bookingsScreen(content);
  } else if (matched.name === "orders") {
    ordersScreen(content);
    if (query?.id) openOrderDetailsDrawer(query.id, content);
  } else if (matched.name === "schedule") {
    scheduleScreen(content);
  } else if (matched.name === "services") {
    servicesScreen(content);
  } else if (matched.name === "offers") {
    offersScreen(content);
  } else if (matched.name === "employees") {
    employeesScreen(content);
  } else if (matched.name === "shifts") {
    shiftsClosingScreen(content);
  } else if (matched.name === "customers") {
    customersCrmScreen(content);
  } else if (matched.name === "reviews") {
    reviewsScreen(content);
  } else if (matched.name === "reports") {
    reportsScreen(content);
  } else if (matched.name === "financials") {
    financialsScreen(content);
  } else if (matched.name === "branches") {
    branchesScreen(content);
  } else if (matched.name === "audit") {
    auditLogScreen(content);
  } else if (matched.name === "notifications") {
    dashNotificationsScreen(content);
  } else if (matched.name === "settings") {
    settingsScreen(content);
  }
}

export function initDashboard() {
  applyLang();
  onLang(() => {
    applyLang();
    renderRoute();
  });

  window.addEventListener("hashchange", renderRoute);
  window.addEventListener("carzen-staff-session", () => renderRoute());
  window.addEventListener("carzen-branch-change", () => renderRoute());

  // Cross-tab live sync via db subscription
  subscribe((db) => {
    renderRoute();
  });

  // Clock updates
  window.addEventListener("carzen-clock", () => {
    const badge = document.getElementById("dash-clock-badge");
    if (badge) badge.textContent = `🕒 ${formatTime(now())}`;
  });

  renderRoute();
  mountDemoBar({ surface: "dashboard" });
}

document.addEventListener("DOMContentLoaded", initDashboard);
