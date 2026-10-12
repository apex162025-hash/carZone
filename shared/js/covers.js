const HUES = {
  br_nasr: 214,
  br_helio: 174,
  br_nile_maadi: 199,
  br_nile_zam: 262,
  br_palm_nc: 152,
  br_palm_oct: 28,
  br_lotus_moh: 330,
  br_corniche_zam: 188,
  br_pyramid_zay: 18,
  br_pyramid_oct: 42,
  br_oasis_nasr: 168,
  br_golden_hel: 46,
  br_dune_maadi: 4,
  br_gate_nc: 222,
};

export function coverSvg(branchId, variant = 0) {
  const hue = (HUES[branchId] ?? 214) + variant * 18;
  const initials = String(branchId).replace("br_", "").slice(0, 2).toUpperCase();
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480" role="img">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 85% 46%)"/>
      <stop offset="1" stop-color="hsl(${(hue + 40) % 360} 70% 42%)"/>
    </linearGradient>
  </defs>
  <rect width="800" height="480" fill="url(#g)"/>
  <ellipse cx="140" cy="390" rx="180" ry="70" fill="rgba(255,255,255,.16)"/>
  <ellipse cx="620" cy="120" rx="160" ry="80" fill="rgba(255,255,255,.12)"/>
  <path d="M40 300c80-40 120-20 180-50s140-20 200 10 160 20 240-30" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="18" stroke-linecap="round"/>
  <path d="M80 340c70-30 130-10 190-36s120-8 190 16 150 16 210-24" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="10" stroke-linecap="round"/>
  <text x="64" y="120" fill="rgba(255,255,255,.92)" font-family="Plus Jakarta Sans, sans-serif" font-size="72" font-weight="800">${initials}</text>
</svg>`;
}

export function coverUri(branchId, variant = 0) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(coverSvg(branchId, variant))}`;
}

export function carSvg(hex = "#F4F7FB") {
  const stroke = "#0B1B33";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 100">
    <path d="M28 62 52 40c6-8 16-12 28-12h62c14 0 24 6 32 16l18 18h20c8 0 12 6 12 12v10H20c0-8 4-14 8-22z" fill="${hex}" stroke="${stroke}" stroke-width="3"/>
    <path d="M78 34h46l10 16H70z" fill="#d7e6f5" stroke="${stroke}" stroke-width="3"/>
    <circle cx="72" cy="74" r="12" fill="#0B1B33"/>
    <circle cx="168" cy="74" r="12" fill="#0B1B33"/>
    <circle cx="72" cy="74" r="5" fill="#cbd5e1"/>
    <circle cx="168" cy="74" r="5" fill="#cbd5e1"/>
  </svg>`;
}

export function carUri(hex) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(carSvg(hex))}`;
}

export function logoSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="cz-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1fa2e0"/>
      <stop offset=".55" stop-color="#0b6ba8"/>
      <stop offset="1" stop-color="#063e66"/>
    </linearGradient>
    <linearGradient id="cz-drop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#e6f5fc"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="18" fill="url(#cz-bg)"/>
  <path d="M32 10.5S17 27.6 17 38.6a15 15 0 0 0 30 0C47 27.6 32 10.5 32 10.5z" fill="url(#cz-drop)"/>
  <path d="M22.6 45v-4.4c0-.8.2-1.5.7-2.1l2.5-3.8c.7-1 1.7-1.5 2.8-1.5h6.8c1.1 0 2.1.5 2.8 1.5l2.5 3.8c.5.6.7 1.3.7 2.1V45c0 .6-.5 1.1-1.1 1.1h-1.8c-.6 0-1.1-.5-1.1-1.1v-1H27.6v1c0 .6-.5 1.1-1.1 1.1h-1.8c-.6 0-1.1-.5-1.1-1.1z" fill="#0b6ba8"/>
  <path d="M27 38.6l1.7-2.7c.3-.5.8-.7 1.3-.7h4c.5 0 1 .2 1.3.7l1.7 2.7z" fill="#e6f5fc"/>
  <circle cx="26.9" cy="41.5" r="1.25" fill="#7fe3ff"/>
  <circle cx="37.1" cy="41.5" r="1.25" fill="#7fe3ff"/>
  <path d="M48 9.5l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill="#F8E7C9"/>
  <path d="M14.5 17l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z" fill="#7fe3ff"/>
</svg>`;
}
