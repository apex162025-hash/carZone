import "server-only";

import type { VendorNotificationType } from "@carzen/contracts/vendor/catalog";
import { nid, now } from "../db";
import type { MockDatabase, VendorBusinessSettings } from "../schema";

export const DEFAULT_NOTIFICATION_PREFS: Record<VendorNotificationType, boolean> = {
  new_booking: true,
  booking_cancelled: true,
  cash_difference: true,
  high_cancellation: true,
  branch_issue: true,
  daily_summary: true,
  review: true,
  platform: true,
  payout: true,
};

export function vendorSettingsFor(db: MockDatabase, businessId: string): VendorBusinessSettings {
  if (!db.vendorSettings[businessId]) {
    db.vendorSettings[businessId] = {
      managerCanEditServices: false,
      phone: "",
      email: "",
      notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS },
    };
  }
  return db.vendorSettings[businessId];
}

/**
 * Adds a notification to the wash's inbox (owner + managers), unless the owner
 * muted that type. Used by both the vendor API and admin actions, so platform
 * decisions (suspension, payouts, moderation) reach the wash in real time.
 */
export function pushVendorNotification(
  db: MockDatabase,
  businessId: string,
  branchId: string | null,
  type: VendorNotificationType,
  title: string,
  body: string,
  href: string,
) {
  // Platform notices are always delivered; everything else respects preferences.
  if (type !== "platform" && !vendorSettingsFor(db, businessId).notificationPrefs[type]) return;
  db.vendorNotifications.unshift({
    id: nid("vn"),
    businessId,
    branchId,
    type,
    title: { ar: title, en: title },
    body: { ar: body, en: body },
    href,
    read: false,
    createdAt: now().toISOString(),
  });
}
