import { get, mutate, now } from "../../../../shared/js/db.js";
import { t, L } from "../../../../shared/js/i18n.js";
import { money, formatDateTime, formatTime, initials } from "../../../../shared/js/format.js";
import { paintIcons } from "../../../../shared/js/dom.js";
import { toast } from "../../../../shared/js/ui.js";
import { currentStaff, currentBranch } from "../state.js";

export function meScreen(root) {
  const db = get();
  const staff = currentStaff();
  const branch = currentBranch();

  // Employee numbers
  const myCompletedOrders = db.orders.filter((o) => o.assignedStaffId === staff.id && o.status === "completed");
  const myTotalRevenue = myCompletedOrders.reduce((s, o) => s + o.total, 0);

  // Past shifts for this employee
  const pastShifts = db.shifts.filter((s) => s.staffId === staff.id && s.actualEnd);

  root.innerHTML = `
    <header class="topbar">
      <div></div>
      <h1>${t("emp.nav.me")}</h1>
      <div></div>
    </header>

    <div class="screen-body" style="padding:14px 16px 80px">
      <!-- Profile Header Card -->
      <div class="card pad between" style="margin-block-end:16px">
        <div class="row" style="gap:14px">
          <div class="avatar lg">${initials(staff.name)}</div>
          <div>
            <b style="font-size:var(--fs-18)">${staff.name}</b>
            <div class="small muted">${staff.role === "manager" ? "مدير فرع" : "موظف غسيل وتشغيل"}</div>
            <div class="small num">${staff.phone}</div>
          </div>
        </div>
        <span class="badge" data-status="confirmed">نشط</span>
      </div>

      <!-- Performance Numbers (EM-29) -->
      <div class="card pad" style="margin-block-end:16px">
        <h3 style="font-size:var(--fs-16);margin-block-end:12px">الأداء الشخصي (My Performance)</h3>
        <div class="grid-2">
          <div style="background:var(--c-bg);padding:12px;border-radius:var(--r-sm);text-align:center">
            <div class="small muted">سيارات مكتملة</div>
            <b class="num" style="font-size:22px;color:var(--c-primary-600)">${myCompletedOrders.length}</b>
          </div>
          <div style="background:var(--c-bg);padding:12px;border-radius:var(--r-sm);text-align:center">
            <div class="small muted">قيمة الخدمات المنجزة</div>
            <b class="num" style="font-size:22px;color:var(--c-success)">${money(myTotalRevenue)}</b>
          </div>
        </div>

        <div class="between" style="margin-block-start:12px;padding-block-start:8px;border-block-start:1px solid var(--c-line)">
          <span class="small muted">متوسط تقييم العملاء:</span>
          <b class="num" style="color:var(--c-warning)">⭐ ٤.٨ من ٥</b>
        </div>
        <div class="between" style="margin-block-start:6px">
          <span class="small muted">الحد الأقصى للخصم:</span>
          <b class="num">${staff.maxDiscountPct || 10}%</b>
        </div>
      </div>

      <!-- Quick Links -->
      <div class="card" style="margin-block-end:20px">
        <a class="menu-row" href="#/notifications">
          <i data-lucide="bell"></i>
          <span class="grow">الإشعارات وتنبيهات الفرع</span>
          <i data-lucide="chevron-left" class="dir-icon muted"></i>
        </a>
        <a class="menu-row" href="#/shift">
          <i data-lucide="clock"></i>
          <span class="grow">الوردية الحالية والنقدية</span>
          <i data-lucide="chevron-left" class="dir-icon muted"></i>
        </a>
      </div>

      <!-- Logout Button -->
      <button class="btn ghost block danger" id="btn-logout" style="min-height:48px">
        تسجيل الخروج
      </button>
    </div>
  `;

  paintIcons(root);

  document.getElementById("btn-logout").onclick = () => {
    localStorage.removeItem("carzen_staff_id");
    location.hash = "#/login";
    toast("تم تسجيل الخروج");
  };
}

export function notificationsScreen(root) {
  const db = get();
  const staff = currentStaff();
  const branch = currentBranch();

  const notifs = db.notifications.filter((n) => {
    return n.audience === "staff" || n.userId === staff.id;
  });

  root.innerHTML = `
    <header class="topbar">
      <button class="icon-btn" onclick="history.back()"><i data-lucide="arrow-right" class="dir-icon"></i></button>
      <h1>الإشعارات</h1>
      <div></div>
    </header>

    <div class="screen-body" style="padding:14px 16px 80px">
      ${notifs.length === 0 ? `
        <div class="empty">
          <i data-lucide="bell" style="width:40px;height:40px;color:var(--c-ink-300)"></i>
          <h3>لا توجد إشعارات جديدة</h3>
          <p class="muted small">ستظهر هنا التنبيهات المتعلقة بالحجوزات الجديدة وحالة السيارات.</p>
        </div>
      ` : notifs.map((n) => `
        <div class="card pad" style="margin-block-end:10px;cursor:pointer" data-link="${n.link || ""}">
          <div class="between" style="margin-block-end:4px">
            <b>${L(n.title)}</b>
            <span class="small muted num">${formatTime(n.createdAt)}</span>
          </div>
          <p class="small muted">${L(n.body)}</p>
        </div>
      `).join("")}
    </div>
  `;

  paintIcons(root);

  root.querySelectorAll("[data-link]").forEach((item) => {
    item.onclick = () => {
      const link = item.dataset.link;
      if (link && link.startsWith("#/")) {
        location.hash = link;
      }
    };
  });
}
