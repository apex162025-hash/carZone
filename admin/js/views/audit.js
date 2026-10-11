import { t, getLang } from "../../../shared/js/i18n.js";
import { formatDateTime } from "../../../shared/js/format.js";
import { getAuditLogs } from "../../../shared/js/services/admin.js";
import { createDataTable } from "../components/table.js";

export async function renderAudit() {
  const container = document.createElement("div");

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t("admin.nav.audit")}</h1>
        <div class="page-subtitle">${getLang() === "ar" ? "سجل الرقابة والتدقيق الأمني غير القابل للتعديل لجميع العمليات الإدارية" : "Immutable system audit trail tracking all administrative actions and mutations"}</div>
      </div>
      <div class="page-actions">
        <span class="badge" style="background:var(--c-primary-50);color:var(--c-primary-700);font-weight:700">
          🔒 ${getLang() === "ar" ? "سجل غير قابل للتعديل أو الحذف" : "Immutable Audit Trail"}
        </span>
      </div>
    </div>
    <div id="audit-table-mount"></div>
  `;

  const logs = await getAuditLogs();

  const table = createDataTable({
    data: logs,
    columns: [
      {
        key: "at",
        title: getLang() === "ar" ? "الوقت والتاريخ" : "Timestamp",
        render: (a) => `
          <div style="font-weight:700">${formatDateTime(a.at)}</div>
          <div class="muted" style="font-size:11px">${a.id}</div>
        `,
      },
      {
        key: "actorName",
        title: getLang() === "ar" ? "المسؤول / المنفذ" : "Admin Actor",
        render: (a) => `<span class="chip flat" style="font-weight:700">${a.actorName || a.actorId}</span>`,
      },
      {
        key: "action",
        title: getLang() === "ar" ? "الإجراء" : "Action",
        render: (a) => `<span class="chip on" style="font-size:12px">${a.action}</span>`,
      },
      {
        key: "entity",
        title: getLang() === "ar" ? "العنصر المستهدف" : "Entity",
        render: (a) => `<strong>${a.entity}</strong> (${a.entityId})`,
      },
      {
        key: "reason",
        title: getLang() === "ar" ? "السبب الموثق" : "Documented Reason",
        render: (a) => `
          <div style="max-inline-size:280px;white-space:normal;font-size:13px;color:var(--c-ink-700)">
            ${a.reason || "—"}
          </div>
        `,
      },
      {
        key: "changes",
        title: getLang() === "ar" ? "الحالة السابقة / الجديدة" : "Change Delta",
        render: (a) => `
          <div style="font-size:12px">
            ${a.oldValue ? `<span style="color:var(--c-danger)">${String(a.oldValue).slice(0, 30)}</span> → ` : ""}
            <span style="color:var(--c-success);font-weight:700">${String(a.newValue || "").slice(0, 30)}</span>
          </div>
        `,
      },
    ],
    exportFileName: "carzen_audit_log",
  });

  container.querySelector("#audit-table-mount").appendChild(table.element);
  return container;
}
