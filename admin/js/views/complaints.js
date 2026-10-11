import { t, getLang } from "../../../shared/js/i18n.js";
import { formatDateTime, formatDate } from "../../../shared/js/format.js";
import { getComplaints, getComplaintDetails, updateComplaint } from "../../../shared/js/services/admin.js";
import { createDataTable } from "../components/table.js";
import { getCurrentAdmin, checkPermission } from "../auth.js";
import { get } from "../../../shared/js/db.js";

export async function renderComplaints(params = {}, query = {}) {
  if (params.id) {
    return renderComplaintDetailsView(params.id);
  }

  const container = document.createElement("div");
  const complaints = await getComplaints();

  const openCount = complaints.filter((c) => c.status === "open").length;
  const inReviewCount = complaints.filter((c) => c.status === "in_review").length;
  const waitingCount = complaints.filter((c) => c.status === "waiting").length;
  const resolvedCount = complaints.filter((c) => c.status === "resolved").length;
  const closedCount = complaints.filter((c) => c.status === "closed").length;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t("admin.nav.complaints")}</h1>
        <div class="page-subtitle">${getLang() === "ar" ? "صندوق وارد بلاغات وشكاوى العملاء ومتابعة حل النزاعات" : "Customer support disputes, complaints inbox and resolution workflow"}</div>
      </div>
    </div>
    <div id="complaints-table-mount"></div>
  `;

  const table = createDataTable({
    data: complaints,
    quickChips: [
      { id: "all", label: `${getLang() === "ar" ? "الكل" : "All"} (${complaints.length})`, active: !query.status || query.status === "all", predicate: () => true },
      { id: "open", label: `${getLang() === "ar" ? "جديدة" : "Open"} (${openCount})`, active: query.status === "open", predicate: (c) => c.status === "open" },
      { id: "in_review", label: `${getLang() === "ar" ? "قيد المراجعة" : "In Review"} (${inReviewCount})`, active: query.status === "in_review", predicate: (c) => c.status === "in_review" },
      { id: "waiting", label: `${getLang() === "ar" ? "بانتظار رد" : "Waiting"} (${waitingCount})`, active: query.status === "waiting", predicate: (c) => c.status === "waiting" },
      { id: "resolved", label: `${getLang() === "ar" ? "تم الحل" : "Resolved"} (${resolvedCount})`, active: query.status === "resolved", predicate: (c) => c.status === "resolved" },
      { id: "closed", label: `${getLang() === "ar" ? "مغلقة" : "Closed"} (${closedCount})`, active: query.status === "closed", predicate: (c) => c.status === "closed" },
    ],
    columns: [
      {
        key: "id",
        title: getLang() === "ar" ? "رقم الشكوى" : "Ticket #",
        render: (c) => `
          <a href="#/complaints/${c.id}" style="font-weight:800;color:var(--c-primary-600)">#${c.id}</a>
          <div class="muted" style="font-size:11px">${c.category}</div>
        `,
      },
      {
        key: "customer",
        title: getLang() === "ar" ? "العميل" : "Customer",
        render: (c) => c.customer ? `<a href="#/customers/${c.customer.id}">${c.customer.name}</a>` : "Guest",
      },
      {
        key: "wash",
        title: getLang() === "ar" ? "المغسلة" : "Wash",
        render: (c) => c.business ? `<a href="#/washes/${c.business.id}">${c.business.name[getLang()] || c.business.name.ar}</a>` : c.businessId,
      },
      {
        key: "order",
        title: getLang() === "ar" ? "الحجز المرتبط" : "Order",
        render: (c) => c.order ? `<a href="#/orders/${c.order.id}">${c.order.number}</a>` : (c.orderId || "—"),
      },
      {
        key: "status",
        title: getLang() === "ar" ? "الحالة" : "Status",
        render: (c) => {
          const colors = {
            open: "var(--c-danger)",
            in_review: "var(--c-warning)",
            waiting: "var(--c-info)",
            resolved: "var(--c-success)",
            closed: "var(--c-ink-500)",
          };
          const color = colors[c.status] || "var(--c-ink-500)";
          return `
            <span class="badge" style="background:color-mix(in srgb,${color} 12%,transparent);color:${color}">
              <span class="dot"></span>
              ${c.status}
            </span>
          `;
        },
      },
      {
        key: "assignee",
        title: getLang() === "ar" ? "المسؤول" : "Assignee",
        render: (c) => c.assignee ? c.assignee.name : `<span class="muted">${getLang() === "ar" ? "غير معين" : "Unassigned"}</span>`,
      },
      {
        key: "createdAt",
        title: getLang() === "ar" ? "التاريخ" : "Created",
        render: (c) => c.createdAt ? formatDate(c.createdAt) : "—",
      },
    ],
    actions: (c) => `
      <a href="#/complaints/${c.id}" class="btn sm ghost">
        ${getLang() === "ar" ? "متابعة" : "View"}
      </a>
    `,
    exportFileName: "carzen_complaints",
  });

  container.querySelector("#complaints-table-mount").appendChild(table.element);
  return container;
}

async function renderComplaintDetailsView(id) {
  const container = document.createElement("div");
  const data = await getComplaintDetails(id);

  if (!data || !data.complaint) {
    container.innerHTML = `
      <div class="empty">
        <h3>${getLang() === "ar" ? "الشكوى غير موجودة" : "Complaint not found"}</h3>
        <a href="#/complaints" class="btn">${getLang() === "ar" ? "العودة للشكاوى" : "Back"}</a>
      </div>
    `;
    return container;
  }

  const { complaint, customer, business, branch, order, washComplaintCount, auditEntries } = data;
  const admin = getCurrentAdmin();
  const db = get();

  container.innerHTML = `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:12px">
        <a href="#/complaints" class="icon-btn sm" title="Back">
          <i data-lucide="arrow-right" style="inline-size:18px;block-size:18px"></i>
        </a>
        <div>
          <h1 class="page-title">#${complaint.id} · ${complaint.category}</h1>
          <div class="page-subtitle">${customer?.name || "Customer"} · ${business?.name?.[getLang()] || ""}</div>
        </div>
      </div>
      <div class="page-actions">
        <span class="badge" style="font-size:14px;padding:6px 12px">${complaint.status}</span>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:var(--s-6)">
      <!-- Left Column: Complaint & Operations Workbench -->
      <div style="display:flex;flex-direction:column;gap:var(--s-5)">
        <!-- Description Card -->
        <div class="card pad">
          <h3 style="margin:0 0 12px;font-size:16px">${getLang() === "ar" ? "تفاصيل البلاغ والشكوى" : "Complaint Details"}</h3>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:var(--c-ink-900)">
            ${complaint.description}
          </p>
          <div style="display:flex;gap:16px;font-size:13px;color:var(--c-ink-500);border-block-start:1px solid var(--c-line);padding-block-start:12px">
            <div><strong>${getLang() === "ar" ? "التصنيف:" : "Category:"}</strong> ${complaint.category}</div>
            <div><strong>${getLang() === "ar" ? "تاريخ البلاغ:" : "Submitted:"}</strong> ${complaint.createdAt ? formatDateTime(complaint.createdAt) : "—"}</div>
          </div>
        </div>

        <!-- Linked Booking with Operational Timeline (Scenario 3 / AD-31) -->
        ${order ? `
          <div class="card pad">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-block-end:16px">
              <h3 style="margin:0;font-size:16px">${getLang() === "ar" ? "الحجز المرتبط والمسار التشغيلي" : "Linked Booking & Timeline"}</h3>
              <a href="#/orders/${order.id}" class="btn sm ghost">${order.number}</a>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;margin-block-end:16px">
              <div><strong>${getLang() === "ar" ? "الموعد:" : "Scheduled:"}</strong> ${formatDateTime(order.scheduledAt)}</div>
              <div><strong>${getLang() === "ar" ? "الخدمات:" : "Items:"}</strong> ${(order.items || []).map((i) => i.name).join(", ")}</div>
              <div><strong>${getLang() === "ar" ? "المبلغ:" : "Total:"}</strong> ${order.total} EGP</div>
              <div><strong>${getLang() === "ar" ? "حالة الحجز:" : "Status:"}</strong> ${order.status}</div>
            </div>

            <h4 style="margin:0 0 10px;font-size:13px">${getLang() === "ar" ? "المسار الزمني للزيارة:" : "Operational Steps:"}</h4>
            <div class="timeline-list">
              ${(order.timeline || []).map((step) => `
                <div class="timeline-step done">
                  <div class="timeline-dot"></div>
                  <div style="font-weight:700;font-size:13px">${step.status}</div>
                  <div class="muted" style="font-size:11px">${formatDateTime(step.at)} · ${step.byId || step.byType}</div>
                </div>
              `).join("")}
            </div>
          </div>
        ` : ""}

        <!-- Resolution Note (if resolved) -->
        ${complaint.resolution ? `
          <div class="card pad" style="background:color-mix(in srgb,var(--c-success) 8%,transparent);border-inline-start:4px solid var(--c-success)">
            <h4 style="margin:0 0 8px;font-size:14px;color:var(--c-success)">✓ ${getLang() === "ar" ? "قرار التسوية المعتمد:" : "Resolution Recorded:"}</h4>
            <p style="margin:0;font-size:14px">${complaint.resolution}</p>
          </div>
        ` : ""}

        <!-- Internal Notes Thread -->
        <div class="card pad">
          <h3 style="margin:0 0 16px;font-size:16px">${getLang() === "ar" ? "سجل الملاحظات الداخلية لفريق الدعم" : "Internal Support Notes"}</h3>
          <div style="display:flex;flex-direction:column;gap:10px;margin-block-end:16px">
            ${(complaint.notes || []).length === 0 ? `
              <p class="muted" style="margin:0;font-size:13px">${getLang() === "ar" ? "لا توجد ملاحظات داخلية مضافة بعد." : "No internal notes yet."}</p>
            ` : (complaint.notes || []).map((n) => `
              <div style="padding:10px 12px;background:var(--c-bg);border-radius:var(--r-sm)">
                <div style="display:flex;justify-content:space-between;margin-block-end:4px;font-size:12px">
                  <strong>${n.authorId}</strong>
                  <span class="muted">${formatDateTime(n.at)}</span>
                </div>
                <div style="font-size:13px">${n.text}</div>
              </div>
            `).join("")}
          </div>

          <div class="field">
            <span class="label">${getLang() === "ar" ? "إضافة ملاحظة داخلية:" : "Add Internal Note:"}</span>
            <div style="display:flex;gap:8px">
              <input type="text" class="control grow" id="input-new-note" placeholder="${getLang() === "ar" ? "اكتب ملاحظة متابعة مع المغسلة أو العميل..." : "Enter internal note..."}" />
              <button type="button" class="btn secondary" id="btn-add-note">${getLang() === "ar" ? "إضافة" : "Add"}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Status Controls & Context Cards -->
      <div style="display:flex;flex-direction:column;gap:var(--s-4)">
        <!-- Ticket Controls -->
        <div class="card pad">
          <h3 style="margin:0 0 16px;font-size:16px">${getLang() === "ar" ? "إجراءات الحالة والتعيين" : "Ticket Controls"}</h3>
          
          <div class="field" style="margin-block-end:var(--s-4)">
            <span class="label">${getLang() === "ar" ? "تعيين المسؤول:" : "Assignee:"}</span>
            <select class="select" id="select-assignee">
              <option value="">${getLang() === "ar" ? "غير معين" : "Unassigned"}</option>
              ${(db.adminUsers || []).map((au) => `
                <option value="${au.id}" ${complaint.assignedAdminId === au.id ? "selected" : ""}>${au.name} (${au.role})</option>
              `).join("")}
            </select>
          </div>

          <div class="field" style="margin-block-end:var(--s-4)">
            <span class="label">${getLang() === "ar" ? "تحديث حالة التذكرة:" : "Status Lifecycle:"}</span>
            <select class="select" id="select-status">
              <option value="open" ${complaint.status === "open" ? "selected" : ""}>Open</option>
              <option value="in_review" ${complaint.status === "in_review" ? "selected" : ""}>In Review</option>
              <option value="waiting" ${complaint.status === "waiting" ? "selected" : ""}>Waiting</option>
              <option value="resolved" ${complaint.status === "resolved" ? "selected" : ""}>Resolved</option>
              <option value="closed" ${complaint.status === "closed" ? "selected" : ""}>Closed</option>
            </select>
          </div>

          <div class="field" id="resolution-field" style="display:${["resolved", "closed"].includes(complaint.status) ? "flex" : "none"};margin-block-end:var(--s-4)">
            <span class="label">${getLang() === "ar" ? "قرار التسوية (إلزامي للحل):" : "Resolution Note (Mandatory):"}</span>
            <textarea class="textarea" id="input-resolution" placeholder="${getLang() === "ar" ? "اكتب الحل النهائي المعتمد للعميل..." : "State final resolution..."}">${complaint.resolution || ""}</textarea>
          </div>

          <button type="button" class="btn primary block" id="btn-save-complaint">
            ${getLang() === "ar" ? "حفظ التحديثات" : "Save Changes"}
          </button>
        </div>

        <!-- Customer Context Card -->
        <div class="card pad">
          <h4 style="margin:0 0 10px;font-size:14px">${getLang() === "ar" ? "بطاقة العميل" : "Customer Card"}</h4>
          ${customer ? `
            <div style="display:flex;flex-direction:column;gap:6px;font-size:13px">
              <div><strong>${customer.name}</strong></div>
              <div class="muted">${customer.phone}</div>
              <a href="#/customers/${customer.id}" style="margin-block-start:6px;font-weight:700">View Full Profile</a>
            </div>
          ` : "Guest"}
        </div>

        <!-- Wash Context & Complaint Spike Card (Scenario 3 / AD-33) -->
        <div class="card pad">
          <h4 style="margin:0 0 10px;font-size:14px">${getLang() === "ar" ? "سجل المغسلة ومؤشر الشكاوى" : "Wash Performance & Complaints"}</h4>
          ${business ? `
            <div style="display:flex;flex-direction:column;gap:6px;font-size:13px">
              <div><strong>${business.name[getLang()] || business.name.ar}</strong></div>
              <div>⭐ ${getLang() === "ar" ? "التقييم:" : "Rating:"} ${business.rating}</div>
              <div style="color:${washComplaintCount >= 3 ? "var(--c-danger)" : "var(--c-ink-700)"};font-weight:${washComplaintCount >= 3 ? "700" : "normal"}">
                ${getLang() === "ar" ? `سجل الشكاوى: ${washComplaintCount} شكاوى سابقة` : `Complaints: ${washComplaintCount} recorded`}
              </div>
              <a href="#/washes/${business.id}" style="margin-block-start:6px;font-weight:700">Review Wash Profile</a>
            </div>
          ` : "—"}
        </div>
      </div>
    </div>
  `;

  if (window.lucide?.createIcons) window.lucide.createIcons({ root: container });

  // Status select toggle resolution textarea
  const statusSelect = container.querySelector("#select-status");
  const resolutionField = container.querySelector("#resolution-field");
  statusSelect.addEventListener("change", (e) => {
    const val = e.target.value;
    resolutionField.style.display = (val === "resolved" || val === "closed") ? "flex" : "none";
  });

  // Add internal note button
  container.querySelector("#btn-add-note").addEventListener("click", async () => {
    const noteInput = container.querySelector("#input-new-note");
    const text = noteInput.value.trim();
    if (!text) return;
    await updateComplaint(complaint.id, {
      adminId: admin.id,
      note: text,
    });
    location.reload();
  });

  // Save changes handler (Scenario 3)
  container.querySelector("#btn-save-complaint").addEventListener("click", async () => {
    const newStatus = statusSelect.value;
    const newAssignee = container.querySelector("#select-assignee").value || null;
    const resolutionText = container.querySelector("#input-resolution")?.value.trim() || null;

    if ((newStatus === "resolved" || newStatus === "closed") && !resolutionText) {
      alert(getLang() === "ar" ? "قرار التسوية إلزامي لإغلاق أو حل الشكوى." : "Resolution note is required to resolve this ticket.");
      return;
    }

    await updateComplaint(complaint.id, {
      adminId: admin.id,
      status: newStatus,
      assignedAdminId: newAssignee,
      resolution: resolutionText,
    });
    location.reload();
  });

  return container;
}
