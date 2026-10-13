import "server-only";

import type { AuditLog } from "@/types/audit";
import type { Localized } from "@/types/common";
import type { AdminNotification } from "@/types/notifications";
import type { ActorType } from "@/types/orders";
import { buildSeed } from "@/lib/mock-api/seed";
import type { MockDatabase } from "@/lib/mock-api/schema";

/**
 * In-memory mock database. Kept on `globalThis` so it survives dev HMR and is
 * shared by every route handler in the same Node process.
 */
const GLOBAL_KEY = "__CARZEN_SUPER_ADMIN_DB__";

type GlobalWithDb = typeof globalThis & { [GLOBAL_KEY]?: MockDatabase };

/**
 * Demo clock — today at 15:30 local, matching `carZone/shared/js/db.js`, so
 * "today" counters line up with the customer / wash demos.
 */
export function now(): Date {
  const d = new Date();
  d.setHours(15, 30, 0, 0);
  return d;
}

export function getDb(): MockDatabase {
  const g = globalThis as GlobalWithDb;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = buildSeed(now());
  }
  return g[GLOBAL_KEY];
}

export function resetDb(): MockDatabase {
  const g = globalThis as GlobalWithDb;
  g[GLOBAL_KEY] = buildSeed(now());
  return g[GLOBAL_KEY];
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
    at: new Date().toISOString(),
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
    createdAt: new Date().toISOString(),
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
