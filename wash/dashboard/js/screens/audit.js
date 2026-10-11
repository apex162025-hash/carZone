import { get, mutate, now } from "../../../../shared/js/db.js";
import { t, L } from "../../../../shared/js/i18n.js";
import { formatDateTime, formatTime } from "../../../../shared/js/format.js";
import { paintIcons } from "../../../../shared/js/dom.js";
import { toast } from "../../../../shared/js/ui.js";
import { currentStaff, selectedBranchId } from "../state.js";

/* =========================================================================
   D17: AUDIT LOG (OW-16)
   ========================================================================= */

let auditFilter = "all";

export function auditLogScreen(root) {
  const db = get();
  let logs = db.auditLogs || [];

  if (auditFilter !== "all") {
    logs = logs.filter((l) => l.action.includes(auditFilter));
  }

  // Sort descending by timestamp
  logs.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  root.innerHTML = `
    <div class="between" style="margin-block-end:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:var(--fs-28);font-weight:800">${t("dash.nav.audit")}</h1>
        <p class="small muted">سجل تدقيق غير قابل للتعديل يوثق جميع العمليات والتغييرات المالية والإدارية</p>
      </div>

      <!-- Filters -->
      <div class="tabs">
        <button class="${auditFilter === "all" ? "on" : ""}" data-afilter="all">الكل (${db.auditLogs.length})</button>
        <button class="${auditFilter === "order" ? "on" : ""}" data-afilter="order">الطلبات</button>
        <button class="${auditFilter === "payment" ? "on" : ""}" data-afilter="payment">المدفوعات</button>
        <button class="${auditFilter === "shift" ? "on" : ""}" data-afilter="shift">الورديات</button>
      </div>
    </div>

    <div class="card pad">
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>الوقت</th>
              <th>المُنفذ (Actor)</th>
              <th>نوع الإجراء (Action)</th>
              <th>الكيان (Entity)</th>
              <th>القيمة السابقة</th>
              <th>القيمة الجديدة</th>
              <th>السبب / البيان</th>
            </tr>
          </thead>
          <tbody>
            ${logs.slice(0, 50).map((l) => {
              const actorLabel = l.actorId === "st_samir" ? "أحمد سمير" : l.actorId === "st_adel" ? "محمد عادل" : l.actorId === "st_owner_biz_carzen" ? "خالد منصور" : l.actorId;
              return `
                <tr>
                  <td class="num small">${formatDateTime(l.at)}</td>
                  <td><b>${actorLabel}</b> <span class="badge" data-status="confirmed">${l.actorType}</span></td>
                  <td><code style="font-size:12px;color:var(--c-primary-600)">${l.action}</code></td>
                  <td>${l.entity} (${l.entityId || "—"})</td>
                  <td class="small muted">${l.oldValue != null ? String(l.oldValue) : "—"}</td>
                  <td class="small strong ink">${l.newValue != null ? String(l.newValue) : "—"}</td>
                  <td class="small muted">${l.reason || "—"}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  paintIcons(root);

  root.querySelectorAll("[data-afilter]").forEach((btn) => {
    btn.onclick = () => {
      auditFilter = btn.dataset.afilter;
      auditLogScreen(root);
    };
  });
}

/* =========================================================================
   D18: NOTIFICATIONS (OW-21)
   ========================================================================= */

export function dashNotificationsScreen(root) {
  const db = get();
  const notifs = (db.notifications || []).filter((n) => n.audience === "owner" || n.audience === "staff");

  root.innerHTML = `
    <div style="margin-block-end:20px">
      <h1 style="font-size:var(--fs-28);font-weight:800">الإشعارات والتنبيهات</h1>
      <p class="small muted">تنبيهات الإدارة والعمليات اليومية</p>
    </div>

    <!-- Daily Summary Card (OW-21) -->
    <div class="card pad" style="margin-block-end:24px;background:var(--c-primary-50);border-color:var(--c-primary-100)">
      <div class="between">
        <b style="font-size:16px;color:var(--c-primary-700)">📊 الملخص اليومي للمغسلة</b>
        <span class="badge" data-status="completed">محدث الآن</span>
      </div>
      <p class="small" style="margin-block:8px">
        تم تسجيل <b>١٨ سيارة مكتملة</b> اليوم بإجمالي إيرادات محصلة بنجاح. لا توجد حجوزات متأخرة بالفرع.
      </p>
    </div>

    <div class="stack" style="gap:10px">
      ${notifs.map((n) => `
        <div class="card pad between" style="cursor:pointer" data-nlink="${n.link || ""}">
          <div>
            <div class="row" style="margin-block-end:4px">
              <b>${L(n.title)}</b>
              <span class="badge" data-status="confirmed">${n.type}</span>
            </div>
            <p class="small muted">${L(n.body)}</p>
          </div>
          <span class="small muted num">${formatTime(n.createdAt)}</span>
        </div>
      `).join("")}
    </div>
  `;

  paintIcons(root);

  root.querySelectorAll("[data-nlink]").forEach((card) => {
    card.onclick = () => {
      const link = card.dataset.nlink;
      if (link && link.startsWith("#/")) location.hash = link;
    };
  });
}
