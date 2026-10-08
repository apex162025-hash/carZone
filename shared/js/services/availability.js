import { get, mutate, now, nid } from "../db.js";
import { read } from "../net.js";

const OCCUPY = new Set(["pending", "confirmed", "waiting", "in_service"]);

export function businessOf(db, branch) {
  return db.businesses.find((b) => b.id === branch.businessId);
}

export function isBookableBranch(db, branch) {
  if (!branch?.active) return false;
  const biz = businessOf(db, branch);
  return biz?.status === "active";
}

export function isOpenAt(branch, when) {
  const hours = branch.workingHours?.[when.getDay()];
  if (!hours || hours.closed) return false;
  const mins = when.getHours() * 60 + when.getMinutes();
  const open = clock(hours.open);
  let close = clock(hours.close);
  if (close === 0) close = 24 * 60;
  return mins >= open && mins < close;
}

export function dayClosed(branch, day) {
  const hours = branch.workingHours?.[day.getDay()];
  return !hours || hours.closed;
}

function clock(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
}

function overlaps(a0, a1, b0, b1) {
  return a0 < b1 && b0 < a1;
}

export function occupancy(db, branchId, start, durationMin) {
  const a0 = start.getTime();
  const a1 = a0 + durationMin * 60000;
  return db.orders.filter((o) => {
    if (o.branchId !== branchId || !OCCUPY.has(o.status)) return false;
    const b0 = new Date(o.scheduledAt).getTime();
    const b1 = b0 + o.durationMin * 60000;
    return overlaps(a0, a1, b0, b1);
  }).length;
}

export function slotStarts(db, branch, day, durationMin, nowDate) {
  if (!isBookableBranch(db, branch) || dayClosed(branch, day)) return [];
  const hours = branch.workingHours[day.getDay()];
  const open = clock(hours.open);
  let close = clock(hours.close);
  if (close === 0) close = 24 * 60;
  const step = branch.settings.slotIntervalMin || 30;
  const lead = branch.settings.leadTimeMin || 0;
  const breakStart = hours.break ? clock(hours.break.start) : null;
  const breakEnd = hours.break ? clock(hours.break.end) : null;
  const out = [];
  for (let m = open; m + durationMin <= close; m += step) {
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    start.setMinutes(m);
    if (start.getTime() < nowDate.getTime() + lead * 60000) continue;
    const endMin = m + durationMin;
    if (breakStart != null && overlaps(m, endMin, breakStart, breakEnd)) continue;
    const blocked = (branch.blockedSlots || []).some((b) => overlaps(
      start.getTime(), start.getTime() + durationMin * 60000, new Date(b.start).getTime(), new Date(b.end).getTime(),
    ));
    if (blocked) continue;
    const used = occupancy(db, branch.id, start, durationMin);
    if (used >= branch.capacity) continue;
    out.push({
      start: start.toISOString(),
      free: branch.capacity - used,
      few: branch.capacity - used === 1,
    });
  }
  return out;
}

export function nextSlots(db, branch, durationMin, count, nowDate) {
  const slots = slotStarts(db, branch, nowDate, durationMin, nowDate);
  return slots.slice(0, count);
}

export function hasSlotWithin(db, branch, durationMin, windowMin, nowDate) {
  const limit = nowDate.getTime() + windowMin * 60000;
  return slotStarts(db, branch, nowDate, durationMin, nowDate)
    .some((s) => new Date(s.start).getTime() <= limit);
}

export function isSlotFree(db, branch, startIso, durationMin) {
  if (!isBookableBranch(db, branch)) return false;
  const start = new Date(startIso);
  const slots = slotStarts(db, branch, start, durationMin, new Date(0));
  return slots.some((s) => new Date(s.start).getTime() === start.getTime());
}

export async function loadSlots(branchId, durationMin, dayIso) {
  return read(() => {
    const db = get();
    const branch = db.branches.find((b) => b.id === branchId);
    const day = new Date(dayIso);
    return slotStarts(db, branch, day, durationMin, now());
  });
}

export function releaseNote() {
  return OCCUPY;
}

void mutate;
void nid;
