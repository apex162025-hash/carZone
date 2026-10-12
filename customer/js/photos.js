// Real photography (Unsplash License — free for commercial use, no attribution required).
// Served from the Unsplash CDN; every use keeps the generated SVG cover as a fallback layer.
import { coverUri } from "../../shared/js/covers.js";

const ID = {
  foamBay: "photo-1605164598708-25701594473e",
  mistMustang: "photo-1575844611398-2a68400b437c",
  foamBmw: "photo-1633014041037-f5446fb4ce99",
  interiorWipe: "photo-1732357624591-f2137085659b",
  foamHatch: "photo-1762933855598-273a51b47649",
  autoWash: "photo-1762933868999-a7adb3f60287",
  detailBrush: "photo-1771491237218-cbd4a707497e",
  station: "photo-1762506168937-fb21f3fcad84",
  handWash: "photo-1607860108855-64acf2078ed9",
  pressureBay: "photo-1769641156615-5d561513b3fa",
  rimSpray: "photo-1608506375591-b90e1f955e4b",
  rearFoam: "photo-1520340356584-f9917d1eea6f",
  twoCars: "photo-1761312834165-c27d037b3a6b",
  grilleFoam: "photo-1761312834150-4beefff097a7",
  sponge: "photo-1694678505383-676d78ea3b96",
  wheelBrush: "photo-1565689876697-e467b6c54da2",
  blueTail: "photo-1704796141009-5ed5cc8ca5f3",
  tireBrush: "photo-1708805282683-50a060eba80f",
};

export function photoUrl(key, w = 800, h = 0) {
  const id = ID[key] || key;
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&q=70&w=${w}${h ? `&h=${h}` : ""}`;
}

export const SHOTS = {
  splash: "foamBay",
  hero: "mistMustang",
  category: { exterior: "foamBmw", interior: "interiorWipe", full: "foamHatch", deep: "detailBrush" },
  onboarding: ["station", "handWash", "pressureBay"],
  offers: ["twoCars", "blueTail", "grilleFoam"],
};

const POOL = ["rimSpray", "rearFoam", "twoCars", "tireBrush", "grilleFoam", "sponge", "wheelBrush", "pressureBay", "foamBay", "blueTail", "handWash", "foamHatch", "mistMustang", "foamBmw", "station", "autoWash"];

// Seeded branches get distinct covers; anything else falls back to a hash.
const BRANCHES = ["br_nasr", "br_helio", "br_nile_maadi", "br_nile_zam", "br_palm_nc", "br_palm_oct", "br_lotus_moh", "br_corniche_zam", "br_pyramid_zay", "br_pyramid_oct", "br_oasis_nasr", "br_golden_hel", "br_dune_maadi", "br_gate_nc"];

function seed(text) {
  const known = BRANCHES.indexOf(text);
  if (known >= 0) return known;
  let h = 0;
  for (const ch of String(text)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

// Branch photo `variant` (0 = cover); stable per branch, different between neighbours.
export function branchPhoto(branchId, variant = 0, w = 800) {
  return photoUrl(POOL[(seed(branchId) + variant * 5) % POOL.length], w);
}

// CSS background value: real photo on top, generated cover underneath if the photo can't load.
export function branchBg(branchId, variant = 0, w = 800) {
  return `url('${branchPhoto(branchId, variant, w)}'), url('${coverUri(branchId, variant)}')`;
}

export function bg(key, w = 800, h = 0) {
  return `url('${photoUrl(key, w, h)}')`;
}
