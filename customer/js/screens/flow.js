import { get, now } from "../../../shared/js/db.js";
import { L, t } from "../../../shared/js/i18n.js";
import { read, isOffline } from "../../../shared/js/net.js";
import { money, formatTime, formatDate, minutesLabel } from "../../../shared/js/format.js";
import { carUri } from "../../../shared/js/covers.js";
import { colorHex } from "../../../shared/js/colors.js";
import { computeQuote } from "../../../shared/js/services/pricing.js";
import { slotStarts, dayClosed } from "../../../shared/js/services/availability.js";
import { createAppBooking, cancelBooking, rescheduleBooking, canReschedule, submitReview, submitComplaint } from "../../../shared/js/services/orders.js";
import { sheet, toast, confirmDialog } from "../../../shared/js/ui.js";
import { tx, screen, topbar, badge, payBadge, icon, esc, bus, skeleton, errorBlock, emptyBlock } from "../kit.js";
import { currentUser, getDraft, saveDraft, clearDraft, rememberReturn, setPending, sessionId } from "../state.js";

function draftFor(branchId) {
  const d = getDraft() || {};
  if (d.branchId !== branchId) return { branchId, serviceId: "", addonIds: [], vehicleId: "", slot: "", note: "", again: false };
  return { addonIds: [], ...d, branchId };
}

function quoteOf(d) {
  if (!d.serviceId) return null;
  return computeQuote(get(), { branchId: d.branchId, serviceId: d.serviceId, addonIds: d.addonIds || [] }, now());
}

function dock(q) {
  if (!q) return `<footer class="dock"><button class="btn block" disabled>${tx("book.continue")}</button></footer>`;
  const offer = q.discount ? `<div class="small" style="color:var(--c-success)">${esc(t("book.offer", { v: q.offer?.discountType === "percent" ? q.offer.discountValue + "%" : money(q.discount) }))}</div>` : "";
  return `<footer class="dock"><div class="grow"><div class="small muted">${tx("book.total")} · ${esc(minutesLabel(q.durationMin))}</div><b class="num">${esc(money(q.total))}</b>${offer}</div><button class="btn" data-act="next">${tx("book.continue")}</button></footer>`;
}

export async function serviceStep(ctx) {
  const branchId = ctx.params.branchId;
  const d = draftFor(branchId);
  const draw = () => {
    const db = get();
    const branch = db.branches.find((b) => b.id === branchId);
    const primary = db.services.filter((s) => s.branchId === branchId && s.type === "primary" && s.active);
    const addons = db.services.filter((s) => s.branchId === branchId && s.type === "addon" && s.active);
    const q = quoteOf(d);
    ctx.root.innerHTML = `<div class="screen">${topbar({ title: esc(branch ? L(branch.name) : ""), back: `#/wash/${branchId}` })}
      <div class="screen-body pad stack" id="body">
        <div class="stepper"><i class="on"></i><i></i><i></i><i></i></div>
        <div class="small muted">${tx("book.step", { n: 1 })} · ${tx("book.service")}</div>
        <h3>${tx("book.primary")}</h3>
        ${primary.map((s) => `<button class="svc ${d.serviceId === s.id ? "on" : ""}" data-act="svc" data-id="${s.id}"><span class="grow"><b>${esc(L(s.name))}</b><div class="small muted">${esc(L(s.description))}</div></span><b class="num">${esc(money(s.price))}</b><span class="chip">${esc(t("minShort", { n: s.durationMin }))}</span></button>`).join("")}
        <h3>${tx("book.addons")}</h3>
        ${addons.map((s) => `<button class="addon" data-act="addon" data-id="${s.id}"><span class="chip ${d.addonIds.includes(s.id) ? "on" : "flat"}">${d.addonIds.includes(s.id) ? "✓" : ""}</span><span class="grow">${esc(L(s.name))}</span><b class="num">${esc(money(s.price))}</b></button>`).join("")}
      </div>${dock(q)}</div>`;
    ctx.icons();
  };
  ctx.root.innerHTML = skeleton(3);
  try { await read(() => true); } catch { ctx.root.innerHTML = screen(topbar({ title: "", back: "#/home" }), errorBlock()); bus.act = () => ctx.render(); return; }
  if (!ctx.alive()) return;
  draw();
  bus.act = (el) => {
    if (el.dataset.act === "svc") { d.serviceId = el.dataset.id; saveDraft(d); draw(); }
    if (el.dataset.act === "addon") {
      d.addonIds = d.addonIds.includes(el.dataset.id) ? d.addonIds.filter((x) => x !== el.dataset.id) : [...d.addonIds, el.dataset.id];
      saveDraft(d); draw();
    }
    if (el.dataset.act === "next" && d.serviceId) { saveDraft(d); location.hash = `#/book/${branchId}/car`; }
  };
}

