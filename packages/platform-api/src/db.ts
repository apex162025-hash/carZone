import "server-only";

import type { AuditLog } from "@carzen/contracts/audit";
import type { Localized } from "@carzen/contracts/common";
import type { AdminNotification } from "@carzen/contracts/notifications";
import type { ActorType } from "@carzen/contracts/orders";
import fs from "node:fs";
import path from "node:path";

import { SCHEMA_VERSION, buildSeed } from "./seed";
import type { MockDatabase } from "./schema";

/**
 * Shared mock database.
 *
 * Every Carzen app (super-admin on :3100, vendor-portal on :3200, …) runs its
 * own Next.js server, so the store is a JSON file at the monorepo root
 * (`.carzen/platform-db.json`, override with CARZEN_DB_FILE). Each request
 * re-reads the file only when another process changed it (mtime check) and
 * successful mutations are written back atomically — an action in one portal
 * is visible in the other on the next request.
 */
const GLOBAL_KEY = "__CARZEN_PLATFORM_DB__";

type DbCache = { db: MockDatabase; mtimeMs: number };
type GlobalWithDb = typeof globalThis & { [GLOBAL_KEY]?: DbCache };

function dbFile(): string {
  // Apps run with their workspace folder as cwd; the store lives one level up (monorepo root).
  return process.env.CARZEN_DB_FILE ?? path.resolve(process.cwd(), "..", ".carzen", "platform-db.json");
}

function readFromDisk(): DbCache | null {
  const file = dbFile();
  try {
    const stat = fs.statSync(file);
    const db = JSON.parse(fs.readFileSync(file, "utf8")) as MockDatabase;
    if (db.schemaVersion !== SCHEMA_VERSION) return null;
    // Seed data is anchored to its calendar day — a store from a previous day is regenerated.
    if (!sameCalendarDay(new Date(db.seededAt), new Date())) return null;
    return { db, mtimeMs: stat.mtimeMs };
  } catch {
    return null;
  }
}

/** Writes the store to disk (temp file + rename, so readers never see a half-written file). */
export function persistDb(db: MockDatabase): void {
  const file = dbFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, file);
  (globalThis as GlobalWithDb)[GLOBAL_KEY] = { db, mtimeMs: fs.statSync(file).mtimeMs };
}

/**
 * Demo clock. The seed is built at "today 15:30" (matching
 * `carZone/shared/js/db.js`) and the clock then advances in real time from
 * that anchor, so timers, "since…" labels and action timestamps stay
 * consistent across both apps. Every API response carries it in
 * `X-Demo-Now` so browsers can calibrate.
 */
export function now(): Date {
  const cached = (globalThis as GlobalWithDb)[GLOBAL_KEY]?.db.clockAnchor;
  if (cached) return new Date(cached.demoMs + (Date.now() - cached.realMs));
  return seedNow();
}

/** Anchor used when (re)seeding: today at 15:30 local. */
export function seedNow(): Date {
  const d = new Date();
  d.setHours(15, 30, 0, 0);
  return d;
}

function sameCalendarDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function getDb(): MockDatabase {
  const g = globalThis as GlobalWithDb;
  let mtimeMs = -1;
  try {
    mtimeMs = fs.statSync(dbFile()).mtimeMs;
  } catch {
    /* no file yet */
  }
  if (g[GLOBAL_KEY] && g[GLOBAL_KEY].mtimeMs === mtimeMs) return g[GLOBAL_KEY].db;

  const fromDisk = mtimeMs >= 0 ? readFromDisk() : null;
  if (fromDisk) {
    g[GLOBAL_KEY] = fromDisk;
    return fromDisk.db;
  }
  const seeded = buildSeed(seedNow());
  persistDb(seeded);
  return seeded;
}

export function resetDb(): MockDatabase {
  const seeded = buildSeed(seedNow());
  persistDb(seeded);
  return seeded;
}

let counter = 0;

export function nid(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}

export function logAudit(
  db: MockDatabase,
  entry: {
    actorId: string;
    action: string;
    entity: string;
    entityId: string;
    oldValue?: unknown;
    newValue?: unknown;
    reason?: string | null;
    branchId?: string | null;
    actorType?: ActorType;
  },
): AuditLog {
  const toText = (v: unknown) =>
    v === undefined || v === null ? null : typeof v === "string" ? v : JSON.stringify(v);

  const log: AuditLog = {
    id: nid("aud"),
    actorType: entry.actorType ?? "admin",
    actorId: entry.actorId,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    branchId: entry.branchId ?? null,
    oldValue: toText(entry.oldValue),
    newValue: toText(entry.newValue),
    reason: entry.reason?.trim() || null,
    at: now().toISOString(),
    actorName: db.admins.find((a) => a.id === entry.actorId)?.name ?? db.staff.find((s) => s.id === entry.actorId)?.name,
  };
  db.auditLogs.unshift(log);
  return log;
}

export function pushAdminNotification(
  db: MockDatabase,
  type: AdminNotification["type"],
  title: Localized,
  body: Localized,
  href: string,
) {
  db.notifications.unshift({
    id: nid("nt"),
    type,
    title,
    body,
    href,
    read: false,
    createdAt: now().toISOString(),
  });
}

export function isSameDay(a: string | Date, b: string | Date): boolean {
  const da = new Date(a);
  const dbb = new Date(b);
  return (
    da.getFullYear() === dbb.getFullYear() &&
    da.getMonth() === dbb.getMonth() &&
    da.getDate() === dbb.getDate()
  );
}

export function daysAgo(n: number, from: Date = now()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
