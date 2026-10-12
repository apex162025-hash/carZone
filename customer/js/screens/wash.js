import { get, now } from "../../../shared/js/db.js";
import { L, t } from "../../../shared/js/i18n.js";
import { read } from "../../../shared/js/net.js";
import { money, formatTime, formatDate, distanceLabel, relativeDay } from "../../../shared/js/format.js";
import { coverUri } from "../../../shared/js/covers.js";
import { branchBg, branchPhoto } from "../photos.js";
import { decorateBranch, liveRating } from "../../../shared/js/services/discovery.js";
import { nextSlots, isOpenAt, slotStarts } from "../../../shared/js/services/availability.js";
import { minPrimary } from "../../../shared/js/services/pricing.js";
import { toast } from "../../../shared/js/ui.js";
import { toggleFavorite } from "../../../shared/js/services/account.js";
import { tx, screen, topbar, badge, icon, esc, bus, skeleton, errorBlock } from "../kit.js";
import { currentUser, getLoc, sessionId, rememberReturn, setPending, saveDraft, getDraft, kmTo } from "../state.js";

const AMENITY_ICON = { waiting: "sofa", ac: "snowflake", wifi: "wifi", card: "credit-card", coffee: "coffee", covered: "warehouse" };

export async function wash(ctx) {
  const id = ctx.params.branchId;
  const draw = (db) => {
    const branch = db.branches.find((b) => b.id === id);
    if (!branch) { ctx.root.innerHTML = screen(topbar({ title: "", back: "#/home" }), errorBlock()); return; }
    const biz = db.businesses.find((b) => b.id === branch.businessId);
    const card = decorateBranch(db, branch, getLoc(), now());
    const open = isOpenAt(branch, now());
    const services = db.services.filter((s) => s.branchId === id && s.active && s.type === "primary");
    const addons = db.services.filter((s) => s.branchId === id && s.active && s.type === "addon");
    const shortest = services.reduce((m, s) => (s.durationMin < m.durationMin ? s : m), services[0]);
    const slots = shortest ? nextSlots(db, branch, shortest.durationMin, 3, now()) : [];
    const tomorrow = new Date(now()); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(9, 0, 0, 0);
    const nextDay = slotStarts(db, branch, tomorrow, shortest?.durationMin || 30, now())[0];
    const stats = liveRating(db, id);
    const recent = stats.rows.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
    const fav = db.favorites.some((f) => f.customerId === sessionId() && f.branchId === id);
    const offer = ctx.query.offer ? db.offers.find((o) => o.id === ctx.query.offer) : null;
    const from = minPrimary(db, id)?.price;
    const unavailable = biz.status !== "active" || !branch.active;
    const hours = branch.workingHours || [];
    const todayH = hours[now().getDay()];
    ctx.root.innerHTML = `<div class="screen">
      <div class="screen-body" id="body">
        <div class="cover wash-hero" style="background-image:${branchBg(id, 1, 900)}">
          <div class="between" style="padding:10px 14px">
            <button class="icon-btn" data-go="#/home"><span class="dir-icon">${icon("chevron-left")}</span></button>
            <div class="row">
              <button class="icon-btn" data-act="share">${icon("share-2")}</button>
              <button class="icon-btn heart ${fav ? "on" : ""}" data-act="fav" style="position:static">${icon("heart")}</button>
            </div>
          </div>
        </div>
        <div class="pad stack">
          <div class="between"><h2>${esc(L(branch.name))}</h2><span class="num">★ ${stats.rating.toFixed(1)}</span></div>
          <button class="linkish" data-go="#/wash/${id}/reviews" style="padding:0">${esc(t("ratingCount", { rating: stats.rating.toFixed(1), count: stats.count }))}</button>
          ${offer ? `<div class="card pad"><b>${esc(L(offer.title))}</b><div class="small">${esc(L(offer.description))}</div></div>` : ""}
          ${unavailable ? `<div class="banner">${tx("wash.unavailable")}</div>` : ""}
          <p class="muted">${esc(L(branch.address))} · ${esc(distanceLabel(kmTo(branch)))}</p>
          <button class="btn ghost" data-act="hours">${tx(open ? "open" : "closed")} · ${esc(todayH ? `${todayH.open}–${todayH.close}` : "")}</button>
          <div id="week" class="hidden stack">${hours.map((h, i) => `<div class="between tiny"><span>${esc(formatDate(new Date(2026, 9, 4 + i)).split(" ")[0])}</span><span>${h.closed ? tx("closed") : `${h.open}–${h.close}`}</span></div>`).join("")}</div>
          <div class="row"><button class="btn ghost grow" data-act="call">${icon("phone")} ${tx("wash.call")}</button><button class="btn ghost grow" data-act="nav">${icon("navigation")} ${tx("wash.nav")}</button></div>
          <h3>${tx("wash.gallery")}</h3>
          <div class="hscroll" style="padding-inline:0">${branch.photos.map((p, i) => `<button data-act="photo" data-i="${i}" style="border:0;padding:0"><img alt="" src="${branchPhoto(id, i + 2, 400)}" onerror="this.onerror=null;this.src='${coverUri(id, i)}'" loading="lazy" style="width:160px;height:100px;object-fit:cover;border-radius:16px"/></button>`).join("")}</div>
          <h3>${tx("wash.amenities")}</h3>
          <div class="wrap">${(branch.amenities || []).map((a) => `<span class="chip flat">${icon(AMENITY_ICON[a] || "check")} ${tx("amenity." + a)}</span>`).join("")}</div>
          <h3>${tx("wash.next")}</h3>
          ${slots.length ? `<div class="row">${slots.map((s) => `<button class="slot" data-act="slot" data-slot="${esc(s.start)}">${esc(formatTime(s.start))}</button>`).join("")}</div>` : `<p class="muted">${esc(t("wash.fullToday", { when: nextDay ? formatTime(nextDay.start) : formatTime(tomorrow) }))}</p>`}
          <h3>${tx("wash.services")}</h3>
          ${services.map((s) => `<button class="svc" data-act="svc" data-id="${s.id}"><span class="grow"><b>${esc(L(s.name))}</b><div class="small muted">${esc(L(s.description))}</div></span><span class="num">${esc(money(s.price))}</span><span class="chip">${esc(t("minShort", { n: s.durationMin }))}</span></button>`).join("")}
          <h3>${tx("wash.extras")}</h3>
          ${addons.map((s) => `<div class="between"><span>${esc(L(s.name))}</span><b class="num">${esc(money(s.price))}</b></div>`).join("")}
          <div class="between"><h3>${tx("wash.reviews")}</h3><button class="linkish" data-go="#/wash/${id}/reviews">${tx("wash.seeReviews")}</button></div>
          ${bars(stats)}
          ${recent.map((r) => reviewCard(db, r)).join("")}
        </div>
      </div>
      ${unavailable ? "" : `<footer class="dock"><div class="grow"><div class="small muted">${tx("wash.from", { price: money(from || 0) })}</div></div><button class="btn" data-act="book">${tx(open ? "wash.book" : "wash.bookLater")}</button></footer>`}
    </div>`;
    ctx.icons();
    bus.act = async (el) => {
      const act = el.dataset.act;
      if (act === "hours") ctx.root.querySelector("#week")?.classList.toggle("hidden");
      if (act === "call") toast(t("toast.call"));
      if (act === "nav") toast(t("toast.maps"));
      if (act === "share") {
        const link = `${location.origin}${location.pathname}#/wash/${id}`;
        try { await navigator.clipboard.writeText(link); } catch { /* ignore */ }
        toast(t("toast.share"));
      }
      if (act === "fav") {
        const user = currentUser();
        if (!user) { setPending({ type: "favorite", branchId: id }); rememberReturn(location.hash); location.hash = "#/login"; return; }
        await toggleFavorite(user.id, id); ctx.render();
      }
      if (act === "photo") openGallery(ctx, id, Number(el.dataset.i), branch.photos.length);
      if (act === "slot") {
        const draft = getDraft() || {};
        saveDraft({ ...draft, branchId: id, slot: el.dataset.slot, serviceId: draft.serviceId || "" });
        location.hash = `#/book/${id}/service`;
      }
      if (act === "svc") {
        saveDraft({ branchId: id, serviceId: el.dataset.id, addonIds: [], vehicleId: "", slot: "", note: "" });
        location.hash = `#/book/${id}/service`;
      }
      if (act === "book") {
        saveDraft({ branchId: id, serviceId: "", addonIds: [], vehicleId: "", slot: "", note: "" });
        location.hash = `#/book/${id}/service`;
      }
    };
  };
  ctx.root.innerHTML = skeleton(4);
  try {
    await read(() => get());
    if (!ctx.alive()) return;
    draw(get());
  } catch {
    ctx.root.innerHTML = screen(topbar({ title: "", back: "#/home" }), errorBlock());
    bus.act = () => ctx.render();
  }
}

