import { t, L } from "../../../shared/js/i18n.js";
import { now } from "../../../shared/js/db.js";
import { read } from "../../../shared/js/net.js";
import { toast } from "../../../shared/js/ui.js";
import { parseEgPhone, findCustomer, registerCustomer } from "../../../shared/js/services/account.js";
import { tx, screen, topbar, icon, esc, bus, skeleton, errorBlock } from "../kit.js";
import { setSession, takeReturn, currentUser } from "../state.js";
import { logoMark, splashScene, onbArt } from "../art.js";
import { bg, SHOTS } from "../photos.js";

const OTP_OK = "123456";

function otpState() {
  try { return JSON.parse(sessionStorage.getItem("carzen_otp") || "null"); }
  catch { return null; }
}
function saveOtp(v) { sessionStorage.setItem("carzen_otp", JSON.stringify(v)); }

export async function splash(ctx) {
  const drops = Array.from({ length: 14 }, (_, i) => `<i style="left:${(i * 37) % 100}%;animation-delay:${(i * 0.17).toFixed(2)}s;animation-duration:${1.2 + (i % 4) * 0.25}s"></i>`).join("");
  ctx.root.innerHTML = `<div class="splash" role="img" aria-label="${tx("app.name")}">
    <div class="sp-bg"><i class="sp-photo" style="background-image:${bg(SHOTS.splash, 900)}"></i><i class="blob b1"></i><i class="blob b2"></i><i class="blob b3"></i><i class="grid"></i></div>
    <div class="sp-drops">${drops}</div>
    <div class="sp-stage">${splashScene()}</div>
    <div class="sp-brand">
      <div class="sp-logo">${logoMark("splogo")}<i class="pulse"></i></div>
      <h1 class="sp-name">${tx("app.name")}</h1>
      <p class="sp-cap">${tx("splash.caption")}</p>
      <div class="sp-load"><i></i></div>
    </div>
  </div>`;
  await new Promise((r) => setTimeout(r, 3300));
  if (!ctx.alive()) return;
  sessionStorage.setItem("carzen_splashed", "1");
  const seen = localStorage.getItem("carzen_onboarded") === "1";
  ctx.go(seen ? "#/home" : "#/onboarding");
}

const RING = 201;

export function onboarding(ctx) {
  let i = 0;
  let prev = 0;
  const slides = [1, 2, 3];
  const draw = () => {
    const n = slides[i];
    const last = i === slides.length - 1;
    const back = i < prev;
    const from = RING * (1 - (prev + 1) / slides.length);
    const to = RING * (1 - (i + 1) / slides.length);
    ctx.root.innerHTML = `<div class="onb ${back ? "back" : ""}">
      <section class="onb-stage">
        <i class="onb-photo" style="background-image:${bg(SHOTS.onboarding[i], 900)}"></i>
        <i class="blob b1"></i><i class="blob b2"></i>
        <div class="onb-top">
          <span class="onb-brand">${logoMark("onblogo")}${tx("app.name")}</span>
          ${last ? "<span></span>" : `<button class="onb-skip" data-act="skip">${tx("onb.skip")}</button>`}
        </div>
        <div class="onb-art-wrap">${onbArt(n)}</div>
      </section>
      <div class="onb-copy">
        <span class="onb-kicker num">0${n} / 0${slides.length}</span>
        <h2>${tx("onb." + n + ".t")}</h2>
        <p>${tx("onb." + n + ".d")}</p>
      </div>
      <footer class="onb-foot">
        <div class="onb-dots">${slides.map((_, idx) => `<i class="${idx === i ? "on" : ""}"></i>`).join("")}</div>
        <button class="onb-next ${last ? "last" : ""}" data-act="next" aria-label="${tx(last ? "onb.start" : "onb.next")}">
          ${last ? "" : `<svg class="ring-svg" viewBox="0 0 72 72"><circle class="track" cx="36" cy="36" r="32"/><circle class="bar" cx="36" cy="36" r="32" style="--from:${from.toFixed(1)};--to:${to.toFixed(1)}"/></svg>`}
          <span class="core">${last ? `<span>${tx("onb.start")}</span>` : ""}<span class="dir-icon">${icon("arrow-right")}</span></span>
        </button>
      </footer>
    </div>`;
    ctx.icons();
    const root = ctx.root.querySelector(".onb");
    let x0 = null;
    root.addEventListener("pointerdown", (e) => { x0 = e.clientX; });
    root.addEventListener("pointerup", (e) => {
      if (x0 == null) return;
      const dx = (e.clientX - x0) * (document.documentElement.dir === "rtl" ? -1 : 1);
      x0 = null;
      if (Math.abs(dx) < 50) return;
      if (dx < 0 && i < slides.length - 1) go(i + 1);
      if (dx > 0 && i > 0) go(i - 1);
    });
  };
  const go = (next) => { prev = i; i = next; draw(); };
  const finish = () => {
    localStorage.setItem("carzen_onboarded", "1");
    ctx.go("#/home");
  };
  bus.act = async (el) => {
    if (el.dataset.act === "skip") finish();
    if (el.dataset.act === "next") {
      if (i < slides.length - 1) go(i + 1);
      else finish();
    }
  };
  draw();
}

