import { get, mutate, now, nid } from "../db.js";
import { read, write } from "../net.js";
import { normalizePlate } from "../format.js";

export function parseEgPhone(input) {
  let d = String(input || "").replace(/\D/g, "");
  if (d.startsWith("20") && d.length >= 12) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (!/^1[0125]\d{8}$/.test(d)) return null;
  return `+20 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

export function phoneDigits(phone) {
  return String(phone || "").replace(/\D/g, "");
}

export async function findCustomer(phone) {
  return read(() => {
    const target = phoneDigits(parseEgPhone(phone) || phone);
    return get().customers.find((c) => phoneDigits(c.phone) === target) || null;
  });
}

export async function registerCustomer(phone, name) {
  return write(() => mutate((draft) => {
    const pretty = parseEgPhone(phone);
    if (!pretty) throw new Error("phone");
    if (draft.customers.some((c) => phoneDigits(c.phone) === phoneDigits(pretty))) {
      return draft.customers.find((c) => phoneDigits(c.phone) === phoneDigits(pretty));
    }
    const row = {
      id: nid("cu"),
      name: name.trim(),
      phone: pretty,
      avatar: null,
      status: "active",
      createdAt: now().toISOString(),
      lastActiveAt: now().toISOString(),
      createdAfterSeed: true,
    };
    draft.customers.push(row);
    return row;
  }));
}

export async function updateCustomer(id, patch) {
  return write(() => mutate((draft) => {
    const row = draft.customers.find((c) => c.id === id);
    if (!row) throw new Error("missing");
    if (patch.name != null) {
      if (patch.name.trim().length < 2) throw new Error("name");
      row.name = patch.name.trim();
    }
    row.lastActiveAt = now().toISOString();
    return row;
  }));
}

const UPCOMING = new Set(["pending", "confirmed", "waiting", "in_service"]);

export async function saveVehicle(customerId, data) {
  return write(() => mutate((draft) => {
    const plateNormalized = normalizePlate(data.plate);
    if (!data.make || !data.model || !data.color || !plateNormalized) throw new Error("required");
    const dup = draft.vehicles.find((v) => v.customerId === customerId && v.plateNormalized === plateNormalized && v.id !== data.id);
    if (dup) throw new Error("duplicate");
    if (data.id) {
      const row = draft.vehicles.find((v) => v.id === data.id && v.customerId === customerId);
      if (!row) throw new Error("missing");
      Object.assign(row, { make: data.make, model: data.model, year: data.year || null, color: data.color, plate: plateNormalized, plateNormalized });
      return row;
    }
    const mine = draft.vehicles.filter((v) => v.customerId === customerId);
    const row = {
      id: nid("ve"), customerId, make: data.make, model: data.model, year: data.year || null,
      color: data.color, plate: plateNormalized, plateNormalized, isDefault: mine.length === 0,
    };
    draft.vehicles.push(row);
    return row;
  }));
}

export async function deleteVehicle(customerId, id) {
  return write(() => mutate((draft) => {
    const row = draft.vehicles.find((v) => v.id === id && v.customerId === customerId);
    if (!row) throw new Error("missing");
    const blocked = draft.orders.some((o) => o.vehicleId === id && UPCOMING.has(o.status));
    if (blocked) throw new Error("upcoming");
    draft.vehicles = draft.vehicles.filter((v) => v.id !== id);
    if (row.isDefault) {
      const next = draft.vehicles.find((v) => v.customerId === customerId);
      if (next) next.isDefault = true;
    }
    return true;
  }));
}

export async function setDefaultVehicle(customerId, id) {
  return write(() => mutate((draft) => {
    draft.vehicles.forEach((v) => {
      if (v.customerId === customerId) v.isDefault = v.id === id;
    });
    return draft.vehicles.find((v) => v.id === id);
  }));
}

export async function toggleFavorite(customerId, branchId) {
  return write(() => mutate((draft) => {
    const idx = draft.favorites.findIndex((f) => f.customerId === customerId && f.branchId === branchId);
    if (idx >= 0) draft.favorites.splice(idx, 1);
    else draft.favorites.push({ customerId, branchId });
    return idx < 0;
  }));
}

export async function markNotifications(userId, id) {
  return write(() => mutate((draft) => {
    draft.notifications.forEach((n) => {
      if (n.audience === "customer" && n.userId === userId && (!id || n.id === id)) n.read = true;
    });
  }));
}

export function makes() {
  return {
    Toyota: ["Corolla", "Camry", "Yaris"],
    Hyundai: ["Elantra", "Tucson", "Accent"],
    Kia: ["Sportage", "Cerato", "Picanto"],
    Nissan: ["Sunny", "Qashqai"],
    Chevrolet: ["Optra", "Captiva"],
    MG: ["MG 5", "HS"],
    BMW: ["3 Series", "X3"],
    Mercedes: ["C180", "GLC"],
  };
}
