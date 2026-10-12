import { esc, icon, paintIcons } from "../../shared/js/dom.js";
import { t } from "../../shared/js/i18n.js";
import { money, formatTime, distanceLabel, minutesLabel } from "../../shared/js/format.js";
import { branchBg } from "./photos.js";
import { isOffline } from "../../shared/js/net.js";

export const bus = { act: async () => {}, input: () => {} };

export function tx(key, vars) { return esc(t(key, vars)); }

export function icons() { paintIcons(document.getElementById("app")); }

export function badge(status) {
  return `<span class="badge" data-status="${esc(status)}"><i class="dot"></i>${tx("status." + status)}</span>`;
}
export function payBadge(status) {
  return `<span class="badge" data-pay="${esc(status)}"><i class="dot"></i>${tx("pay." + status)}</span>`;
}

export function offlineBanner() {
  return isOffline() ? `<div class="banner">${tx("offline.banner")}</div>` : "";
}

export function skeleton(lines = 4) {
  return `<div class="pad stack">${Array.from({ length: lines }, () => `<div class="sk sk-card"></div>`).join("")}</div>`;
}

export function errorBlock() {
  return `<div class="error-box">
    ${icon("wifi-off")}
    <h3>${tx("error.title")}</h3>
    <p>${tx("error.body")}</p>
    <button class="btn" data-act="retry">${tx("error.retry")}</button>
  </div>`;
}

export function emptyBlock(titleKey, body, cta) {
  return `<div class="empty">
    <div class="empty-art">${icon("sparkles")}</div>
    <h3>${tx(titleKey)}</h3>
    ${body ? `<p>${body}</p>` : ""}
    ${cta || ""}
  </div>`;
}

export function topbar({ title, back, end = "" }) {
  const backBtn = back ? `<button class="icon-btn" data-go="${esc(back)}" aria-label="${tx("common.back")}"><span class="dir-icon">${icon("chevron-left")}</span></button>` : `<span></span>`;
  return `<header class="topbar">${backBtn}<h1>${title}</h1><div class="end">${end}</div></header>`;
}

export function screen(head, body, dock = "") {
  return `<div class="screen">${offlineBanner()}${head}<div class="screen-body" id="body">${body}</div>${dock ? `<footer class="dock">${dock}</footer>` : ""}</div>`;
}

export function washCard(row, opts = {}) {
  const b = row.branch;
  const price = opts.price ?? row.from;
  const when = row.next ? formatTime(row.next.start) : "—";
  const fav = opts.fav ? "on" : "";
  return `<article class="wash-card card" data-go="#/wash/${esc(b.id)}">
    <div class="cover" style="background-image:${branchBg(b.id, 0, 600)}">
      <span class="shade"></span>
      ${b.featured ? `<span class="chip sponsored">${tx("sponsored")}</span>` : ""}
      <button class="heart ${fav}" data-act="fav" data-id="${esc(b.id)}" aria-label="${tx("fav")}">${icon("heart")}</button>
      <span class="rate-pill num"><span class="star">★</span>${row.rating.toFixed(1)}<span class="cnt">(${row.count})</span></span>
    </div>
    <div class="wash-body">
      <strong class="clip">${esc(opts.name || "")}</strong>
      <div class="muted small row meta">${icon("map-pin")}${esc(distanceLabel(row.km))} · <span class="pill ${row.open ? "open" : "shut"}">${tx(row.open ? "open" : "closed")}</span></div>
      <div class="between foot"><span class="next-chip">${icon("clock")}${esc(when)}</span><b class="num price">${price == null ? "" : esc(money(price))}</b></div>
    </div>
  </article>`;
}

export function minsAway(iso, nowDate) {
  return Math.max(0, Math.round((new Date(iso).getTime() - nowDate.getTime()) / 60000));
}

export { money, formatTime, distanceLabel, minutesLabel, icon, esc, t };
