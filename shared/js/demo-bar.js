import { t, setLang, getLang, L } from "./i18n.js";
import { get, resetDb, advanceClock, now } from "./db.js";
import { setFlag, isOffline, isFlaky, isPresent } from "./net.js";
import { setTheme, theme } from "../../customer/js/state.js";
import { simulateAppBooking, advanceOrder, processReminders } from "./services/orders.js";
import { toast } from "./ui.js";

function prefix() {
  const p = location.pathname;
  if (p.includes("/wash/")) return "../..";
  if (p.includes("/customer/") || p.includes("/admin/")) return "..";
  return ".";
}

export function mountDemoBar({ surface }) {
  if (isPresent()) return;
  const root = document.createElement("div");
  root.className = "demo-bar";
  document.body.appendChild(root);
  let open = false;
  const draw = () => {
    const db = get();
    const base = prefix();
    const orders = db.orders.filter((o) => ["pending", "confirmed", "waiting", "in_service"].includes(o.status) || (o.status === "completed" && o.paymentStatus === "pending")).slice(0, 12);
    root.innerHTML = `<button class="btn demo-toggle" data-d="toggle">${t("demo.title")}</button>` + (open ? `<div class="demo-panel">
      <div class="small muted">${t("demo.surface")}</div>
      <a class="btn sm ghost" href="${base}/customer/index.html#/">${t("launcher.customer")}</a>
      <a class="btn sm ghost" href="${base}/wash/employee/index.html">${t("launcher.employee")}</a>
      <a class="btn sm ghost" href="${base}/wash/dashboard/index.html">${t("launcher.dash")}</a>
      <a class="btn sm ghost" href="${base}/admin/index.html">${t("launcher.admin")}</a>
      ${surface === "customer" ? `<label class="small">${t("demo.persona")}</label>
        <select data-d="persona"><option value="">${t("demo.guest")}</option>${db.customers.slice(0, 8).map((c) => `<option value="${c.id}" ${localStorage.getItem("carzen_customer_id") === c.id ? "selected" : ""}>${c.name}</option>`).join("")}</select>` : ""}
      <div class="row">
        <button class="mini" data-d="lang">${getLang() === "ar" ? "EN" : "عربي"}</button>
        <button class="mini" data-d="theme">${t("demo.dark")}</button>
        <button class="mini" data-d="clock">${t("demo.clock")}</button>
      </div>
      <div class="row">
        <button class="mini" data-d="offline">${t("demo.offline")} ${isOffline() ? "✓" : ""}</button>
        <button class="mini" data-d="flaky">${t("demo.flaky")} ${isFlaky() ? "✓" : ""}</button>
      </div>
      <button class="btn sm" data-d="sim">${t("demo.sim")}</button>
      <select data-d="order">${orders.map((o) => `<option value="${o.id}">${o.number} · ${o.status}</option>`).join("")}</select>
      <button class="btn sm secondary" data-d="advance">${t("demo.advance")}</button>
      <button class="mini" data-d="slot">${t("demo.slot")}</button>
      <button class="btn sm ghost" data-d="reset">${t("demo.reset")}</button>
      <div class="small muted num">${new Date(now()).toLocaleString("en-GB")}</div>
    </div>` : "");
  };
  root.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-d]");
    if (!btn) return;
    const d = btn.dataset.d;
    if (d === "toggle") { open = !open; draw(); }
    if (d === "lang") { setLang(getLang() === "ar" ? "en" : "ar"); draw(); }
    if (d === "theme") { setTheme(theme() === "dark" ? "light" : "dark"); draw(); }
    if (d === "clock") { advanceClock(30); processReminders(); toast("+30"); draw(); }
    if (d === "offline") { setFlag("offline", !isOffline()); draw(); }
    if (d === "flaky") { setFlag("flaky", !isFlaky()); draw(); }
    if (d === "reset") { resetDb(); }
    if (d === "slot") { localStorage.setItem("carzen_force_slot", "1"); toast("slot"); }
    if (d === "sim") {
      try { const order = await simulateAppBooking(); toast(order.number); draw(); }
      catch { toast("—"); }
    }
    if (d === "advance") {
      const id = root.querySelector("[data-d=order]")?.value;
      if (!id) return;
      try { const order = await advanceOrder(id, "st_samir"); toast(L({ ar: order.status, en: order.status })); draw(); }
      catch { toast("—"); }
    }
  });
  root.addEventListener("change", (e) => {
    if (e.target.dataset.d === "persona") {
      const id = e.target.value;
      if (id) localStorage.setItem("carzen_customer_id", id);
      else localStorage.removeItem("carzen_customer_id");
      window.dispatchEvent(new CustomEvent("carzen-session"));
    }
  });
  draw();
}
