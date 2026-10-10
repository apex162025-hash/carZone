import { t, getLang } from "../../../shared/js/i18n.js";
import { formatDateTime, formatDate, money } from "../../../shared/js/format.js";
import { getWashes, getWashDetails, suspendWash, reactivateWash, updateBusinessDataAsAdmin } from "../services/admin.js";
import { createDataTable } from "../components/table.js";
import { openDrawer } from "../components/drawer.js";
import { promptReasonModal, confirmModal } from "../components/modal.js";
import { getCurrentAdmin, checkPermission } from "../auth.js";
import { get } from "../../../shared/js/db.js";

export async function renderWashes(params = {}, query = {}) {
  if (params.id) {
    return renderWashDetailsView(params.id);
  }

  const container = document.createElement("div");
  const initialStatus = query.status || "all";

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t("admin.nav.washes")}</h1>
        <div class="page-subtitle">${getLang() === "ar" ? "إدارة ومتابعة شبكة مغاسل السيارات المعتمدة على كارزن" : "Partner car wash businesses overview and performance"}</div>
      </div>
      <div class="page-actions">
        <a href="#/applications" class="btn primary">
          <i data-lucide="file-plus" style="inline-size:16px;block-size:16px"></i>
          <span>${t("admin.nav.applications")}</span>
        </a>
      </div>
    </div>
    <div id="washes-table-mount"></div>
  `;

  const washes = await getWashes("all");

  const table = createDataTable({
    data: washes,
    searchPlaceholder: getLang() === "ar" ? "ابحث باسم المغسلة أو المالك..." : "Search by wash name or owner...",
    quickChips: [
      { id: "all", label: getLang() === "ar" ? "الكل" : "All", active: initialStatus === "all", predicate: () => true },
      { id: "active", label: getLang() === "ar" ? "النشطة" : "Active", active: initialStatus === "active", predicate: (w) => w.status === "active" },
      { id: "pending", label: getLang() === "ar" ? "معلقة" : "Pending", active: initialStatus === "pending", predicate: (w) => w.status === "pending" },
      { id: "suspended", label: getLang() === "ar" ? "معلّقة" : "Suspended", active: initialStatus === "suspended", predicate: (w) => w.status === "suspended" },
      { id: "rejected", label: getLang() === "ar" ? "مرفوضة" : "Rejected", active: initialStatus === "rejected", predicate: (w) => w.status === "rejected" },
    ],
    columns: [
      {
        key: "name",
        title: getLang() === "ar" ? "اسم المغسلة" : "Wash Name",
        render: (w) => `
          <div style="font-weight:700;font-size:15px">${w.name[getLang()] || w.name.ar}</div>
          <div class="muted" style="font-size:12px">${w.id}</div>
        `,
      },
      {
        key: "ownerName",
        title: getLang() === "ar" ? "المالك" : "Owner",
        render: (w) => w.ownerName || "—",
      },
      {
        key: "branchesCount",
        title: getLang() === "ar" ? "الفروع" : "Branches",
        render: (w) => `<strong>${w.branchesCount}</strong> ${getLang() === "ar" ? "فروع" : "branches"}`,
      },
      {
        key: "status",
        title: getLang() === "ar" ? "الحالة" : "Status",
        render: (w) => {
          const colors = {
            active: "var(--c-success)",
            suspended: "var(--c-danger)",
            rejected: "var(--c-ink-500)",
            pending: "var(--c-warning)",
          };
          const color = colors[w.status] || "var(--c-ink-500)";
          return `
            <span class="badge" style="background:color-mix(in srgb,${color} 12%,transparent);color:${color}">
              <span class="dot"></span>
              ${w.status}
            </span>
          `;
        },
      },
      {
        key: "rating",
        title: getLang() === "ar" ? "التقييم" : "Rating",
        render: (w) => `<span style="color:var(--c-warning);font-weight:700">★ ${w.rating || "—"}</span>`,
      },
      {
        key: "ordersCount",
        title: getLang() === "ar" ? "الحجوزات" : "Bookings",
        render: (w) => `<strong>${w.ordersCount}</strong> (${w.activeOrders} ${getLang() === "ar" ? "جارية" : "live"})`,
      },
      {
        key: "commissionRate",
        title: getLang() === "ar" ? "العمولة" : "Commission",
        render: (w) => `<strong>${w.commissionRate}%</strong>`,
      },
    ],
    onRowClick: (wash) => {
      openWashDrawer(wash);
    },
    exportFileName: "carzen_washes",
  });

  container.querySelector("#washes-table-mount").appendChild(table.element);
  return container;
}

function openWashDrawer(w) {
  openDrawer({
    title: w.name[getLang()] || w.name.ar,
    subtitle: `${w.ownerName} · Status: ${w.status}`,
    fullDetailsUrl: `#/washes/${w.id}`,
    bodyHtml: `
      <div class="card pad" style="background:var(--c-bg)">
        <div style="display:flex;justify-content:space-between;margin-block-end:8px">
          <span class="muted">${getLang() === "ar" ? "التقييم العام:" : "Average Rating:"}</span>
          <strong style="color:var(--c-warning)">★ ${w.rating}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin-block-end:8px">
          <span class="muted">${getLang() === "ar" ? "الفروع المشغلة:" : "Active Branches:"}</span>
          <strong>${w.branchesCount}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin-block-end:8px">
          <span class="muted">${getLang() === "ar" ? "نسبة العمولة:" : "Commission Rate:"}</span>
          <strong style="color:var(--c-primary-600)">${w.commissionRate}%</strong>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span class="muted">${getLang() === "ar" ? "تاريخ الاعتماد:" : "Created:"}</span>
          <span>${formatDate(w.createdAt)}</span>
        </div>
      </div>
      <div>
        <h4 style="margin:0 0 10px;font-size:14px">${getLang() === "ar" ? "الفروع" : "Branches"}</h4>
        ${(w.branches || []).map((b) => `
          <div style="padding:10px 12px;background:var(--c-surface);border:1px solid var(--c-line);border-radius:var(--r-sm);margin-block-end:6px">
            <div style="font-weight:700">${b.name[getLang()] || b.name.ar}</div>
            <div class="muted" style="font-size:12px">${b.area} · Capacity: ${b.capacity} bays</div>
          </div>
        `).join("")}
      </div>
    `,
  });
}

