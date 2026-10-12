import { applyLang, onLang, t } from "../../shared/js/i18n.js";
import { get, subscribe, now, load } from "../../shared/js/db.js";
import { parseHash, matchRoute } from "../../shared/js/router.js";
import { paintIcons } from "../../shared/js/dom.js";
import { confirmDialog, toast } from "../../shared/js/ui.js";
import { L } from "../../shared/js/i18n.js";
import { formatTime } from "../../shared/js/format.js";
import { isOffline } from "../../shared/js/net.js";
import { processReminders } from "../../shared/js/services/orders.js";
import { toggleFavorite } from "../../shared/js/services/account.js";
import { mountDemoBar } from "../../shared/js/demo-bar.js";
import { bus, offlineBanner, tx, icon } from "./kit.js";
import { currentUser, getDraft, clearDraft, sessionId, takePending } from "./state.js";
import { destroyMap } from "./screens/discover.js";
import * as auth from "./screens/auth.js";
import * as discover from "./screens/discover.js";
import * as wash from "./screens/wash.js";
import * as flow from "./screens/flow.js";
import * as account from "./screens/account.js";

const routes = [
  { path: "/", name: "splash", hideTab: true },
  { path: "/onboarding", name: "onboarding", hideTab: true },
  { path: "/login", name: "login", hideTab: true },
  { path: "/otp", name: "otp", hideTab: true },
  { path: "/profile/setup", name: "setup", hideTab: true },
  { path: "/home", name: "home" },
  { path: "/search", name: "search" },
  { path: "/results", name: "results" },
  { path: "/map", name: "map" },
  { path: "/offers", name: "offers" },
  { path: "/wash/:branchId/reviews", name: "reviews" },
  { path: "/wash/:branchId", name: "wash" },
  { path: "/book/:branchId/service", name: "service", hideTab: true },
  { path: "/book/:branchId/car", name: "car", hideTab: true },
  { path: "/book/:branchId/slot", name: "slot", hideTab: true },
  { path: "/book/:branchId/summary", name: "summary", hideTab: true },
  { path: "/book/success/:orderId", name: "success" },
  { path: "/bookings", name: "bookings" },
  { path: "/booking/:orderId/reschedule", name: "reschedule", hideTab: true },
  { path: "/booking/:orderId/review", name: "review", hideTab: true },
  { path: "/booking/:orderId/report", name: "report", hideTab: true },
  { path: "/booking/:orderId", name: "booking" },
  { path: "/cars/new", name: "carForm", hideTab: true },
  { path: "/cars/:id", name: "carForm", hideTab: true },
  { path: "/cars", name: "cars" },
  { path: "/favorites", name: "favorites" },
  { path: "/notifications", name: "notifications" },
  { path: "/profile/edit", name: "editProfile" },
  { path: "/profile", name: "profile" },
  { path: "/settings", name: "settings" },
  { path: "/legal/:doc", name: "legal" },
  { path: "/help", name: "help" },
];

const screens = {
  splash: auth.splash,
  onboarding: auth.onboarding,
  login: auth.login,
  otp: auth.otp,
  setup: auth.setup,
  home: discover.home,
  search: discover.search,
  results: discover.results,
  map: discover.mapScreen,
  offers: discover.offers,
  wash: wash.wash,
  reviews: wash.reviews,
  service: flow.serviceStep,
  car: flow.carStep,
  slot: flow.slotStep,
  summary: flow.summaryStep,
  success: flow.success,
  bookings: flow.bookings,
  booking: flow.bookingDetail,
  reschedule: flow.reschedule,
  review: flow.review,
  report: flow.report,
  cars: account.cars,
  carForm: account.carForm,
  favorites: account.favorites,
  notifications: account.notifications,
  profile: account.profile,
  editProfile: account.editProfile,
  settings: account.settings,
  legal: account.legal,
  help: account.help,
};

const app = document.getElementById("app");
const tabs = document.getElementById("tabbar");
let gen = 0;
let currentHash = location.hash || "#/";
let suppress = false;
let leave = () => {};
const seenNotes = new Set();

function flowHash(hash) {
  return /^#\/book\/[^/]+\/(service|car|slot|summary)/.test(hash || "");
}
function safeLeave(hash) {
  return /^#\/(login|otp|profile\/setup|cars|legal)/.test(hash || "");
}