export function login(ctx) {
  let phone = sessionStorage.getItem("carzen_phone_draft") || "100 123 4567";
  let error = "";
  let sending = false;
  const draw = () => {
    ctx.root.innerHTML = screen(
      topbar({ title: tx("login.title"), back: "#/home" }),
      `<div class="pad stack">
        <div class="auth-brand">${logoMark("auth")}<div><b>${tx("app.name")}</b><span class="small muted">${tx("app.tagline")}</span></div></div>
        <p class="muted">${tx("login.body")}</p>
        <label class="field"><span class="label">${tx("login.phone")}</span>
          <div class="phone-row"><div class="cc">+20</div>
            <input class="control num" inputmode="numeric" maxlength="12" value="${esc(phone)}" data-bind="phone" />
          </div>
          <span class="err">${esc(error)}</span>
        </label>
        <p class="small muted">${tx("login.terms")}</p>
        <p class="small"><a data-go="#/legal/terms">${tx("legal.terms")}</a> · <a data-go="#/legal/privacy">${tx("legal.privacy")}</a></p>
        <button class="btn block" data-act="send" ${sending ? "disabled" : ""}>${tx(sending ? "otp.sending" : "login.send")}</button>
      </div>`,
    );
    ctx.icons();
  };
  bus.input = (el) => { if (el.dataset.bind === "phone") phone = el.value; };
  bus.act = async (el) => {
    if (el.dataset.act !== "send") return;
    const pretty = parseEgPhone(phone);
    if (!pretty) { error = t("login.bad"); draw(); return; }
    sending = true; draw();
    sessionStorage.setItem("carzen_phone_draft", phone);
    saveOtp({ phone: pretty, attempts: 0, lockUntil: 0, resendAt: Date.now() + 30000, phase: "sending" });
    await new Promise((r) => setTimeout(r, 350));
    const state = otpState();
    state.phase = "idle";
    saveOtp(state);
    ctx.go("#/otp");
  };
  draw();
}