function bars(stats) {
  const max = Math.max(1, ...stats.dist);
  return `<div class="stack">${[5, 4, 3, 2, 1].map((star) => `<div class="row"><span class="num">${star}</span><div style="flex:1;height:8px;background:var(--c-line);border-radius:99px"><div style="width:${(stats.dist[star - 1] / max) * 100}%;height:100%;background:var(--c-warning);border-radius:99px"></div></div><span class="num small">${stats.dist[star - 1]}</span></div>`).join("")}</div>`;
}

function reviewCard(db, r) {
  const customer = db.customers.find((c) => c.id === r.customerId);
  const service = db.services.find((s) => s.id === r.serviceId);
  return `<article class="card pad"><div class="between"><b>${esc(customer?.name || "")}</b><span>${"★".repeat(r.stars)}</span></div>
    <div class="small muted">${esc(relativeDay(r.createdAt, now()))} · ${esc(service ? L(service.name) : "")}</div>
    <p>${esc(typeof r.comment === "string" ? r.comment : L(r.comment))}</p>
    ${r.reply ? `<div class="small"><b>${tx("wash.reply")}</b> ${esc(typeof r.reply === "string" ? r.reply : L(r.reply))}</div>` : ""}</article>`;
}

function openGallery(ctx, id, index, total) {
  let i = index;
  const layer = document.createElement("div");
  layer.className = "gallery";
  const paint = () => {
    layer.innerHTML = `<div class="between pad-x"><button class="icon-btn" data-g="close">${icon("x")}</button><b class="num">${i + 1} / ${total}</b><span></span></div>
      <img alt="" src="${branchPhoto(id, i + 2, 1200)}" onerror="this.onerror=null;this.src='${coverUri(id, i)}'" />
      <div class="row" style="justify-content:center;padding:12px"><button class="icon-btn" data-g="prev"><span class="dir-icon">${icon("chevron-left")}</span></button><button class="icon-btn" data-g="next"><span class="dir-icon">${icon("chevron-right")}</span></button></div>`;
    ctx.icons();
  };
  let x0 = 0;
  layer.addEventListener("pointerdown", (e) => { x0 = e.clientX; });
  layer.addEventListener("pointerup", (e) => {
    const dx = e.clientX - x0;
    if (Math.abs(dx) < 40) return;
    i = dx < 0 ? Math.min(total - 1, i + 1) : Math.max(0, i - 1);
    paint();
  });
  layer.addEventListener("click", (e) => {
    const g = e.target.closest("[data-g]")?.dataset.g;
    if (g === "close") layer.remove();
    if (g === "next") { i = Math.min(total - 1, i + 1); paint(); }
    if (g === "prev") { i = Math.max(0, i - 1); paint(); }
  });
  document.querySelector(".device-inner").appendChild(layer);
  paint();
}

