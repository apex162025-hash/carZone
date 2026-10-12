// Inline, CSS-animated artwork for the customer app (splash, onboarding, home).

export function logoMark(id = "lm") {
  return `<svg class="logo-mark" viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1fa2e0"/><stop offset=".55" stop-color="#0b6ba8"/><stop offset="1" stop-color="#063e66"/></linearGradient>
      <linearGradient id="${id}-dr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#e6f5fc"/></linearGradient>
    </defs>
    <rect width="64" height="64" rx="18" fill="url(#${id}-bg)"/>
    <path class="lm-drop" d="M32 10.5S17 27.6 17 38.6a15 15 0 0 0 30 0C47 27.6 32 10.5 32 10.5z" fill="url(#${id}-dr)"/>
    <path d="M22.6 45v-4.4c0-.8.2-1.5.7-2.1l2.5-3.8c.7-1 1.7-1.5 2.8-1.5h6.8c1.1 0 2.1.5 2.8 1.5l2.5 3.8c.5.6.7 1.3.7 2.1V45c0 .6-.5 1.1-1.1 1.1h-1.8c-.6 0-1.1-.5-1.1-1.1v-1H27.6v1c0 .6-.5 1.1-1.1 1.1h-1.8c-.6 0-1.1-.5-1.1-1.1z" fill="#0b6ba8"/>
    <path d="M27 38.6l1.7-2.7c.3-.5.8-.7 1.3-.7h4c.5 0 1 .2 1.3.7l1.7 2.7z" fill="#e6f5fc"/>
    <circle cx="26.9" cy="41.5" r="1.25" fill="#7fe3ff"/><circle cx="37.1" cy="41.5" r="1.25" fill="#7fe3ff"/>
    <path class="lm-spark" d="M48 9.5l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill="#F8E7C9"/>
    <path class="lm-spark s2" d="M14.5 17l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z" fill="#7fe3ff"/>
  </svg>`;
}

const sparkle = (x, y, s, cls = "") => `<g transform="translate(${x} ${y}) scale(${s})"><path class="spark ${cls}" d="M0-10l2.6 7.4L10 0l-7.4 2.6L0 10l-2.6-7.4L-10 0l7.4-2.6z"/></g>`;

function car(id) {
  return `<g class="sp-car">
    <ellipse cx="92" cy="80" rx="88" ry="7" fill="rgba(0,0,0,.28)"/>
    <path d="M10 58c0-10 6-14 16-16l26-4 22-20c6-5 14-8 24-8h30c10 0 18 4 24 12l12 16c10 2 16 8 16 18v6c0 4-3 6-7 6H8c-3 0-5-2-5-5v-3c0-1 3-2 7-2z" fill="url(#${id}-body)"/>
    <path d="M60 38l18-16c4-4 10-6 16-6h14v22zM114 16h14c7 0 12 3 16 8l10 14h-40z" fill="url(#${id}-glass)"/>
    <path d="M70 30l10-9M120 30l8-10" stroke="rgba(255,255,255,.55)" stroke-width="3" stroke-linecap="round"/>
    <path d="M18 52h150" stroke="rgba(11,107,168,.18)" stroke-width="2" stroke-linecap="round"/>
    <rect x="170" y="45" width="9" height="5" rx="2.5" fill="#fff6c2"/>
    <rect x="4" y="50" width="7" height="4" rx="2" fill="#ff8a8a"/>
    <g transform="translate(42 68)"><g class="wheel"><circle r="14" fill="#0a2233"/><circle r="7" fill="#c4e7f8"/><path d="M0-7v14M-7 0h14" stroke="#0b6ba8" stroke-width="2"/></g></g>
    <g transform="translate(142 68)"><g class="wheel"><circle r="14" fill="#0a2233"/><circle r="7" fill="#c4e7f8"/><path d="M0-7v14M-7 0h14" stroke="#0b6ba8" stroke-width="2"/></g></g>
    <g class="foam">
      <circle cx="84" cy="14" r="9"/><circle cx="98" cy="8" r="11"/><circle cx="114" cy="11" r="9"/><circle cx="128" cy="15" r="7"/>
      <circle cx="40" cy="44" r="7"/><circle cx="52" cy="40" r="9"/><circle cx="160" cy="40" r="8"/>
    </g>
    ${sparkle(150, 30, 0.9, "d1")}${sparkle(30, 34, 0.6, "d2")}${sparkle(104, 4, 0.7, "d3")}
  </g>`;
}