export async function carStep(ctx) {
  const user = currentUser();
  if (!user) {
    rememberReturn(location.hash);
    location.hash = "#/login";
    return;
  }
  const branchId = ctx.params.branchId;
  const d = draftFor(branchId);
  const draw = () => {
    const cars = get().vehicles.filter((v) => v.customerId === user.id);
    if (!d.vehicleId) d.vehicleId = cars.find((c) => c.isDefault)?.id || cars[0]?.id || "";
    const q = quoteOf(d);
    ctx.root.innerHTML = `<div class="screen">${topbar({ title: tx("book.car"), back: `#/book/${branchId}/service` })}
      <div class="screen-body pad stack"><div class="stepper"><i class="on"></i><i class="on"></i><i></i><i></i></div>
      ${cars.map((c) => `<button class="svc ${d.vehicleId === c.id ? "on" : ""}" data-act="car" data-id="${c.id}"><img class="car-art" alt="" src="${carUri(colorHex(c.color))}"/><span class="grow"><b>${esc(c.make)} ${esc(c.model)}</b><div class="plate"><b>EG</b><span class="num">${esc(c.plate)}</span></div>${c.isDefault ? `<span class="chip">${tx("book.default")}</span>` : ""}</span></button>`).join("")}
      <button class="btn ghost" data-act="add">${tx("book.addCar")}</button>
      </div>${dock(q)}</div>`;
    ctx.icons();
  };
  await read(() => true).catch(() => {});
  if (!ctx.alive()) return;
  draw();
  bus.act = (el) => {
    if (el.dataset.act === "car") { d.vehicleId = el.dataset.id; saveDraft(d); draw(); }
    if (el.dataset.act === "add") { sessionStorage.setItem("carzen_car_return", location.hash); location.hash = "#/cars/new"; }
    if (el.dataset.act === "next" && d.vehicleId) { saveDraft(d); location.hash = `#/book/${branchId}/slot`; }
  };
}

