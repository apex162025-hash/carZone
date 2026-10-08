import { get, now } from "../../../shared/js/db.js";
import { L, t, setLang, getLang } from "../../../shared/js/i18n.js";
import { read } from "../../../shared/js/net.js";
import { carUri } from "../../../shared/js/covers.js";
import { colorHex, COLORS } from "../../../shared/js/colors.js";
import { saveVehicle, deleteVehicle, setDefaultVehicle, makes, updateCustomer, markNotifications } from "../../../shared/js/services/account.js";
import { sheet, toast, confirmDialog } from "../../../shared/js/ui.js";
import { relativeDay, formatTime } from "../../../shared/js/format.js";
import { tx, screen, topbar, icon, esc, bus, skeleton, errorBlock, emptyBlock } from "../kit.js";
import { currentUser, setSession, clearDraft, setTheme, theme, notifPrefs, saveNotifPrefs } from "../state.js";

export async function cars(ctx) {
  const user = currentUser();
  if (!user) { location.hash = "#/login"; return; }
  const draw = () => {
    const list = get().vehicles.filter((v) => v.customerId === user.id);
    ctx.root.innerHTML = screen(
      topbar({ title: tx("cars.title"), back: "#/profile", end: `<button class="icon-btn" data-go="#/cars/new">${icon("plus")}</button>` }),
      list.length
        ? `<div class="pad stack">${list.map((c) => `<article class="card pad row"><img class="car-art" alt="" src="${carUri(colorHex(c.color))}"/><div class="grow"><b>${esc(c.make)} ${esc(c.model)}</b><div class="plate"><b>EG</b><span class="num">${esc(c.plate)}</span></div>${c.isDefault ? `<span class="chip">${tx("book.default")}</span>` : ""}</div><button class="icon-btn" data-act="menu" data-id="${c.id}">${icon("more-vertical")}</button></article>`).join("")}</div>`
        : emptyBlock("empty.cars", "", `<button class="btn" data-go="#/cars/new">${tx("cars.add")}</button>`),
    );
    ctx.icons();
  };
  ctx.root.innerHTML = skeleton(3);
  try { await read(() => true); } catch { ctx.root.innerHTML = errorBlock(); return; }
  draw();
  bus.act = async (el) => {
    if (el.dataset.act !== "menu") return;
    const id = el.dataset.id;
    const picked = await sheet(`<button class="btn ghost block" data-pick="edit">${tx("cars.edit")}</button>
      <button class="btn ghost block" data-pick="default">${tx("cars.setDefault")}</button>
      <button class="btn danger block" data-pick="delete">${tx("cars.delete")}</button>`);
    if (picked?.value === "edit") location.hash = `#/cars/${id}`;
    if (picked?.value === "default") { await setDefaultVehicle(user.id, id); draw(); }
    if (picked?.value === "delete") {
      const ok = await confirmDialog({ title: t("cars.deleteAsk"), ok: t("cars.delete"), cancel: t("common.cancel"), danger: true });
      if (!ok) return;
      try { await deleteVehicle(user.id, id); draw(); }
      catch (e) { toast(e.message === "upcoming" ? t("cars.deleteBlocked") : t("error.body")); }
    }
  };
}

export async function carForm(ctx) {
  const user = currentUser();
  if (!user) { sessionStorage.setItem("carzen_return", location.hash); location.hash = "#/login"; return; }
  const existing = ctx.params.id ? get().vehicles.find((v) => v.id === ctx.params.id && v.customerId === user.id) : null;
  const catalog = makes();
  const form = {
    make: existing?.make || "Toyota",
    model: existing?.model || "Corolla",
    year: existing?.year || "",
    color: existing?.color || "white",
    plate: existing?.plate || "",
    id: existing?.id,
  };
  let error = "";
  const draw = () => {
    const models = catalog[form.make] || [];
    if (!models.includes(form.model)) form.model = models[0];
    ctx.root.innerHTML = screen(topbar({ title: tx(existing ? "cars.edit" : "cars.add"), back: sessionStorage.getItem("carzen_car_return") || "#/cars" }), `<div class="pad stack">
      <label class="field"><span class="label">${tx("cars.make")}</span><select class="select" data-bind="make">${Object.keys(catalog).map((m) => `<option ${m === form.make ? "selected" : ""}>${m}</option>`).join("")}</select></label>
      <label class="field"><span class="label">${tx("cars.model")}</span><select class="select" data-bind="model">${models.map((m) => `<option ${m === form.model ? "selected" : ""}>${esc(m)}</option>`).join("")}</select></label>
      <label class="field"><span class="label">${tx("cars.year")}</span><input class="control" data-bind="year" value="${esc(form.year)}" inputmode="numeric" maxlength="4"/></label>
      <div>${tx("cars.color")}</div>
      <div class="wrap">${Object.entries(COLORS).map(([key, c]) => `<button class="swatch ${form.color === key ? "on" : ""}" style="background:${c.hex}" data-act="color" data-c="${key}" aria-label="${esc(getLang() === "ar" ? c.ar : c.en)}"></button>`).join("")}</div>
      <label class="field"><span class="label">${tx("cars.plate")}</span><input class="control num" data-bind="plate" value="${esc(form.plate)}" /></label>
      <span class="err">${esc(error)}</span>
      <button class="btn block" data-act="save">${tx("profile.save")}</button>
    </div>`);
  };
  draw();
  bus.input = (el) => { if (el.dataset.bind) form[el.dataset.bind] = el.value; if (el.dataset.bind === "make") draw(); };
  bus.act = async (el) => {
    if (el.dataset.act === "color") { form.color = el.dataset.c; draw(); }
    if (el.dataset.act !== "save") return;
    if (!form.plate.trim()) { error = t("cars.required"); draw(); return; }
    try {
      const saved = await saveVehicle(user.id, form);
      toast(t("cars.saved"));
      const back = sessionStorage.getItem("carzen_car_return");
      sessionStorage.removeItem("carzen_car_return");
      if (back && back.includes("/book/")) {
        const draft = JSON.parse(localStorage.getItem("carzen_booking_draft") || "{}");
        draft.vehicleId = saved.id;
        localStorage.setItem("carzen_booking_draft", JSON.stringify(draft));
        location.hash = back;
      } else location.hash = "#/cars";
    } catch (e) {
      error = e.message === "duplicate" ? t("cars.dup") : t("cars.required");
      draw();
    }
  };
}

