import { parseClock } from "./format.js";

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function iso(now, dayOffset, hh, mm = 0) {
  const d = new Date(now);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

function week(open, close, closedDays = []) {
  return Array.from({ length: 7 }, (_, i) => ({
    open, close, closed: closedDays.includes(i),
  }));
}

function nid(prefix, n) {
  return `${prefix}_${String(n).padStart(3, "0")}`;
}

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const NAMES = [
  "Ahmed Hassan","Mona Salah","Omar Fathy","Nour Adel","Hassan Magdy","Layla Mostafa",
  "Youssef Kamal","Farah Nabil","Mahmoud Eid","Salma Hassan","Karim Tarek","Hana Osama",
  "Tamer Shawky","Dina Hany","Ali Gaber","Mariam Samir","Sherif Lotfy","Aya Khaled",
  "Hossam Reda","Nada Fouad","Walid Nasser","Reem Ashraf","Bassem Lotfy","Sara Hatem",
  "Adel Sobhy","Maya Refaat","Ibrahim Zaki","Lina Farid","Samer Wagdy","Hagar Emad",
  "Ramy Adel","Yara Mostafa","Fady Nabil","Mai Hassan","Khaled Saad","Noha Tamer",
  "Amr Yassin","Jana Sherif","Wael Mamdouh","Passant Ali",
];

const MAKES = [
  ["Toyota", ["Corolla", "Camry", "Yaris"]],
  ["Hyundai", ["Elantra", "Tucson", "Accent"]],
  ["Kia", ["Sportage", "Cerato", "Picanto"]],
  ["Nissan", ["Sunny", "Qashqai"]],
  ["Chevrolet", ["Optra", "Captiva"]],
  ["MG", ["MG 5", "HS"]],
];
const COLOR_KEYS = ["white", "black", "silver", "gray", "blue", "red", "green", "beige"];

export function buildSeed(now) {
  const rand = mulberry32(20261008);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const areas = [
    { id: "nasr", name: { ar: "مدينة نصر", en: "Nasr City" }, lat: 30.0566, lng: 31.3301 },
    { id: "helio", name: { ar: "مصر الجديدة", en: "Heliopolis" }, lat: 30.091, lng: 31.322 },
    { id: "nc", name: { ar: "التجمع", en: "New Cairo" }, lat: 30.0074, lng: 31.4913 },
    { id: "maadi", name: { ar: "المعادي", en: "Maadi" }, lat: 29.9602, lng: 31.2497 },
    { id: "zamalek", name: { ar: "الزمالك", en: "Zamalek" }, lat: 30.0626, lng: 31.2194 },
    { id: "moh", name: { ar: "المهندسين", en: "Mohandessin" }, lat: 30.0554, lng: 31.2001 },
    { id: "zayed", name: { ar: "الشيخ زايد", en: "Sheikh Zayed" }, lat: 30.0278, lng: 30.9746 },
    { id: "oct", name: { ar: "٦ أكتوبر", en: "6th of October" }, lat: 29.972, lng: 30.944 },
  ];
  const areaById = Object.fromEntries(areas.map((a) => [a.id, a]));

  const businesses = [
    biz("biz_carzen", "كارزن ووش", "Carzen Wash", "Khaled Mansour", "active", 7),
    biz("biz_nile", "بريق النيل", "Nile Sparkle", "Hany Mourad", "active", 7),
    biz("biz_palm", "رغوة النخيل", "Palm Foam", "Sherine Adel", "active", 7),
    biz("biz_lotus", "لوتس أوتو سبا", "Lotus Auto Spa", "Tarek Hosny", "active", 8),
    biz("biz_corniche", "نظافة الكورنيش", "Corniche Clean", "Rania Fouad", "active", 7),
    biz("biz_pyramid", "بولش الهرم", "Pyramid Polish", "Sameh Lotfy", "active", 7),
    biz("biz_oasis", "لمعان الواحة", "Oasis Shine", "Heba Nasser", "active", 7),
    biz("biz_golden", "الإطار الذهبي", "Golden Tire Wash", "Wael Sabry", "active", 9),
    biz("biz_dune", "كثبان حمراء", "Red Dune Wash", "Nader Fathy", "suspended", 7, "Repeated quality complaints"),
    biz("biz_gate", "مغسلة البوابة", "Gate Wash", "Ola Samir", "rejected", 7, "Incomplete documents"),
  ];

  const branchDefs = [
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

  const branches = branchDefs.map((b) => ({
    id: b[0], businessId: b[1],
    name: { ar: b[3], en: b[4] },
    area: b[2],
    address: {
      ar: `${areaById[b[2]].name.ar}، القاهرة`,
      en: `${areaById[b[2]].name.en}, Cairo`,
    },
    lat: b[5], lng: b[6],
    phone: "+20 2 555 0142",
    photos: ["0", "1", "2", "3"],
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
    blockedSlots: b[0] === "br_helio" ? [{ start: iso(now, 1, 12), end: iso(now, 1, 13) }] : [],
    rating: 0,
    reviewCount: 0,
  }));
  // price multiplier stored beside def
  const mult = Object.fromEntries(branchDefs.map((b) => [b[0], b[11]]));

  const services = [];
  const svc = (branchId, key, type, category, name, price, durationMin) => {
    const row = {
      id: `svc_${branchId}_${key}`,
      branchId, type, category, name,
      description: {
        ar: type === "addon" ? "إضافة اختيارية على الخدمة الأساسية." : "خدمة غسيل بمعايير كارزن.",
        en: type === "addon" ? "Optional extra on the main service." : "A Carzen-standard wash service.",
      },
      price, durationMin, active: true,
    };
    services.push(row);
    return row;
  };
  for (const b of branches) {
    const m = b.id === "br_nasr" ? 1 : mult[b.id];
    const price = (n) => (b.id === "br_nasr" ? n : Math.max(20, Math.round(n * m)));
    svc(b.id, "ext", "primary", "exterior", { ar: "غسيل خارجي", en: "Exterior Wash" }, price(100), 20);
    svc(b.id, "int", "primary", "interior", { ar: "غسيل داخلي", en: "Interior Wash" }, price(100), 25);
    svc(b.id, "full", "primary", "full", { ar: "غسيل داخلي وخارجي", en: "Interior + Exterior" }, price(180), 40);
    svc(b.id, "deep", "primary", "deep", { ar: "تنظيف عميق (بخار)", en: "Deep Cleaning (Steam)" }, price(300), 60);
    svc(b.id, "tire", "addon", "exterior", { ar: "تنظيف الإطارات", en: "Tire Cleaning" }, price(30), 5);
    svc(b.id, "air", "addon", "interior", { ar: "معطر جو", en: "Air Freshener" }, price(20), 2);
    svc(b.id, "wax", "addon", "exterior", { ar: "تلميع بالشمع", en: "Wax Polish" }, price(60), 15);
  }

  const customers = NAMES.map((name, i) => ({
    id: i === 0 ? "cu_ahmed" : nid("cu", i + 1),
    name,
    phone: i === 0 ? "+20 100 123 4567" : prettyPhone(1100000000 + i * 137),
    avatar: null,
    status: i === 39 ? "suspended" : "active",
    createdAt: iso(now, -120 + i, 10),
    lastActiveAt: iso(now, -i, 12),
  }));

  const vehicles = [
    vehicle("ve_corolla", "cu_ahmed", "Toyota", "Corolla", 2021, "white", "ABC123", true),
    vehicle("ve_sportage", "cu_ahmed", "Kia", "Sportage", 2023, "black", "KLM482", false),
  ];
  let extra = 0;
  for (let i = 1; i < customers.length; i += 1) {
    const [make, models] = MAKES[i % MAKES.length];
    const color = COLOR_KEYS[i % COLOR_KEYS.length];
    vehicles.push(vehicle(
      nid("ve", vehicles.length + 1),
      customers[i].id, make, models[0], 2016 + (i % 9), color,
      plateFrom(i), true,
    ));
    if (extra < 14) {
      vehicles.push(vehicle(
        nid("ve", vehicles.length + 1),
        customers[i].id, MAKES[(i + 2) % MAKES.length][0], MAKES[(i + 2) % MAKES.length][1][1] || models[0],
        2018 + (i % 6), COLOR_KEYS[(i + 3) % COLOR_KEYS.length], plateFrom(100 + i), false,
      ));
      extra += 1;
    }
  }

  const staff = [];
  const ownerIds = {};
  businesses.forEach((b, i) => {
    const id = `st_owner_${b.id}`;
    ownerIds[b.id] = id;
    staff.push(member(id, b.id, b.id === "biz_carzen" ? "br_nasr" : branches.find((x) => x.businessId === b.id).id, b.ownerName, prettyPhone(1200000000 + i), "owner", 100));
  });
  staff.push(member("st_samir", "biz_carzen", "br_nasr", "Ahmed Samir", "+20 100 555 0101", "employee", 10, { confirmBooking: true, collectPayment: true, runService: true }));
  staff.push(member("st_adel", "biz_carzen", "br_nasr", "Mohamed Adel", "+20 100 555 0102", "manager", 20, { confirmBooking: true, cancelOrder: true, closeShift: true, editServices: true, refund: true, collectPayment: true, runService: true, manageStaff: true }));
  staff.push(member("st_hassan", "biz_carzen", "br_nasr", "Hassan Tarek", "+20 100 555 0103", "employee", 10));
  staff.push(member("st_youssef", "biz_carzen", "br_nasr", "Youssef Nabil", "+20 100 555 0104", "employee", 10));
  staff.push(member("st_karim", "biz_carzen", "br_nasr", "Karim Fathy", "+20 100 555 0105", "employee", 10));
  for (const b of branches) {
    if (b.id === "br_nasr") continue;
    staff.push(member(`st_emp_${b.id}`, b.businessId, b.id, `Employee ${b.id}`, "+20 100 555 0199", "employee", 10));
  }
  staff.forEach((s) => {
    if (s.role === "employee") {
      s.scheduledShifts = [{ start: "09:00", end: "17:00", days: [0, 1, 2, 3, 4, 5, 6] }];
    }
  });

  const seq = { app: 9880, walk_in: 19968, phone: 30001 };
  const quota = { app: 121, walk_in: 77, phone: 22 };
  const usedCodes = new Set(["5K8P2"]);
  const orders = [];
  const payments = [];
  const transactions = [];

  function nextCode() {
    let c = "";
    do {
      c = Array.from({ length: 5 }, () => ALPHA[Math.floor(rand() * ALPHA.length)]).join("");
    } while (usedCodes.has(c));
    usedCodes.add(c);
    return c;
  }
  function takeNumber(source) {
    const n = seq[source];
    seq[source] += 1;
    quota[source] -= 1;
    return `CZ-${String(n).padStart(5, "0")}`;
  }

  function addOrder(source, partial) {
    if (quota[source] < 0) throw new Error(`quota ${source}`);
    const branch = branches.find((b) => b.id === partial.branchId);
    const business = businesses.find((b) => b.id === branch.businessId);
    const items = partial.items;
    const subtotal = items.reduce((s, it) => s + it.price, 0);
    const total = partial.total ?? subtotal;
    const durationMin = items.reduce((s, it) => s + it.durationMin, 0);
    const order = {
      id: partial.id || `ord_${partial.number || orders.length}`,
      number: takeNumber(source),
      code: nextCode(),
      source,
      customerId: partial.customerId || null,
      vehicleId: partial.vehicleId || null,
      plate: partial.plate || "",
      businessId: branch.businessId,
      branchId: branch.id,
      items,
      subtotal,
      discount: partial.discount || null,
      offerId: partial.offerId || null,
      total,
      durationMin,
      scheduledAt: partial.scheduledAt,
      status: partial.status,
      paymentStatus: partial.paymentStatus,
      paymentMethod: partial.paymentMethod || null,
      assignedStaffId: partial.assignedStaffId || null,
      timeline: partial.timeline || timelineFor(partial.status, partial.scheduledAt, source, partial.customerId),
      notes: partial.notes || [],
      cancel: partial.cancel || null,
      closedInShiftId: partial.closedInShiftId || null,
      createdAt: partial.createdAt || partial.scheduledAt,
      reminderSent: false,
      createdAfterSeed: false,
    };
    order.id = partial.id || `ord_${order.number}`;
    orders.push(order);
    if (partial.paymentStatus === "paid") {
      payments.push({
        id: `pay_${order.id}`,
        orderId: order.id,
        amount: partial.paidAmount ?? total,
        method: partial.paymentMethod || "cash",
        collectedBy: partial.assignedStaffId || "st_samir",
        collectedAt: partial.scheduledAt,
        status: "paid",
      });
    }
    if (partial.status !== "cancelled" && partial.status !== "no_show") {
      const rate = business.commissionRate || 7;
      const commission = Math.round(total * rate) / 100;
      transactions.push({
        id: `txn_${order.id}`,
        orderId: order.id,
        businessId: business.id,
        gross: total,
        commissionRate: rate,
        commission,
        netToWash: Math.round((total - commission) * 100) / 100,
        date: partial.scheduledAt,
        status: partial.paymentStatus === "paid" ? "paid" : "pending",
        flag: partial.flag || null,
      });
    }
    return order;
  }

  const fullItem = {
    serviceId: "svc_br_nasr_full",
    name: { ar: "غسيل داخلي وخارجي", en: "Interior + Exterior" },
    type: "primary", price: 180, durationMin: 40,
  };
  const extItem = (branchId) => {
    const s = services.find((x) => x.id === `svc_${branchId}_ext`);
    return { serviceId: s.id, name: s.name, type: "primary", price: s.price, durationMin: s.durationMin };
  };

  const ahmedDays = [14, 17, 19, 21, 23, 25, 27];
  ahmedDays.forEach((d, i) => {
    addOrder("app", {
      id: `ord_ahmed_${i}`,
      customerId: "cu_ahmed",
      vehicleId: "ve_corolla",
      plate: "ABC123",
      branchId: "br_nasr",
      items: [fullItem],
      scheduledAt: iso(now, -d, 11),
      status: "completed",
      paymentStatus: "paid",
      paymentMethod: "cash",
      assignedStaffId: "st_samir",
    });
  });
  addOrder("app", {
    id: "ord_ahmed_ns",
    customerId: "cu_ahmed",
    vehicleId: "ve_corolla",
    plate: "ABC123",
    branchId: "br_nasr",
    items: [fullItem],
    scheduledAt: iso(now, -30, 16),
    status: "no_show",
    paymentStatus: "pending",
  });

  for (let i = 0; i < 14; i += 1) {
    addOrder("app", {
      id: `ord_host_${i}`,
      customerId: customers[1 + (i % 20)].id,
      vehicleId: vehicles.find((v) => v.customerId === customers[1 + (i % 20)].id)?.id || null,
      plate: "HOST" + i,
      branchId: "br_nasr",
      items: [extItem("br_nasr")],
      scheduledAt: iso(now, -(2 + i), 12),
      status: "completed",
      paymentStatus: "paid",
      paymentMethod: "cash",
      assignedStaffId: "st_hassan",
    });
  }

  for (let i = 0; i < 18; i += 1) {
    const source = i < 10 ? "app" : i < 16 ? "walk_in" : "phone";
    const pendingPay = i === 0;
    addOrder(source, {
      id: `ord_today_${i}`,
      customerId: source === "walk_in" && i % 2 ? null : customers[2 + (i % 15)].id,
      plate: "TDY" + i,
      branchId: "br_nasr",
      items: [extItem("br_nasr")],
      scheduledAt: iso(now, 0, 9 + Math.floor(i / 3), (i % 3) * 15),
      status: "completed",
      paymentStatus: pendingPay ? "pending" : "paid",
      paymentMethod: pendingPay ? null : "cash",
      assignedStaffId: "st_samir",
      closedInShiftId: pendingPay ? null : "sh_open_prev",
    });
  }
  for (let i = 0; i < 3; i += 1) {
    addOrder("app", {
      id: `ord_wait_${i}`,
      customerId: customers[5 + i].id,
      plate: "WAIT" + i,
      branchId: "br_nasr",
      items: [{ ...extItem("br_nasr") }],
      scheduledAt: iso(now, 0, 16, 0),
      status: "waiting",
      paymentStatus: "pending",
      assignedStaffId: null,
    });
  }
  for (let i = 0; i < 4; i += 1) {
    addOrder(i < 2 ? "app" : "walk_in", {
      id: `ord_svc_${i}`,
      customerId: customers[8 + i].id,
      plate: "SVC" + i,
      branchId: "br_nasr",
      items: [extItem("br_nasr")],
      scheduledAt: iso(now, 0, 15, 0),
      status: "in_service",
      paymentStatus: "pending",
      assignedStaffId: i % 2 ? "st_youssef" : "st_samir",
    });
  }
  addOrder("app", {
    id: "ord_tmw_1", customerId: customers[3].id, plate: "TMW1", branchId: "br_nasr",
    items: [fullItem], scheduledAt: iso(now, 1, 10), status: "confirmed", paymentStatus: "pending",
  });
  addOrder("app", {
    id: "ord_tmw_2", customerId: customers[4].id, plate: "TMW2", branchId: "br_nasr",
    items: [fullItem], scheduledAt: iso(now, 1, 10, 30), status: "confirmed", paymentStatus: "pending",
  });
  addOrder("app", {
    id: "ord_py_1", customerId: customers[6].id, plate: "PY1", branchId: "br_pyramid_zay",
    items: [extItem("br_pyramid_zay")], scheduledAt: iso(now, 1, 11), status: "confirmed", paymentStatus: "pending",
  });
  addOrder("app", {
    id: "ord_py_2", customerId: customers[7].id, plate: "PY2", branchId: "br_pyramid_zay",
    items: [extItem("br_pyramid_zay")], scheduledAt: iso(now, 1, 12), status: "confirmed", paymentStatus: "pending",
  });

  const activeBranches = branches.filter((b) => b.active && businesses.find((z) => z.id === b.businessId).status === "active");
  let guard = 0;
  while (quota.app + quota.walk_in + quota.phone > 0) {
    guard += 1;
    if (guard > 400) throw new Error("filler overflow " + JSON.stringify(quota));
    const options = ["app", "walk_in", "phone"].filter((s) => quota[s] > 0);
    const source = options[Math.floor(rand() * options.length)];
    const branch = activeBranches[Math.floor(rand() * activeBranches.length)];
    const prim = services.filter((s) => s.branchId === branch.id && s.type === "primary");
    const service = prim[Math.floor(rand() * prim.length)];
    const roll = rand();
    const status = roll < 0.8 ? "completed" : roll < 0.92 ? "cancelled" : "no_show";
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
      paymentMethod: status === "completed" ? "cash" : null,
      assignedStaffId: status === "completed" ? "st_samir" : null,
      cancel: status === "cancelled" ? { reason: "changed_plans", byType: "customer", byId: cust.id, at: iso(now, -daysAgo, hour), late: false } : null,
    });
  }

  if (seq.app !== 10001 || seq.walk_in !== 20045 || seq.phone !== 30023) {
    throw new Error(`counter drift app ${seq.app} walk ${seq.walk_in} phone ${seq.phone} orders ${orders.length}`);
  }

  const paidMismatch = payments.find((p) => p.orderId.startsWith("ord_host_"));
  if (paidMismatch) {
    paidMismatch.amount = 50;
    const txn = transactions.find((t) => t.orderId === paidMismatch.orderId);
    if (txn) txn.flag = "discrepancy";
  }

  const reviews = [];
  const reviewComments = [
    [{ ar: "شغل نظيف والموعد كان مظبوط.", en: "Clean work and the slot was on time." }, 5],
    [{ ar: "الداخلية رجعت جديدة.", en: "The interior looks new again." }, 5],
    [{ ar: "كويس بس الانتظار زاد شوية.", en: "Good, though the wait ran a bit long." }, 4],
    [{ ar: "سعر واضح وتعامل محترم.", en: "Clear price and polite staff." }, 5],
  ];
  ahmedDays.slice(1).forEach((d, i) => {
    reviews.push(review(`rv_ahmed_${i}`, `ord_ahmed_${i + 1}`, "cu_ahmed", "biz_carzen", "br_nasr", "svc_br_nasr_full", 5, reviewComments[i % 4][0], ["clean"], iso(now, -d, 15)));
  });
  for (let i = 0; i < 14; i += 1) {
    const stars = i < 10 ? 5 : 4;
    reviews.push(review(`rv_host_${i}`, `ord_host_${i}`, customers[1 + (i % 20)].id, "biz_carzen", "br_nasr", "svc_br_nasr_ext", stars, reviewComments[i % 4][0], stars === 5 ? ["clean"] : ["value"], iso(now, -(2 + i), 18)));
  }
  const otherCompleted = orders.filter((o) => o.status === "completed" && o.branchId !== "br_nasr" && o.customerId);
  if (otherCompleted.length < 100) {
    for (const o of orders) {
      if (otherCompleted.length >= 100) break;
      if (o.branchId === "br_nasr" || !o.customerId || o.status === "completed") continue;
      if (new Date(o.scheduledAt) >= now) continue;
      o.status = "completed";
      o.paymentStatus = "paid";
      otherCompleted.push(o);
    }
  }
  for (let i = 0; i < 100 && i < otherCompleted.length; i += 1) {
    const o = otherCompleted[i];
    const stars = 3 + (i % 3);
    reviews.push(review(`rv_auto_${i}`, o.id, o.customerId, o.businessId, o.branchId, o.items[0].serviceId, stars === 3 ? 4 : stars, reviewComments[i % 4][0], [], o.scheduledAt));
  }
  const reported = reviews.find((r) => r.branchId === "br_pyramid_zay") || reviews[reviews.length - 1];
  reported.stars = 1;
  reported.reportedByWash = true;
  reported.comment = { ar: "الخدمة كانت أقل من المتوقع بكثير.", en: "The service was far below what I expected." };
  reported.status = "visible";

  function recompute(list) {
    for (const b of branches) {
      const rs = list.filter((r) => r.branchId === b.id && r.status === "visible");
      const sum = rs.reduce((s, r) => s + r.stars, 0);
      b.reviewCount = rs.length;
      b.rating = rs.length ? Math.round((sum / rs.length) * 10) / 10 : 0;
    }
    for (const biz of businesses) {
      const rs = list.filter((r) => r.businessId === biz.id && r.status === "visible");
      const sum = rs.reduce((s, r) => s + r.stars, 0);
      biz.rating = rs.length ? Math.round((sum / rs.length) * 10) / 10 : 0;
    }
  }
  recompute(reviews);

  const exteriorIds = services.filter((s) => s.type === "primary" && s.category === "exterior").map((s) => s.id);
  const offers = [
    offer("of_platform", "platform", null, branches.map((b) => b.id), exteriorIds, "خصم ١٥٪ على الغسيل الخارجي", "15% off exterior washes", "على كل المغاسل المشاركة هذا الأسبوع.", "At participating washes this week.", "percent", 15, iso(now, -1, 0), iso(now, 5, 23), "active", true),
    offer("of_deep", "wash", "biz_carzen", ["br_nasr"], ["svc_br_nasr_deep"], "تنظيف عميق بخصم ١٥٪", "15% off deep cleaning", "على التنظيف بالبخار في مدينة نصر.", "Steam cleaning at Nasr City.", "percent", 15, iso(now, -2, 0), iso(now, 6, 23), "active", false),
    offer("of_nile", "wash", "biz_nile", ["br_nile_maadi"], [`svc_br_nile_maadi_full`], "٢٠ ج.م على الغسيل الكامل", "20 EGP off a full wash", "في فرع المعادي.", "At the Maadi branch.", "fixed", 20, iso(now, -1, 0), iso(now, 4, 23), "active", false),
    offer("of_soon", "platform", null, ["br_palm_nc"], [`svc_br_palm_nc_ext`], "عرض نهاية الأسبوع", "Weekend offer", "يبدأ قريبًا.", "Starts soon.", "percent", 10, iso(now, 3, 0), iso(now, 6, 23), "scheduled", false),
    offer("of_old", "wash", "biz_lotus", ["br_lotus_moh"], [`svc_br_lotus_moh_int`], "عرض منتهٍ", "Expired offer", "انتهى أمس.", "Ended yesterday.", "percent", 10, iso(now, -10, 0), iso(now, -1, 12), "expired", false),
    offer("of_draft", "wash", "biz_golden", ["br_golden_hel"], [`svc_br_golden_hel_wax`], "مسودة عرض", "Draft offer", "لم يُنشر.", "Not published.", "fixed", 15, iso(now, 1, 0), iso(now, 8, 0), "draft", false),
  ];

  const complaints = [
    complaint("cp_1", customers[6].id, "biz_pyramid", "br_pyramid_zay", "ord_py_1", "quality", "open"),
    complaint("cp_2", customers[7].id, "biz_pyramid", "br_pyramid_zay", "ord_py_2", "pricing", "in_review"),
    complaint("cp_3", customers[8].id, "biz_pyramid", "br_pyramid_zay", null, "behavior", "waiting"),
    complaint("cp_4", customers[9].id, "biz_pyramid", "br_pyramid_zay", null, "quality", "open"),
    complaint("cp_5", customers[10].id, "biz_nile", "br_nile_maadi", null, "booking", "resolved"),
    complaint("cp_6", customers[11].id, "biz_palm", "br_palm_nc", null, "refund", "closed"),
    complaint("cp_7", customers[12].id, "biz_lotus", "br_lotus_moh", null, "other", "in_review"),
    complaint("cp_8", "cu_ahmed", "biz_carzen", "br_nasr", "ord_ahmed_ns", "booking", "open"),
    complaint("cp_9", customers[13].id, "biz_golden", "br_golden_hel", null, "quality", "waiting"),
  ].map((c, i) => ({ ...c, createdAt: iso(now, - (i + 1), 13) }));

  const favorites = [
    { customerId: customers[2].id, branchId: "br_nasr" },
  ];

  const notifications = [
    note("nt_ahmed_review", "customer", "cu_ahmed", "review_reminder", "قيّم زيارتك الأخيرة", "Rate your last visit", "غسيل داخلي وخارجي في كارزن ووش – مدينة نصر.", "Interior + Exterior at Carzen Wash – Nasr City.", "#/booking/ord_ahmed_0", false, iso(now, -1, 18)),
    note("nt_ahmed_offer", "customer", "cu_ahmed", "offer", "خصم على الغسيل الخارجي", "Exterior wash offer", "١٥٪ هذا الأسبوع على الغسيل الخارجي.", "15% off exterior washes this week.", "#/offers", false, iso(now, 0, 9)),
    note("nt_staff", "staff", "st_samir", "shift", "وردية اليوم", "Today's shift", "وردية ٩:٠٠ ص إلى ٥:٠٠ م.", "Shift 9:00 AM to 5:00 PM.", "#/home", false, iso(now, 0, 8)),
    note("nt_owner", "owner", "st_owner_biz_carzen", "summary", "ملخص اليوم", "Today's summary", "هناك حجوزات بانتظار المتابعة.", "There are bookings to follow up.", "#/home", false, iso(now, 0, 9)),
    note("nt_admin", "admin", "au_omar", "complaint", "شكوى جديدة", "New complaint", "شكوى جودة على بولش الهرم.", "A quality complaint at Pyramid Polish.", "#/complaints/cp_1", false, iso(now, -1, 13)),
  ];

  const auditLogs = orders.slice(0, 60).map((o, i) => ({
    id: `aud_seed_${i}`,
    actorType: "system",
    actorId: "seed",
    action: "order.seed",
    entity: "order",
    entityId: o.id,
    branchId: o.branchId,
    oldValue: null,
    newValue: o.status,
    reason: null,
    at: o.createdAt,
  }));

  const shifts = [
    {
      id: "sh_short",
      staffId: "st_hassan",
      branchId: "br_nasr",
      scheduledStart: iso(now, -1, 9),
      scheduledEnd: iso(now, -1, 17),
      actualStart: iso(now, -1, 9, 4),
      actualEnd: iso(now, -1, 17, 12),
      ordersCompleted: 8,
      expectedCash: 1500,
      actualCash: 1350,
      difference: -150,
      reason: { ar: "عجز في الصندوق عند الإغلاق", en: "Cash drawer short at close" },
      reviewStatus: "open",
    },
    {
      id: "sh_samir_today",
      staffId: "st_samir",
      branchId: "br_nasr",
      scheduledStart: iso(now, 0, 9),
      scheduledEnd: iso(now, 0, 17),
      actualStart: iso(now, 0, 9, 1),
      actualEnd: null,
      ordersCompleted: 6,
      expectedCash: 0,
      actualCash: null,
      difference: null,
      reason: null,
      reviewStatus: "open",
    },
  ];

  const payouts = [
    { id: "po_1", businessId: "biz_carzen", periodStart: iso(now, -30, 0), periodEnd: iso(now, -16, 0), amountDue: 4200, amountPaid: 4200, status: "paid", reference: "TRX-88421" },
    { id: "po_2", businessId: "biz_pyramid", periodStart: iso(now, -15, 0), periodEnd: iso(now, -1, 0), amountDue: 1800, amountPaid: 0, status: "due", reference: null },
  ];

  const washApplications = [0, 1, 2].map((i) => ({
    id: `app_${i + 1}`,
    businessName: ["مغسلة النسيم", "كلين درايف", "واش هاب"][i],
    ownerName: ["مصطفى عادل", "هبة طارق", "كريم سمير"][i],
    phone: prettyPhone(1500000000 + i),
    email: `apply${i + 1}@carzen.demo`,
    address: "القاهرة",
    lat: 30.05 + i * 0.01,
    lng: 31.33,
    photos: [],
    services: ["Exterior Wash"],
    workingHours: week("09:00", "21:00"),
    capacity: 3 + i,
    documents: ["commercial-register.pdf"],
    status: "pending",
    reviewNote: null,
    submittedAt: iso(now, -(i + 1), 11),
  }));

  const adminUsers = [
    { id: "au_sara", name: "Sara Nabil", email: "sara@carzen.demo", role: "super", status: "active", password: "demo1234" },
    { id: "au_omar", name: "Omar Fathy", email: "omar@carzen.demo", role: "operations", status: "active", password: "demo1234" },
    { id: "au_nour", name: "Nour Salem", email: "nour@carzen.demo", role: "finance", status: "active", password: "demo1234" },
    { id: "au_mona", name: "Mona Adel", email: "mona@carzen.demo", role: "support", status: "active", password: "demo1234" },
  ];

  return {
    version: 1,
    seededAt: new Date(now).toISOString(),
    customers,
    vehicles,
    businesses,
    branches,
    services,
    staff,
    shifts,
    orders,
    payments,
    transactions,
    payouts,
    reviews,
    offers,
    favorites,
    complaints,
    washApplications,
    adminUsers,
    notifications,
    auditLogs,
    catalogs: {
      areas,
      serviceCategories: [
        { id: "exterior", name: { ar: "غسيل خارجي", en: "Exterior wash" } },
        { id: "interior", name: { ar: "غسيل داخلي", en: "Interior wash" } },
        { id: "full", name: { ar: "داخلي وخارجي", en: "Interior + exterior" } },
        { id: "deep", name: { ar: "تنظيف عميق", en: "Deep cleaning" } },
      ],
      amenities: ["waiting", "ac", "wifi", "card", "coffee", "covered"],
    },
    settings: {
      defaultCommissionPct: 7,
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
          ar: "نحتفظ برقم موبايلك واسمك وسياراتك وحجوزاتك لتشغيل الخدمة وعرضها على المغسلة التي تحجز لديها. البيانات في هذا العرض التجريبي تبقى على جهازك فقط ولا تُرسل إلى خادم.",
          en: "We store your mobile number, name, cars and bookings to run the service and show them to the wash you book. In this demo the data stays on your device and is not sent to a server.",
        },
      },
      support: {
        phone: "+20 150 000 1111",
        email: "hello@carzen.demo",
        hours: { ar: "يومياً ٩:٠٠ ص – ٩:٠٠ م", en: "Daily 9:00 AM – 9:00 PM" },
      },
    },
    counters: {
      nextAppBooking: "CZ-10001",
      nextWalkIn: "CZ-20045",
      nextPhone: "CZ-30023",
      bookingCodes: ["5K8P2"],
      nextTicket: 1042,
    },
    platformBaseline: {
      customers: 12540,
      activeWashes: 87,
      branches: 132,
      bookingsToday: 420,
      completedToday: 352,
      gmvToday: 48500,
      platformRevenueToday: 3100,
    },
  };
}

