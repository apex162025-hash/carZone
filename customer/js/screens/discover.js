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
import { loadGoogleMaps, createPinIcon, createUserDotIcon, createCarWashPinIcon, MAP_STYLES } from "../../../shared/js/maps.js";

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
let mapMarkers = [];
let dragCleanup = null;

export function destroyMap() {
  if (dragCleanup) {
    try { dragCleanup(); } catch {}
    dragCleanup = null;
  }
  if (mapMarkers && mapMarkers.length) {
    mapMarkers.forEach((m) => {
      try {
        if (typeof m.setMap === "function") m.setMap(null);
        else if (typeof m.remove === "function") m.remove();
      } catch {}
    });
    mapMarkers = [];
  }
  if (mapRef) {
    try {
      if (typeof mapRef.remove === "function") mapRef.remove();
    } catch {}
    mapRef = null;
  }
}

/**
 * Mock Data Model:
 * { id, name, area, distanceKm, rating, reviewsCount, priceFrom, isOpen, services[], imageUrl, lat, lng, isFavorite }
 */
export const MOCK_CAR_WASHES = [
  {
    id: "br_oasis_nasr",
    name: "لمعان الواحة - مدينة نصر",
    area: "مدينة نصر",
    distanceKm: 1.2,
    rating: 4.8,
    reviewsCount: 230,
    priceFrom: 80,
    isOpen: true,
    services: ["غسيل كامل", "تلميع", "تنظيف محرك"],
    imageUrl: "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=600&auto=format&fit=crop&q=80",
    lat: 30.0488,
    lng: 31.3390,
    isFavorite: false,
  },
  {
    id: "br_carzen_nasr",
    name: "كارزن وش - مدينة نصر",
    area: "مدينة نصر",
    distanceKm: 1.9,
    rating: 4.9,
    reviewsCount: 310,
    priceFrom: 90,
    isOpen: true,
    services: ["غسيل خارجي", "تلميع نانو", "تعقيم"],
    imageUrl: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=600&auto=format&fit=crop&q=80",
    lat: 30.0570,
    lng: 31.3460,
    isFavorite: true,
  },
  {
    id: "br_carzen_hel",
    name: "كارزن وش - مصر الجديدة",
    area: "مصر الجديدة",
    distanceKm: 3.6,
    rating: 4.7,
    reviewsCount: 185,
    priceFrom: 95,
    isOpen: true,
    services: ["غسيل بخار", "غسيل داخلي", "حماية طلاء"],
    imageUrl: "https://images.unsplash.com/photo-1507136566006-cfc505b114fc?w=600&auto=format&fit=crop&q=80",
    lat: 30.0910,
    lng: 31.3280,
    isFavorite: false,
  },
  {
    id: "br_golden_hel",
    name: "الإطار الذهبي - مصر الجديدة",
    area: "مصر الجديدة",
    distanceKm: 4.2,
    rating: 4.6,
    reviewsCount: 142,
    priceFrom: 85,
    isOpen: true,
    services: ["غسيل خارجي", "تلميع جنوط", "تشميع"],
    imageUrl: "https://images.unsplash.com/photo-1563720223185-11003d516935?w=600&auto=format&fit=crop&q=80",
    lat: 30.0944,
    lng: 31.3330,
    isFavorite: false,
  },
  {
    id: "br_corniche_zam",
    name: "الكورنيش - الزمالك",
    area: "الزمالك",
    distanceKm: 10.0,
    rating: 4.8,
    reviewsCount: 290,
    priceFrom: 110,
    isOpen: false,
    services: ["غسيل كامل", "تعقيم", "خدمة VIP"],
    imageUrl: "https://images.unsplash.com/photo-1552930294-6b595f4c2974?w=600&auto=format&fit=crop&q=80",
    lat: 30.0660,
    lng: 31.2240,
    isFavorite: false,
  },
  {
    id: "br_nile_zam",
    name: "بريق النيل - الزمالك",
    area: "الزمالك",
    distanceKm: 10.0,
    rating: 4.5,
    reviewsCount: 98,
    priceFrom: 100,
    isOpen: true,
    services: ["غسيل سريع", "غسيل محرك", "تلميع"],
    imageUrl: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&auto=format&fit=crop&q=80",
    lat: 30.0602,
    lng: 31.2215,
    isFavorite: false,
  },
  {
    id: "br_speed_nc",
    name: "سبيد ووش - التجمع الخامس",
    area: "التجمع الخامس",
    distanceKm: 14.0,
    rating: 4.9,
    reviewsCount: 420,
    priceFrom: 120,
    isOpen: true,
    services: ["خدمة متنقلة", "غسيل كامل", "تلميع مائي"],
    imageUrl: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=600&auto=format&fit=crop&q=80",
    lat: 30.0130,
    lng: 31.4780,
    isFavorite: true,
  },
  {
    id: "br_auto_zay",
    name: "أوتو سبا - الشيخ زايد",
    area: "الشيخ زايد",
    distanceKm: 22.0,
    rating: 4.7,
    reviewsCount: 165,
    priceFrom: 130,
    isOpen: false,
    services: ["غسيل داخلي عميق", "نانو سيراميك", "تلميع"],
    imageUrl: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=600&auto=format&fit=crop&q=80",
    lat: 30.0310,
    lng: 30.9820,
    isFavorite: false,
  },
  {
    id: "br_diamond_maadi",
    name: "الماسة لغسيل السيارات - المعادي",
    area: "المعادي",
    distanceKm: 8.5,
    rating: 4.6,
    reviewsCount: 215,
    priceFrom: 85,
    isOpen: true,
    services: ["غسيل بخار", "غسيل خارجي", "تلميع"],
    imageUrl: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=600&auto=format&fit=crop&q=80",
    lat: 29.9628,
    lng: 31.2580,
    isFavorite: false,
  },
  {
    id: "br_crystal_dokki",
    name: "كريستال كار - الدقي",
    area: "الدقي",
    distanceKm: 6.8,
    rating: 4.8,
    reviewsCount: 178,
    priceFrom: 90,
    isOpen: true,
    services: ["خدمة متنقلة", "غسيل كامل", "تعقيم داخلي"],
    imageUrl: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=600&auto=format&fit=crop&q=80",
    lat: 30.0385,
    lng: 31.2110,
    isFavorite: false,
  },
];