export function slotBoard(branch, duration, selected, onPick) {
  const db = get();
  const days = [];
  for (let i = 0; i <= (branch.settings.maxAdvanceDays || 7); i += 1) {
    const day = new Date(now());
    day.setDate(day.getDate() + i);
    day.setHours(12, 0, 0, 0);
    days.push(day);
  }
  let dayIndex = 0;
  if (selected) {
    const sel = new Date(selected);
    dayIndex = days.findIndex((d) => d.toDateString() === sel.toDateString());
    if (dayIndex < 0) dayIndex = 0;
  }
  const html = () => {
    const day = new Date(days[dayIndex]);
    day.setHours(0, 0, 0, 0);
    const closed = dayClosed(branch, day);
    const slots = closed ? [] : slotStarts(db, branch, day, duration, now());
    const groups = { morning: [], afternoon: [], evening: [] };
    slots.forEach((s) => {
      const h = new Date(s.start).getHours();
      groups[h < 12 ? "morning" : h < 17 ? "afternoon" : "evening"].push(s);
    });
    return `<div class="dates">${days.map((d, i) => `<button class="date ${i === dayIndex ? "on" : ""}" data-act="day" data-i="${i}" ${dayClosed(branch, d) ? "disabled" : ""}>${i === 0 ? tx("book.today") : i === 1 ? tx("book.tomorrow") : esc(formatDate(d))}</button>`).join("")}</div>
      ${["morning", "afternoon", "evening"].map((g) => groups[g].length ? `<h3>${tx("book." + g)}</h3><div class="slots">${groups[g].map((s) => `<button class="slot ${selected === s.start ? "on" : ""}" data-act="time" data-slot="${esc(s.start)}">${esc(formatTime(s.start))}${s.few ? `<div class="few">${tx("book.few")}</div>` : ""}</button>`).join("")}</div>` : "").join("")}
      ${!slots.length ? `<div class="empty"><h3>${tx("book.noSlots")}</h3><button class="btn" data-act="tomorrow">${tx("book.seeTomorrow")}</button></div>` : ""}`;
  };
  return {
    html: html(),
    bind(el, rerender) {
      el.onclick = (e) => {
        const b = e.target.closest("[data-act]");
        if (!b) return;
        if (b.dataset.act === "day") { dayIndex = Number(b.dataset.i); rerender(); }
        if (b.dataset.act === "tomorrow") { dayIndex = Math.min(days.length - 1, dayIndex + 1); rerender(); }
        if (b.dataset.act === "time") onPick(b.dataset.slot);
      };
    },
  };
}

export async function slotStep(ctx) {
  const branchId = ctx.params.branchId;
  const d = draftFor(branchId);
  const q = quoteOf(d);
  if (!q) { location.hash = `#/book/${branchId}/service`; return; }
  const branch = get().branches.find((b) => b.id === branchId);
  const paint = () => {
    const board = slotBoard(branch, q.durationMin, d.slot, (slot) => { d.slot = slot; saveDraft(d); paint(); });
    ctx.root.innerHTML = `<div class="screen">${topbar({ title: tx("book.slot"), back: `#/book/${branchId}/car` })}
      <div class="screen-body pad" id="slotroot">${board.html}</div>${dock(q)}</div>`;
    board.bind(ctx.root.querySelector("#slotroot"), paint);
    const next = ctx.root.querySelector("[data-act=next]");
    if (next) next.onclick = () => { if (d.slot) { saveDraft(d); location.hash = `#/book/${branchId}/summary`; } };
  };
  ctx.root.innerHTML = skeleton(3);
  try { await read(() => true); } catch { ctx.root.innerHTML = errorBlock(); return; }
  if (!ctx.alive()) return;
  paint();
  bus.act = (el) => {
    if (el.dataset.act === "next" && d.slot) { saveDraft(d); location.hash = `#/book/${branchId}/summary`; }
  };
}