function biz(id, ar, en, ownerName, status, commissionRate, statusReason) {
  return {
    id, name: { ar, en }, ownerId: `st_owner_${id}`, ownerName, status,
    statusReason: statusReason || null, commissionRate, rating: 0, createdAt: "2025-01-15T10:00:00.000Z",
  };
}

function lotusHours() {
  return Array.from({ length: 7 }, (_, i) => ({
    open: "09:00", close: i === 4 ? "14:00" : "22:00", closed: false,
  }));
}

function member(id, businessId, branchId, name, phone, role, maxDiscountPct, extra = {}) {
  const base = {
    confirmBooking: role !== "employee",
    cancelOrder: role !== "employee",
    closeShift: role !== "employee",
    editServices: role === "owner" || role === "manager",
    refund: role === "owner" || role === "manager",
    collectPayment: true,
    runService: true,
    manageStaff: role === "owner" || role === "manager",
  };
  return {
    id, businessId, branchId, name, phone, role, status: "active", maxDiscountPct,
    permissions: { ...base, ...extra },
    password: "demo1234",
    scheduledShifts: [],
  };
}

function vehicle(id, customerId, make, model, year, color, plate, isDefault) {
  return { id, customerId, make, model, year, color, plate, plateNormalized: plate.replace(/[\s-]/g, "").toUpperCase(), isDefault };
}