export async function mapScreen(ctx) {
  destroyMap();

  // Simple reactive state object (Flutter Provider/Riverpod equivalent)
  const state = {
    cars: MOCK_CAR_WASHES.map((c) => ({ ...c })),
    selectedId: null,
    filterCategory: "all",
    searchQuery: "",
    sortBy: "nearest",
    sheetState: "half", // 'collapsed' | 'half' | 'expanded'
    isGoogle: false,
    mapInstance: null,
    userMarker: null,
  };

  // Base user center (Cairo - Nasr City)
  const userLoc = { lat: 30.0488, lng: 31.3390 };

  // Initial HTML skeleton matching component hierarchy
  ctx.root.innerHTML = `
    <div class="map-view-container" id="mapViewContainer" data-sheet-expanded="false" dir="rtl">
      <!-- Full-screen base map canvas -->
      <div id="map" class="map-canvas"></div>

      <!-- Backdrop dim overlay when sheet is expanded -->
      <div class="map-dim-backdrop" id="mapDim"></div>

      <!-- Floating Top Area: SearchBar & FilterChipsRow -->
      <header class="map-floating-header">
        <div class="map-search-bar">
          <span class="search-icon"><i data-lucide="search"></i></span>
          <input type="search" class="search-input" id="mapSearchInput" placeholder="ابحث عن مغسلة سيارات..." />
          <button class="clear-search-btn" id="mapClearBtn" hidden aria-label="مسح البحث">
            <i data-lucide="x"></i>
          </button>
          <button class="filter-icon-btn" id="mapFilterModalBtn" aria-label="الفلاتر">
            <i data-lucide="sliders-horizontal"></i>
            <span class="filter-badge" id="filterCountBadge" hidden>1</span>
          </button>
        </div>

        <div class="filter-chips-rail" id="filterChipsRail">
          <button class="chip-item active" data-filter="all">الكل</button>
          <button class="chip-item" data-filter="nearest">الأقرب</button>
          <button class="chip-item" data-filter="top_rated">الأعلى تقييماً</button>
          <button class="chip-item" data-filter="open_now">مفتوح الآن</button>
          <button class="chip-item" data-filter="exterior">غسيل خارجي</button>
          <button class="chip-item" data-filter="interior">غسيل داخلي</button>
          <button class="chip-item" data-filter="polish">تلميع</button>
          <button class="chip-item" data-filter="mobile">خدمة متنقلة</button>
        </div>
      </header>

      <!-- Floating Map Action Buttons -->
      <aside class="map-controls-floating">
        <button class="map-ctrl-btn" id="recenterBtn" aria-label="موقعي">
          <i data-lucide="locate-fixed"></i>
        </button>
        <div class="map-ctrl-group">
          <button class="map-ctrl-btn zoom-btn" id="zoomInBtn" aria-label="تكبير">
            <i data-lucide="plus"></i>
          </button>
          <div class="map-ctrl-divider"></div>
          <button class="map-ctrl-btn zoom-btn" id="zoomOutBtn" aria-label="تصغير">
            <i data-lucide="minus"></i>
          </button>
        </div>
        <button class="map-ctrl-btn" id="toggleSheetBtn" aria-label="تبديل العرض">
          <i data-lucide="layers"></i>
        </button>
      </aside>

      <!-- Compact Floating Horizontal Carousel (active when pin selected and sheet collapsed) -->
      <div class="map-horizontal-carousel" id="mapCarousel" hidden></div>

      <!-- Draggable Bottom Sheet -->
      <section class="draggable-bottom-sheet" id="draggableSheet" data-state="half">
        <div class="sheet-handle-zone" id="sheetHandle">
          <div class="sheet-drag-pill"></div>
        </div>

        <div class="sheet-header-row" id="sheetHeaderRow">
          <div class="sheet-title-group">
            <h3 class="sheet-title" id="sheetResultTitle">مغاسل قريبة منك</h3>
            <span class="sheet-count-badge" id="sheetCountBadge">· 10 نتائج</span>
          </div>
          <div class="sheet-sort-group">
            <select class="sheet-sort-select" id="sheetSortSelect" aria-label="ترتيب النتائج">
              <option value="nearest">الأقرب ▾</option>
              <option value="top_rated">الأعلى تقييماً ▾</option>
              <option value="price_asc">الأقل سعراً ▾</option>
            </select>
          </div>
        </div>

        <div class="sheet-scroll-body" id="sheetScrollBody">
          <!-- Cards rendered dynamically -->
        </div>
      </section>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // DOM Elements
  const container = ctx.root.querySelector("#mapViewContainer");
  const sheet = ctx.root.querySelector("#draggableSheet");
  const sheetBody = ctx.root.querySelector("#sheetScrollBody");
  const carousel = ctx.root.querySelector("#mapCarousel");
  const countBadge = ctx.root.querySelector("#sheetCountBadge");
  const searchInput = ctx.root.querySelector("#mapSearchInput");
  const clearBtn = ctx.root.querySelector("#mapClearBtn");
  const filterChips = ctx.root.querySelectorAll(".chip-item");
  const sortSelect = ctx.root.querySelector("#sheetSortSelect");
  const recenterBtn = ctx.root.querySelector("#recenterBtn");
  const zoomInBtn = ctx.root.querySelector("#zoomInBtn");
  const zoomOutBtn = ctx.root.querySelector("#zoomOutBtn");
  const toggleSheetBtn = ctx.root.querySelector("#toggleSheetBtn");
  const mapDim = ctx.root.querySelector("#mapDim");
  const handleZone = ctx.root.querySelector("#sheetHandle");
  const headerRow = ctx.root.querySelector("#sheetHeaderRow");

  // Filtering & Sorting Core Logic
  function getFilteredList() {
    let list = state.cars.slice();

    // 1. Search Query
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.trim().toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.area.toLowerCase().includes(q) ||
        c.services.some((s) => s.toLowerCase().includes(q))
      );
    }

    // 2. Filter Category Chip
    if (state.filterCategory === "nearest") {
      list.sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (state.filterCategory === "top_rated") {
      list = list.filter((c) => c.rating >= 4.7);
    } else if (state.filterCategory === "open_now") {
      list = list.filter((c) => c.isOpen);
    } else if (state.filterCategory === "exterior") {
      list = list.filter((c) => c.services.some((s) => s.includes("خارجي") || s.includes("كامل")));
    } else if (state.filterCategory === "interior") {
      list = list.filter((c) => c.services.some((s) => s.includes("داخلي") || s.includes("كامل")));
    } else if (state.filterCategory === "polish") {
      list = list.filter((c) => c.services.some((s) => s.includes("تلميع") || s.includes("نانو")));
    } else if (state.filterCategory === "mobile") {
      list = list.filter((c) => c.services.some((s) => s.includes("متنقلة")));
    }

    // 3. Sort Order
    if (state.sortBy === "nearest") {
      list.sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (state.sortBy === "top_rated") {
      list.sort((a, b) => b.rating - a.rating);
    } else if (state.sortBy === "price_asc") {
      list.sort((a, b) => a.priceFrom - b.priceFrom);
    }

    return list;
  }

  // Render Vertical List Card (Variant A)
  function renderCard(item, isSelected) {
    const visibleServices = item.services.slice(0, 2);
    const extraServicesCount = item.services.length - 2;

    return `
      <article class="carwash-card ${isSelected ? 'selected' : ''}" data-id="${item.id}" tabindex="0">
        <div class="card-thumb-wrap">
          <img src="${item.imageUrl}" alt="${esc(item.name)}" class="card-thumb" loading="lazy" />
          <span class="status-badge ${item.isOpen ? 'open' : 'closed'}">
            <i class="status-dot"></i>
            <span>${item.isOpen ? 'مفتوح' : 'مغلق'}</span>
          </span>
        </div>

        <div class="card-info-col">
          <div class="card-title-row">
            <h4 class="card-name">${esc(item.name)}</h4>
            <button class="card-fav-btn ${item.isFavorite ? 'active' : ''}" data-act="fav" data-id="${item.id}" aria-label="إضافة للمفضلة">
              <i data-lucide="heart"></i>
            </button>
          </div>

          <div class="card-rating-row">
            <span class="star-icon"><i data-lucide="star"></i></span>
            <span class="rating-val">${item.rating.toFixed(1)}</span>
            <span class="reviews-count">(${item.reviewsCount})</span>
          </div>

          <div class="card-location-row">
            <span class="loc-pin"><i data-lucide="map-pin"></i></span>
            <span class="area-name">${esc(item.area)}</span>
            <span class="loc-dot">•</span>
            <span class="distance-pill">${item.distanceKm} كم</span>
          </div>

          <div class="card-services-row">
            ${visibleServices.map((s) => `<span class="svc-tag">${esc(s)}</span>`).join("")}
            ${extraServicesCount > 0 ? `<span class="svc-tag more">+${extraServicesCount}</span>` : ""}
          </div>

          <div class="card-bottom-row">
            <div class="card-price-block">
              <span class="price-label">يبدأ من</span>
              <span class="price-val">${item.priceFrom} <small>ج.م</small></span>
            </div>
            <button class="card-book-btn" data-act="book" data-id="${item.id}">
              <span>احجز الآن</span>
              <i data-lucide="arrow-left" class="rtl-flip"></i>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  // Render Horizontal Carousel Card (Variant B)
  function renderCarouselCard(item, isSelected) {
    return `
      <div class="carousel-card ${isSelected ? 'selected' : ''}" data-id="${item.id}">
        <div class="carousel-thumb-wrap">
          <img src="${item.imageUrl}" alt="${esc(item.name)}" class="carousel-thumb" />
          <span class="status-badge ${item.isOpen ? 'open' : 'closed'}">
            <i class="status-dot"></i>
            <span>${item.isOpen ? 'مفتوح' : 'مغلق'}</span>
          </span>
        </div>
        <div class="carousel-info-col">
          <div class="carousel-title-row">
            <h4 class="carousel-name">${esc(item.name)}</h4>
            <span class="distance-pill">${item.distanceKm} كم</span>
          </div>
          <div class="carousel-meta-row">
            <span class="star-icon"><i data-lucide="star"></i></span>
            <span class="rating-val">${item.rating.toFixed(1)}</span>
            <span class="reviews-count">(${item.reviewsCount})</span>
            <span class="loc-dot">•</span>
            <span class="area-name">${esc(item.area)}</span>
          </div>
          <div class="carousel-bottom-row">
            <div class="card-price-block">
              <span class="price-label">يبدأ من</span>
              <span class="price-val">${item.priceFrom} <small>ج.م</small></span>
            </div>
            <button class="card-book-btn sm" data-act="book" data-id="${item.id}">
              <span>احجز الآن</span>
              <i data-lucide="arrow-left" class="rtl-flip"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Render Loading Skeletons
  function renderSkeletons() {
    return Array.from({ length: 3 }).map(() => `
      <div class="skeleton-card">
        <div class="skeleton-thumb"></div>
        <div class="skeleton-content">
          <div class="skeleton-line title"></div>
          <div class="skeleton-line rating"></div>
          <div class="skeleton-line loc"></div>
          <div class="skeleton-line cta"></div>
        </div>
      </div>
    `).join("");
  }

  // Render Empty State
  function renderEmpty() {
    return `
      <div class="map-empty-state">
        <div class="empty-icon-bubble">
          <i data-lucide="map-pin-off"></i>
        </div>
        <h4 class="empty-title">لا توجد مغاسل قريبة</h4>
        <p class="empty-desc">لم نجد نتائج مطابقة لبحثك في هذا النطاق أو الفلاتر المحددة.</p>
        <button class="empty-action-btn" id="resetMapFiltersBtn">
          <i data-lucide="refresh-cw"></i>
          <span>وسّع نطاق البحث</span>
        </button>
      </div>
    `;
  }

  // Update Sheet Snap State with Smooth Transition
  function setSheetState(newState) {
    state.sheetState = newState;
    sheet.dataset.state = newState;
    container.dataset.sheetExpanded = (newState === "expanded");

    // Carousel visibility: show if collapsed and we have a selected card
    if (newState === "collapsed" && state.selectedId) {
      carousel.hidden = false;
    } else {
      carousel.hidden = true;
    }
  }

  // Sync Markers & List View
  function syncUI() {
    const list = getFilteredList();

    // 1. Update Result Count Badge
    countBadge.textContent = `· ${list.length} نتائج`;

    // 2. Render Vertical List in Bottom Sheet
    if (list.length === 0) {
      sheetBody.innerHTML = renderEmpty();
      carousel.hidden = true;
    } else {
      sheetBody.innerHTML = list.map((item) => renderCard(item, item.id === state.selectedId)).join("");

      // Render horizontal carousel cards
      carousel.innerHTML = list.map((item) => renderCarouselCard(item, item.id === state.selectedId)).join("");
      if (state.sheetState === "collapsed" && state.selectedId) {
        carousel.hidden = false;
      }
    }

    if (window.lucide) window.lucide.createIcons();

    // 3. Update Map Markers
    updateMapMarkers(list);

    // 4. Scroll selected card into view smoothly
    if (state.selectedId) {
      const activeCard = sheetBody.querySelector(`.carwash-card[data-id="${state.selectedId}"]`);
      if (activeCard && state.sheetState !== "collapsed") {
        activeCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      const activeCarouselCard = carousel.querySelector(`.carousel-card[data-id="${state.selectedId}"]`);
      if (activeCarouselCard && !carousel.hidden) {
        activeCarouselCard.scrollIntoView({ behavior: "smooth", inline: "center" });
      }
    }
  }

  // Update Markers on Map
  function updateMapMarkers(list) {
    if (!state.mapInstance) return;

    if (state.isGoogle) {
      // Clear existing markers
      mapMarkers.forEach((m) => m.setMap(null));
      mapMarkers = [];

      list.forEach((car) => {
        const isSelected = (car.id === state.selectedId);
        const marker = new window.google.maps.Marker({
          position: { lat: car.lat, lng: car.lng },
          map: state.mapInstance,
          icon: createCarWashPinIcon({
            price: car.priceFrom,
            rating: car.rating,
            isSelected,
          }),
          zIndex: isSelected ? 9999 : 100,
          title: car.name,
        });

        marker.addListener("click", () => {
          selectCarWash(car.id);
        });

        mapMarkers.push(marker);
      });
    } else if (window.L && state.mapInstance) {
      // Leaflet Markers
      mapMarkers.forEach((m) => m.remove());
      mapMarkers = [];

      list.forEach((car) => {
        const isSelected = (car.id === state.selectedId);
        const iconHtml = `
          <div class="cz-leaflet-pin ${isSelected ? 'selected' : ''}" data-id="${car.id}">
            <div class="cz-pin-bubble">${car.priceFrom} ج.م</div>
            <div class="cz-pin-body">
              <svg viewBox="0 0 36 44">
                <path d="M18 2 C9.5 2 3 8.5 3 17 C3 27 16 38 18 40 C20 38 33 27 33 17 C33 8.5 26.5 2 18 2 Z" fill="#0B1F4B" stroke="${isSelected ? '#FFD54F' : '#FFFFFF'}" stroke-width="${isSelected ? '2.5' : '1.5'}"/>
              </svg>
              <span class="cz-pin-icon-inner">
                <svg viewBox="0 0 24 24"><path d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4-6.2-4.5h7.6z"/></svg>
              </span>
            </div>
          </div>
        `;

        const marker = window.L.marker([car.lat, car.lng], {
          icon: window.L.divIcon({ className: "", html: iconHtml, iconSize: [40, 50] }),
          zIndexOffset: isSelected ? 1000 : 10,
        }).addTo(state.mapInstance);

        marker.on("click", () => selectCarWash(car.id));
        mapMarkers.push(marker);
      });
    }
  }

  // Select Car Wash (Bidirectional Sync)
  function selectCarWash(id) {
    state.selectedId = id;
    const car = state.cars.find((c) => c.id === id);

    if (car && state.mapInstance) {
      if (state.isGoogle) {
        state.mapInstance.panTo({ lat: car.lat, lng: car.lng });
      } else if (window.L) {
        state.mapInstance.panTo([car.lat, car.lng]);
      }
    }

    syncUI();
  }

  // Setup Spring-like Drag Behavior
  function setupDragGestures() {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let initialTranslateY = 0;

    function getTranslatePercent() {
      if (state.sheetState === "expanded") return 4;
      if (state.sheetState === "half") return 52;
      return 88;
    }

    function onStart(e) {
      isDragging = true;
      startY = e.touches ? e.touches[0].clientY : e.clientY;
      currentY = startY;
      initialTranslateY = getTranslatePercent();
      sheet.style.transition = "none";
    }

    function onMove(e) {
      if (!isDragging) return;
      currentY = e.touches ? e.touches[0].clientY : e.clientY;
      const deltaY = currentY - startY;
      const viewportH = container.clientHeight || 700;
      const percentDelta = (deltaY / viewportH) * 100;
      const targetPercent = Math.max(4, Math.min(88, initialTranslateY + percentDelta));
      sheet.style.transform = `translateY(${targetPercent}%)`;
    }

    function onEnd() {
      if (!isDragging) return;
      isDragging = false;
      sheet.style.transition = "";

      const deltaY = currentY - startY;
      if (Math.abs(deltaY) < 15) {
        // Tapped without dragging: toggle state
        if (state.sheetState === "collapsed") setSheetState("half");
        else if (state.sheetState === "half") setSheetState("expanded");
        else setSheetState("half");
        return;
      }

      // Drag threshold calculation
      if (deltaY < -45) {
        // Dragged up
        if (state.sheetState === "collapsed") setSheetState("half");
        else setSheetState("expanded");
      } else if (deltaY > 45) {
        // Dragged down
        if (state.sheetState === "expanded") setSheetState("half");
        else setSheetState("collapsed");
      } else {
        // Snap back to current state
        setSheetState(state.sheetState);
      }
    }

    // Attach touch & mouse events
    handleZone.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);

    handleZone.addEventListener("mousedown", onStart);
    headerRow.addEventListener("mousedown", onStart);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);

    dragCleanup = () => {
      handleZone.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      handleZone.removeEventListener("mousedown", onStart);
      headerRow.removeEventListener("mousedown", onStart);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
    };
  }

  setupDragGestures();

  // Event Listeners for Controls & Filters
  // 1. Search Bar
  let searchTimer = null;
  searchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    clearBtn.hidden = !state.searchQuery;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => syncUI(), 200);
  });

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    state.searchQuery = "";
    clearBtn.hidden = true;
    syncUI();
    searchInput.focus();
  });

  // 2. Filter Chips
  filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      filterChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      state.filterCategory = chip.dataset.filter;
      syncUI();
    });
  });

  // 3. Sort Select
  sortSelect.addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    syncUI();
  });

  // 4. Recenter Button ("موقعي")
  recenterBtn.addEventListener("click", () => {
    if (state.mapInstance) {
      if (state.isGoogle) {
        state.mapInstance.panTo(userLoc);
        state.mapInstance.setZoom(13);
      } else if (window.L) {
        state.mapInstance.setView([userLoc.lat, userLoc.lng], 13);
      }
    }
  });

  // 5. Zoom In & Out Buttons
  zoomInBtn.addEventListener("click", () => {
    if (state.mapInstance) {
      if (state.isGoogle) state.mapInstance.setZoom(state.mapInstance.getZoom() + 1);
      else if (window.L) state.mapInstance.zoomIn();
    }
  });

  zoomOutBtn.addEventListener("click", () => {
    if (state.mapInstance) {
      if (state.isGoogle) state.mapInstance.setZoom(state.mapInstance.getZoom() - 1);
      else if (window.L) state.mapInstance.zoomOut();
    }
  });

  // 6. Toggle Sheet Button
  toggleSheetBtn.addEventListener("click", () => {
    if (state.sheetState === "collapsed") setSheetState("half");
    else if (state.sheetState === "half") setSheetState("expanded");
    else setSheetState("collapsed");
  });

  // 7. Backdrop Dim click closes expanded sheet
  mapDim.addEventListener("click", () => {
    setSheetState("half");
  });

  // 8. Card actions delegation (Favorites, Booking, Card Click)
  container.addEventListener("click", async (e) => {
    // Reset filters from empty state
    if (e.target.closest("#resetMapFiltersBtn")) {
      state.searchQuery = "";
      state.filterCategory = "all";
      searchInput.value = "";
      clearBtn.hidden = true;
      filterChips.forEach((c) => c.classList.toggle("active", c.dataset.filter === "all"));
      syncUI();
      return;
    }

    // Favorite heart button
    const favBtn = e.target.closest("[data-act='fav']");
    if (favBtn) {
      e.stopPropagation();
      const carId = favBtn.dataset.id;
      const targetCar = state.cars.find((c) => c.id === carId);
      if (targetCar) {
        targetCar.isFavorite = !targetCar.isFavorite;
        favBtn.classList.toggle("active", targetCar.isFavorite);
        toast(targetCar.isFavorite ? "تمت الإضافة إلى المفضلة" : "تمت الإزالة من المفضلة");
      }
      return;
    }

    // Book CTA Button
    const bookBtn = e.target.closest("[data-act='book']");
    if (bookBtn) {
      e.stopPropagation();
      const branchId = bookBtn.dataset.id;
      // Direct navigation to branch detail
      const dbBranches = get().branches || [];
      const hasRealBranch = dbBranches.some((b) => b.id === branchId);
      location.hash = hasRealBranch ? `#/wash/${branchId}` : `#/wash/br_oasis_nasr`;
      return;
    }

    // Card Selection
    const card = e.target.closest(".carwash-card, .carousel-card");
    if (card && card.dataset.id) {
      selectCarWash(card.dataset.id);
    }
  });

  // Initialize Map Engine (Google Maps with Leaflet fallback)
  const mapEl = ctx.root.querySelector("#map");
  let isGoogleReady = false;

  try {
    await loadGoogleMaps();
    isGoogleReady = !!(window.google && window.google.maps);
  } catch {
    isGoogleReady = false;
  }

  state.isGoogle = isGoogleReady;

  if (isGoogleReady) {
    const isDark = document.documentElement.dataset.theme === "dark";
    const gmap = new window.google.maps.Map(mapEl, {
      center: userLoc,
      zoom: 13,
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: isDark ? MAP_STYLES.dark : MAP_STYLES.light,
    });

    state.mapInstance = gmap;
    mapRef = gmap;

    // User Location Dot Marker
    new window.google.maps.Marker({
      position: userLoc,
      map: gmap,
      icon: createUserDotIcon(),
      title: "موقعي الحالي",
      zIndex: 200,
    });
  } else if (window.L) {
    const map = window.L.map(mapEl, { zoomControl: false }).setView([userLoc.lat, userLoc.lng], 13);
    state.mapInstance = map;
    mapRef = map;

    window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    // User Location Dot Marker in Leaflet
    window.L.marker([userLoc.lat, userLoc.lng], {
      icon: window.L.divIcon({
        className: "",
        html: `<div class="cz-user-marker"><div class="cz-user-pulse"></div><div class="cz-user-dot"></div></div>`,
        iconSize: [22, 22],
      }),
    }).addTo(map);

    setTimeout(() => map.invalidateSize(), 60);
  }

  // Initial UI Render
  syncUI();
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