function paintTabs(name) {
  const items = [
    ["home", "nav.home", "house"],
    ["map", "nav.map", "map"],
    null,
    ["bookings", "nav.bookings", "calendar"],
    ["profile", "nav.profile", "user"],
  ];
  const fab = `<button data-tab="results?mode=washnow" class="fab-tab" aria-label="${tx("home.washNow")}"><span class="fab">${icon("sparkles")}</span></button>`;
  tabs.innerHTML = items.map((item) => {
    if (!item) return fab;
    const [id, key, ic] = item;
    return `<button data-tab="${id}" class="${name === id ? "on" : ""}"><span class="ti">${icon(ic)}</span><span>${tx(key)}</span></button>`;
  }).join("");
  paintIcons(tabs);
}

function paintStatus() {
  const el = document.getElementById("status-time");
  if (el) el.textContent = formatTime(now()).replace(/[^\d:٠-٩]/g, "");
}

async function render() {
  const token = ++gen;
  leave();
  leave = () => {};
  destroyMap();
  const parsed = parseHash();
  if (parsed.path === "/" && sessionStorage.getItem("carzen_splashed") === "1") {
    location.hash = "#/home";
    return;
  }
  const matched = matchRoute(parsed.path, routes) || { name: "missing", hideTab: false, params: {} };
  tabs.hidden = !!matched.hideTab;
  paintTabs(matched.name);
  paintStatus();
  const user = currentUser();
  if (user && sessionStorage.getItem("carzen_pending")) {
    const pending = takePending();
    if (pending?.type === "favorite") await toggleFavorite(user.id, pending.branchId);
  }
  const ctx = {
    root: app,
    params: matched.params,
    query: parsed.query,
    alive: () => token === gen,
    go: (hash) => { if (location.hash === hash) render(); else location.hash = hash; },
    render,
    icons: () => paintIcons(app),
    offlineBanner,
    onLeave: (fn) => { leave = fn; },
  };
  bus.act = async () => {};
  bus.input = () => {};
  app.classList.remove("enter");
  void app.offsetWidth;
  app.classList.add("enter");
  try {
    if (screens[matched.name]) await screens[matched.name](ctx);
    else app.innerHTML = `<div class="empty"><h3>${tx("notfound")}</h3><button class="btn" data-go="#/home">${tx("book.home")}</button></div>`;
  } catch (err) {
    console.error(err);
    if (token === gen) app.innerHTML = `<div class="error-box"><h3>${tx("error.title")}</h3><p>${tx("error.body")}</p></div>`;
  }
  if (token === gen) paintIcons(app);
}

app.addEventListener("click", async (e) => {
  const act = e.target.closest("[data-act]");
  if (act) {
    e.preventDefault();
    if (isOffline() && ["confirm", "send", "save", "verify"].includes(act.dataset.act)) {
      toast(t("offline.action"));
      return;
    }
    await bus.act(act);
    return;
  }
  const go = e.target.closest("[data-go]");
  if (go) {
    e.preventDefault();
    location.hash = go.dataset.go;
  }
});
app.addEventListener("input", (e) => bus.input(e.target));
app.addEventListener("change", (e) => bus.input(e.target));
tabs.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-tab]");
  if (btn) location.hash = `#/${btn.dataset.tab}`;
});

window.addEventListener("hashchange", async () => {
  if (suppress) { suppress = false; return; }
  const next = location.hash || "#/";
  const draft = getDraft();
  if (draft?.serviceId && flowHash(currentHash) && !flowHash(next) && !safeLeave(next)) {
    suppress = true;
    location.hash = currentHash;
    const ok = await confirmDialog({
      title: t("book.discard"),
      body: t("book.discardBody"),
      ok: t("book.discardYes"),
      cancel: t("book.keep"),
      danger: true,
    });
    if (!ok) return;
    clearDraft();
    suppress = true;
    currentHash = next;
    location.hash = next;
    render();
    return;
  }
  currentHash = next;
  render();
});

function bootNotes() {
  const id = sessionId();
  get().notifications.filter((n) => n.userId === id).forEach((n) => seenNotes.add(n.id));
}
subscribe(() => {
  const id = sessionId();
  get().notifications.filter((n) => n.audience === "customer" && n.userId === id).forEach((n) => {
    if (!seenNotes.has(n.id)) {
      seenNotes.add(n.id);
      toast(L(n.title));
    }
  });
  render();
});
window.addEventListener("carzen-session", () => render());
window.addEventListener("carzen-clock", () => { processReminders(); render(); });
window.addEventListener("carzen-reset", () => { location.hash = "#/"; location.reload(); });
onLang(() => render());

load();
applyLang();
bootNotes();
processReminders();
mountDemoBar({ surface: "customer" });
if (!location.hash) location.hash = "#/";
currentHash = location.hash || "#/";
render();