export async function summaryStep(ctx) {
  const branchId = ctx.params.branchId;
  const d = draftFor(branchId);
  const q = quoteOf(d);
  if (!q || !d.vehicleId) { location.hash = `#/book/${branchId}/service`; return; }
  let busy = false;
  const draw = () => {
    const db = get();
    const branch = db.branches.find((b) => b.id === branchId);
    const car = db.vehicles.find((v) => v.id === d.vehicleId);
    const when = d.slot ? `${formatDate(d.slot)} · ${formatTime(d.slot)}` : t("book.pickTime");
    ctx.root.innerHTML = `<div class="screen">${topbar({ title: tx("book.summary"), back: `#/book/${branchId}/slot` })}
      <div class="screen-body pad stack">
        <div class="stepper"><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i></div>
        ${row(t("wash.services"), L(branch.name), `#/wash/${branchId}`)}
        ${row(t("book.service"), q.items.map((i) => L(i.name)).join(" + "), `#/book/${branchId}/service`)}
        ${row(t("book.car"), car ? `${car.make} ${car.model} · ${car.plate}` : "", `#/book/${branchId}/car`)}
        ${row(t("book.slot"), when, `#/book/${branchId}/slot`)}
        <div class="kv"><span>${tx("book.subtotal")}</span><b class="num">${esc(money(q.subtotal))}</b></div>
        ${q.discount ? `<div class="kv"><span>${tx("book.discount")}</span><b class="num">−${esc(money(q.discount))}</b></div>` : ""}
        <div class="kv"><span>${tx("book.total")}</span><b class="num">${esc(money(q.total))}</b></div>
        <p>${tx("book.payLine")}</p>
        <p class="small muted">${esc(t("book.policy", { min: branch.settings.freeCancelMin }))}</p>
        <label class="field"><span class="label">${tx("book.note")}</span><textarea class="textarea" data-bind="note">${esc(d.note || "")}</textarea></label>
        ${!d.slot ? `<div id="inline-slot"></div>` : ""}
      </div>
      <footer class="dock"><button class="btn block" data-act="confirm" ${!d.slot || busy || isOffline() ? "disabled" : ""}>${tx(busy ? "common.loading" : "book.confirm")}</button></footer>
    </div>`;
    ctx.icons();
    if (!d.slot) {
      const board = slotBoard(branch, q.durationMin, "", (slot) => { d.slot = slot; saveDraft(d); draw(); });
      const host = ctx.root.querySelector("#inline-slot");
      if (host) { host.innerHTML = board.html; board.bind(host, draw); }
    }
  };
  bus.input = (el) => { if (el.dataset.bind === "note") { d.note = el.value; saveDraft(d); } };
  bus.act = async (el) => {
    if (el.dataset.act !== "confirm" || !d.slot) return;
    const user = currentUser();
    if (!user) { setPending({ type: "resume" }); rememberReturn(location.hash); location.hash = "#/login"; return; }
    busy = true; draw();
    try {
      const order = await createAppBooking({
        branchId, serviceId: d.serviceId, addonIds: d.addonIds, vehicleId: d.vehicleId,
        scheduledAt: d.slot, note: d.note, customerId: user.id,
      });
      clearDraft();
      location.hash = `#/book/success/${order.id}`;
    } catch (e) {
      busy = false;
      if (e.code === "slot_taken") {
        d.slot = ""; saveDraft(d);
        toast(t("book.slotTaken"));
        location.hash = `#/book/${branchId}/slot`;
      } else if (e.code === "offline") toast(t("offline.action"));
      else { toast(t("error.body")); draw(); }
    }
  };
  ctx.root.innerHTML = skeleton(3);
  try { await read(() => true); } catch { ctx.root.innerHTML = errorBlock(); return; }
  draw();
}

function row(label, value, href) {
  return `<div class="kv"><span><div class="small muted">${esc(label)}</div><b>${esc(value)}</b></span><a data-go="${esc(href)}">${tx("book.edit")}</a></div>`;
}

const CONFETTI = ["#0b6ba8", "#2cc6f2", "#7fe3ff", "#f8e7c9", "#13a6c9", "#f5a524"];

export async function success(ctx) {
  const order = get().orders.find((o) => o.id === ctx.params.orderId);
  if (!order) { location.hash = "#/home"; return; }
  const confetti = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    return `<i style="--x:${Math.round(Math.cos(a) * (90 + (i % 3) * 40))}px;--y:${Math.round(Math.sin(a) * 120 + 160)}px;--r:${(i * 67) % 360}deg;--d:${(0.25 + (i % 5) * 0.05).toFixed(2)}s;--c:${CONFETTI[i % CONFETTI.length]}"></i>`;
  }).join("");
  ctx.root.innerHTML = `<div class="screen center pad success" style="text-align:center;gap:12px">
    <div class="confetti">${confetti}</div>
    <div class="ok-badge"><i class="rip"></i><i class="rip r2"></i><span class="core"><svg viewBox="0 0 52 52" fill="none"><path d="M14 27l8 8 16-18" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg></span></div>
    <h2>${tx("book.success")}</h2>
    <div class="small muted">${tx("book.number")}</div>
    <div class="num" style="font-size:28px;font-weight:800">${esc(order.number)}</div>
    ${badge(order.status)}
    <button class="btn block" data-go="#/booking/${order.id}">${tx("book.view")}</button>
    <button class="btn ghost block" data-go="#/home">${tx("book.home")}</button>
  </div>`;
  ctx.icons();
}

