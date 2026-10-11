import { applyLang, onLang, t } from "../../../shared/js/i18n.js";
import { get, subscribe, now, load } from "../../../shared/js/db.js";
import { parseHash, matchRoute } from "../../../shared/js/router.js";
import { paintIcons } from "../../../shared/js/dom.js";
import { toast } from "../../../shared/js/ui.js";
import { formatTime } from "../../../shared/js/format.js";
import { mountDemoBar } from "../../../shared/js/demo-bar.js";
import { currentStaff, currentBranch, hasActiveShift } from "./state.js";

import { loginScreen, startShiftGate } from "./screens/auth.js";
import { todayScreen } from "./screens/today.js";
import { ordersListScreen, orderDetailsScreen } from "./screens/orders.js";
import { walkinScreen } from "./screens/walkin.js";
import { checkinScreen } from "./screens/checkin.js";
import { phoneBookingScreen } from "./screens/phone.js";
import { shiftScreen } from "./screens/shift.js";
import { meScreen, notificationsScreen } from "./screens/me.js";

const routes = [
  { path: "/login", name: "login", hideTab: true },
  { path: "/shift/start", name: "startShift", hideTab: true },
  { path: "/home", name: "home" },
  { path: "/orders", name: "orders" },
  { path: "/order/:id", name: "orderDetails", hideTab: true },
  { path: "/walk-in", name: "walkin", hideTab: true },
  { path: "/check-in", name: "checkin", hideTab: true },
  { path: "/phone-booking", name: "phoneBooking", hideTab: true },
  { path: "/shift", name: "shift" },
  { path: "/notifications", name: "notifications" },
  { path: "/me", name: "me" },
];

let lastOrdersCount = 0;

function renderTabbar(activeName, hideTab) {
  const tabbar = document.getElementById("emp-tabbar");
  if (!tabbar) return;

  if (hideTab) {
    tabbar.style.display = "none";
    return;
  }
  tabbar.style.display = "grid";

  tabbar.innerHTML = `
    <button class="${activeName === "home" ? "on" : ""}" data-go="#/home">
      <i data-lucide="layout-grid"></i>
      <span>${t("emp.nav.today")}</span>
    </button>
    <button class="${activeName === "orders" ? "on" : ""}" data-go="#/orders">
      <i data-lucide="list"></i>
      <span>${t("emp.nav.orders")}</span>
    </button>
    <div class="fab-wrap">
      <button class="emp-fab" data-go="#/walk-in" title="${t("emp.nav.walkin")}">
        <i data-lucide="plus"></i>
      </button>
    </div>
    <button class="${activeName === "shift" ? "on" : ""}" data-go="#/shift">
      <i data-lucide="clock"></i>
      <span>${t("emp.nav.shift")}</span>
    </button>
    <button class="${activeName === "me" ? "on" : ""}" data-go="#/me">
      <i data-lucide="user"></i>
      <span>${t("emp.nav.me")}</span>
    </button>
  `;

  paintIcons(tabbar);

  tabbar.querySelectorAll("[data-go]").forEach((btn) => {
    btn.onclick = () => {
      location.hash = btn.dataset.go;
    };
  });
}

function renderRoute() {
  const hash = location.hash || "#/home";
  const { path, query } = parseHash(hash);
  const matched = matchRoute(path, routes);
  const appEl = document.getElementById("app");
  if (!appEl) return;

  load();

  // If user is not logged in
  if (!localStorage.getItem("carzen_staff_id") && path !== "/login") {
    loginScreen(appEl);
    renderTabbar("login", true);
    return;
  }

  if (!matched) {
    location.hash = "#/home";
    return;
  }

  // Check start shift gate
  if ((matched.name === "home" || matched.name === "orders") && !hasActiveShift()) {
    startShiftGate(appEl);
    renderTabbar("shift", true);
    return;
  }

  renderTabbar(matched.name, matched.hideTab);

  if (matched.name === "login") {
    loginScreen(appEl);
  } else if (matched.name === "startShift") {
    startShiftGate(appEl);
  } else if (matched.name === "home") {
    todayScreen(appEl);
  } else if (matched.name === "orders") {
    ordersListScreen(appEl);
  } else if (matched.name === "orderDetails") {
    orderDetailsScreen(appEl, matched.params.id);
  } else if (matched.name === "walkin") {
    walkinScreen(appEl);
  } else if (matched.name === "checkin") {
    checkinScreen(appEl, query?.id || null);
  } else if (matched.name === "phoneBooking") {
    phoneBookingScreen(appEl);
  } else if (matched.name === "shift") {
    shiftScreen(appEl);
  } else if (matched.name === "notifications") {
    notificationsScreen(appEl);
  } else if (matched.name === "me") {
    meScreen(appEl);
  }
}

export function initEmployee() {
  applyLang();
  onLang(() => {
    applyLang();
    renderRoute();
  });

  const db = load();
  lastOrdersCount = db.orders.length;

  window.addEventListener("hashchange", renderRoute);
  window.addEventListener("carzen-staff-session", () => renderRoute());

  // Listen for db updates (including cross-tab storage changes from Customer app!)
  subscribe((currentDb) => {
    // If a new booking was created by customer in another tab!
    if (currentDb && currentDb.orders && currentDb.orders.length > lastOrdersCount) {
      const branch = currentBranch();
      const newOrders = currentDb.orders.filter((o) => o.branchId === branch.id && o.source === "app");
      const latest = newOrders[newOrders.length - 1];
      if (latest && latest.createdAfterSeed) {
        toast(`🔔 حجز جديد من التطبيق: ${latest.number} (${latest.plate})`);
      }
      lastOrdersCount = currentDb.orders.length;
    }
    renderRoute();
  });

  // Clock in status bar
  const clockEl = document.getElementById("status-time");
  if (clockEl) {
    const updateTime = () => {
      clockEl.textContent = formatTime(now());
    };
    updateTime();
    window.addEventListener("carzen-clock", updateTime);
  }

  renderRoute();
  mountDemoBar({ surface: "employee" });
}

document.addEventListener("DOMContentLoaded", initEmployee);