export async function reviews(ctx) {
  const id = ctx.params.branchId;
  let star = 0;
  const draw = () => {
    const db = get();
    const stats = liveRating(db, id);
    const branch = db.branches.find((b) => b.id === id);
    let rows = stats.rows.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (star) rows = rows.filter((r) => r.stars === star);
    ctx.root.innerHTML = screen(topbar({ title: esc(branch ? L(branch.name) : ""), back: `#/wash/${id}` }), `<div class="pad stack">
      <div class="between"><b class="num" style="font-size:36px">${stats.rating.toFixed(1)}</b><span>${stats.count}</span></div>
      ${bars(stats)}
      <div class="wrap">${[0, 5, 4, 3, 2, 1].map((n) => `<button class="chip ${star === n ? "on" : "flat"}" data-act="star" data-n="${n}">${n ? n + "★" : tx("f.any")}</button>`).join("")}</div>
      ${rows.map((r) => reviewCard(db, r)).join("") || `<p class="muted">${tx("empty.search")}</p>`}
    </div>`);
    ctx.icons();
  };
  ctx.root.innerHTML = skeleton(3);
  try {
    await read(() => get());
    if (!ctx.alive()) return;
    draw();
  } catch {
    ctx.root.innerHTML = screen(topbar({ title: "", back: "#/home" }), errorBlock());
  }
  bus.act = (el) => { if (el.dataset.act === "star") { star = Number(el.dataset.n); draw(); } if (el.dataset.act === "retry") ctx.render(); };
}

void badge;
void formatDate;
void tx;