const UP = ["pending", "confirmed", "waiting", "in_service"];

export async function bookings(ctx) {
  let tab = "upcoming";
  const draw = () => {
    const user = currentUser();
    const list = user ? get().orders.filter((o) => o.customerId === user.id) : [];
    const rows = list.filter((o) => tab === "upcoming" ? UP.includes(o.status) : !UP.includes(o.status));
    rows.sort((a, b) => tab === "upcoming" ? new Date(a.scheduledAt) - new Date(b.scheduledAt) : new Date(b.scheduledAt) - new Date(a.scheduledAt));
    const db = get();
    ctx.root.innerHTML = screen(topbar({ title: tx("bookings.title") }), `<div class="pad">
      <div class="tabs"><button class="${tab === "upcoming" ? "on" : ""}" data-act="tab" data-tab="upcoming">${tx("bookings.upcoming")}</button><button class="${tab === "history" ? "on" : ""}" data-act="tab" data-tab="history">${tx("bookings.history")}</button></div>
      <div class="stack" style="margin-top:12px">${rows.length ? rows.map((o) => {
        const branch = db.branches.find((b) => b.id === o.branchId);
        const primary = o.items.find((i) => i.type === "primary") || o.items[0];
        return `<button class="card pad" data-go="#/booking/${o.id}" style="text-align:start"><div class="between"><b>${esc(branch ? L(branch.name) : "")}</b>${badge(o.status)}</div><div class="small">${esc(primary ? L(primary.name) : "")}</div><div class="between tiny"><span class="num">${esc(formatDate(o.scheduledAt))} · ${esc(formatTime(o.scheduledAt))}</span><b class="num">${esc(money(o.total))}</b></div><div class="small muted num">${esc(o.number)}</div></button>`;
      }).join("") : emptyBlock("empty.bookings", "", `<button class="btn" data-go="#/home">${tx("empty.bookCta")}</button>`)}</div>
    </div>`);
    ctx.icons();
  };
  ctx.root.innerHTML = skeleton(3);
  try { await read(() => true); } catch { ctx.root.innerHTML = screen(topbar({ title: tx("bookings.title") }), errorBlock()); bus.act = () => ctx.render(); return; }
  draw();
  bus.act = (el) => { if (el.dataset.act === "tab") { tab = el.dataset.tab; draw(); } };
}

