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
    <rect width="64" height="64" rx="18" fill="#1463FF"/>
    <path d="M18 38c6-14 10-18 14-18s8 4 14 18" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
    <circle cx="32" cy="26" r="4" fill="#12C8B6"/>
  </svg>`;
}
