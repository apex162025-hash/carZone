import { get } from "../db.js";
import { now } from "../db.js";
import { read } from "../net.js";
import { haversineKm, sameDay } from "../format.js";
import { isOpenAt, hasSlotWithin, nextSlots, slotStarts, isBookableBranch } from "./availability.js";
import { minPrimary } from "./pricing.js";

export function liveRating(db, branchId) {
  const rows = db.reviews.filter((r) => r.branchId === branchId && r.status === "visible");
  const count = rows.length;
  const rating = count ? Math.round((rows.reduce((s, r) => s + r.stars, 0) / count) * 10) / 10 : 0;
  const dist = [1, 2, 3, 4, 5].map((star) => rows.filter((r) => r.stars === star).length);
  return { rating, count, dist, rows };
}

export function decorateBranch(db, branch, loc, when = now()) {
  const primary = db.services.filter((s) => s.branchId === branch.id && s.type === "primary" && s.active);
  const shortest = primary.reduce((m, s) => (s.durationMin < m.durationMin ? s : m), primary[0]);
  const cheapest = minPrimary(db, branch.id);
  const next = shortest ? nextSlots(db, branch, shortest.durationMin, 1, when)[0] : null;
  const soon = shortest ? hasSlotWithin(db, branch, shortest.durationMin, 90, when) : false;
  const stats = liveRating(db, branch.id);
  const km = loc ? haversineKm(loc.lat, loc.lng, branch.lat, branch.lng) : null;
  return {
    branch, km, open: isOpenAt(branch, when), next, soon,
    from: cheapest?.price ?? null,
    durationMin: shortest?.durationMin ?? 30,
    ...stats,
    bookable: isBookableBranch(db, branch),
  };
}

export function listBranches(db, loc, when = now()) {
  return db.branches.map((b) => decorateBranch(db, b, loc, when)).filter((row) => row.bookable || row.branch.businessId === "biz_dune");
}

export async function loadDiscovery(loc) {
  return read(() => {
    const db = get();
    return {
      rows: listBranches(db, loc, now()),
      offers: db.offers.filter((o) => o.status === "active" && new Date(o.endAt) >= now()),
      categories: db.catalogs.serviceCategories,
    };
  });
}

export function applyFilters(rows, filters, db, when = now()) {
  let out = rows.slice();
  if (filters.distance) out = out.filter((r) => r.km != null && r.km <= filters.distance);
  if (filters.rating) out = out.filter((r) => r.rating >= filters.rating);
  if (filters.priceMin != null) out = out.filter((r) => r.from >= filters.priceMin);
  if (filters.priceMax != null) out = out.filter((r) => r.from <= filters.priceMax);
  if (filters.openNow) out = out.filter((r) => r.open);
  if (filters.availableToday) {
    out = out.filter((r) => slotStarts(db, r.branch, when, r.durationMin, when).length > 0);
  }
  if (filters.category) {
    out = out.filter((r) => db.services.some((s) => s.branchId === r.branch.id && s.category === filters.category && s.type === "primary" && s.active));
  }
  if (filters.washNow) out = out.filter((r) => r.open && r.soon);
  if (filters.areaId) out = out.filter((r) => r.branch.area === filters.areaId);
  if (filters.q) {
    const q = filters.q.trim().toLowerCase();
    out = out.filter((r) => `${r.branch.name.ar} ${r.branch.name.en} ${r.branch.address.ar} ${r.branch.address.en}`.toLowerCase().includes(q));
  }
  const sort = filters.sort || (filters.washNow ? "earliest" : "nearest");
  out.sort((a, b) => {
    if (sort === "rated") return b.rating - a.rating || (a.km ?? 0) - (b.km ?? 0);
    if (sort === "price") return (a.from ?? 0) - (b.from ?? 0);
    if (sort === "earliest") {
      const ta = a.next ? new Date(a.next.start).getTime() : Infinity;
      const tb = b.next ? new Date(b.next.start).getTime() : Infinity;
      return ta - tb || (a.km ?? 0) - (b.km ?? 0);
    }
    return (a.km ?? 0) - (b.km ?? 0);
  });
  return out;
}

export function searchAll(db, q, loc) {
  const query = q.trim().toLowerCase();
  if (!query) return { washes: [], services: [], areas: [] };
  const rows = listBranches(db, loc).filter((r) => `${r.branch.name.ar} ${r.branch.name.en}`.toLowerCase().includes(query));
  const services = [];
  for (const s of db.services) {
    if (s.type !== "primary") continue;
    if (!`${s.name.ar} ${s.name.en}`.toLowerCase().includes(query)) continue;
    const branch = db.branches.find((b) => b.id === s.branchId);
    if (!branch) continue;
    services.push({ service: s, card: decorateBranch(db, branch, loc) });
  }
  const areas = db.catalogs.areas.filter((a) => `${a.name.ar} ${a.name.en}`.toLowerCase().includes(query));
  return { washes: rows, services: services.slice(0, 8), areas };
}

export function categoryPrice(db, branchId, category) {
  const list = db.services.filter((s) => s.branchId === branchId && s.category === category && s.type === "primary" && s.active);
  if (!list.length) return null;
  return Math.min(...list.map((s) => s.price));
}

void sameDay;