export async function favorites(ctx) {
  const user = currentUser();
  if (!user) { location.hash = "#/login"; return; }
  ctx.root.innerHTML = skeleton(2);
  try { await read(() => true); } catch { ctx.root.innerHTML = errorBlock(); return; }
  const db = get();
  const rows = db.favorites.filter((f) => f.customerId === user.id).map((f) => db.branches.find((b) => b.id === f.branchId)).filter(Boolean);
  ctx.root.innerHTML = screen(topbar({ title: tx("profile.fav"), back: "#/profile" }), rows.length
    ? `<div class="pad stack">${rows.map((b) => `<button class="card pad" data-go="#/wash/${b.id}" style="text-align:start"><b>${esc(L(b.name))}</b><div class="small muted">★ ${Number(b.rating).toFixed(1)}</div></button>`).join("")}</div>`
    : emptyBlock("empty.fav", "", `<button class="btn" data-go="#/home">${tx("empty.favCta")}</button>`));
  ctx.icons();
}

export async function notifications(ctx) {
  const user = currentUser();
  const draw = () => {
    const rows = user ? get().notifications.filter((n) => n.audience === "customer" && n.userId === user.id) : [];
    const groups = new Map();
    rows.forEach((n) => {
      const key = relativeDay(n.createdAt, now());
      groups.set(key, [...(groups.get(key) || []), n]);
    });
    ctx.root.innerHTML = screen(
      topbar({ title: tx("notif.title"), back: "#/home", end: user ? `<button class="linkish" data-act="all">${tx("notif.readAll")}</button>` : "" }),
      !user ? emptyBlock("empty.notif", "", `<button class="btn" data-go="#/login">${tx("profile.login")}</button>`)
        : (rows.length ? `<div class="pad stack">${[...groups.entries()].map(([day, list]) => `<h3>${esc(day)}</h3>${list.map((n) => `<button class="card pad" data-act="open" data-id="${n.id}" data-link="${esc(n.link)}" style="text-align:start"><b>${n.read ? "" : "• "}${esc(L(n.title))}</b><div class="small">${esc(L(n.body))}</div><div class="small muted num">${esc(formatTime(n.createdAt))}</div></button>`).join("")}`).join("")}</div>` : emptyBlock("empty.notif")),
    );
    ctx.icons();
  };
  ctx.root.innerHTML = skeleton(3);
  try { await read(() => true); } catch { ctx.root.innerHTML = errorBlock(); bus.act = () => ctx.render(); return; }
  draw();
  bus.act = async (el) => {
    if (el.dataset.act === "all" && user) { await markNotifications(user.id); draw(); }
    if (el.dataset.act === "open" && user) {
      await markNotifications(user.id, el.dataset.id);
      if (el.dataset.link) location.hash = el.dataset.link;
    }
  };
}

