import { esc, icon, paintIcons } from "../../shared/js/dom.js";
import { t } from "../../shared/js/i18n.js";
import { money, formatTime, distanceLabel, minutesLabel } from "../../shared/js/format.js";
import { coverUri } from "../../shared/js/covers.js";
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
    <img alt="" src="${coverUri("empty", 2)}" style="inline-size:120px;border-radius:24px" />
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
    <div class="cover" style="background-image:url('${coverUri(b.id, 0)}')">
      ${b.featured ? `<span class="chip sponsored">${tx("sponsored")}</span>` : ""}
      <button class="heart ${fav}" data-act="fav" data-id="${esc(b.id)}" aria-label="${tx("fav")}">${icon("heart")}</button>
    </div>
    <div class="wash-body">
      <div class="between"><strong class="clip">${esc(opts.name || "")}</strong><span class="num tiny">★ ${row.rating.toFixed(1)}</span></div>
      <div class="muted small row">${esc(distanceLabel(row.km))} · ${row.count} · <span class="pill ${row.open ? "open" : "shut"}">${tx(row.open ? "open" : "closed")}</span></div>
      <div class="between tiny"><span class="muted">${esc(t("nextSlot", { time: when }))}</span><b class="num">${price == null ? "" : esc(money(price))}</b></div>
    </div>
  </article>`;
}

export function minsAway(iso, nowDate) {
  return Math.max(0, Math.round((new Date(iso).getTime() - nowDate.getTime()) / 60000));
}

export { money, formatTime, distanceLabel, minutesLabel, icon, esc, t };