export async function bookingDetail(ctx) {
  const draw = () => {
    const db = get();
    const o = db.orders.find((x) => x.id === ctx.params.orderId);
    const user = currentUser();
    if (!o || !user || o.customerId !== user.id) { ctx.root.innerHTML = screen(topbar({ title: "", back: "#/bookings" }), emptyBlock("empty.bookings")); return; }
    const branch = db.branches.find((b) => b.id === o.branchId);
    const car = db.vehicles.find((v) => v.id === o.vehicleId);
    const review = db.reviews.find((r) => r.orderId === o.id);
    const complaint = db.complaints.find((c) => c.orderId === o.id && c.customerId === user.id);
    const started = o.timeline.find((t) => t.status === "in_service");
    const eta = started ? new Date(new Date(started.at).getTime() + o.durationMin * 60000) : null;
    const progress = started && o.status === "in_service" ? Math.min(1, (now() - new Date(started.at)) / (o.durationMin * 60000)) : 0;
    ctx.root.innerHTML = screen(topbar({ title: tx("book.details"), back: "#/bookings" }), `<div class="pad stack">
      <div class="between"><b class="num">${esc(o.number)}</b>${badge(o.status)}</div>
      ${o.status === "no_show" ? `<div class="banner">${tx("noShow.banner")}</div>` : ""}
      ${o.status === "in_service" ? `<div class="card pad row"><svg class="ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" fill="none" stroke="var(--c-line)" stroke-width="4"/><circle cx="18" cy="18" r="15" fill="none" stroke="var(--c-accent-500)" stroke-width="4" stroke-dasharray="${(progress * 94).toFixed(1)} 94" stroke-linecap="round"/></svg><div>${esc(t("book.finishEta", { time: eta ? formatTime(eta) : "" }))}</div></div>` : ""}
      ${o.status === "pending" ? `<div class="card pad center"><p>${tx("book.qrWait")}</p></div>` : ""}
      ${["confirmed", "waiting", "in_service"].includes(o.status) ? `<button class="card pad" data-act="qr" style="text-align:center"><div class="qr-box"><canvas id="qrc" width="180" height="180"></canvas></div><div class="small muted">${tx("book.code")}</div><div class="code-lg num">${esc(o.code)}</div><div class="small">${tx("book.showQr")}</div></button>` : ""}
      <h3>${tx("book.timeline")}</h3>
      <div class="timeline">${o.timeline.map((ev) => `<div class="tl"><i></i><div><b>${ev.status === "rescheduled" ? tx("reschedule.done") : tx("status." + ev.status)}</b><div class="small muted num">${esc(formatDate(ev.at))} · ${esc(formatTime(ev.at))}</div></div></div>`).join("")}</div>
      <p>${esc(branch ? L(branch.name) : "")}</p>
      <p class="muted">${esc(branch ? L(branch.address) : "")}</p>
      <div class="row"><button class="btn ghost grow" data-act="nav">${tx("book.navigate")}</button><button class="btn ghost grow" data-act="call">${tx("book.contact")}</button></div>
      ${car ? `<div>${esc(car.make)} ${esc(car.model)} · ${esc(car.plate)}</div>` : `<div class="num">${esc(o.plate)}</div>`}
      ${o.items.map((i) => `<div class="between"><span>${esc(L(i.name))}</span><b class="num">${esc(money(i.price))}</b></div>`).join("")}
      <div class="between"><span>${esc(formatDate(o.scheduledAt))} · ${esc(formatTime(o.scheduledAt))}</span><span>${esc(minutesLabel(o.durationMin))}</span></div>
      <div class="between"><b>${tx("book.total")}</b><b class="num">${esc(money(o.total))}</b></div>
      <div class="between"><span>${tx("book.payStatus")}</span>${payBadge(o.paymentStatus)}</div>
      ${complaint ? `<div class="card pad"><b>${tx("report.status")}</b> ${tx("st." + complaint.status)} · ${esc(complaint.ticket || complaint.id)}</div>` : ""}
      <div class="stack">
        ${UP.includes(o.status) && ["pending", "confirmed"].includes(o.status) ? `<button class="btn ghost" data-act="cancel">${tx("book.cancel")}</button>` : ""}
        ${canReschedule(o, branch, now()) ? `<button class="btn ghost" data-go="#/booking/${o.id}/reschedule">${tx("book.reschedule")}</button>` : ""}
        ${o.status === "completed" && !review ? `<button class="btn" data-go="#/booking/${o.id}/review">${tx("review.title")}</button>` : ""}
        ${review ? `<button class="btn ghost" data-go="#/wash/${o.branchId}/reviews">${tx("review.view")}</button>` : ""}
        ${["completed", "cancelled", "no_show"].includes(o.status) ? `<button class="btn ghost" data-act="again">${tx("book.again")}</button>` : ""}
        ${["completed", "cancelled", "no_show"].includes(o.status) ? `<button class="btn ghost" data-go="#/booking/${o.id}/report">${tx("report.title")}</button>` : ""}
      </div>
    </div>`);
    ctx.icons();
    const canvas = ctx.root.querySelector("#qrc");
    if (canvas && window.QRCode) {
      window.QRCode.toCanvas(canvas, `carzen://checkin/${o.number}/${o.code}`, { width: 180, margin: 1 });
    }
  };
  ctx.root.innerHTML = skeleton(4);
  try { await read(() => true); } catch { ctx.root.innerHTML = errorBlock(); bus.act = () => ctx.render(); return; }
  if (!ctx.alive()) return;
  draw();
  bus.act = async (el) => {
    const o = get().orders.find((x) => x.id === ctx.params.orderId);
    const branch = get().branches.find((b) => b.id === o?.branchId);
    if (el.dataset.act === "nav") toast(t("toast.maps"));
    if (el.dataset.act === "call") toast(t("toast.call"));
    if (el.dataset.act === "qr") {
      const layer = document.createElement("div");
      layer.className = "gallery";
      layer.innerHTML = `<button class="icon-btn" data-g="x">${icon("x")}</button><canvas id="qrc2"></canvas><div class="code-lg num">${esc(o.code)}</div>`;
      layer.style.background = "#fff";
      layer.style.color = "#0b1b33";
      document.querySelector(".device-inner").appendChild(layer);
      window.QRCode?.toCanvas(layer.querySelector("#qrc2"), `carzen://checkin/${o.number}/${o.code}`, { width: 260, margin: 1 });
      layer.onclick = () => layer.remove();
    }
    if (el.dataset.act === "cancel") {
      const late = now().getTime() > new Date(o.scheduledAt).getTime() - branch.settings.freeCancelMin * 60000;
      const picked = await sheet(`<h3>${tx("cancel.title")}</h3><p class="small">${esc(t("book.policy", { min: branch.settings.freeCancelMin }))}</p>
        ${late ? `<div class="banner">${tx("cancel.late")}</div><p>${tx("cancel.lateBody")}</p>` : ""}
        ${["r1", "r2", "r3", "r4"].map((r) => `<button class="btn ghost block" data-pick="${r}" style="margin-top:8px">${tx("cancel." + r)}</button>`).join("")}`);
      if (!picked?.value) return;
      try {
        await cancelBooking(o.id, currentUser().id, picked.value);
        toast(t("toast.cancelled"));
        draw();
      } catch (e) { toast(e.code === "offline" ? t("offline.action") : t("error.body")); }
    }
    if (el.dataset.act === "again") {
      const primary = o.items.find((i) => i.type === "primary");
      saveDraft({
        branchId: o.branchId,
        serviceId: primary?.serviceId,
        addonIds: o.items.filter((i) => i.type === "addon").map((i) => i.serviceId),
        vehicleId: o.vehicleId,
        slot: "",
        note: "",
        again: true,
      });
      location.hash = `#/book/${o.branchId}/summary`;
    }
  };
}

