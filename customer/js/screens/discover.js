import { get, now } from "../../../shared/js/db.js";
import { L, t } from "../../../shared/js/i18n.js";
import { read } from "../../../shared/js/net.js";
import { money, formatTime, formatDate, distanceLabel, relativeDay } from "../../../shared/js/format.js";
import { coverUri } from "../../../shared/js/covers.js";
import { loadDiscovery, applyFilters, searchAll, categoryPrice, decorateBranch } from "../../../shared/js/services/discovery.js";
import { sheet, toast } from "../../../shared/js/ui.js";
import { toggleFavorite } from "../../../shared/js/services/account.js";
import { tx, screen, topbar, washCard, skeleton, errorBlock, emptyBlock, badge, icon, esc, bus, minsAway } from "../kit.js";
import { bg, SHOTS } from "../photos.js";
import { currentUser, getLoc, setLoc, NASR, getFilters, saveFilters, sessionId, rememberReturn, setPending, recentSearches, pushSearch, clearSearches } from "../state.js";

const ICONS = { exterior: "droplets", interior: "sparkles", full: "car", deep: "wind" };

function favSet() {
  const id = sessionId();
  return new Set(get().favorites.filter((f) => f.customerId === id).map((f) => f.branchId));
}

async function onFav(id) {
  const user = currentUser();
  if (!user) {
    setPending({ type: "favorite", branchId: id });
    rememberReturn(location.hash);
    location.hash = "#/login";
    return;
  }
  await toggleFavorite(user.id, id);
}