export function splashScene() {
  const id = "sp";
  const jets = [120, 150, 180, 210, 240].map((x, i) => `<path class="jet j${i}" d="M${x} 98 L${x + (i - 2) * 5} 178"/>`).join("");
  const bubbles = Array.from({ length: 14 }, (_, i) => {
    const x = 60 + ((i * 53) % 250);
    const r = 3 + (i % 4) * 2;
    return `<circle class="bub" style="--d:${(i * 0.23).toFixed(2)}s;--x:${(i % 2 ? 1 : -1) * (6 + (i % 5) * 3)}px" cx="${x}" cy="${230 - (i % 3) * 14}" r="${r}"/>`;
  }).join("");
  const stripes = Array.from({ length: 16 }, (_, i) => `<rect x="0" y="${i * 18 - 36}" width="24" height="8" transform="skewY(-24)"/>`).join("");
  return `<svg class="sp-scene" viewBox="0 0 360 300" aria-hidden="true">
    <defs>
      <linearGradient id="${id}-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#F8E7C9"/></linearGradient>
      <linearGradient id="${id}-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1689c9"/><stop offset="1" stop-color="#062a45"/></linearGradient>
      <linearGradient id="${id}-brush" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2cc6f2"/><stop offset=".5" stop-color="#8ed0f0"/><stop offset="1" stop-color="#1689c9"/></linearGradient>
      <linearGradient id="${id}-frame" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(230,245,252,.34)"/><stop offset="1" stop-color="rgba(230,245,252,.06)"/></linearGradient>
      <clipPath id="${id}-cl"><rect x="70" y="92" width="24" height="150" rx="12"/></clipPath>
      <clipPath id="${id}-cr"><rect x="266" y="92" width="24" height="150" rx="12"/></clipPath>
    </defs>
    <g class="sp-rings"><circle cx="180" cy="160" r="128"/><circle cx="180" cy="160" r="96"/></g>
    <g class="sp-gantry">
      <path d="M38 252V82c0-22 18-40 40-40h204c22 0 40 18 40 40v170h-24V86c0-11-9-20-20-20H82c-11 0-20 9-20 20v166z" fill="url(#${id}-frame)" stroke="rgba(230,245,252,.45)" stroke-width="1.5"/>
      <rect x="120" y="22" width="120" height="34" rx="17" fill="#F8E7C9"/>
      <path d="M140 32s-6 6.5-6 10.5a6 6 0 0 0 12 0c0-4-6-10.5-6-10.5z" fill="#0b6ba8"/>
      <text x="196" y="44" text-anchor="middle" font-family="Readex Pro, sans-serif" font-size="13" font-weight="800" letter-spacing="2" fill="#0b6ba8">CAR WASH</text>
      <rect x="104" y="84" width="152" height="10" rx="5" fill="#e6f5fc" opacity=".9"/>
      ${[120, 150, 180, 210, 240].map((x) => `<rect x="${x - 3}" y="92" width="6" height="6" rx="2" fill="#8ed0f0"/>`).join("")}
      <rect x="70" y="92" width="24" height="150" rx="12" fill="url(#${id}-brush)"/>
      <rect x="266" y="92" width="24" height="150" rx="12" fill="url(#${id}-brush)"/>
      <g clip-path="url(#${id}-cl)"><g transform="translate(70 0)"><g class="brush-st">${stripes}</g></g></g>
      <g clip-path="url(#${id}-cr)"><g transform="translate(266 0)"><g class="brush-st rev">${stripes}</g></g></g>
    </g>
    <g class="sp-jets">${jets}</g>
    <g transform="translate(88 170)">${car(id)}</g>
    <g class="sp-bubbles">${bubbles}</g>
    <path class="sp-floor" d="M20 258h320" stroke="rgba(230,245,252,.35)" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 10"/>
  </svg>`;
}

