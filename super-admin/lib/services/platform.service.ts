import { getData, getPaginated, send } from "@/lib/api/request";
import type { AuditListMeta, AuditListParams, AuditLogListItem } from "@/types/audit";
import type { AdminNotification, NotificationListMeta } from "@/types/notifications";
import type { SearchResponse } from "@/types/search";
import type { PlatformSettings, UpdateSettingsPayload } from "@/types/settings";

export function fetchSettings() {
  return getData<PlatformSettings>("/admin/settings", undefined, "تعذر تحميل الإعدادات");
}

export function updateSettings({ section, value, reason }: UpdateSettingsPayload) {
  return send<PlatformSettings>("put", `/admin/settings/${section}`, { value, reason });
}

export function fetchAuditLogs(params: AuditListParams) {
  return getPaginated<AuditLogListItem, AuditListMeta>("/admin/audit", params, "تعذر تحميل سجل التدقيق");
}

export function fetchNotifications(filter: string, page = 1) {
  return getPaginated<AdminNotification, NotificationListMeta>(
    "/admin/notifications",
    { filter, page },
    "تعذر تحميل الإشعارات",
  );
}

export function markNotificationRead(id: string) {
  return send<AdminNotification>("post", `/admin/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return send<null>("post", "/admin/notifications/read-all");
}

export function globalSearch(q: string) {
  return getData<SearchResponse>("/admin/search", { q });
}

export function resetDemoData() {
  return send<null>("post", "/admin/system/reset");
}
