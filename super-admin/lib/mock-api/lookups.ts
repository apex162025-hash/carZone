import "server-only";

import type { Localized } from "@/types/common";
import type { Order, OrderListItem } from "@/types/orders";
import { MockApiError } from "@/lib/mock-api/http";
import type { MockDatabase } from "@/lib/mock-api/schema";

const EMPTY: Localized = { ar: "—", en: "—" };

export function findOrThrow<T extends { id: string }>(list: T[], id: string, label: string): T {
  const item = list.find((x) => x.id === id);
  if (!item) throw new MockApiError(`${label} غير موجود`, 404);
  return item;
}

export function businessName(db: MockDatabase, id: string): Localized {
  return db.businesses.find((b) => b.id === id)?.name ?? EMPTY;
}

export function branchName(db: MockDatabase, id: string | null): Localized {
  if (!id) return EMPTY;
  return db.branches.find((b) => b.id === id)?.name ?? EMPTY;
}

export function customerName(db: MockDatabase, id: string | null): string | null {
  if (!id) return null;
  return db.customers.find((c) => c.id === id)?.name ?? null;
}

export function adminName(db: MockDatabase, id: string | null): string | null {
  if (!id) return null;
  if (id === "seed") return "النظام";
  return db.admins.find((a) => a.id === id)?.name ?? db.staff.find((s) => s.id === id)?.name ?? null;
}

export function serviceName(order: Order): Localized {
  return order.items.find((i) => i.type === "primary")?.name ?? order.items[0]?.name ?? EMPTY;
}

export function toOrderListItem(db: MockDatabase, o: Order): OrderListItem {
  return {
    ...o,
    customerName: customerName(db, o.customerId),
    businessName: businessName(db, o.businessId),
    branchName: branchName(db, o.branchId),
    serviceName: serviceName(o),
  };
}

export function effectiveCommissionRate(db: MockDatabase, businessId: string): number {
  return db.businesses.find((b) => b.id === businessId)?.commissionRate ?? db.defaultCommissionPct;
}

export const UPCOMING_STATUSES = ["pending", "confirmed"] as const;
export const ACTIVE_STATUSES = ["pending", "confirmed", "waiting", "in_service"] as const;