export async function reschedule(ctx) {
  const o = get().orders.find((x) => x.id === ctx.params.orderId);
  const branch = get().branches.find((b) => b.id === o?.branchId);
  if (!o || !canReschedule(o, branch, now())) {
    ctx.root.innerHTML = screen(topbar({ title: tx("reschedule.title"), back: `#/booking/${ctx.params.orderId}` }), `<div class="pad"><p>${tx("reschedule.blocked")}</p></div>`);
    return;
  }
  let slot = "";
  const paint = () => {
    const board = slotBoard(branch, o.durationMin, slot, (value) => { slot = value; paint(); });
    ctx.root.innerHTML = screen(topbar({ title: tx("reschedule.title"), back: `#/booking/${o.id}` }), `<div class="pad" id="slotroot">${board.html}</div>`, `<button class="btn block" data-act="save" ${slot ? "" : "disabled"}>${tx("reschedule.title")}</button>`);
    board.bind(ctx.root.querySelector("#slotroot"), paint);
  };
  paint();
  bus.act = async (el) => {
    if (el.dataset.act !== "save" || !slot) return;
    try {
      await rescheduleBooking(o.id, currentUser().id, slot);
      toast(t("reschedule.done"));
      location.hash = `#/booking/${o.id}`;
    } catch (e) {
      toast(e.code === "slot_taken" ? t("book.slotTaken") : t("error.body"));
    }
  };
}