export function profile(ctx) {
  const user = currentUser();
  if (!user) {
    ctx.root.innerHTML = screen(topbar({ title: tx("profile.title") }), `<div class="pad"><button class="card pad" data-go="#/login" style="text-align:start"><b>${tx("profile.login")}</b><div class="small muted">${tx("profile.guest")}</div></button></div>`);
    return;
  }
  const row = (href, key, ic) => `<button class="menu-row" data-go="${href}">${icon(ic)} <span class="grow">${tx(key)}</span><span class="dir-icon">${icon("chevron-right")}</span></button>`;
  ctx.root.innerHTML = screen(topbar({ title: tx("profile.title") }), `<div class="pad stack">
    <button class="card pad row" data-go="#/profile/edit"><span class="avatar lg">${esc(user.name.slice(0, 1))}</span><span class="grow"><b>${esc(user.name)}</b><div class="small num">${esc(user.phone)}</div></span></button>
    <div class="card">${row("#/cars", "profile.cars", "car")}${row("#/bookings", "profile.bookings", "calendar")}${row("#/favorites", "profile.fav", "heart")}${row("#/notifications", "profile.notif", "bell")}${row("#/settings", "profile.lang", "settings")}${row("#/legal/terms", "profile.legal", "file-text")}${row("#/help", "profile.help", "life-buoy")}</div>
    <button class="btn ghost" data-act="logout">${tx("profile.logout")}</button>
  </div>`);
  ctx.icons();
  bus.act = async (el) => {
    if (el.dataset.act !== "logout") return;
    const ok = await confirmDialog({ title: t("profile.logoutAsk"), ok: t("profile.logout"), cancel: t("common.cancel"), danger: true });
    if (!ok) return;
    setSession("");
    clearDraft();
    location.hash = "#/home";
  };
}

export function editProfile(ctx) {
  const user = currentUser();
  if (!user) { location.hash = "#/login"; return; }
  let name = user.name;
  let error = "";
  const draw = () => {
    ctx.root.innerHTML = screen(topbar({ title: tx("profile.edit"), back: "#/profile" }), `<div class="pad stack">
      <div class="avatar lg" style="margin-inline:auto">${esc((name || "?").slice(0, 1))}</div>
      <label class="field"><span class="label">${tx("profile.name")}</span><input class="control" data-bind="name" value="${esc(name)}"/><span class="err">${esc(error)}</span></label>
      <button class="btn block" data-act="save">${tx("profile.save")}</button>
    </div>`);
  };
  draw();
  bus.input = (el) => { if (el.dataset.bind === "name") name = el.value; };
  bus.act = async () => {
    try { await updateCustomer(user.id, { name }); location.hash = "#/profile"; }
    catch { error = t("profile.nameErr"); draw(); }
  };
}

export function settings(ctx) {
  const prefs = notifPrefs();
  const draw = () => {
    const lang = getLang();
    const mode = theme();
    ctx.root.innerHTML = screen(topbar({ title: tx("settings.title"), back: "#/profile" }), `<div class="pad stack">
      <div class="card pad"><b>${tx("settings.lang")}</b><div class="row" style="margin-top:8px">
        <button class="chip ${lang === "ar" ? "on" : "flat"}" data-act="lang" data-l="ar">${tx("settings.ar")}</button>
        <button class="chip ${lang === "en" ? "on" : "flat"}" data-act="lang" data-l="en">${tx("settings.en")}</button>
      </div></div>
      <div class="card pad"><b>${tx("settings.theme")}</b><div class="row" style="margin-top:8px">
        <button class="chip ${mode === "light" ? "on" : "flat"}" data-act="theme" data-t="light">${tx("settings.light")}</button>
        <button class="chip ${mode === "dark" ? "on" : "flat"}" data-act="theme" data-t="dark">${tx("settings.dark")}</button>
      </div></div>
      <label class="menu-row"><input type="checkbox" data-bind="reminders" ${prefs.reminders ? "checked" : ""}/> ${tx("settings.reminders")}</label>
      <label class="menu-row"><input type="checkbox" data-bind="offers" ${prefs.offers ? "checked" : ""}/> ${tx("settings.offers")}</label>
    </div>`);
  };
  draw();
  bus.act = (el) => {
    if (el.dataset.act === "lang") setLang(el.dataset.l);
    if (el.dataset.act === "theme") { setTheme(el.dataset.t); draw(); }
  };
  bus.input = (el) => {
    if (!el.dataset.bind) return;
    prefs[el.dataset.bind] = el.checked;
    saveNotifPrefs(prefs);
  };
}

export function legal(ctx) {
  const doc = ctx.params.doc === "privacy" ? "privacy" : "terms";
  ctx.root.innerHTML = screen(
    topbar({ title: tx(doc === "privacy" ? "legal.privacy" : "legal.terms"), back: "#/profile" }),
    `<div class="pad"><p>${esc(L(get().settings.legal[doc]))}</p><p><a data-go="#/legal/${doc === "terms" ? "privacy" : "terms"}">${tx(doc === "terms" ? "legal.privacy" : "legal.terms")}</a></p></div>`,
  );
}

export function help(ctx) {
  const s = get().settings.support;
  ctx.root.innerHTML = screen(topbar({ title: tx("help.title"), back: "#/profile" }), `<div class="pad stack"><p>${tx("help.body")}</p><b class="num">${esc(s.phone)}</b><div>${esc(s.email)}</div><div class="muted">${esc(L(s.hours))}</div></div>`);
}
