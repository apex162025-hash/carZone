import { get } from "../db.js";
import { read } from "../net.js";

export function activeOffers(db, when) {
  const t = when.getTime();
  return db.offers.filter((o) => o.status === "active" && new Date(o.startAt).getTime() <= t && new Date(o.endAt).getTime() >= t);
}

export function bestOffer(db, branchId, serviceIds, when, source = "app") {
  const branch = db.branches.find((b) => b.id === branchId);
  const matches = activeOffers(db, when).filter((o) => {
    const branchOk = !o.branchIds?.length || o.branchIds.includes(branchId);
    const serviceOk = !o.serviceIds?.length || serviceIds.some((id) => o.serviceIds.includes(id));
    const scopeOk = (source !== "walk_in" && o.scope === "platform") || o.businessId === branch?.businessId;
    return branchOk && serviceOk && scopeOk;
  });
  let best = null;
  let bestAmount = 0;
  const primaryAndAddons = serviceIds;
  for (const offer of matches) {
    const eligible = db.services.filter((s) => primaryAndAddons.includes(s.id) && (!offer.serviceIds?.length || offer.serviceIds.includes(s.id)));
    const base = eligible.reduce((sum, s) => sum + s.price, 0);
    const amount = offer.discountType === "percent"
      ? Math.round(base * offer.discountValue / 100)
      : Math.min(offer.discountValue, base);
    if (amount > bestAmount) {
      best = offer;
      bestAmount = amount;
    }
  }
  return { offer: best, amount: bestAmount };
}

export function computeQuote(db, { branchId, serviceId, addonIds = [], source = "app" }, when = new Date()) {
  const primary = db.services.find((s) => s.id === serviceId && s.branchId === branchId && s.type === "primary" && s.active);
  if (!primary) throw new Error("service");
  const addons = addonIds.map((id) => db.services.find((s) => s.id === id && s.branchId === branchId && s.type === "addon" && s.active)).filter(Boolean);
  const items = [primary, ...addons].map((s) => ({
    serviceId: s.id,
    name: s.name,
    type: s.type,
    price: s.price,
    durationMin: s.durationMin,
  }));
  const subtotal = items.reduce((s, it) => s + it.price, 0);
  const durationMin = items.reduce((s, it) => s + it.durationMin, 0);
  const { offer, amount } = bestOffer(db, branchId, items.map((i) => i.serviceId), when, source);
  const discount = amount;
  return {
    items, subtotal, discount, total: Math.max(0, subtotal - discount), durationMin,
    offer, offerId: offer?.id || null,
  };
}

export async function quote(input) {
  return read(() => computeQuote(get(), input, new Date()));
}

export function minPrimary(db, branchId) {
  const list = db.services.filter((s) => s.branchId === branchId && s.type === "primary" && s.active);
  return list.reduce((min, s) => (s.price < min.price ? s : min), list[0]);
}
