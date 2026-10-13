import "server-only";

import type { RolesMatrix } from "@/types/admins";
import type { WashApplication } from "@/types/applications";
import type { AuditLog } from "@/types/audit";
import type { Localized } from "@/types/common";
import type { Complaint, ComplaintCategory, ComplaintStatus } from "@/types/complaints";
import type { Customer, Vehicle } from "@/types/customers";
import type { Payment, Payout, Transaction } from "@/types/finance";
import type { AdminNotification } from "@/types/notifications";
import type { Offer } from "@/types/offers";
import type { Order, OrderItem, OrderSource, OrderStatus, PaymentStatus, TimelineEntry } from "@/types/orders";
import type { Review } from "@/types/reviews";
import type { Branch, Business, BusinessStatus, Staff, StaffRole, WashService, WorkingDay } from "@/types/washes";
import type { MockDatabase, Shift, StoredAdmin } from "@/lib/mock-api/schema";

/**
 * TypeScript port of `carZone/shared/js/seed.js`.
 * Same deterministic generator and canonical demo records, so the super admin
 * shows exactly the data the customer / wash demos were designed around.
 */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function iso(now: Date, dayOffset: number, hh: number, mm = 0) {
  const d = new Date(now);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

function week(open: string, close: string, closedDays: number[] = []): WorkingDay[] {
  return Array.from({ length: 7 }, (_, i) => ({ open, close, closed: closedDays.includes(i) }));
}

function lotusHours(): WorkingDay[] {
  return Array.from({ length: 7 }, (_, i) => ({
    open: "09:00",
    close: i === 4 ? "14:00" : "22:00",
    closed: false,
  }));
}

function nid(prefix: string, n: number) {
  return `${prefix}_${String(n).padStart(3, "0")}`;
}

function prettyPhone(n: number) {
  const d = String(n).replace(/\D/g, "").slice(-10);
  return `+20 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

function plateFrom(i: number) {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return `${letters[i % 23]}${letters[(i * 3) % 23]}${letters[(i * 7) % 23]}${String(100 + (i % 800)).padStart(3, "0")}`;
}

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const NAMES = [
  "Ahmed Hassan", "Mona Salah", "Omar Fathy", "Nour Adel", "Hassan Magdy", "Layla Mostafa",
  "Youssef Kamal", "Farah Nabil", "Mahmoud Eid", "Salma Hassan", "Karim Tarek", "Hana Osama",
  "Tamer Shawky", "Dina Hany", "Ali Gaber", "Mariam Samir", "Sherif Lotfy", "Aya Khaled",
  "Hossam Reda", "Nada Fouad", "Walid Nasser", "Reem Ashraf", "Bassem Lotfy", "Sara Hatem",
  "Adel Sobhy", "Maya Refaat", "Ibrahim Zaki", "Lina Farid", "Samer Wagdy", "Hagar Emad",
  "Ramy Adel", "Yara Mostafa", "Fady Nabil", "Mai Hassan", "Khaled Saad", "Noha Tamer",
  "Amr Yassin", "Jana Sherif", "Wael Mamdouh", "Passant Ali",
];

const MAKES: [string, string[]][] = [
  ["Toyota", ["Corolla", "Camry", "Yaris"]],
  ["Hyundai", ["Elantra", "Tucson", "Accent"]],
  ["Kia", ["Sportage", "Cerato", "Picanto"]],
  ["Nissan", ["Sunny", "Qashqai"]],
  ["Chevrolet", ["Optra", "Captiva"]],
  ["MG", ["MG 5", "HS"]],
];

const COLOR_KEYS = ["white", "black", "silver", "gray", "blue", "red", "green", "beige"];

const COMPLAINT_TEXT: Record<ComplaintCategory, string> = {
  quality: "تم استلام السيارة وبها بقع واضحة على الزجاج والجنوط رغم أن الخدمة كانت غسيل كامل.",
  pricing: "تم تحصيل مبلغ أعلى من السعر المعروض في التطبيق بدون توضيح السبب.",
  behavior: "تعامل غير لائق من أحد العاملين عند الاستفسار عن مدة الانتظار.",
  booking: "وصلت في موعد الحجز ولم يتم استقبال السيارة إلا بعد ٤٠ دقيقة.",
  refund: "تم إلغاء الخدمة من المغسلة ولم يتم رد المبلغ المدفوع بالبطاقة.",
  other: "الفرع كان مغلقًا في وقت يظهر فيه مفتوحًا على التطبيق.",
};

export const DEFAULT_ROLES_MATRIX: RolesMatrix = {
  super: {
    dashboard: "manage", customers: "manage", staff: "manage", washes: "manage",
    applications: "manage", branches: "manage", orders: "manage", reviews: "manage",
    complaints: "manage", offers: "manage", finance: "manage", reports: "manage",
    notifications: "manage", admins: "manage", roles: "manage", settings: "manage", audit: "view",
  },
  operations: {
    dashboard: "view", customers: "none", staff: "view", washes: "manage",
    applications: "manage", branches: "manage", orders: "manage", reviews: "none",
    complaints: "manage", offers: "manage", finance: "none", reports: "view",
    notifications: "view", admins: "none", roles: "none", settings: "none", audit: "none",
  },
  finance: {
    dashboard: "view", customers: "none", staff: "none", washes: "none",
    applications: "none", branches: "none", orders: "view", reviews: "none",
    complaints: "none", offers: "none", finance: "manage", reports: "view",
    notifications: "view", admins: "none", roles: "none", settings: "none", audit: "none",
  },
  support: {
    dashboard: "view", customers: "manage", staff: "none", washes: "none",
    applications: "none", branches: "none", orders: "view", reviews: "manage",
    complaints: "manage", offers: "none", finance: "none", reports: "none",
    notifications: "view", admins: "none", roles: "none", settings: "none", audit: "none",
  },
};

export function buildSeed(now: Date): MockDatabase {
  const rand = mulberry32(20261008);

  const areas = [
    { id: "nasr", name: { ar: "مدينة نصر", en: "Nasr City" } },
    { id: "helio", name: { ar: "مصر الجديدة", en: "Heliopolis" } },
    { id: "nc", name: { ar: "التجمع", en: "New Cairo" } },
    { id: "maadi", name: { ar: "المعادي", en: "Maadi" } },
    { id: "zamalek", name: { ar: "الزمالك", en: "Zamalek" } },
    { id: "moh", name: { ar: "المهندسين", en: "Mohandessin" } },
    { id: "zayed", name: { ar: "الشيخ زايد", en: "Sheikh Zayed" } },
    { id: "oct", name: { ar: "٦ أكتوبر", en: "6th of October" } },
  ];
  const areaById = Object.fromEntries(areas.map((a) => [a.id, a]));

  const biz = (
    id: string, ar: string, en: string, ownerName: string, status: BusinessStatus,
    commissionRate: number, statusReason?: string,
  ): Business => ({
    id, name: { ar, en }, ownerId: `st_owner_${id}`, ownerName, status,
    statusReason: statusReason ?? null, commissionRate, rating: 0,
    createdAt: "2025-01-15T10:00:00.000Z",
  });

  const businesses: Business[] = [
    biz("biz_carzen", "كارزن ووش", "Carzen Wash", "Khaled Mansour", "active", 7),
    biz("biz_nile", "بريق النيل", "Nile Sparkle", "Hany Mourad", "active", 7),
    biz("biz_palm", "رغوة النخيل", "Palm Foam", "Sherine Adel", "active", 7),
    biz("biz_lotus", "لوتس أوتو سبا", "Lotus Auto Spa", "Tarek Hosny", "active", 8),
    biz("biz_corniche", "نظافة الكورنيش", "Corniche Clean", "Rania Fouad", "active", 7),
    biz("biz_pyramid", "بولش الهرم", "Pyramid Polish", "Sameh Lotfy", "active", 7),
    biz("biz_oasis", "لمعان الواحة", "Oasis Shine", "Heba Nasser", "active", 7),
    biz("biz_golden", "الإطار الذهبي", "Golden Tire Wash", "Wael Sabry", "active", 9),
    biz("biz_dune", "كثبان حمراء", "Red Dune Wash", "Nader Fathy", "suspended", 7, "شكاوى جودة متكررة"),
    biz("biz_gate", "مغسلة البوابة", "Gate Wash", "Ola Samir", "rejected", 7, "مستندات غير مكتملة"),
  ];
  // Staggered onboarding dates read more naturally than one shared timestamp.
  businesses.forEach((b, i) => {
    b.createdAt = iso(now, -(300 - i * 24), 10);
  });

  type BranchDef = [string, string, string, string, string, number, number, number, boolean, WorkingDay[], string[], number];
  const branchDefs: BranchDef[] = [
    ["br_nasr", "biz_carzen", "nasr", "كارزن ووش – مدينة نصر", "Carzen Wash – Nasr City", 30.0642, 31.348, 6, false, week("09:00", "00:00"), ["waiting", "ac", "wifi", "card", "coffee", "covered"], 1],
    ["br_helio", "biz_carzen", "helio", "كارزن ووش – مصر الجديدة", "Carzen Wash – Heliopolis", 30.0872, 31.3195, 4, false, week("09:00", "00:00"), ["waiting", "ac", "card"], 1],
    ["br_nile_maadi", "biz_nile", "maadi", "بريق النيل – المعادي", "Nile Sparkle – Maadi", 29.9628, 31.258, 5, true, week("08:00", "22:00"), ["waiting", "wifi", "coffee"], 1.1],
    ["br_nile_zam", "biz_nile", "zamalek", "بريق النيل – الزمالك", "Nile Sparkle – Zamalek", 30.0602, 31.2215, 3, false, week("10:00", "22:00"), ["ac", "card", "covered"], 1.2],
    ["br_palm_nc", "biz_palm", "nc", "رغوة النخيل – التجمع", "Palm Foam – New Cairo", 30.013, 31.478, 6, true, week("09:00", "23:00"), ["waiting", "ac", "wifi", "card"], 1],
    ["br_palm_oct", "biz_palm", "oct", "رغوة النخيل – ٦ أكتوبر", "Palm Foam – 6th of October", 29.969, 30.952, 4, false, week("09:00", "21:00"), ["waiting", "covered"], 0.9],
    ["br_lotus_moh", "biz_lotus", "moh", "لوتس – المهندسين", "Lotus Auto Spa – Mohandessin", 30.0518, 31.203, 3, false, lotusHours(), ["ac", "wifi", "coffee", "card"], 1.3],
    ["br_corniche_zam", "biz_corniche", "zamalek", "الكورنيش – الزمالك", "Corniche Clean – Zamalek", 30.066, 31.224, 4, false, week("09:00", "20:00", [5]), ["waiting", "card"], 1],
    ["br_pyramid_zay", "biz_pyramid", "zayed", "بولش الهرم – الشيخ زايد", "Pyramid Polish – Sheikh Zayed", 30.031, 30.982, 5, false, week("09:00", "22:00"), ["waiting", "ac", "covered"], 0.95],
    ["br_pyramid_oct", "biz_pyramid", "oct", "بولش الهرم – ٦ أكتوبر", "Pyramid Polish – 6th of October", 29.981, 30.961, 4, false, week("09:00", "21:00"), ["waiting", "card"], 0.9],
    ["br_oasis_nasr", "biz_oasis", "nasr", "لمعان الواحة – مدينة نصر", "Oasis Shine – Nasr City", 30.0488, 31.339, 5, true, week("08:00", "00:00"), ["waiting", "ac", "wifi", "coffee", "card"], 1],
    ["br_golden_hel", "biz_golden", "helio", "الإطار الذهبي – مصر الجديدة", "Golden Tire Wash – Heliopolis", 30.0944, 31.333, 4, false, week("09:00", "23:00"), ["card", "covered", "waiting"], 1.05],
    ["br_dune_maadi", "biz_dune", "maadi", "كثبان حمراء – المعادي", "Red Dune Wash – Maadi", 29.955, 31.27, 3, false, week("10:00", "20:00"), ["waiting"], 0.8],
    ["br_gate_nc", "biz_gate", "nc", "البوابة – التجمع", "Gate Wash – New Cairo", 30.002, 31.47, 2, false, week("10:00", "18:00"), ["waiting"], 0.8],
  ];

  const branches: Branch[] = branchDefs.map((b) => ({
    id: b[0],
    businessId: b[1],
    name: { ar: b[3], en: b[4] },
    area: b[2],
    address: { ar: `${areaById[b[2]].name.ar}، القاهرة`, en: `${areaById[b[2]].name.en}, Cairo` },
    lat: b[5],
    lng: b[6],
    phone: "+20 2 555 0142",
    amenities: b[10],
    capacity: b[7],
    active: b[1] !== "biz_gate",
    featured: b[0] === "br_nile_maadi",
    workingHours: b[9],
    settings: {
      autoConfirm: b[0] === "br_oasis_nasr",
      slotIntervalMin: 30,
      leadTimeMin: 15,
      maxAdvanceDays: 7,
      freeCancelMin: 60,
      noShowGraceMin: 15,
      reminderMin: 45,
    },
    rating: 0,
    reviewCount: 0,
  }));
  const mult = Object.fromEntries(branchDefs.map((b) => [b[0], b[11]]));

  const services: WashService[] = [];
  const svc = (branchId: string, key: string, type: WashService["type"], category: string, name: Localized, price: number, durationMin: number) => {
    services.push({ id: `svc_${branchId}_${key}`, branchId, type, category, name, price, durationMin, active: true });
  };
  for (const b of branches) {
    const m = b.id === "br_nasr" ? 1 : mult[b.id];
    const price = (n: number) => (b.id === "br_nasr" ? n : Math.max(20, Math.round(n * m)));
    svc(b.id, "ext", "primary", "exterior", { ar: "غسيل خارجي", en: "Exterior Wash" }, price(100), 20);
    svc(b.id, "int", "primary", "interior", { ar: "غسيل داخلي", en: "Interior Wash" }, price(100), 25);
    svc(b.id, "full", "primary", "full", { ar: "غسيل داخلي وخارجي", en: "Interior + Exterior" }, price(180), 40);
    svc(b.id, "deep", "primary", "deep", { ar: "تنظيف عميق (بخار)", en: "Deep Cleaning (Steam)" }, price(300), 60);
    svc(b.id, "tire", "addon", "exterior", { ar: "تنظيف الإطارات", en: "Tire Cleaning" }, price(30), 5);
    svc(b.id, "air", "addon", "interior", { ar: "معطر جو", en: "Air Freshener" }, price(20), 2);
    svc(b.id, "wax", "addon", "exterior", { ar: "تلميع بالشمع", en: "Wax Polish" }, price(60), 15);
  }

  const customers: Customer[] = NAMES.map((name, i) => ({
    id: i === 0 ? "cu_ahmed" : nid("cu", i + 1),
    name,
    phone: i === 0 ? "+20 100 123 4567" : prettyPhone(1100000000 + i * 137),
    status: i === 39 ? "suspended" : "active",
    statusReason: i === 39 ? "محاولات حجز وهمية متكررة" : null,
    createdAt: iso(now, -120 + i * 3, 10),
    lastActiveAt: iso(now, -i, 12),
  }));

  const vehicle = (id: string, customerId: string, make: string, model: string, year: number, color: string, plate: string, isDefault: boolean): Vehicle => ({
    id, customerId, make, model, year, color, plate,
    plateNormalized: plate.replace(/[\s-]/g, "").toUpperCase(), isDefault,
  });

  const vehicles: Vehicle[] = [
    vehicle("ve_corolla", "cu_ahmed", "Toyota", "Corolla", 2021, "white", "ABC123", true),
    vehicle("ve_sportage", "cu_ahmed", "Kia", "Sportage", 2023, "black", "KLM482", false),
  ];
  let extra = 0;
  for (let i = 1; i < customers.length; i += 1) {
    const [make, models] = MAKES[i % MAKES.length];
    vehicles.push(vehicle(nid("ve", vehicles.length + 1), customers[i].id, make, models[0], 2016 + (i % 9), COLOR_KEYS[i % COLOR_KEYS.length], plateFrom(i), true));
    if (extra < 14) {
      const [make2, models2] = MAKES[(i + 2) % MAKES.length];
      vehicles.push(vehicle(nid("ve", vehicles.length + 1), customers[i].id, make2, models2[1] || models[0], 2018 + (i % 6), COLOR_KEYS[(i + 3) % COLOR_KEYS.length], plateFrom(100 + i), false));
      extra += 1;
    }
  }

  const member = (id: string, businessId: string, branchId: string, name: string, phone: string, role: StaffRole, maxDiscountPct: number): Staff => ({
    id, businessId, branchId, name, phone, role, status: "active", maxDiscountPct,
  });
  const staff: Staff[] = [];
  businesses.forEach((b, i) => {
    const branchId = b.id === "biz_carzen" ? "br_nasr" : branches.find((x) => x.businessId === b.id)!.id;
    staff.push(member(`st_owner_${b.id}`, b.id, branchId, b.ownerName, prettyPhone(1200000000 + i), "owner", 100));
  });
  staff.push(member("st_samir", "biz_carzen", "br_nasr", "Ahmed Samir", "+20 100 555 0101", "employee", 10));
  staff.push(member("st_adel", "biz_carzen", "br_nasr", "Mohamed Adel", "+20 100 555 0102", "manager", 20));
  staff.push(member("st_hassan", "biz_carzen", "br_nasr", "Hassan Tarek", "+20 100 555 0103", "employee", 10));
  staff.push(member("st_youssef", "biz_carzen", "br_nasr", "Youssef Nabil", "+20 100 555 0104", "employee", 10));
  staff.push(member("st_karim", "biz_carzen", "br_nasr", "Karim Fathy", "+20 100 555 0105", "employee", 10));
  const EMPLOYEE_NAMES = ["Mostafa Ali", "Sayed Ramadan", "Ehab Fawzy", "Hamdy Saber", "Gamal Hosny", "Ashraf Kamel", "Tarek Mounir", "Medhat Salem", "Reda Abdo", "Atef Nour", "Saad Fikry", "Nabil Shaker", "Emad Lotfy"];
  branches.filter((b) => b.id !== "br_nasr").forEach((b, i) => {
    staff.push(member(`st_emp_${b.id}`, b.businessId, b.id, EMPLOYEE_NAMES[i % EMPLOYEE_NAMES.length], prettyPhone(1001550000 + i * 11), "employee", 10));
  });

  const seq: Record<OrderSource, number> = { app: 9880, walk_in: 19968, phone: 30001 };
  const quota: Record<OrderSource, number> = { app: 121, walk_in: 77, phone: 22 };
  const usedCodes = new Set(["5K8P2"]);
  const orders: Order[] = [];
  const payments: Payment[] = [];
  const transactions: Transaction[] = [];

  const nextCode = () => {
    let c = "";
    do {
      c = Array.from({ length: 5 }, () => ALPHA[Math.floor(rand() * ALPHA.length)]).join("");
    } while (usedCodes.has(c));
    usedCodes.add(c);
    return c;
  };
  const takeNumber = (source: OrderSource) => {
    const n = seq[source];
    seq[source] += 1;
    quota[source] -= 1;
    return `CZ-${String(n).padStart(5, "0")}`;
  };

  type OrderInput = {
    id?: string;
    customerId?: string | null;
    vehicleId?: string | null;
    plate?: string;
    branchId: string;
    items: OrderItem[];
    scheduledAt: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    paymentMethod?: Order["paymentMethod"];
    assignedStaffId?: string | null;
    cancel?: Order["cancel"];
  };

  const addOrder = (source: OrderSource, partial: OrderInput) => {
    if (quota[source] < 0) throw new Error(`quota ${source}`);
    const branch = branches.find((b) => b.id === partial.branchId)!;
    const business = businesses.find((b) => b.id === branch.businessId)!;
    const subtotal = partial.items.reduce((s, it) => s + it.price, 0);
    const number = takeNumber(source);
    const order: Order = {
      id: partial.id ?? `ord_${number}`,
      number,
      code: nextCode(),
      source,
      customerId: partial.customerId ?? null,
      vehicleId: partial.vehicleId ?? null,
      plate: partial.plate ?? "",
      businessId: business.id,
      branchId: branch.id,
      items: partial.items,
      subtotal,
      discount: null,
      offerId: null,
      total: subtotal,
      durationMin: partial.items.reduce((s, it) => s + it.durationMin, 0),
      scheduledAt: partial.scheduledAt,
      status: partial.status,
      paymentStatus: partial.paymentStatus,
      paymentMethod: partial.paymentMethod ?? null,
      assignedStaffId: partial.assignedStaffId ?? null,
      timeline: timelineFor(partial.status, partial.scheduledAt, source, partial.customerId ?? null),
      notes: [],
      cancel: partial.cancel ?? null,
      flag: null,
      createdAt: partial.scheduledAt,
    };
    orders.push(order);
    if (partial.paymentStatus === "paid") {
      payments.push({
        id: `pay_${order.id}`,
        orderId: order.id,
        amount: order.total,
        method: partial.paymentMethod ?? "cash",
        collectedBy: partial.assignedStaffId ?? "st_samir",
        collectedAt: partial.scheduledAt,
        status: "paid",
      });
    }
    if (partial.status !== "cancelled" && partial.status !== "no_show") {
      const rate = business.commissionRate ?? 7;
      const commission = Math.round(order.total * rate) / 100;
      transactions.push({
        id: `txn_${order.id}`,
        orderId: order.id,
        businessId: business.id,
        gross: order.total,
        commissionRate: rate,
        commission,
        netToWash: Math.round((order.total - commission) * 100) / 100,
        date: partial.scheduledAt,
        status: partial.paymentStatus === "paid" ? "paid" : "pending",
        flag: null,
        reviewNote: null,
      });
    }
    return order;
  };

  const fullItem: OrderItem = {
    serviceId: "svc_br_nasr_full",
    name: { ar: "غسيل داخلي وخارجي", en: "Interior + Exterior" },
    type: "primary",
    price: 180,
    durationMin: 40,
  };
  const extItem = (branchId: string): OrderItem => {
    const s = services.find((x) => x.id === `svc_${branchId}_ext`)!;
    return { serviceId: s.id, name: s.name, type: "primary", price: s.price, durationMin: s.durationMin };
  };

  const ahmedDays = [14, 17, 19, 21, 23, 25, 27];
  ahmedDays.forEach((d, i) => {
    addOrder("app", {
      id: `ord_ahmed_${i}`, customerId: "cu_ahmed", vehicleId: "ve_corolla", plate: "ABC123",
      branchId: "br_nasr", items: [fullItem], scheduledAt: iso(now, -d, 11),
      status: "completed", paymentStatus: "paid", paymentMethod: "cash", assignedStaffId: "st_samir",
    });
  });
  addOrder("app", {
    id: "ord_ahmed_ns", customerId: "cu_ahmed", vehicleId: "ve_corolla", plate: "ABC123",
    branchId: "br_nasr", items: [fullItem], scheduledAt: iso(now, -30, 16),
    status: "no_show", paymentStatus: "pending",
  });

  for (let i = 0; i < 14; i += 1) {
    const cust = customers[1 + (i % 20)];
    addOrder("app", {
      id: `ord_host_${i}`, customerId: cust.id,
      vehicleId: vehicles.find((v) => v.customerId === cust.id)?.id ?? null,
      plate: vehicles.find((v) => v.customerId === cust.id)?.plate ?? "",
      branchId: "br_nasr", items: [extItem("br_nasr")], scheduledAt: iso(now, -(2 + i), 12),
      status: "completed", paymentStatus: "paid", paymentMethod: "cash", assignedStaffId: "st_hassan",
    });
  }

  for (let i = 0; i < 18; i += 1) {
    const source: OrderSource = i < 10 ? "app" : i < 16 ? "walk_in" : "phone";
    const pendingPay = i === 0;
    addOrder(source, {
      id: `ord_today_${i}`,
      customerId: source === "walk_in" && i % 2 ? null : customers[2 + (i % 15)].id,
      plate: plateFrom(200 + i),
      branchId: "br_nasr", items: [extItem("br_nasr")],
      scheduledAt: iso(now, 0, 9 + Math.floor(i / 3), (i % 3) * 15),
      status: "completed", paymentStatus: pendingPay ? "pending" : "paid",
      paymentMethod: pendingPay ? null : "cash", assignedStaffId: "st_samir",
    });
  }
  for (let i = 0; i < 3; i += 1) {
    addOrder("app", {
      id: `ord_wait_${i}`, customerId: customers[5 + i].id, plate: plateFrom(240 + i),
      branchId: "br_nasr", items: [extItem("br_nasr")], scheduledAt: iso(now, 0, 16, 0),
      status: "waiting", paymentStatus: "pending",
    });
  }
  for (let i = 0; i < 4; i += 1) {
    addOrder(i < 2 ? "app" : "walk_in", {
      id: `ord_svc_${i}`, customerId: customers[8 + i].id, plate: plateFrom(260 + i),
      branchId: "br_nasr", items: [extItem("br_nasr")], scheduledAt: iso(now, 0, 15, 0),
      status: "in_service", paymentStatus: "pending", assignedStaffId: i % 2 ? "st_youssef" : "st_samir",
    });
  }
  addOrder("app", { id: "ord_tmw_1", customerId: customers[3].id, plate: plateFrom(280), branchId: "br_nasr", items: [fullItem], scheduledAt: iso(now, 1, 10), status: "confirmed", paymentStatus: "pending" });
  addOrder("app", { id: "ord_tmw_2", customerId: customers[4].id, plate: plateFrom(281), branchId: "br_nasr", items: [fullItem], scheduledAt: iso(now, 1, 10, 30), status: "confirmed", paymentStatus: "pending" });
  addOrder("app", { id: "ord_py_1", customerId: customers[6].id, plate: plateFrom(282), branchId: "br_pyramid_zay", items: [extItem("br_pyramid_zay")], scheduledAt: iso(now, 1, 11), status: "confirmed", paymentStatus: "pending" });
  addOrder("app", { id: "ord_py_2", customerId: customers[7].id, plate: plateFrom(283), branchId: "br_pyramid_zay", items: [extItem("br_pyramid_zay")], scheduledAt: iso(now, 1, 12), status: "confirmed", paymentStatus: "pending" });

  const activeBranches = branches.filter((b) => b.active && businesses.find((z) => z.id === b.businessId)!.status === "active");
  let guard = 0;
  while (quota.app + quota.walk_in + quota.phone > 0) {
    guard += 1;
    if (guard > 400) throw new Error("filler overflow");
    const options = (["app", "walk_in", "phone"] as OrderSource[]).filter((s) => quota[s] > 0);
    const source = options[Math.floor(rand() * options.length)];
    const branch = activeBranches[Math.floor(rand() * activeBranches.length)];
    const prim = services.filter((s) => s.branchId === branch.id && s.type === "primary");
    const service = prim[Math.floor(rand() * prim.length)];
    const roll = rand();
    const status: OrderStatus = roll < 0.8 ? "completed" : roll < 0.92 ? "cancelled" : "no_show";
    const daysAgo = 1 + Math.floor(rand() * 30);
    const hour = 9 + Math.floor(rand() * 10);
    const cust = customers[1 + Math.floor(rand() * 28)];
    addOrder(source, {
      customerId: source === "walk_in" && rand() < 0.4 ? null : cust.id,
      plate: `P${Math.floor(rand() * 9000 + 1000)}`,
      branchId: branch.id,
      items: [{ serviceId: service.id, name: service.name, type: "primary", price: service.price, durationMin: service.durationMin }],
      scheduledAt: iso(now, -daysAgo, hour, rand() < 0.5 ? 0 : 30),
      status,
      paymentStatus: status === "completed" ? "paid" : "pending",
      paymentMethod: status === "completed" ? (rand() < 0.3 ? "card" : "cash") : null,
      assignedStaffId: status === "completed" ? "st_samir" : null,
      cancel: status === "cancelled" ? { reason: "تغيير في المواعيد", byType: "customer", byId: cust.id, at: iso(now, -daysAgo, hour) } : null,
    });
  }

  // Seeded edge case: one cash collection that does not match the order total.
  const paidMismatch = payments.find((p) => p.orderId.startsWith("ord_host_"));
  if (paidMismatch) {
    paidMismatch.amount = 50;
    const txn = transactions.find((t) => t.orderId === paidMismatch.orderId);
    if (txn) txn.flag = "discrepancy";
  }

  const reviews: Review[] = [];
  const reviewComments: Localized[] = [
    { ar: "شغل نظيف والموعد كان مظبوط.", en: "Clean work and the slot was on time." },
    { ar: "الداخلية رجعت جديدة.", en: "The interior looks new again." },
    { ar: "كويس بس الانتظار زاد شوية.", en: "Good, though the wait ran a bit long." },
    { ar: "سعر واضح وتعامل محترم.", en: "Clear price and polite staff." },
  ];
  const review = (id: string, orderId: string, customerId: string, businessId: string, branchId: string, serviceId: string, stars: number, comment: Localized, tags: string[], createdAt: string): Review => ({
    id, orderId, customerId, businessId, branchId, serviceId, stars, comment, tags,
    reply: null, status: "visible", hiddenReason: null, reportedByWash: false, createdAt,
  });
  ahmedDays.slice(1).forEach((d, i) => {
    reviews.push(review(`rv_ahmed_${i}`, `ord_ahmed_${i + 1}`, "cu_ahmed", "biz_carzen", "br_nasr", "svc_br_nasr_full", 5, reviewComments[i % 4], ["clean"], iso(now, -d, 15)));
  });
  for (let i = 0; i < 14; i += 1) {
    const stars = i < 10 ? 5 : 4;
    reviews.push(review(`rv_host_${i}`, `ord_host_${i}`, customers[1 + (i % 20)].id, "biz_carzen", "br_nasr", "svc_br_nasr_ext", stars, reviewComments[i % 4], stars === 5 ? ["clean"] : ["value"], iso(now, -(2 + i), 18)));
  }
  const otherCompleted = orders.filter((o) => o.status === "completed" && o.branchId !== "br_nasr" && o.customerId);
  for (let i = 0; i < 100 && i < otherCompleted.length; i += 1) {
    const o = otherCompleted[i];
    const stars = 3 + (i % 3);
    reviews.push(review(`rv_auto_${i}`, o.id, o.customerId!, o.businessId, o.branchId, o.items[0].serviceId, stars === 3 ? 4 : stars, reviewComments[i % 4], [], o.scheduledAt));
  }
  const reported = reviews.find((r) => r.branchId === "br_pyramid_zay") ?? reviews[reviews.length - 1];
  reported.stars = 1;
  reported.reportedByWash = true;
  reported.comment = { ar: "الخدمة كانت أقل من المتوقع بكثير.", en: "The service was far below what I expected." };
  // A second abusive one so moderation has something to act on.
  const abusive = reviews.find((r) => r.branchId === "br_golden_hel");
  if (abusive) {
    abusive.stars = 2;
    abusive.comment = { ar: "أسوأ مغسلة… العمال مش فاهمين أي حاجة وكلامهم قليل الأدب.", en: "Worst wash… staff are clueless and rude." };
  }
  const hiddenOne = reviews.find((r) => r.branchId === "br_lotus_moh");
  if (hiddenOne) {
    hiddenOne.stars = 1;
    hiddenOne.status = "hidden";
    hiddenOne.hiddenReason = "spam";
    hiddenOne.comment = { ar: "زوروا صفحتي للحصول على خصومات حصرية!!!", en: "Visit my page for exclusive discounts!!!" };
  }

  recomputeRatings(branches, businesses, reviews);

  const offer = (id: string, scope: Offer["scope"], businessId: string | null, branchIds: string[], serviceCategories: string[], arT: string, enT: string, arD: string, enD: string, discountType: Offer["discountType"], discountValue: number, startAt: string, endAt: string, status: Offer["status"], featured: boolean): Offer => ({
    id, scope, businessId, branchIds, serviceCategories, title: { ar: arT, en: enT }, description: { ar: arD, en: enD },
    discountType, discountValue, startAt, endAt, status, featured,
  });
  const offers: Offer[] = [
    offer("of_platform", "platform", null, branches.filter((b) => b.active).map((b) => b.id), ["exterior"], "خصم ١٥٪ على الغسيل الخارجي", "15% off exterior washes", "على كل المغاسل المشاركة هذا الأسبوع.", "At participating washes this week.", "percent", 15, iso(now, -1, 0), iso(now, 5, 23), "active", true),
    offer("of_deep", "wash", "biz_carzen", ["br_nasr"], ["deep"], "تنظيف عميق بخصم ١٥٪", "15% off deep cleaning", "على التنظيف بالبخار في مدينة نصر.", "Steam cleaning at Nasr City.", "percent", 15, iso(now, -2, 0), iso(now, 6, 23), "active", false),
    offer("of_nile", "wash", "biz_nile", ["br_nile_maadi"], ["full"], "٢٠ ج.م على الغسيل الكامل", "20 EGP off a full wash", "في فرع المعادي.", "At the Maadi branch.", "fixed", 20, iso(now, -1, 0), iso(now, 4, 23), "active", false),
    offer("of_soon", "platform", null, ["br_palm_nc"], ["exterior"], "عرض نهاية الأسبوع", "Weekend offer", "يبدأ قريبًا.", "Starts soon.", "percent", 10, iso(now, 3, 0), iso(now, 6, 23), "scheduled", false),
    offer("of_old", "wash", "biz_lotus", ["br_lotus_moh"], ["interior"], "عرض منتهٍ", "Expired offer", "انتهى أمس.", "Ended yesterday.", "percent", 10, iso(now, -10, 0), iso(now, -1, 12), "expired", false),
    offer("of_draft", "platform", null, ["br_golden_hel"], ["exterior"], "مسودة عرض الشتاء", "Winter draft offer", "لم يُنشر بعد.", "Not published yet.", "fixed", 15, iso(now, 1, 0), iso(now, 8, 0), "draft", false),
  ];

  let ticket = 1030;
  const complaint = (id: string, customerId: string, businessId: string, branchId: string, orderId: string | null, category: ComplaintCategory, status: ComplaintStatus, daysAgo: number): Complaint => {
    ticket += 1;
    const createdAt = iso(now, -daysAgo, 13);
    return {
      id, ticket: `TK-${ticket}`, customerId, businessId, branchId, orderId, category,
      description: COMPLAINT_TEXT[category], status,
      assignedAdminId: status === "open" ? null : "au_mona",
      notes: status === "open" ? [] : [{ authorId: "au_mona", text: "تم التواصل مع مدير الفرع وبانتظار الرد.", at: iso(now, -daysAgo + 1, 11) }],
      resolution: status === "resolved" || status === "closed" ? "تمت مراجعة الحالة مع مدير الفرع وتعويض العميل بغسلة مجانية." : null,
      createdAt, updatedAt: createdAt,
    };
  };
  const complaints: Complaint[] = [
    complaint("cp_1", customers[6].id, "biz_pyramid", "br_pyramid_zay", "ord_py_1", "quality", "open", 1),
    complaint("cp_2", customers[7].id, "biz_pyramid", "br_pyramid_zay", "ord_py_2", "pricing", "in_review", 2),
    complaint("cp_3", customers[8].id, "biz_pyramid", "br_pyramid_zay", null, "behavior", "waiting", 3),
    complaint("cp_4", customers[9].id, "biz_pyramid", "br_pyramid_zay", null, "quality", "open", 4),
    complaint("cp_5", customers[10].id, "biz_nile", "br_nile_maadi", null, "booking", "resolved", 5),
    complaint("cp_6", customers[11].id, "biz_palm", "br_palm_nc", null, "refund", "closed", 6),
    complaint("cp_7", customers[12].id, "biz_lotus", "br_lotus_moh", null, "other", "in_review", 7),
    complaint("cp_8", "cu_ahmed", "biz_carzen", "br_nasr", "ord_ahmed_ns", "booking", "open", 8),
    complaint("cp_9", customers[13].id, "biz_golden", "br_golden_hel", null, "quality", "waiting", 9),
  ];

  const shifts: Shift[] = [
    {
      id: "sh_short", staffId: "st_hassan", branchId: "br_nasr",
      scheduledStart: iso(now, -1, 9), scheduledEnd: iso(now, -1, 17),
      actualStart: iso(now, -1, 9, 4), actualEnd: iso(now, -1, 17, 12),
      ordersCompleted: 8, expectedCash: 1500, actualCash: 1350, difference: -150,
      reason: { ar: "عجز في الصندوق عند الإغلاق", en: "Cash drawer short at close" }, reviewStatus: "open",
    },
  ];

  const payouts: Payout[] = [
    { id: "po_1", businessId: "biz_carzen", periodStart: iso(now, -30, 0), periodEnd: iso(now, -16, 0), amountDue: 4200, amountPaid: 4200, status: "paid", reference: "TRX-88421", paidAt: iso(now, -14, 12) },
    { id: "po_2", businessId: "biz_pyramid", periodStart: iso(now, -15, 0), periodEnd: iso(now, -1, 0), amountDue: 1800, amountPaid: 0, status: "due", reference: null, paidAt: null },
    { id: "po_3", businessId: "biz_nile", periodStart: iso(now, -15, 0), periodEnd: iso(now, -1, 0), amountDue: 2650, amountPaid: 0, status: "due", reference: null, paidAt: null },
    { id: "po_4", businessId: "biz_palm", periodStart: iso(now, -30, 0), periodEnd: iso(now, -16, 0), amountDue: 3120, amountPaid: 3120, status: "paid", reference: "TRX-88437", paidAt: iso(now, -13, 15) },
    { id: "po_5", businessId: "biz_oasis", periodStart: iso(now, -15, 0), periodEnd: iso(now, -1, 0), amountDue: 1975, amountPaid: 0, status: "due", reference: null, paidAt: null },
  ];

  const applications: WashApplication[] = [
    {
      id: "app_1", businessName: "مغسلة النسيم", ownerName: "مصطفى عادل", phone: prettyPhone(1500000000),
      email: "apply1@carzen.demo", area: "nasr", address: "شارع عباس العقاد، مدينة نصر، القاهرة",
      lat: 30.0561, lng: 31.3412,
      services: [
        { name: "غسيل خارجي", price: 110, durationMin: 20 },
        { name: "غسيل داخلي وخارجي", price: 190, durationMin: 40 },
        { name: "تلميع بالشمع", price: 70, durationMin: 15 },
      ],
      workingHours: week("09:00", "23:00"), capacity: 4,
      documents: ["السجل التجاري.pdf", "البطاقة الضريبية.pdf", "عقد الإيجار.pdf"],
      status: "pending", reviewNote: null, submittedAt: iso(now, -3, 11), reviewedAt: null,
    },
    {
      id: "app_2", businessName: "كلين درايف", ownerName: "هبة طارق", phone: prettyPhone(1500000001),
      email: "apply2@carzen.demo", area: "nc", address: "التسعين الشمالي، التجمع الخامس، القاهرة",
      lat: 30.0255, lng: 31.4654,
      services: [
        { name: "غسيل خارجي", price: 130, durationMin: 20 },
        { name: "تنظيف عميق (بخار)", price: 350, durationMin: 60 },
      ],
      workingHours: week("10:00", "22:00", [5]), capacity: 3,
      documents: ["السجل التجاري.pdf", "البطاقة الضريبية.pdf"],
      status: "pending", reviewNote: null, submittedAt: iso(now, -2, 15), reviewedAt: null,
    },
    {
      id: "app_3", businessName: "واش هاب", ownerName: "كريم سمير", phone: prettyPhone(1500000002),
      email: "apply3@carzen.demo", area: "zayed", address: "محور ٢٦ يوليو، الشيخ زايد، الجيزة",
      lat: 30.0412, lng: 30.9881,
      services: [
        { name: "غسيل خارجي", price: 95, durationMin: 20 },
        { name: "غسيل داخلي", price: 95, durationMin: 25 },
        { name: "غسيل داخلي وخارجي", price: 170, durationMin: 40 },
      ],
      workingHours: week("08:00", "21:00"), capacity: 5,
      documents: ["السجل التجاري.pdf"],
      status: "pending", reviewNote: null, submittedAt: iso(now, -1, 9), reviewedAt: null,
    },
    {
      id: "app_4", businessName: "سبيد شاين", ownerName: "طارق حمدي", phone: prettyPhone(1500000003),
      email: "apply4@carzen.demo", area: "maadi", address: "شارع ٩، المعادي، القاهرة",
      lat: 29.9598, lng: 31.2577,
      services: [{ name: "غسيل خارجي", price: 100, durationMin: 25 }],
      workingHours: week("09:00", "20:00"), capacity: 2,
      documents: ["السجل التجاري.pdf"],
      status: "needs_changes", reviewNote: "يرجى رفع صورة البطاقة الضريبية وصور واضحة لمنطقة الغسيل.",
      submittedAt: iso(now, -9, 13), reviewedAt: iso(now, -7, 10),
    },
  ];

  const admins: StoredAdmin[] = [
    { id: "au_sara", name: "Sara Nabil", email: "sara@carzen.demo", role: "super", status: "active", password: "demo1234", lastLoginAt: iso(now, 0, 9, 12), createdAt: iso(now, -400, 10) },
    { id: "au_omar", name: "Omar Fathy", email: "omar@carzen.demo", role: "operations", status: "active", password: "demo1234", lastLoginAt: iso(now, 0, 10, 40), createdAt: iso(now, -310, 10) },
    { id: "au_nour", name: "Nour Salem", email: "nour@carzen.demo", role: "finance", status: "active", password: "demo1234", lastLoginAt: iso(now, -1, 16, 5), createdAt: iso(now, -250, 10) },
    { id: "au_mona", name: "Mona Adel", email: "mona@carzen.demo", role: "support", status: "active", password: "demo1234", lastLoginAt: iso(now, 0, 8, 55), createdAt: iso(now, -200, 10) },
    { id: "au_yasser", name: "Yasser Hamed", email: "yasser@carzen.demo", role: "operations", status: "inactive", password: "demo1234", lastLoginAt: iso(now, -45, 12), createdAt: iso(now, -380, 10) },
  ];

  const notification = (id: string, type: AdminNotification["type"], arT: string, enT: string, arB: string, enB: string, href: string, read: boolean, createdAt: string): AdminNotification => ({
    id, type, title: { ar: arT, en: enT }, body: { ar: arB, en: enB }, href, read, createdAt,
  });
  const notifications: AdminNotification[] = [
    notification("nt_1", "application", "طلب انضمام جديد", "New wash application", "واش هاب – الشيخ زايد قدمت طلب انضمام.", "Wash Hub – Sheikh Zayed submitted an application.", "/applications/app_3", false, iso(now, -1, 9)),
    notification("nt_2", "complaint", "شكوى جديدة", "New complaint", "شكوى جودة على بولش الهرم – الشيخ زايد.", "Quality complaint at Pyramid Polish – Sheikh Zayed.", "/complaints/cp_1", false, iso(now, -1, 13)),
    notification("nt_3", "critical_review", "تقييم حرج (نجمة واحدة)", "Critical review (1 star)", "تقييم بنجمة واحدة أبلغت عنه المغسلة.", "A 1-star review reported by the wash.", "/reviews", false, iso(now, -2, 18)),
    notification("nt_4", "payment_issue", "فرق في التحصيل", "Collection discrepancy", "مبلغ محصل لا يطابق إجمالي الطلب في كارزن ووش.", "Collected amount does not match order total at Carzen Wash.", "/finance/transactions?filter=discrepancy", false, iso(now, -2, 12)),
    notification("nt_5", "unusual_activity", "عجز في وردية", "Shift cash shortage", "عجز ١٥٠ ج.م في وردية حسن طارق – مدينة نصر.", "150 EGP shortage on Hassan Tarek's shift – Nasr City.", "/washes/biz_carzen", true, iso(now, -1, 17, 15)),
    notification("nt_6", "system", "اكتمال النسخ الاحتياطي", "Backup completed", "تم أخذ نسخة احتياطية كاملة لقاعدة البيانات.", "A full database backup completed.", "/settings", true, iso(now, -3, 3)),
  ];

  const auditLogs: AuditLog[] = [
    audit("aud_s1", "admin", "au_sara", "suspend_wash", "businesses", "biz_dune", "active", "suspended", "شكاوى جودة متكررة", iso(now, -6, 14)),
    audit("aud_s2", "admin", "au_mona", "hide_review", "reviews", hiddenOne?.id ?? "rv_auto_0", "visible", "hidden", "محتوى دعائي (سبام)", iso(now, -5, 11)),
    audit("aud_s3", "admin", "au_omar", "reject_application", "applications", "app_gate", "pending", "rejected", "مستندات غير مكتملة", iso(now, -20, 10)),
    audit("aud_s4", "admin", "au_omar", "request_changes_application", "applications", "app_4", "pending", "needs_changes", "يرجى رفع صورة البطاقة الضريبية.", iso(now, -7, 10)),
    audit("aud_s5", "admin", "au_nour", "mark_payout_paid", "payouts", "po_1", "due", "paid", "Reference: TRX-88421", iso(now, -14, 12)),
    audit("aud_s6", "admin", "au_mona", "suspend_customer", "customers", customers[39].id, "active", "suspended", "محاولات حجز وهمية متكررة", iso(now, -4, 16)),
    audit("aud_s7", "admin", "au_sara", "update_commission_settings", "businesses", "biz_golden", "7", "9", "اتفاقية خدمات مميزة", iso(now, -30, 12)),
    ...orders.slice(0, 40).map((o, i) => audit(`aud_seed_${i}`, "system", "seed", "order.created", "orders", o.id, null, o.status, null, o.createdAt)),
  ];

  const adminNames = Object.fromEntries(admins.map((a) => [a.id, a.name]));
  auditLogs.forEach((log) => {
    log.actorName = log.actorType === "system" ? "النظام" : adminNames[log.actorId];
  });

  const db: MockDatabase = {
    seededAt: now.toISOString(),
    customers, vehicles, businesses, branches, services, staff, shifts, orders, payments,
    transactions, payouts, reviews, offers, complaints, applications, admins, notifications, auditLogs,
    settings: {
      general: {
        platformName: "Carzen",
        currency: "EGP",
        supportPhone: "+20 150 000 1111",
        supportEmail: "hello@carzen.demo",
        supportHours: { ar: "يومياً ٩:٠٠ ص – ٩:٠٠ م", en: "Daily 9:00 AM – 9:00 PM" },
      },
      bookingDefaults: {
        autoConfirm: false, slotIntervalMin: 30, leadTimeMin: 15, maxAdvanceDays: 7,
        freeCancelMin: 60, noShowGraceMin: 15, reminderMin: 45,
      },
      legal: {
        terms: {
          ar: "باستخدام كارزن فإنك تحجز خدمة غسيل لدى مغسلة مستقلة. السعر المعروض هو سعر المغسلة، والدفع يتم في الفرع نقدًا أو بالبطاقة. يجوز إلغاء الحجز مجانًا حتى المدة الموضحة قبل الموعد. كارزن وسيط تقني ولا تملك السيارات أثناء الخدمة.",
          en: "Carzen lets you book a wash with an independent car wash. The price shown is the wash's price, and payment happens at the branch by cash or card. You may cancel free of charge until the stated window before the slot. Carzen is a technology intermediary and does not take custody of the vehicle.",
        },
        privacy: {
          ar: "نحتفظ برقم موبايلك واسمك وسياراتك وحجوزاتك لتشغيل الخدمة وعرضها على المغسلة التي تحجز لديها.",
          en: "We store your mobile number, name, cars and bookings to run the service and show them to the wash you book.",
        },
      },
      catalogs: {
        areas: areas.map((a) => ({ ...a, active: true })),
        serviceCategories: [
          { id: "exterior", name: { ar: "غسيل خارجي", en: "Exterior wash" }, active: true },
          { id: "interior", name: { ar: "غسيل داخلي", en: "Interior wash" }, active: true },
          { id: "full", name: { ar: "داخلي وخارجي", en: "Interior + exterior" }, active: true },
          { id: "deep", name: { ar: "تنظيف عميق", en: "Deep cleaning" }, active: true },
        ],
        amenities: [
          { id: "waiting", name: { ar: "منطقة انتظار", en: "Waiting area" }, active: true },
          { id: "ac", name: { ar: "تكييف", en: "AC" }, active: true },
          { id: "wifi", name: { ar: "واي فاي", en: "Wi-Fi" }, active: true },
          { id: "card", name: { ar: "دفع بالبطاقة", en: "Card payment" }, active: true },
          { id: "coffee", name: { ar: "قهوة", en: "Coffee" }, active: true },
          { id: "covered", name: { ar: "منطقة مغطاة", en: "Covered area" }, active: true },
        ],
      },
      notificationTemplates: [
        { id: "tpl_confirmed", event: "booking.confirmed", audience: "customer", title: { ar: "تم تأكيد حجزك", en: "Your booking is confirmed" }, body: { ar: "حجزك {{number}} في {{branch}} يوم {{date}} مؤكد. كود الوصول: {{code}}", en: "Booking {{number}} at {{branch}} on {{date}} is confirmed. Check-in code: {{code}}" } },
        { id: "tpl_reminder", event: "booking.reminder", audience: "customer", title: { ar: "موعدك بعد قليل", en: "Your slot is coming up" }, body: { ar: "باقي {{minutes}} دقيقة على موعدك في {{branch}}.", en: "{{minutes}} minutes until your slot at {{branch}}." } },
        { id: "tpl_cancelled", event: "booking.cancelled", audience: "customer", title: { ar: "تم إلغاء الحجز", en: "Booking cancelled" }, body: { ar: "تم إلغاء الحجز {{number}}. السبب: {{reason}}", en: "Booking {{number}} was cancelled. Reason: {{reason}}" } },
        { id: "tpl_approved", event: "application.approved", audience: "owner", title: { ar: "تمت الموافقة على مغسلتك", en: "Your wash was approved" }, body: { ar: "مرحبًا بك في كارزن! أكمل إعداد الفروع لتبدأ في استقبال الحجوزات.", en: "Welcome to Carzen! Finish setting up your branches to start taking bookings." } },
        { id: "tpl_suspended", event: "wash.suspended", audience: "owner", title: { ar: "تم تعليق المغسلة", en: "Wash suspended" }, body: { ar: "تم تعليق {{wash}} مؤقتًا. السبب: {{reason}}", en: "{{wash}} was temporarily suspended. Reason: {{reason}}" } },
        { id: "tpl_complaint", event: "complaint.resolved", audience: "customer", title: { ar: "تم حل الشكوى", en: "Complaint resolved" }, body: { ar: "تم حل الشكوى {{ticket}}: {{resolution}}", en: "Complaint {{ticket}} resolved: {{resolution}}" } },
      ],
    },
    defaultCommissionPct: 7,
    roles: structuredClone(DEFAULT_ROLES_MATRIX),
    sessions: {},
    counters: { nextTicket: ticket + 1 },
    baseline: {
      customers: 12540,
      activeWashes: 87,
      branches: 132,
      bookingsToday: 420,
      completedToday: 352,
      gmvToday: 48500,
      platformRevenueToday: 3100,
    },
  };

  return db;
}

function audit(
  id: string, actorType: AuditLog["actorType"], actorId: string, action: string, entity: string,
  entityId: string, oldValue: string | null, newValue: string | null, reason: string | null, at: string,
): AuditLog {
  return { id, actorType, actorId, action, entity, entityId, branchId: null, oldValue, newValue, reason, at };
}

function timelineFor(status: OrderStatus, scheduledAt: string, source: OrderSource, customerId: string | null): TimelineEntry[] {
  const base = new Date(scheduledAt).getTime();
  const flow: OrderStatus[] = source === "walk_in"
    ? ["waiting", "in_service", "completed"]
    : ["pending", "confirmed", "waiting", "in_service", "completed"];
  let steps: OrderStatus[];
  if (status === "cancelled") steps = source === "walk_in" ? ["waiting", "cancelled"] : ["pending", "cancelled"];
  else if (status === "no_show") steps = ["pending", "confirmed", "no_show"];
  else steps = flow.slice(0, Math.max(1, flow.indexOf(status) + 1));
  // Realistic gaps: booking → confirm 6m, confirm → arrive (slot), arrive → start 9m, start → done = service.
  const gaps = [0, 6, 22, 9, 35, 4];
  let cursor = base - 37 * 60000;
  return steps.map((st, i) => {
    cursor += gaps[i] * 60000;
    return {
      status: st,
      at: new Date(cursor).toISOString(),
      byType: i === 0 && source !== "walk_in" ? "customer" : "staff",
      byId: i === 0 && source !== "walk_in" ? (customerId ?? "customer") : "st_samir",
    };
  });
}

/** Branch rating = average of visible reviews; business rating = average of rated branches. */
export function recomputeRatings(branches: Branch[], businesses: Business[], reviews: Review[]) {
  for (const b of branches) {
    const rs = reviews.filter((r) => r.branchId === b.id && r.status === "visible");
    b.reviewCount = rs.length;
    b.rating = rs.length ? Math.round((rs.reduce((s, r) => s + r.stars, 0) / rs.length) * 10) / 10 : 0;
  }
  for (const biz of businesses) {
    const rs = reviews.filter((r) => r.businessId === biz.id && r.status === "visible");
    biz.rating = rs.length ? Math.round((rs.reduce((s, r) => s + r.stars, 0) / rs.length) * 10) / 10 : 0;
  }
}