export async function review(ctx) {
  const o = get().orders.find((x) => x.id === ctx.params.orderId);
  const user = currentUser();
  if (!user) { rememberReturn(location.hash); location.hash = "#/login"; return; }
  if (!o || o.customerId !== user.id || o.status !== "completed") { location.hash = "#/bookings"; return; }
  if (get().reviews.some((r) => r.orderId === o.id)) { location.hash = `#/booking/${o.id}`; return; }
  let stars = 0;
  let tags = [];
  let comment = "";
  const tagKeys = ["clean", "fast", "staff", "value"];
  const draw = () => {
    ctx.root.innerHTML = screen(topbar({ title: tx("review.title"), back: `#/booking/${o.id}` }), `<div class="pad stack">
      <div class="stars">${[1, 2, 3, 4, 5].map((n) => `<button class="${n <= stars ? "on" : ""}" data-act="star" data-n="${n}">★</button>`).join("")}</div>
      <span class="err" id="star-err"></span>
      <div class="wrap">${tagKeys.map((k) => `<button class="chip ${tags.includes(k) ? "on" : "flat"}" data-act="tag" data-k="${k}">${tx("tag." + k)}</button>`).join("")}</div>
      <textarea class="textarea" maxlength="500" data-bind="comment" placeholder="${tx("review.comment")}">${esc(comment)}</textarea>
      <button class="btn block" data-act="send">${tx("review.send")}</button>
    </div>`);
  };
  draw();
  bus.input = (el) => { if (el.dataset.bind === "comment") comment = el.value.slice(0, 500); };
  bus.act = async (el) => {
    if (el.dataset.act === "star") { stars = Number(el.dataset.n); draw(); }
    if (el.dataset.act === "tag") { tags = tags.includes(el.dataset.k) ? tags.filter((x) => x !== el.dataset.k) : [...tags, el.dataset.k]; draw(); }
    if (el.dataset.act === "send") {
      if (!stars) { ctx.root.querySelector("#star-err").textContent = t("review.need"); return; }
      try {
        await submitReview({ orderId: o.id, customerId: user.id, stars, tags, comment });
        toast(t("review.done"));
        location.hash = `#/wash/${o.branchId}/reviews`;
      } catch (e) { toast(e.code === "offline" ? t("offline.action") : t("error.body")); }
    }
  };
}

export async function report(ctx) {
  const o = get().orders.find((x) => x.id === ctx.params.orderId);
  const user = currentUser();
  if (!user) { rememberReturn(location.hash); location.hash = "#/login"; return; }
  if (!o || !["completed", "cancelled", "no_show"].includes(o.status)) { location.hash = "#/bookings"; return; }
  let category = "quality";
  let description = "";
  let error = "";
  const cats = ["quality", "pricing", "booking", "behavior", "refund", "other"];
  const draw = () => {
    ctx.root.innerHTML = screen(topbar({ title: tx("report.title"), back: `#/booking/${o.id}` }), `<div class="pad stack">
      <div class="wrap">${cats.map((c) => `<button class="chip ${category === c ? "on" : "flat"}" data-act="cat" data-c="${c}">${tx("cat." + c)}</button>`).join("")}</div>
      <textarea class="textarea" data-bind="description" placeholder="${tx("report.desc")}">${esc(description)}</textarea>
      <span class="err">${esc(error)}</span>
      <button class="btn block" data-act="send" ${isOffline() ? "disabled" : ""}>${tx("report.send")}</button>
    </div>`);
  };
  draw();
  bus.input = (el) => { if (el.dataset.bind === "description") description = el.value; };
  bus.act = async (el) => {
    if (el.dataset.act === "cat") { category = el.dataset.c; draw(); }
    if (el.dataset.act === "send") {
      if (description.trim().length < 20) { error = t("report.min"); draw(); return; }
      try {
        const row = await submitComplaint({ orderId: o.id, customerId: user.id, category, description });
        toast(t("report.ticket", { n: row.ticket }));
        location.hash = `#/booking/${o.id}`;
      } catch (e) { toast(e.code === "offline" ? t("offline.action") : t("error.body")); }
    }
  };
}

void confirmDialog;
void icon;
void sessionId;