async function renderWashDetailsView(id) {
  const container = document.createElement("div");
  const data = await getWashDetails(id);

  if (!data || !data.biz) {
    container.innerHTML = `
      <div class="empty">
        <h3>${getLang() === "ar" ? "المغسلة غير موجودة" : "Wash not found"}</h3>
        <a href="#/washes" class="btn">${getLang() === "ar" ? "العودة للمغاسل" : "Back to washes"}</a>
      </div>
    `;
    return container;
  }

  const { biz, branches, services, staff, orders, reviews, complaints, transactions, auditLogs, financials } = data;
  const admin = getCurrentAdmin();
  const canManage = checkPermission("suspend_wash");
  const canEditBiz = checkPermission("*");

  // Check upcoming bookings for suspension preview
  const upcomingOrders = orders.filter((o) => ["pending", "confirmed"].includes(o.status));

  container.innerHTML = `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:12px">
        <a href="#/washes" class="icon-btn sm" title="Back">
          <i data-lucide="arrow-right" style="inline-size:18px;block-size:18px"></i>
        </a>
        <div>
          <h1 class="page-title">${biz.name[getLang()] || biz.name.ar}</h1>
          <div class="page-subtitle">${biz.ownerName} · ${branches.length} ${getLang() === "ar" ? "فروع" : "branches"} · ★ ${biz.rating}</div>
        </div>
      </div>
      <div class="page-actions">
        ${canManage ? `
          <button type="button" class="btn ${biz.status === "active" ? "danger" : "secondary"}" id="btn-toggle-wash-status">
            ${biz.status === "active" ? t("admin.action.suspend") : t("admin.action.reactivate")}
          </button>
        ` : ""}
      </div>
    </div>

    <!-- Tabs -->
    <div class="admin-tabs" id="wash-detail-tabs">
      <button class="tab-btn active" data-tab="tab-biz">${getLang() === "ar" ? "بيانات المنشأة" : "Business"}</button>
      <button class="tab-btn" data-tab="tab-branches">${getLang() === "ar" ? "الفروع" : "Branches"} (${branches.length})</button>
      <button class="tab-btn" data-tab="tab-services">${getLang() === "ar" ? "الخدمات والأسعار" : "Services"} (${services.length})</button>
      <button class="tab-btn" data-tab="tab-staff">${getLang() === "ar" ? "فريق العمل" : "Employees"} (${staff.length})</button>
      <button class="tab-btn" data-tab="tab-orders">${getLang() === "ar" ? "الحجوزات" : "Bookings"} (${orders.length})</button>
      <button class="tab-btn" data-tab="tab-reviews">${getLang() === "ar" ? "التقييمات" : "Reviews"} (${reviews.length})</button>
      <button class="tab-btn" data-tab="tab-finance">${getLang() === "ar" ? "الإيرادات والعمولة" : "Revenue"}</button>
      <button class="tab-btn" data-tab="tab-complaints">${getLang() === "ar" ? "الشكاوى" : "Complaints"} (${complaints.length})</button>
      <button class="tab-btn" data-tab="tab-audit">${getLang() === "ar" ? "سجل التدقيق" : "Audit Log"}</button>
    </div>

    <div id="tab-content-area">
      <!-- Tab 1: Business Profile -->
      <div id="tab-biz" class="tab-pane">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s-4)">
          <div class="card pad">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-block-end:16px">
              <h3 style="margin:0;font-size:16px">${getLang() === "ar" ? "معلومات المنشأة" : "Business Details"}</h3>
              ${canEditBiz ? `
                <button type="button" class="btn sm ghost" id="btn-edit-biz-admin">
                  <i data-lucide="edit-3" style="inline-size:14px;block-size:14px"></i>
                  <span>${t("admin.action.editAdmin")}</span>
                </button>
              ` : ""}
            </div>
            <div style="display:flex;flex-direction:column;gap:12px;font-size:14px">
              <div><strong>${getLang() === "ar" ? "الاسم العربي:" : "Arabic Name:"}</strong> ${biz.name.ar}</div>
              <div><strong>${getLang() === "ar" ? "الاسم اللاتيني:" : "English Name:"}</strong> ${biz.name.en}</div>
              <div><strong>${getLang() === "ar" ? "المالك المسؤول:" : "Owner:"}</strong> ${biz.ownerName}</div>
              <div>
                <strong>${getLang() === "ar" ? "الحالة التشغيلية:" : "Status:"}</strong>
                <span class="badge" style="background:${biz.status === "active" ? "color-mix(in srgb,var(--c-success) 12%,transparent)" : "color-mix(in srgb,var(--c-danger) 12%,transparent)"};color:${biz.status === "active" ? "var(--c-success)" : "var(--c-danger)"}">
                  ${biz.status}
                </span>
              </div>
              ${biz.statusReason ? `<div><strong>${getLang() === "ar" ? "سبب التعليق:" : "Reason:"}</strong> <span style="color:var(--c-danger)">${biz.statusReason}</span></div>` : ""}
              <div><strong>${getLang() === "ar" ? "نسبة العمولة المتعاقد عليها:" : "Commission Rate:"}</strong> ${biz.commissionRate}%</div>
              <div><strong>${getLang() === "ar" ? "تاريخ التأسيس / الانضمام:" : "Created:"}</strong> ${formatDateTime(biz.createdAt)}</div>
            </div>
          </div>

          <div class="card pad">
            <h3 style="margin:0 0 16px;font-size:16px">${getLang() === "ar" ? "مؤشرات الجودة والعمليات" : "Performance Snapshot"}</h3>
            <div style="display:flex;flex-direction:column;gap:12px;font-size:14px">
              <div><strong>${getLang() === "ar" ? "متوسط التقييم العام:" : "Average Rating:"}</strong> <span style="color:var(--c-warning);font-weight:700">★ ${biz.rating}</span></div>
              <div><strong>${getLang() === "ar" ? "إجمالي الحجوزات:" : "Total Orders:"}</strong> ${orders.length}</div>
              <div><strong>${getLang() === "ar" ? "الحجوزات القادمة اليوم:" : "Upcoming:"}</strong> ${upcomingOrders.length}</div>
              <div><strong>${getLang() === "ar" ? "عدد الشكاوى المسجلة:" : "Complaints:"}</strong> <span style="${complaints.length >= 3 ? "color:var(--c-danger);font-weight:700" : ""}">${complaints.length}</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: Branches -->
      <div id="tab-branches" class="tab-pane" style="display:none">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:var(--s-4)">
          ${branches.map((b) => `
            <div class="card pad">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-block-end:10px">
                <h4 style="margin:0;font-size:16px">${b.name[getLang()] || b.name.ar}</h4>
                <span class="badge" style="background:${b.active ? "color-mix(in srgb,var(--c-success) 12%,transparent)" : "var(--c-bg)"};color:${b.active ? "var(--c-success)" : "var(--c-ink-500)"}">
                  ${b.active ? (getLang() === "ar" ? "مفعّل" : "Active") : (getLang() === "ar" ? "معطل" : "Inactive")}
                </span>
              </div>
              <div style="font-size:13px;color:var(--c-ink-700);display:flex;flex-direction:column;gap:6px">
                <div>📍 ${b.address?.[getLang()] || b.address?.ar || b.area}</div>
                <div>🚗 ${getLang() === "ar" ? "الطاقة الاستيعابية:" : "Capacity:"} ${b.capacity} ${getLang() === "ar" ? "مسارات غسيل" : "bays"}</div>
                <div>⭐ ${getLang() === "ar" ? "التقييم:" : "Rating:"} ${b.rating}</div>
              </div>
              <div style="margin-block-start:12px;border-block-start:1px solid var(--c-line);padding-block-start:10px">
                <a href="#/branches/${b.id}" class="btn sm ghost block">${getLang() === "ar" ? "عرض تفاصيل الفرع والخريطة" : "View Branch Details & Map"}</a>
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Tab 3: Services -->
      <div id="tab-services" class="tab-pane" style="display:none">
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>${getLang() === "ar" ? "الخدمة" : "Service"}</th>
                <th>${getLang() === "ar" ? "التصنيف" : "Category"}</th>
                <th>${getLang() === "ar" ? "السعر" : "Price"}</th>
                <th>${getLang() === "ar" ? "المدة" : "Duration"}</th>
                <th>${getLang() === "ar" ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              ${services.map((s) => `
                <tr>
                  <td>
                    <div style="font-weight:700">${s.name[getLang()] || s.name.ar}</div>
                    <div class="muted" style="font-size:12px">${s.description?.[getLang()] || s.description?.ar || ""}</div>
                  </td>
                  <td>${s.category || s.type}</td>
                  <td><strong style="color:var(--c-primary-600)">${money(s.price)}</strong></td>
                  <td>${s.durationMin} ${getLang() === "ar" ? "دقيقة" : "min"}</td>
                  <td><span class="chip ${s.active ? "on" : "flat"}" style="font-size:11px">${s.active ? "Active" : "Disabled"}</span></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab 4: Employees -->
      <div id="tab-staff" class="tab-pane" style="display:none">
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>${getLang() === "ar" ? "الاسم" : "Name"}</th>
                <th>${getLang() === "ar" ? "الدور" : "Role"}</th>
                <th>${getLang() === "ar" ? "الموبايل" : "Phone"}</th>
                <th>${getLang() === "ar" ? "أقصى خصم" : "Max Discount"}</th>
                <th>${getLang() === "ar" ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              ${staff.map((st) => `
                <tr>
                  <td><strong>${st.name}</strong></td>
                  <td><span class="chip on" style="font-size:11px">${st.role}</span></td>
                  <td>${st.phone}</td>
                  <td>${st.maxDiscountPct}%</td>
                  <td><span class="badge">${st.status}</span></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab 5: Orders -->
      <div id="tab-orders" class="tab-pane" style="display:none">
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>${getLang() === "ar" ? "رقم الحجز" : "Order #"}</th>
                <th>${getLang() === "ar" ? "العميل" : "Customer"}</th>
                <th>${getLang() === "ar" ? "الموعد" : "Scheduled"}</th>
                <th>${getLang() === "ar" ? "الحالة" : "Status"}</th>
                <th>${getLang() === "ar" ? "المبلغ" : "Total"}</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map((o) => `
                <tr>
                  <td><a href="#/orders/${o.id}" style="font-weight:700;color:var(--c-primary-600)">${o.number}</a></td>
                  <td>${o.customerId}</td>
                  <td>${formatDateTime(o.scheduledAt)}</td>
                  <td><span class="badge" data-status="${o.status}">${o.status}</span></td>
                  <td><strong>${money(o.total)}</strong></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab 6: Reviews -->
      <div id="tab-reviews" class="tab-pane" style="display:none">
        <div style="display:flex;flex-direction:column;gap:12px">
          ${reviews.map((r) => `
            <div class="card pad">
              <div style="display:flex;justify-content:space-between;margin-block-end:6px">
                <div style="color:var(--c-warning);font-weight:700">${"★".repeat(r.stars)} (${r.stars}/5)</div>
                <div class="muted" style="font-size:12px">${formatDate(r.createdAt)}</div>
              </div>
              <p style="margin:0;font-size:14px">${r.comment || "—"}</p>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Tab 7: Revenue & Financials -->
      <div id="tab-finance" class="tab-pane" style="display:none">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--s-4);margin-block-end:var(--s-4)">
          <div class="card pad" style="background:var(--c-bg)">
            <span class="muted" style="font-size:12px">${getLang() === "ar" ? "إجمالي قيمة المعاملات (GMV)" : "Gross Volume"}</span>
            <div style="font-size:22px;font-weight:800;color:var(--c-ink-900);margin-block-start:4px">${money(financials.totalGmv)}</div>
          </div>
          <div class="card pad" style="background:var(--c-bg)">
            <span class="muted" style="font-size:12px">${getLang() === "ar" ? "عمولة المنصة المقيدة" : "Platform Commission"}</span>
            <div style="font-size:22px;font-weight:800;color:var(--c-primary-600);margin-block-start:4px">${money(financials.totalCommission)}</div>
          </div>
          <div class="card pad" style="background:var(--c-bg)">
            <span class="muted" style="font-size:12px">${getLang() === "ar" ? "صافي مستحقات المغسلة" : "Net Due to Wash"}</span>
            <div style="font-size:22px;font-weight:800;color:var(--c-success);margin-block-start:4px">${money(financials.netPayout)}</div>
          </div>
        </div>
      </div>

      <!-- Tab 8: Complaints -->
      <div id="tab-complaints" class="tab-pane" style="display:none">
        <div style="display:flex;flex-direction:column;gap:12px">
          ${complaints.length === 0 ? `<div class="empty"><p>${getLang() === "ar" ? "سجل المغسلة نظيف ولا توجد شكاوى" : "No complaints for this wash"}</p></div>` : complaints.map((c) => `
            <div class="card pad">
              <div style="display:flex;justify-content:space-between;margin-block-end:6px">
                <a href="#/complaints/${c.id}" style="font-weight:700;color:var(--c-danger)">#${c.id} · ${c.category}</a>
                <span class="badge">${c.status}</span>
              </div>
              <p style="margin:0;font-size:14px">${c.description}</p>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Tab 9: Audit Trail -->
      <div id="tab-audit" class="tab-pane" style="display:none">
        <div class="timeline-list">
          ${auditLogs.map((a) => `
            <div class="timeline-step done">
              <div class="timeline-dot"></div>
              <div style="font-weight:700;font-size:14px">${a.action} by ${a.actorId}</div>
              <div class="muted" style="font-size:12px">${formatDateTime(a.at)}</div>
              ${a.reason ? `<div style="font-size:13px;margin-block-start:4px;color:var(--c-ink-700)">${getLang() === "ar" ? "السبب:" : "Reason:"} ${a.reason}</div>` : ""}
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;

  if (window.lucide?.createIcons) window.lucide.createIcons({ root: container });

  // Tab switching
  container.querySelectorAll("#wash-detail-tabs .tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll("#wash-detail-tabs .tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const targetId = btn.dataset.tab;
      container.querySelectorAll(".tab-pane").forEach((p) => (p.style.display = "none"));
      container.querySelector(`#${targetId}`).style.display = "block";
    });
  });

  // Suspend / Reactivate handler with impact preview (AD-21)
  const statusBtn = container.querySelector("#btn-toggle-wash-status");
  if (statusBtn) {
    statusBtn.addEventListener("click", async () => {
      const isSuspending = biz.status === "active";
      if (isSuspending) {
        let impactHtml = "";
        if (upcomingOrders.length > 0) {
          impactHtml = `
            <div style="margin-block:12px;padding:12px;background:color-mix(in srgb,var(--c-warning) 12%,transparent);border-radius:var(--r-sm);font-size:13px">
              <strong>${getLang() === "ar" ? "تنبيه تأثير التعليق:" : "Suspension Impact Preview:"}</strong>
              ${getLang() === "ar" ? `توجد ${upcomingOrders.length} حجوزات قادمة مؤكدة لهذه المغسلة.` : `There are ${upcomingOrders.length} upcoming confirmed bookings for this wash.`}
            </div>
          `;
        }

        const result = await promptReasonModal({
          title: getLang() === "ar" ? "تعليق حساب المغسلة" : "Suspend Car Wash",
          message: `${getLang() === "ar" ? "سيؤدي التعليق إلى إخفاء المغسلة فوراً من تطبيق العملاء ومنع أي حجوزات جديدة." : "Suspending will hide the wash from customer discovery and block new bookings."} ${impactHtml}`,
          danger: true,
          options: [
            { value: "repeated_complaints", label: getLang() === "ar" ? "تكرار شكاوى الجودة وسوء الخدمة" : "Repeated quality complaints" },
            { value: "incorrect_information", label: getLang() === "ar" ? "بيانات أو أسعار غير صحيحة" : "Incorrect information or pricing" },
            { value: "operational_issue", label: getLang() === "ar" ? "خلل تشغيلي / عدم الالتزام بالمواعيد" : "Operational issues" },
            { value: "policy_violation", label: getLang() === "ar" ? "مخالفة سياسات وقواعد المنصة" : "Policy violation" },
            { value: "owner_request", label: getLang() === "ar" ? "بناء على طلب مالك المغسلة" : "Owner request" },
          ],
        });

        if (result) {
          await suspendWash(biz.id, {
            adminId: admin.id,
            reason: result.option || result.reason,
            note: result.note,
            cancelUpcoming: false,
          });
          location.reload();
        }
      } else {
        const result = await promptReasonModal({
          title: getLang() === "ar" ? "إعادة تفعيل حساب المغسلة" : "Reactivate Car Wash",
          message: getLang() === "ar" ? "ستعود المغسلة للظهور مجدداً في نتائج البحث واستقبال حجوزات العملاء." : "The wash will be restored to discovery and can receive bookings.",
        });

        if (result) {
          await reactivateWash(biz.id, {
            adminId: admin.id,
            note: result.reason,
          });
          location.reload();
        }
      }
    });
  }

  // Edit as admin handler (AD-24)
  const editBizBtn = container.querySelector("#btn-edit-biz-admin");
  if (editBizBtn) {
    editBizBtn.addEventListener("click", async () => {
      const result = await promptReasonModal({
        title: getLang() === "ar" ? "تعديل بيانات المنشأة بصلاحية الإدارة" : "Edit Business Data as Admin",
        message: getLang() === "ar" ? "البيانات التشغيلية مملوكة للمغسلة. أي تعديل إداري يتطلب توثيق السبب رسمياً في سجل التدقيق." : "Business-owned data requires documented reason for administrative override.",
      });

      if (result) {
        await updateBusinessDataAsAdmin(biz.id, {
          adminId: admin.id,
          patch: {},
          reason: result.reason,
        });
        location.reload();
      }
    });
  }

  return container;
}