export function otp(ctx) {
  const state = otpState();
  if (!state?.phone) { ctx.go("#/login"); return; }
  let digits = ["1", "2", "3", "4", "5", "6"];
  let error = "";
  let phase = state.phase || "idle";
  let left = Math.max(0, Math.ceil((state.resendAt - Date.now()) / 1000));
  const tick = setInterval(() => {
    const lock = state.lockUntil > Date.now();
    left = Math.max(0, Math.ceil((state.resendAt - Date.now()) / 1000));
    const label = ctx.root.querySelector("[data-resend]");
    if (label && phase === "idle") {
      label.textContent = lock ? t("otp.locked") : left > 0 ? t("otp.resendIn", { s: left }) : t("otp.resend");
      label.disabled = left > 0 || lock;
    }
  }, 400);
  ctx.onLeave(() => clearInterval(tick));

  const draw = () => {
    ctx.root.innerHTML = screen(
      topbar({ title: tx("otp.title"), back: "#/login" }),
      `<div class="pad stack">
        <p class="muted">${esc(t("otp.sent", { phone: state.phone }))}</p>
        <p class="small" style="font-weight:800">${esc(phase === "sending" ? t("otp.sending") : phase === "verifying" ? t("otp.verifying") : phase === "success" ? t("otp.success") : "")}</p>
        <div class="otp">${digits.map((d, i) => `<input class="num" maxlength="1" inputmode="numeric" data-i="${i}" value="${esc(d)}" />`).join("")}</div>
        <span class="err">${esc(error)}</span>
        <button class="btn ghost" data-act="resend" data-resend ${left > 0 ? "disabled" : ""}>${tx(left > 0 ? "otp.resendIn" : "otp.resend", { s: left })}</button>
        <button class="linkish" data-act="change">${tx("otp.change")}</button>
        <button class="btn block" data-act="verify" ${phase === "verifying" ? "disabled" : ""}>${tx("otp.verify")}</button>
      </div>`,
    );
    ctx.icons();
    const box = ctx.root.querySelector(".otp");
    box?.addEventListener("paste", (e) => {
      const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
      if (!text) return;
      e.preventDefault();
      digits = text.padEnd(6, " ").slice(0, 6).split("");
      draw();
    });
  };
  bus.input = (el) => {
    if (!el.dataset.i) return;
    const i = Number(el.dataset.i);
    digits[i] = (el.value || "").replace(/\D/g, "").slice(-1);
    el.value = digits[i];
    const next = ctx.root.querySelector(`[data-i="${i + 1}"]`);
    if (digits[i] && next) next.focus();
  };
  bus.act = async (el) => {
    if (el.dataset.act === "change") ctx.go("#/login");
    if (el.dataset.act === "resend") {
      if (Date.now() < state.resendAt || Date.now() < state.lockUntil) return;
      phase = "sending"; draw();
      await new Promise((r) => setTimeout(r, 300));
      state.resendAt = Date.now() + 30000;
      state.phase = "idle";
      phase = "idle";
      saveOtp(state);
      draw();
    }
    if (el.dataset.act === "verify") {
      if (Date.now() < state.lockUntil) { error = t("otp.locked"); draw(); return; }
      const code = digits.join("");
      phase = "verifying"; error = ""; draw();
      await new Promise((r) => setTimeout(r, 280));
      if (code === "000000") { error = t("otp.expired"); phase = "idle"; draw(); return; }
      if (code !== OTP_OK) {
        state.attempts += 1;
        if (state.attempts >= 5) { state.lockUntil = Date.now() + 60000; state.attempts = 0; error = t("otp.locked"); }
        else error = t("otp.invalid");
        phase = "idle"; saveOtp(state); draw(); return;
      }
      phase = "success"; draw();
      const existing = await findCustomer(state.phone);
      if (existing?.status === "suspended") { error = t("wash.unavailable"); phase = "idle"; draw(); return; }
      if (!existing) { sessionStorage.setItem("carzen_new_phone", state.phone); ctx.go("#/profile/setup"); return; }
      setSession(existing.id);
      toast(t("otp.success"));
      ctx.go(takeReturn("#/home"));
    }
  };
  draw();
}

export function setup(ctx) {
  const phone = sessionStorage.getItem("carzen_new_phone");
  if (!phone) { ctx.go("#/home"); return; }
  let name = "";
  let error = "";
  const draw = () => {
    ctx.root.innerHTML = screen(topbar({ title: tx("profile.setup") }), `<div class="pad stack">
      <p class="muted">${tx("profile.setupBody")}</p>
      <label class="field"><span class="label">${tx("profile.name")}</span>
        <input class="control" data-bind="name" value="${esc(name)}" />
        <span class="err">${esc(error)}</span>
      </label>
      <button class="btn block" data-act="save">${tx("profile.save")}</button>
    </div>`);
  };
  bus.input = (el) => { if (el.dataset.bind === "name") name = el.value; };
  bus.act = async () => {
    if (name.trim().length < 2) { error = t("profile.nameErr"); draw(); return; }
    try {
      const row = await registerCustomer(phone, name.trim());
      setSession(row.id);
      sessionStorage.removeItem("carzen_new_phone");
      ctx.go(takeReturn("#/home"));
    } catch (e) {
      if (e.code === "offline") toast(t("offline.action"));
      else { error = t("error.body"); draw(); }
    }
  };
  draw();
}

void now;
void read;
void skeleton;
void errorBlock;
void currentUser;
void L;
