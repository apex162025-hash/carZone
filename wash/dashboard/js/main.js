import { applyLang, onLang, t, L } from "../../../shared/js/i18n.js";
import { get, subscribe, now, load } from "../../../shared/js/db.js";
import { parseHash, matchRoute } from "../../../shared/js/router.js";
import { paintIcons } from "../../../shared/js/dom.js";
import { toast } from "../../../shared/js/ui.js";
import { formatTime } from "../../../shared/js/format.js";
import { mountDemoBar } from "../../../shared/js/demo-bar.js";
import {
  currentStaff,
  isOwner,
  isSignedIn,
  role,
  homeHash,
  currentBranch,
  hasActiveShift,
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

import { startShiftGate } from "./ops/auth.js";
import { todayScreen } from "./ops/today.js";
import { ordersListScreen, orderDetailsScreen } from "./ops/orders.js";
import { walkinScreen } from "./ops/walkin.js";
import { checkinScreen } from "./ops/checkin.js";
import { phoneBookingScreen } from "./ops/phone.js";
import { shiftScreen } from "./ops/shift.js";
import { meScreen } from "./ops/me.js";

const ALL = ["owner", "manager", "employee"];
const MGMT = ["owner", "manager"];
const OPS = ["manager", "employee"];

// One wash app: each role only sees (and can open) its own sections.
// `ops` screens are the former employee app; they need an open shift.
const NAV = [
  { group: "wash.nav.ops", roles: ALL },
  { name: "dashboard", hash: "dashboard", icon: "layout-dashboard", label: "dash.nav.dashboard", roles: MGMT },
  { name: "today", hash: "today", icon: "layout-grid", label: "emp.nav.today", roles: OPS, ops: true, shift: true },
  { name: "live", hash: "live", icon: "kanban", label: "dash.nav.live", roles: ALL },
  { name: "walkin", hash: "walk-in", icon: "user-plus", label: "emp.nav.walkin", roles: OPS, ops: true },
  { name: "checkin", hash: "check-in", icon: "scan-line", label: "wash.nav.checkin", roles: OPS, ops: true },
  { name: "phoneBooking", hash: "phone-booking", icon: "phone-call", label: "wash.nav.phone", roles: OPS, ops: true },
  { name: "myShift", hash: "my-shift", icon: "timer", label: "wash.nav.myShift", roles: OPS, ops: true },
  { group: "wash.nav.bookingsGroup", roles: ALL },
  { name: "queue", hash: "queue", icon: "list", label: "wash.nav.queue", roles: ["employee"], ops: true, shift: true },
  { name: "bookings", hash: "bookings", icon: "calendar", label: "dash.nav.bookings", roles: ALL },
  { name: "orders", hash: "orders", icon: "list-ordered", label: "dash.nav.orders", roles: MGMT },
  { name: "schedule", hash: "schedule", icon: "clock", label: "dash.nav.schedule", roles: ALL },
  { name: "customers", hash: "customers", icon: "user-check", label: "dash.nav.customers", roles: MGMT },
  { group: "wash.nav.manage", roles: MGMT },
  { name: "services", hash: "services", icon: "wrench", label: "dash.nav.services", roles: MGMT },
  { name: "offers", hash: "offers", icon: "tag", label: "dash.nav.offers", roles: MGMT },
  { name: "employees", hash: "employees", icon: "users", label: "dash.nav.employees", roles: MGMT },
  { name: "shifts", hash: "shifts", icon: "file-check", label: "dash.nav.shifts", roles: MGMT },
  { name: "reviews", hash: "reviews", icon: "star", label: "dash.nav.reviews", roles: MGMT },
  { name: "branches", hash: "branches", icon: "map-pin", label: "dash.nav.branches", roles: ["owner"] },
  { name: "settings", hash: "settings", icon: "settings", label: "dash.nav.settings", roles: ["owner"] },
  { group: "wash.nav.finance", roles: MGMT },
  { name: "reports", hash: "reports", icon: "bar-chart-3", label: "dash.nav.reports", roles: MGMT },
  { name: "financials", hash: "financials", icon: "wallet", label: "dash.nav.financials", roles: ["owner"] },
  { name: "audit", hash: "audit", icon: "shield-check", label: "dash.nav.audit", roles: ["owner"] },
];

// Routes outside the sidebar list.
const EXTRA = {
  notifications: { roles: ALL },
  me: { roles: OPS, ops: true },
  queueDetail: { roles: OPS, ops: true },
  startShift: { roles: OPS, ops: true },
};

const routes = [
  { path: "/login", name: "login" },
  { path: "/home", name: "home" },
  { path: "/my-shift/start", name: "startShift" },
  { path: "/queue/:id", name: "queueDetail" },
  { path: "/notifications", name: "notifications" },
  { path: "/me", name: "me" },
  ...NAV.filter((n) => n.name).map((n) => ({ path: `/${n.hash}`, name: n.name })),
];

// Phone-width bottom bar (app mode), per role.
const TABS = {
  employee: [["today", "layout-grid", "emp.nav.today"], ["queue", "list", "wash.nav.queue"], ["walk-in", "plus", ""], ["my-shift", "timer", "wash.nav.myShift"], ["me", "user", "emp.nav.me"]],
  manager: [["dashboard", "layout-dashboard", "dash.nav.dashboard"], ["today", "layout-grid", "emp.nav.today"], ["walk-in", "plus", ""], ["bookings", "calendar", "dash.nav.bookings"], ["me", "user", "emp.nav.me"]],
  owner: [["dashboard", "layout-dashboard", "dash.nav.dashboard"], ["live", "kanban", "dash.nav.live"], ["bookings", "calendar", ""], ["reports", "bar-chart-3", "dash.nav.reports"], ["settings", "settings", "dash.nav.settings"]],
};

function routeInfo(name) {
  return NAV.find((n) => n.name === name) || EXTRA[name] || null;
}

function allowed(name) {
  const info = routeInfo(name);
  return !info || info.roles.includes(role());
}

let lastOrdersCount = 0;

function renderSidebar(activeName) {
  const sidebar = document.getElementById("dash-sidebar");
  if (!sidebar) return;
  const staff = currentStaff();
  const r = role();
  const items = NAV.filter((n) => n.roles.includes(r));
  // Drop group headers with nothing under them.
  const visible = items.filter((n, i) => !n.group || (items[i + 1] && !items[i + 1].group));

  sidebar.innerHTML = `
    <div class="dash-brand">
      <img src="../../shared/assets/logo.svg" alt="" />
      <div>
        <div class="dash-brand-title">Carzen Wash</div>
        <div class="dash-brand-sub">${t("wash.view." + r)}</div>
      </div>
    </div>

    <nav class="dash-nav">
      ${visible.map((n) => n.group
        ? `<div class="dash-nav-group">${t(n.group)}</div>`
        : `<a class="${activeName === n.name ? "active" : ""}" href="#/${n.hash}"><i data-lucide="${n.icon}"></i> <span>${t(n.label)}</span></a>`).join("")}
      <a class="${activeName === "notifications" ? "active" : ""}" href="#/notifications"><i data-lucide="bell"></i> <span>${t("wash.nav.notifications")}</span></a>
      ${r === "owner" ? "" : `<a class="${activeName === "me" ? "active" : ""}" href="#/me"><i data-lucide="user"></i> <span>${t("emp.nav.me")}</span></a>`}
    </nav>

    <div class="dash-user-badge between">
      <div class="row">
        <div class="avatar">${staff.name.slice(0, 1)}</div>
        <div>
          <b>${staff.name}</b>
          <div class="small muted">${t("wash.role." + r)}</div>
        </div>
      </div>
      <button class="icon-btn" id="dash-logout" title="تسجيل الخروج" style="width:34px;height:34px">
        <i data-lucide="log-out"></i>
      </button>
    </div>
  `;

  paintIcons(sidebar);
  sidebar.querySelector("#dash-logout").onclick = () => {
    localStorage.removeItem("carzen_staff_id");
    location.hash = "#/login";
  };
  sidebar.querySelectorAll(".dash-nav a").forEach((a) => {
    a.addEventListener("click", () => setMenu(false));
  });
}

function setMenu(open) {
  document.getElementById("dash-sidebar")?.classList.toggle("open", open);
  document.getElementById("dash-scrim")?.classList.toggle("on", open);
}

function renderTopBar() {
  const topbar = document.getElementById("dash-topbar");
  if (!topbar) return;

  const currentBranchId = selectedBranchId();
  const db = get();
  const ownBranches = db.branches.filter((b) => b.businessId === currentStaff().businessId);

  topbar.innerHTML = `
    <div class="row">
      <button class="icon-btn dash-burger" id="dash-burger" aria-label="${t("wash.menu")}"><i data-lucide="menu"></i></button>
      ${!isOwner() ? `
        <div class="chip on" style="gap:6px">
          <i data-lucide="lock" style="width:14px;height:14px"></i>
          <span>${L(currentBranch()?.name)}</span>
        </div>
      ` : `
        <div class="row">
          <span class="small muted hide-sm">الفرع:</span>
          <select class="control" id="dash-branch-switcher" style="height:40px;padding-inline:10px;font-weight:700">
            <option value="all" ${currentBranchId === "all" ? "selected" : ""}>جميع الفروع (All Branches)</option>
            ${ownBranches.map((b) => `<option value="${b.id}" ${currentBranchId === b.id ? "selected" : ""}>${L(b.name)}</option>`).join("")}
          </select>
        </div>
      `}
    </div>

    <div class="row dash-search">
      <i data-lucide="search"></i>
      <input class="control" id="dash-global-search" placeholder="بحث باللوحة، رقم الطلب، أو الهاتف..." />
    </div>

    <div class="row">
      <div class="chip flat num small hide-sm" id="dash-clock-badge">🕒 ${formatTime(now())}</div>
      <a class="icon-btn" href="#/notifications" title="${t("wash.nav.notifications")}" style="width:40px;height:40px">
        <i data-lucide="bell"></i>
      </a>
    </div>
  `;

  paintIcons(topbar);
  topbar.querySelector("#dash-burger").onclick = () => setMenu(!document.getElementById("dash-sidebar").classList.contains("open"));

  const branchSelect = document.getElementById("dash-branch-switcher");
  if (branchSelect) {
    branchSelect.onchange = (e) => {
      setSelectedBranchId(e.target.value);
      renderRoute();
    };
  }

  const searchInput = document.getElementById("dash-global-search");
  if (searchInput) {
    searchInput.onkeydown = (e) => {
      if (e.key !== "Enter") return;
      const val = searchInput.value.trim();
      if (!val) return;
      location.hash = role() === "employee" ? "#/queue" : `#/orders?q=${encodeURIComponent(val)}`;
    };
  }
}

function renderTabbar(activeHash) {
  const bar = document.getElementById("dash-tabbar");
  if (!bar) return;
  const tabs = TABS[role()] || [];
  bar.innerHTML = tabs.map(([hash, ic, label]) => label
    ? `<a class="${activeHash === hash ? "on" : ""}" href="#/${hash}"><span class="ti"><i data-lucide="${ic}"></i></span><span>${t(label)}</span></a>`
    : `<a class="fab-tab" href="#/${hash}" aria-label="${t("emp.nav.walkin")}"><span class="fab"><i data-lucide="${ic}"></i></span></a>`).join("");
  paintIcons(bar);
}

function renderRoute() {
  const hash = location.hash || "#/";
  const { path, query } = parseHash(hash);
  const matched = matchRoute(path, routes);
  const content = document.getElementById("dash-content");
  const layout = document.querySelector(".dash-layout");
  if (!content) return;

  load();

  if (!isSignedIn() || matched?.name === "login") {
    layout.classList.add("signed-out");
    dashLoginScreen(content);
    return;
  }
  layout.classList.remove("signed-out");

  if (!matched || matched.name === "home") {
    location.replace(homeHash());
    return;
  }
  if (!allowed(matched.name)) {
    toast(t("wash.noAccess"));
    location.replace(homeHash());
    return;
  }

  const info = routeInfo(matched.name) || {};
  content.classList.toggle("ops-mode", !!info.ops);
  const activeHash = path.slice(1).split("/")[0];

  renderSidebar(matched.name === "queueDetail" ? "queue" : matched.name);
  renderTopBar();
  renderTabbar(activeHash);

  if (info.shift && !hasActiveShift()) {
    startShiftGate(content);
    return;
  }

  const screens = {
    dashboard: () => dashboardScreen(content),
    live: () => liveOperationsScreen(content),
    bookings: () => bookingsScreen(content),
    orders: () => {
      ordersScreen(content);
      if (query?.id) openOrderDetailsDrawer(query.id, content);
    },
    schedule: () => scheduleScreen(content),
    services: () => servicesScreen(content),
    offers: () => offersScreen(content),
    employees: () => employeesScreen(content),
    shifts: () => shiftsClosingScreen(content),
    customers: () => customersCrmScreen(content),
    reviews: () => reviewsScreen(content),
    reports: () => reportsScreen(content),
    financials: () => financialsScreen(content),
    branches: () => branchesScreen(content),
    audit: () => auditLogScreen(content),
    notifications: () => dashNotificationsScreen(content),
    settings: () => settingsScreen(content),
    today: () => todayScreen(content),
    queue: () => ordersListScreen(content),
    queueDetail: () => orderDetailsScreen(content, matched.params.id),
    walkin: () => walkinScreen(content),
    checkin: () => checkinScreen(content, query?.id || null),
    phoneBooking: () => phoneBookingScreen(content),
    myShift: () => shiftScreen(content),
    startShift: () => startShiftGate(content),
    me: () => meScreen(content),
  };
  screens[matched.name]?.();
}

export function initDashboard() {
  applyLang();
  onLang(() => {
    applyLang();
    renderRoute();
  });

  lastOrdersCount = load().orders.length;

  window.addEventListener("hashchange", renderRoute);
  window.addEventListener("carzen-staff-session", () => renderRoute());
  window.addEventListener("carzen-branch-change", () => renderRoute());
  document.getElementById("dash-scrim")?.addEventListener("click", () => setMenu(false));

  // Cross-tab live sync; front-desk staff get a toast for new app bookings.
  subscribe((db) => {
    if (db?.orders && db.orders.length > lastOrdersCount) {
      if (isSignedIn() && !isOwner()) {
        const latest = db.orders.filter((o) => o.branchId === currentBranch().id && o.source === "app").pop();
        if (latest?.createdAfterSeed) toast(`🔔 حجز جديد من التطبيق: ${latest.number} (${latest.plate})`);
      }
      lastOrdersCount = db.orders.length;
    }
    renderRoute();
  });

  window.addEventListener("carzen-clock", () => {
    const badge = document.getElementById("dash-clock-badge");
    if (badge) badge.textContent = `🕒 ${formatTime(now())}`;
  });

  renderRoute();
  mountDemoBar({ surface: "dashboard" });
}

document.addEventListener("DOMContentLoaded", initDashboard);