export async function home(ctx) {
  const draw = (data) => {
    const user = currentUser();
    const db = get();
    const favs = favSet();
    const unread = user ? db.notifications.filter((n) => n.audience === "customer" && n.userId === user.id && !n.read).length : 0;
    const loc = getLoc();
    const area = db.catalogs.areas.find((a) => a.id === loc.areaId);
    const rows = applyFilters(data.rows, { sort: "nearest" }, db, now()).slice(0, 8);
    const active = user ? db.orders.find((o) => o.customerId === user.id && ["pending", "confirmed", "waiting", "in_service"].includes(o.status) && new Date(o.scheduledAt).toDateString() === now().toDateString()) : null;
    const unreviewed = user ? db.orders.filter((o) => o.customerId === user.id && o.status === "completed" && !db.reviews.some((r) => r.orderId === o.id)).sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt))[0] : null;
    const cats = db.catalogs.serviceCategories.map((c) => {
      const prices = db.services.filter((s) => s.category === c.id && s.type === "primary" && s.active && db.branches.some((b) => b.id === s.branchId && b.active)).map((s) => s.price);
      return { ...c, from: prices.length ? Math.min(...prices) : null };
    });
    const offers = data.offers.slice(0, 6);
    const first = user?.name?.split(" ")[0];
    const bubbles = "<i></i>".repeat(4);
    ctx.root.innerHTML = `<div class="screen home"><div class="screen-body" id="body">
      ${ctx.offlineBanner()}
      <header class="home-head">
        <div class="hh-deco"><i></i><i></i><i></i><i></i></div>
        <div class="between hh-top">
          <button class="area-chip" data-act="area">${icon("map-pin")} ${esc(area ? L(area.name) : "")}<span class="sm-ico">${icon("chevron-down")}</span></button>
          <div class="row">
            <button class="icon-btn glass-btn bell" data-go="#/notifications" aria-label="${tx("notif.title")}">${icon("bell")}${unread ? `<em>${unread}</em>` : ""}</button>
            <button class="avatar hh-avatar" data-go="#/profile">${esc((user?.name || "؟").slice(0, 1))}</button>
          </div>
        </div>
        <div class="hh-hello">${user ? esc(t("greet.user", { name: first })) : tx("greet.guest")}</div>
        <div class="hh-sub">${tx("app.tagline")}</div>
      </header>
      <button class="search-btn" data-go="#/search">${icon("search")}<span class="grow">${tx("search.ph")}</span><span class="tune">${icon("sliders-horizontal")}</span></button>
      <button class="hero" data-go="#/results?mode=washnow" style="--photo:${bg(SHOTS.hero, 900)}">
        <span class="bubbles">${bubbles}</span>
        <span class="kick">${icon("zap")} ${tx("home.fast")}</span>
        <strong>${tx("home.washNow")}</strong>
        <span>${tx("home.washNowSub")}</span>
        <span class="cta">${tx("home.washNowCta")}<span class="arr"><span class="dir-icon">${icon("arrow-right")}</span></span></span>
      </button>
      ${active ? `<button class="card active-card" data-go="#/booking/${esc(active.id)}"><span class="lead">${icon("car")}</span><div class="grow"><div class="small muted">${tx("home.active")}</div><b class="num">${esc(active.number)}</b><div>${badge(active.status)}</div></div><span class="dir-icon">${icon("chevron-right")}</span></button>` : ""}
      ${unreviewed ? `<button class="card prompt-card" data-go="#/booking/${esc(unreviewed.id)}/review"><span class="lead">${icon("star")}</span><div class="grow"><b>${tx("home.reviewPrompt")}</b><div class="small muted">${esc(L(db.branches.find((b) => b.id === unreviewed.branchId)?.name))}</div></div><span class="btn sm">${tx("home.reviewCta")}</span></button>` : ""}
      <div class="section-h"><h2>${tx("home.services")}</h2></div>
      <div class="cat-grid">${cats.map((c) => `<button class="cat" data-go="#/results?category=${c.id}" style="--photo:${bg(SHOTS.category[c.id] || SHOTS.hero, 500, 360)}"><span class="ci">${icon(ICONS[c.id] || "sparkles")}</span><b>${esc(L(c.name))}</b><span class="small muted">${c.from == null ? "" : esc(t("home.from", { price: money(c.from) }))}</span></button>`).join("")}</div>
      <div class="section-h"><h2>${tx("home.nearby")}</h2><button class="linkish" data-go="#/results?mode=nearby">${tx("home.seeAll")}</button></div>
      <div class="hscroll">${rows.map((r) => washCard(r, { name: L(r.branch.name), fav: favs.has(r.branch.id) })).join("")}</div>
      <div class="section-h"><h2>${tx("home.offers")}</h2><button class="linkish" data-go="#/offers">${tx("home.seeAll")}</button></div>
      <div class="hscroll">${offers.map((o, i) => offerCard(o, db, i)).join("")}</div>
      <button class="map-preview" data-go="#/map"><i class="mp-pin p1"></i><i class="mp-pin p2"></i><i class="mp-pin p3"></i><i class="mp-me"></i><span class="mp-copy"><strong>${tx("home.map")}</strong><span class="go"><span class="dir-icon">${icon("arrow-right")}</span></span></span></button>
    </div></div>`;
    ctx.icons();
    const body = ctx.root.querySelector("#body");
    let y0 = 0;
    body.addEventListener("touchstart", (e) => { if (body.scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
    body.addEventListener("touchend", (e) => {
      if (y0 && e.changedTouches[0].clientY - y0 > 72) ctx.render();
      y0 = 0;
    });
  };
  bus.act = async (el) => {
    if (el.dataset.act === "fav") { await onFav(el.dataset.id); ctx.render(); }
    if (el.dataset.act === "area") await pickArea(ctx);
    if (el.dataset.act === "retry") ctx.render();
  };
  ctx.root.innerHTML = `<div class="screen"><div class="screen-body">${skeleton(5)}</div></div>`;
  try {
    const data = await loadDiscovery(getLoc());
    if (!ctx.alive()) return;
    draw(data);
  } catch (e) {
    if (!ctx.alive()) return;
    ctx.root.innerHTML = screen(topbar({ title: tx("nav.home") }), e.code === "offline" ? emptyBlock("error.title") : errorBlock());
    ctx.icons();
  }
}

function offerCard(o, db, i = 0) {
  const branch = db.branches.find((b) => o.branchIds?.includes(b.id));
  const days = Math.max(0, Math.ceil((new Date(o.endAt) - now()) / 86400000));
  const off = o.discountType === "percent" ? `${o.discountValue}%` : money(o.discountValue);
  const photo = i % 3 === 1 ? "" : ` style="--photo:${bg(SHOTS.offers[i % SHOTS.offers.length], 700)}"`;
  return `<button class="card offer-card v${i % 3}${photo ? " has-photo" : ""}"${photo} data-go="#/wash/${esc(branch?.id || o.branchIds[0])}?offer=${esc(o.id)}">
    <span class="off num">${esc(t("offers.off", { v: off }))}</span>
    <b>${esc(L(o.title))}</b>
    <span class="small muted">${esc(L(o.description))}</span>
    <span class="small">${esc(branch ? L(branch.name) : "")}</span>
    <span class="ends">${icon("clock")} ${esc(days <= 0 ? t("offers.ends1") : t("offers.ends", { n: days }))}</span>
  </button>`;
}

async function pickArea(ctx) {
  const db = get();
  const choiceRes = await sheet(`<h3>${tx("loc.title")}</h3>
    <button class="btn block" data-pick="__loc" style="margin-block:8px">${tx("loc.use")}</button>
    <div class="stack">${db.catalogs.areas.map((a) => `<button class="btn ghost block" data-pick="${esc(a.id)}">${esc(L(a.name))}</button>`).join("")}</div>`);
  const choice = choiceRes?.value;
  if (!choice) return;
  if (choice === "__loc") {
    const allowRes = await sheet(`<h3>${tx("loc.ask")}</h3><div class="row" style="margin-top:12px">
      <button class="btn ghost grow" data-pick="deny">${tx("loc.deny")}</button>
      <button class="btn grow" data-pick="allow">${tx("loc.allow")}</button></div>`);
    if (allowRes?.value === "allow") setLoc({ ...NASR, mode: "geo" });
    else return pickArea(ctx);
  } else {
    const area = db.catalogs.areas.find((a) => a.id === choice);
    setLoc({ mode: "area", areaId: area.id, lat: area.lat, lng: area.lng });
  }
  ctx.render();
}

export async function search(ctx) {
  let q = ctx.query.q || "";
  let data = { washes: [], services: [], areas: [] };
  const run = async () => {
    ctx.root.innerHTML = screen(topbar({ title: tx("search.ph"), back: "#/home" }), `<div class="pad">
      <input class="control" data-bind="q" value="${esc(q)}" placeholder="${tx("search.ph")}" />
      <div id="out" style="margin-top:12px">${skeleton(3)}</div>
    </div>`);
    try {
      data = await read(() => q.trim() ? searchAll(get(), q, getLoc()) : null);
    } catch {
      ctx.root.querySelector("#out").innerHTML = errorBlock();
      ctx.icons();
      return;
    }
    if (!ctx.alive()) return;
    paintResults();
  };
  const paintResults = () => {
    const out = ctx.root.querySelector("#out");
    if (!out) return;
    if (!q.trim()) {
      const recent = recentSearches();
      out.innerHTML = `<div class="between"><b>${tx("search.recent")}</b>${recent.length ? `<button class="linkish" data-act="clear">${tx("search.clear")}</button>` : ""}</div>
        ${recent.map((r) => `<button class="menu-row" data-act="recent" data-q="${esc(r)}">${esc(r)}</button>`).join("") || `<p class="muted">${tx("empty.search")}</p>`}`;
      return;
    }
    if (!data || (!data.washes.length && !data.services.length && !data.areas.length)) {
      out.innerHTML = emptyBlock("empty.search");
      return;
    }
    const favs = favSet();
    out.innerHTML = `
      ${data.areas.length ? `<h3>${tx("search.areas")}</h3>${data.areas.map((a) => `<button class="menu-row" data-go="#/results?area=${a.id}">${esc(L(a.name))}</button>`).join("")}` : ""}
      ${data.washes.length ? `<h3>${tx("search.washes")}</h3>${data.washes.map((r) => washCard({ ...r }, { name: L(r.branch.name), fav: favs.has(r.branch.id) })).join("")}` : ""}
      ${data.services.length ? `<h3>${tx("search.services")}</h3>${data.services.map((s) => `<button class="menu-row" data-go="#/wash/${s.card.branch.id}"><span class="grow">${esc(L(s.service.name))}<div class="small muted">${esc(L(s.card.branch.name))} · ${esc(money(s.service.price))}</div></span><span class="pill ${s.card.open ? "open" : "shut"}">${tx(s.card.open ? "open" : "closed")}</span></button>`).join("")}` : ""}`;
    ctx.icons();
  };
  let timer = 0;
  bus.input = (el) => {
    if (el.dataset.bind !== "q") return;
    q = el.value;
    clearTimeout(timer);
    timer = setTimeout(() => { pushSearch(q); run(); }, 250);
  };
  bus.act = async (el) => {
    if (el.dataset.act === "clear") { clearSearches(); paintResults(); }
    if (el.dataset.act === "recent") { q = el.dataset.q; run(); }
    if (el.dataset.act === "fav") { await onFav(el.dataset.id); run(); }
    if (el.dataset.act === "retry") run();
  };
  await run();
}

export async function results(ctx) {
  const filters = getFilters();
  if (ctx.query.mode === "washnow") filters.washNow = true;
  else filters.washNow = false;
  filters.category = ctx.query.category || "";
  filters.areaId = ctx.query.area || "";
  filters.q = ctx.query.q || "";
  if (ctx.query.mode === "washnow" && !filters.sort) filters.sort = "earliest";
  const load = async () => {
    ctx.root.innerHTML = screen(topbar({ title: tx("nav.home"), back: "#/home", end: `<button class="icon-btn" data-act="filters" id="fbtn">${icon("sliders-horizontal")}</button>` }), skeleton(4));
    try {
      const data = await loadDiscovery(getLoc());
      if (!ctx.alive()) return;
      const rows = applyFilters(data.rows, filters, get(), now());
      const n = ["distance", "rating", "openNow", "availableToday"].filter((k) => filters[k]).length + (filters.priceMax < 500 || filters.priceMin > 0 ? 1 : 0);
      const favs = favSet();
      const db = get();
      ctx.root.innerHTML = screen(
        topbar({
          title: filters.washNow ? tx("home.washNow") : tx("nav.home"),
          back: "#/home",
          end: `<button class="icon-btn" data-act="filters">${icon("sliders-horizontal")}${n ? `<em class="bell" style="position:relative">${n}</em>` : ""}</button>`,
        }),
        `<div class="pad-x" style="padding-bottom:8px"><div class="hscroll" style="padding-inline:0">${["earliest", "nearest", "rated", "price"].map((s) => `<button class="chip ${filters.sort === s ? "on" : "flat"}" data-act="sort" data-sort="${s}">${tx("sort." + s)}</button>`).join("")}</div></div>
        ${rows.length ? rows.map((r) => {
          const price = filters.category ? categoryPrice(db, r.branch.id, filters.category) : r.from;
          if (filters.category && price == null) return "";
          return `<div class="wash-card wide card" data-go="#/wash/${r.branch.id}">${washCard(r, { name: L(r.branch.name), fav: favs.has(r.branch.id), price }).replace('class="wash-card card"', 'class="contents"')}</div>`;
        }).join("") : emptyBlock("empty.results", "", `<button class="btn" data-act="clear">${tx("empty.clear")}</button><button class="btn ghost" data-act="area">${tx("empty.area")}</button>`)}`,
      );
      ctx.icons();
    } catch {
      if (!ctx.alive()) return;
      ctx.root.innerHTML = screen(topbar({ title: tx("nav.home"), back: "#/home" }), errorBlock());
      ctx.icons();
    }
  };
  bus.act = async (el) => {
    if (el.dataset.act === "retry") return load();
    if (el.dataset.act === "fav") { await onFav(el.dataset.id); return load(); }
    if (el.dataset.act === "sort") { filters.sort = el.dataset.sort; saveFilters(filters); return load(); }
    if (el.dataset.act === "clear") {
      Object.assign(filters, { distance: null, rating: null, priceMin: 0, priceMax: 500, openNow: false, availableToday: false });
      saveFilters(filters); return load();
    }
    if (el.dataset.act === "area") return pickArea({ ...ctx, render: load });
    if (el.dataset.act === "filters") {
      const picked = await sheet(filterSheet(filters));
      if (picked?.value === "apply") {
        const f = picked.fields || {};
        filters.distance = Number(f.distance || 0) || null;
        filters.rating = Number(f.rating || 0) || null;
        filters.priceMin = Number(f.pmin || 0);
        filters.priceMax = Number(f.pmax || 500);
        filters.openNow = !!f.open;
        filters.availableToday = !!f.today;
        saveFilters(filters);
        load();
      }
      if (picked?.value === "reset") {
        Object.assign(filters, { distance: null, rating: null, priceMin: 0, priceMax: 500, openNow: false, availableToday: false });
        saveFilters(filters); load();
      }
    }
  };
  await load();
}

function filterSheet(f) {
  const dist = [1, 3, 5, 10].map((n) => `<label class="chip ${f.distance === n ? "on" : "flat"}"><input type="radio" name="distance" value="${n}" ${f.distance === n ? "checked" : ""}/> ${n}</label>`).join("");
  const rates = [4, 4.5].map((n) => `<label class="chip ${f.rating === n ? "on" : "flat"}"><input type="radio" name="rating" value="${n}" ${f.rating === n ? "checked" : ""}/> ${n}+</label>`).join("");
  return `<h3>${tx("filter")}</h3>
    <p class="label">${tx("f.distance")}</p><div class="wrap">${dist}<label class="chip flat"><input type="radio" name="distance" value="0" ${!f.distance ? "checked" : ""}/> ${tx("f.any")}</label></div>
    <p>${tx("f.rating")}</p><div class="wrap">${rates}<label class="chip flat"><input type="radio" name="rating" value="0" ${!f.rating ? "checked" : ""}/> ${tx("f.any")}</label></div>
    <p>${tx("f.price")}</p>
    <div class="row"><input class="control" name="pmin" type="number" min="0" max="500" value="${f.priceMin}"/><input class="control" name="pmax" type="number" min="0" max="500" value="${f.priceMax}"/></div>
    <label class="menu-row"><input type="checkbox" name="open" ${f.openNow ? "checked" : ""}/> ${tx("f.open")}</label>
    <label class="menu-row"><input type="checkbox" name="today" ${f.availableToday ? "checked" : ""}/> ${tx("f.today")}</label>
    <div class="row" style="margin-top:12px"><button class="btn ghost grow" data-pick="reset">${tx("f.reset")}</button><button class="btn grow" data-pick="apply">${tx("f.apply")}</button></div>`;
}

let mapRef = null;
export function destroyMap() {
  if (mapRef) { mapRef.remove(); mapRef = null; }
}

export async function mapScreen(ctx) {
  destroyMap();
  ctx.root.innerHTML = `<div class="map-screen"><div class="between pad-x"><button class="icon-btn" data-go="#/home">${icon("chevron-left")}</button><b>${tx("nav.map")}</b><button class="btn sm" data-go="#/results?mode=nearby">${tx("map.list")}</button></div><div id="map"></div><div class="map-sheet" id="sheet"></div></div>`;
  ctx.icons();
  try {
    const data = await loadDiscovery(getLoc());
    if (!ctx.alive() || !window.L) return;
    const loc = getLoc();
    const rows = applyFilters(data.rows, { sort: "nearest" }, get(), now());
    const map = window.L.map(ctx.root.querySelector("#map"), { zoomControl: false }).setView([loc.lat, loc.lng], 12);
    mapRef = map;
    window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap" }).addTo(map);
    window.L.marker([loc.lat, loc.lng], { icon: window.L.divIcon({ className: "", html: `<span class="me"></span>`, iconSize: [16, 16] }) }).addTo(map);
    rows.forEach((r) => {
      const marker = window.L.marker([r.branch.lat, r.branch.lng], {
        icon: window.L.divIcon({ className: "", html: `<span class="pin-dot ${r.open ? "" : "off"}"></span>`, iconSize: [16, 16] }),
      }).addTo(map);
      marker.on("click", () => {
        const sheetEl = ctx.root.querySelector("#sheet");
        sheetEl.innerHTML = `<button class="menu-row" data-go="#/wash/${r.branch.id}"><span class="grow"><b>${esc(L(r.branch.name))}</b><div class="small">★ ${r.rating.toFixed(1)} · ${esc(distanceLabel(r.km))} · ${esc(r.next ? formatTime(r.next.start) : "—")} · ${esc(money(r.from || 0))}</div></span></button>`;
      });
    });
    ctx.root.querySelector("#sheet").innerHTML = rows.slice(0, 8).map((r) => `<button class="menu-row" data-go="#/wash/${r.branch.id}">${esc(L(r.branch.name))}<span class="small muted">${esc(distanceLabel(r.km))}</span></button>`).join("");
    setTimeout(() => map.invalidateSize(), 60);
    const recenter = document.createElement("button");
    recenter.className = "btn sm";
    recenter.style.cssText = "position:absolute;inset-inline-end:12px;inset-block-start:88px;z-index:500";
    recenter.textContent = t("map.recenter");
    ctx.root.querySelector(".map-screen").appendChild(recenter);
    recenter.onclick = () => map.setView([loc.lat, loc.lng], 13);
  } catch {
    ctx.root.innerHTML = screen(topbar({ title: tx("nav.map"), back: "#/home" }), errorBlock());
  }
}

export async function offers(ctx) {
  ctx.root.innerHTML = screen(topbar({ title: tx("offers.title"), back: "#/home" }), skeleton(3));
  try {
    const data = await loadDiscovery(getLoc());
    if (!ctx.alive()) return;
    const db = get();
    ctx.root.innerHTML = screen(topbar({ title: tx("offers.title"), back: "#/home" }),
      data.offers.length ? `<div class="pad stack">${data.offers.map((o, i) => offerCard(o, db, i)).join("")}</div>` : emptyBlock("empty.search"));
    ctx.icons();
  } catch {
    ctx.root.innerHTML = screen(topbar({ title: tx("offers.title"), back: "#/home" }), errorBlock());
  }
  bus.act = async (el) => { if (el.dataset.act === "retry") offers(ctx); };
}

void decorateBranch;
void relativeDay;
void formatDate;
void coverUri;
void minsAway;
void toast;