export function onbArt(n) {
  if (n === 1) {
    return `<svg class="onb-art a1" viewBox="0 0 320 260" aria-hidden="true">
      <rect class="map-card" x="30" y="20" width="260" height="200" rx="28" fill="#e6f5fc"/>
      <g class="roads" stroke="#c4e7f8" stroke-width="10" stroke-linecap="round" fill="none">
        <path d="M30 90c60 10 90-30 150-20s80 40 110 30"/><path d="M110 20c-10 60 20 110 0 200"/><path d="M30 170c70-20 150 10 260-20"/>
      </g>
      <g class="radar"><circle cx="160" cy="124" r="14"/><circle cx="160" cy="124" r="14" class="r2"/></g>
      <circle cx="160" cy="124" r="9" fill="#2cc6f2" stroke="#fff" stroke-width="4"/>
      ${[[88, 72, 0], [226, 92, 1], [118, 176, 2], [236, 168, 3]].map(([x, y, i]) => `<g transform="translate(${x} ${y})"><g class="pin p${i}"><path d="M0 0c-9-12-14-19-14-25a14 14 0 0 1 28 0c0 6-5 13-14 25z" fill="#0b6ba8"/><circle cy="-25" r="5.5" fill="#e6f5fc"/></g></g>`).join("")}
      <g class="mini-card"><rect x="70" y="196" width="180" height="52" rx="18" fill="#fff"/><rect x="82" y="206" width="32" height="32" rx="10" fill="#0b6ba8"/><path d="M98 213s-6 6.5-6 10.5a6 6 0 0 0 12 0c0-4-6-10.5-6-10.5z" fill="#e6f5fc"/>
        <rect x="124" y="210" width="72" height="8" rx="4" fill="#c4e7f8"/><text x="124" y="236" font-family="Readex Pro, sans-serif" font-size="12" font-weight="800" fill="#0b6ba8">★ 4.8 · 2.1 km</text></g>
    </svg>`;
  }
  if (n === 2) {
    return `<svg class="onb-art a2" viewBox="0 0 320 260" aria-hidden="true">
      <rect class="phone" x="80" y="10" width="160" height="240" rx="30" fill="#062a45"/>
      <rect x="88" y="18" width="144" height="224" rx="24" fill="#e6f5fc"/>
      <rect x="138" y="24" width="44" height="8" rx="4" fill="#062a45"/>
      ${[0, 1, 2].map((i) => `<g class="row r${i}"><rect x="100" y="${46 + i * 46}" width="120" height="38" rx="12" fill="#fff"/><rect x="108" y="${54 + i * 46}" width="22" height="22" rx="7" fill="${i === 0 ? "#0b6ba8" : "#c4e7f8"}"/><rect x="138" y="${58 + i * 46}" width="${60 - i * 10}" height="6" rx="3" fill="#8ed0f0"/><rect x="138" y="${68 + i * 46}" width="36" height="5" rx="2.5" fill="#c4e7f8"/><g class="tick t${i}"><circle cx="206" cy="${65 + i * 46}" r="8" fill="#2cc6f2"/><path d="M202 ${65 + i * 46}l3 3 5-6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></g>`).join("")}
      <g class="cta"><rect x="100" y="190" width="120" height="36" rx="18" fill="#0b6ba8"/><rect x="140" y="205" width="40" height="6" rx="3" fill="#e6f5fc"/></g>
      <circle class="tap" cx="178" cy="208" r="10"/>
      <g class="tag"><rect x="210" y="30" width="86" height="40" rx="14" fill="#F8E7C9"/><text x="253" y="56" text-anchor="middle" font-family="Readex Pro, sans-serif" font-size="15" font-weight="800" fill="#0b6ba8">180 EGP</text></g>
      <g class="tag t2"><rect x="24" y="150" width="70" height="34" rx="12" fill="#2cc6f2"/><text x="59" y="172" text-anchor="middle" font-family="Readex Pro, sans-serif" font-size="13" font-weight="800" fill="#062a45">10:30</text></g>
    </svg>`;
  }
  return `<svg class="onb-art a3" viewBox="0 0 320 260" aria-hidden="true">
    <circle cx="160" cy="126" r="92" fill="rgba(230,245,252,.1)"/>
    <circle cx="160" cy="126" r="74" fill="none" stroke="rgba(230,245,252,.22)" stroke-width="14"/>
    <circle class="prog" cx="160" cy="126" r="74" fill="none" stroke="#7fe3ff" stroke-width="14" stroke-linecap="round" pathLength="100" transform="rotate(-90 160 126)"/>
    <circle cx="160" cy="126" r="54" fill="#e6f5fc"/>
    <g transform="translate(130 108)"><g class="mid-car"><path d="M2 26v-7c0-1.2.4-2.4 1.1-3.4l4-6c1.1-1.6 2.8-2.6 4.6-2.6h24.6c1.8 0 3.5 1 4.6 2.6l4 6c.7 1 1.1 2.2 1.1 3.4v7c0 1-.8 1.8-1.8 1.8h-3c-1 0-1.8-.8-1.8-1.8v-1.6H8.6V26c0 1-.8 1.8-1.8 1.8h-3C2.8 27.8 2 27 2 26z" fill="#0b6ba8"/><path d="M10 16l3-4.6c.5-.8 1.4-1.2 2.2-1.2h17.6c.9 0 1.7.4 2.2 1.2l3 4.6z" fill="#e6f5fc"/><circle cx="10" cy="20.5" r="2" fill="#7fe3ff"/><circle cx="38" cy="20.5" r="2" fill="#7fe3ff"/></g></g>
    <text x="160" y="160" text-anchor="middle" font-family="Readex Pro, sans-serif" font-size="14" font-weight="800" fill="#0b6ba8" class="pct">75%</text>
    <g class="chip-o c0"><rect x="18" y="36" width="74" height="30" rx="15" fill="#fff"/><circle cx="34" cy="51" r="6" fill="#2cc6f2"/><rect x="46" y="48" width="36" height="6" rx="3" fill="#c4e7f8"/></g>
    <g class="chip-o c1"><rect x="228" y="70" width="80" height="30" rx="15" fill="#fff"/><circle cx="244" cy="85" r="6" fill="#1689c9"/><rect x="256" y="82" width="40" height="6" rx="3" fill="#c4e7f8"/></g>
    <g class="qr"><rect x="222" y="160" width="74" height="74" rx="18" fill="#fff"/>${[0, 1, 2, 3, 4].map((r) => [0, 1, 2, 3, 4].map((c) => ((r * 7 + c * 3) % 4 === 0 || (r + c) % 3 === 0) ? `<rect x="${234 + c * 10}" y="${172 + r * 10}" width="8" height="8" rx="2" fill="#0b6ba8"/>` : "").join("")).join("")}</g>
    ${sparkle(64, 196, 0.9, "d1")}${sparkle(290, 30, 0.7, "d2")}
  </svg>`;
}

export function heroCar() {
  return `<svg class="hero-car" viewBox="0 0 190 96" aria-hidden="true">
    <defs><linearGradient id="hc-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#F8E7C9"/></linearGradient>
    <linearGradient id="hc-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1689c9"/><stop offset="1" stop-color="#062a45"/></linearGradient></defs>
    <g transform="translate(2 8)">${car("hc").replace('class="sp-car"', 'class="hc-car"')}</g>
  </svg>`;
}
