import type { Localized } from "./common";

export type AdminNotificationType =
  | "application"
  | "complaint"
  | "critical_review"
  | "payment_issue"
  | "unusual_activity"
  | "system"
  | "finance_flag";

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title: Localized;
  body: Localized;
  href: string;
  read: boolean;
  createdAt: string;
}

export type NotificationListMeta = {
  unread: number;
};