function prettyPhone(n) {
  const d = String(n).replace(/\D/g, "").slice(-10);
  return `+20 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

function plateFrom(i) {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const a = letters[i % 23];
  const b = letters[(i * 3) % 23];
  const c = letters[(i * 7) % 23];
  return `${a}${b}${c}${String(100 + (i % 800)).padStart(3, "0")}`;
}

function timelineFor(status, scheduledAt, source, customerId) {
  const base = new Date(scheduledAt).getTime();
  const flow = source === "walk_in"
    ? ["waiting", "in_service", "completed"]
    : ["pending", "confirmed", "waiting", "in_service", "completed"];
  let steps;
  if (status === "cancelled") steps = source === "walk_in" ? ["waiting", "cancelled"] : ["pending", "cancelled"];
  else if (status === "no_show") steps = ["pending", "confirmed", "no_show"];
  else steps = flow.slice(0, Math.max(1, flow.indexOf(status) + 1));
  return steps.map((st, i) => ({
    status: st,
    at: new Date(base + i * 5 * 60000).toISOString(),
    byType: i === 0 && source !== "walk_in" ? "customer" : "staff",
    byId: i === 0 && source !== "walk_in" ? (customerId || "customer") : "st_samir",
  }));
}

function review(id, orderId, customerId, businessId, branchId, serviceId, stars, comment, tags, createdAt) {
  return {
    id, orderId, customerId, businessId, branchId, serviceId, stars, comment, tags,
    reply: null, status: "visible", hiddenReason: null, reportedByWash: false, createdAt,
  };
}

function offer(id, scope, businessId, branchIds, serviceIds, arT, enT, arD, enD, discountType, discountValue, startAt, endAt, status, featured) {
  return {
    id, scope, businessId, branchIds, serviceIds,
    title: { ar: arT, en: enT }, description: { ar: arD, en: enD },
    discountType, discountValue, startAt, endAt, status, featured,
  };
}

function complaint(id, customerId, businessId, branchId, orderId, category, status) {
  return {
    id, customerId, businessId, branchId, orderId, category,
    description: "The visit did not match what was confirmed in the booking.",
    status, assignedAdminId: status === "open" ? null : "au_mona",
    notes: [], resolution: status === "resolved" || status === "closed" ? "Reviewed with the branch manager." : null,
    createdAt: null,
  };
}

function note(id, audience, userId, type, arT, enT, arB, enB, link, read, createdAt) {
  return { id, audience, userId, type, title: { ar: arT, en: enT }, body: { ar: arB, en: enB }, link, read, createdAt };
}

export function assertSeed(db, now) {
  const errors = [];
  const check = (cond, msg) => { if (!cond) errors.push(msg); };
  check(db.customers.length === 40, "customers " + db.customers.length);
  check(db.vehicles.length === 55, "vehicles " + db.vehicles.length);
  check(db.businesses.filter((b) => b.status === "active").length === 8, "active biz");
  check(db.businesses.some((b) => b.status === "suspended") && db.businesses.some((b) => b.status === "rejected"), "biz status");
  check(db.branches.length === 14, "branches");
  check(db.orders.length === 220, "orders " + db.orders.length);
  const ahmed = db.orders.filter((o) => o.customerId === "cu_ahmed" && o.status === "completed");
  check(ahmed.length === 7, "ahmed completed " + ahmed.length);
  check(ahmed.reduce((s, o) => s + o.total, 0) === 1260, "spent");
  const last = ahmed.map((o) => new Date(o.scheduledAt)).sort((a, b) => b - a)[0];
  const days = Math.round((new Date(now).setHours(0, 0, 0, 0) - new Date(last).setHours(0, 0, 0, 0)) / 86400000);
  check(days === 14, "last days " + days);
  const today = db.orders.filter((o) => o.branchId === "br_nasr" && new Date(o.scheduledAt).toDateString() === new Date(now).toDateString());
  check(today.filter((o) => o.status === "waiting").length === 3, "waiting");
  check(today.filter((o) => o.status === "in_service").length === 4, "in service");
  check(today.filter((o) => o.status === "completed").length === 18, "completed today");
  check(today.filter((o) => o.status === "completed" && o.paymentStatus === "pending").length === 1, "pay pending");
  check(db.counters.nextAppBooking === "CZ-10001", "next app");
  check(db.counters.bookingCodes[0] === "5K8P2", "code");
  check(db.counters.nextWalkIn === "CZ-20045", "walk");
  const nasrReviews = db.reviews.filter((r) => r.branchId === "br_nasr" && r.status === "visible");
  const avg = nasrReviews.reduce((s, r) => s + r.stars, 0) / nasrReviews.length;
  check(Math.round(avg * 10) / 10 === 4.8, "rating " + avg + " n " + nasrReviews.length);
  check(db.reviews.length >= 120, "reviews " + db.reviews.length);
  check(db.complaints.filter((c) => c.branchId === "br_pyramid_zay").length === 4, "complaints");
  const upcomingPy = db.orders.filter((o) => o.branchId === "br_pyramid_zay" && ["pending", "confirmed"].includes(o.status) && new Date(o.scheduledAt) > now);
  check(upcomingPy.length === 2, "pyramid upcoming " + upcomingPy.length);
  check(db.transactions.some((t) => t.flag === "discrepancy"), "discrepancy");
  check(db.shifts.some((s) => s.difference === -150), "shift");
  check(db.reviews.some((r) => r.stars === 1 && r.reportedByWash), "one star");
  check(db.customers[0].phone === "+20 100 123 4567", "phone");
  check(db.vehicles.some((v) => v.plate === "ABC123" && v.isDefault), "plate");
  const full = db.services.find((s) => s.id === "svc_br_nasr_full");
  check(full.price === 180 && full.durationMin === 40, "full price");
  return errors;
}

void parseClock;
