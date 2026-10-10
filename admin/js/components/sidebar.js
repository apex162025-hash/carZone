import { t, getLang } from "../../../shared/js/i18n.js";
import { getCurrentAdmin, checkPermission } from "../auth.js";
import { get } from "../../../shared/js/db.js";

export function renderSidebar(currentRoute) {
  const admin = getCurrentAdmin();
  const db = get();

  const pendingApps = db.washApplications?.filter((a) => a.status === "pending").length || 0;
  const openComplaints = db.complaints?.filter((c) => c.status === "open").length || 0;
  const unreadNotifs = db.notifications?.filter((n) => n.audience === "admin" && !n.read).length || 0;

  const sections = [
    {
      title: null,
      items: [
        { id: "dashboard", icon: "layout-dashboard", label: t("admin.nav.dashboard"), route: "#/dashboard", perm: "dashboard" },
      ],
    },
    {
      title: t("admin.nav.users"),
      items: [
        { id: "customers", icon: "users", label: t("admin.nav.customers"), route: "#/customers", perm: "customers" },
        { id: "owners", icon: "briefcase", label: t("admin.nav.owners"), route: "#/owners", perm: "washes" },
        { id: "employees", icon: "user-check", label: t("admin.nav.employees"), route: "#/employees", perm: "washes" },
      ],
    },
    {
      title: t("admin.nav.washes"),
      items: [
        { id: "washes", icon: "store", label: t("admin.nav.washes"), route: "#/washes", perm: "washes" },
        { id: "applications", icon: "file-plus", label: t("admin.nav.applications"), route: "#/applications", perm: "applications", badge: pendingApps, badgeType: "warning" },
        { id: "branches", icon: "map-pin", label: t("admin.nav.branches"), route: "#/branches", perm: "branches" },
      ],
    },
    {
      title: t("admin.nav.orders"),
      items: [
        { id: "orders", icon: "calendar-check", label: t("admin.nav.orders"), route: "#/orders", perm: "orders" },
        { id: "reviews", icon: "star", label: t("admin.nav.reviews"), route: "#/reviews", perm: "reviews" },
        { id: "complaints", icon: "alert-triangle", label: t("admin.nav.complaints"), route: "#/complaints", perm: "complaints", badge: openComplaints, badgeType: "danger" },
      ],
    },
    {
      title: t("admin.nav.offers"),
      items: [
        { id: "offers", icon: "tag", label: t("admin.nav.offers"), route: "#/offers", perm: "offers" },
        { id: "featured", icon: "sparkles", label: t("admin.nav.featured"), route: "#/featured", perm: "featured" },
      ],
    },
    {
      title: t("admin.nav.finance"),
      items: [
        { id: "finance", icon: "pie-chart", label: t("admin.nav.finance"), route: "#/finance", perm: "finance" },
        { id: "transactions", icon: "receipt", label: t("admin.nav.transactions"), route: "#/finance/transactions", perm: "transactions" },
        { id: "commission", icon: "percent", label: t("admin.nav.commission"), route: "#/finance/commission", perm: "commission" },
        { id: "payouts", icon: "wallet", label: t("admin.nav.payouts"), route: "#/finance/payouts", perm: "payouts" },
      ],
    },
    {
      title: t("admin.nav.reports"),
      items: [
        { id: "reports", icon: "bar-chart-3", label: t("admin.nav.reports"), route: "#/reports/users", perm: "reports" },
      ],
    },
    {
      title: t("admin.nav.settings"),
      items: [
        { id: "notifications", icon: "bell", label: t("admin.nav.notifications"), route: "#/notifications", perm: "dashboard", badge: unreadNotifs, badgeType: "info" },
        { id: "admins", icon: "shield-alert", label: t("admin.nav.admins"), route: "#/admins", perm: "admins" },
        { id: "roles", icon: "lock", label: t("admin.nav.roles"), route: "#/roles", perm: "roles" },
        { id: "settings", icon: "settings", label: t("admin.nav.settings"), route: "#/settings", perm: "settings" },
        { id: "audit", icon: "history", label: t("admin.nav.audit"), route: "#/audit", perm: "audit" },
      ],
    },
  ];

  let html = `
    <div class="sidebar-header">
      <a href="#/dashboard" class="logo-badge">
        <div class="logo-icon">CZ</div>
        <div class="logo-text">
          Carzen Admin
          <small>${t("admin.title")}</small>
        </div>
      </a>
    </div>
    <div class="sidebar-nav">
  `;

  for (const section of sections) {
    const visibleItems = section.items.filter((item) => checkPermission(item.perm));
    if (visibleItems.length === 0) continue;

    if (section.title) {
      html += `<div class="nav-section-title">${section.title}</div>`;
    }

    for (const item of visibleItems) {
      const active = currentRoute.startsWith(item.route) || (item.id === "dashboard" && currentRoute === "#/");
      html += `
        <a href="${item.route}" class="nav-item ${active ? "active" : ""}">
          <i data-lucide="${item.icon}" class="icon"></i>
          <span>${item.label}</span>
          ${item.badge ? `<span class="badge ${item.badgeType || ""}">${item.badge}</span>` : ""}
        </a>
      `;
    }
  }

  const roleLabels = {
    super: { ar: "مسؤول رئيسي", en: "Super Admin" },
    operations: { ar: "عمليات وتشغيل", en: "Operations" },
    finance: { ar: "إدارة مالية", en: "Finance" },
    support: { ar: "دعم وخدمة عملاء", en: "Support" },
  };
  const roleName = roleLabels[admin.role]?.[getLang()] || admin.role;

  html += `
    </div>
    <div class="sidebar-footer">
      <div class="role-pill">
        <i data-lucide="shield" style="inline-size:16px;block-size:16px;color:var(--c-primary-600)"></i>
        <span>${roleName}</span>
      </div>
    </div>
  `;

  return html;
}
