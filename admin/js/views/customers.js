import { t, getLang } from "../../../shared/js/i18n.js";
import { formatDateTime, formatDate, money } from "../../../shared/js/format.js";
import { getCustomers, getCustomerDetails, toggleCustomerSuspended } from "../services/admin.js";
import { createDataTable } from "../components/table.js";
import { openDrawer } from "../components/drawer.js";
import { promptReasonModal, confirmModal } from "../components/modal.js";
import { getCurrentAdmin, checkPermission } from "../auth.js";

export async function renderCustomers(params = {}) {
  const container = document.createElement("div");

  // If params.id is provided, render customer full details page
  if (params.id) {
    return renderCustomerDetailsView(params.id);
  }

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t("admin.nav.customers")}</h1>
        <div class="page-subtitle">${getLang() === "ar" ? "قائمة عملاء المنصة والسيارات وسجل الحجوزات" : "Platform customer base, vehicles and booking histories"}</div>
      </div>
    </div>
    <div id="customers-table-mount"></div>
  `;

  const customers = await getCustomers("all");

  const table = createDataTable({
    data: customers,
    initialSort: { key: "created", asc: false },
    searchPlaceholder: getLang() === "ar" ? "ابحث بالاسم، الموبايل، أو رقم اللوحة..." : "Search by name, phone, or plate...",
    quickChips: [
      { id: "all", label: getLang() === "ar" ? "الكل" : "All", active: true, predicate: () => true },
      { id: "active", label: getLang() === "ar" ? "نشط" : "Active", predicate: (c) => c.status === "active" },
      { id: "suspended", label: getLang() === "ar" ? "معلّق" : "Suspended", predicate: (c) => c.status === "suspended" },
      { id: "new", label: getLang() === "ar" ? "جديد (آخر ٧ أيام)" : "New (Last 7d)", predicate: (c) => new Date(c.createdAt) >= new Date(Date.now() - 7 * 86400000) },
      { id: "high", label: getLang() === "ar" ? "نشاط عالي (≥ ٥ زيارات)" : "High activity", predicate: (c) => c.ordersCount >= 5 },
    ],
    columns: [
      {
        key: "name",
        title: getLang() === "ar" ? "العميل" : "Customer",
        render: (c) => `
          <div style="display:flex;align-items:center;gap:10px">
            <div class="avatar sm">${c.name.slice(0, 2).toUpperCase()}</div>
            <div>
              <div style="font-weight:700">${c.name}</div>
              <div class="muted" style="font-size:12px">${c.phone}</div>
            </div>
          </div>
        `,
      },
      {
        key: "status",
        title: getLang() === "ar" ? "الحالة" : "Status",
        render: (c) => `
          <span class="badge" style="background:${c.status === "active" ? "color-mix(in srgb,var(--c-success) 12%,transparent)" : "color-mix(in srgb,var(--c-danger) 12%,transparent)"};color:${c.status === "active" ? "var(--c-success)" : "var(--c-danger)"}">
            <span class="dot"></span>
            ${c.status === "active" ? (getLang() === "ar" ? "نشط" : "Active") : (getLang() === "ar" ? "معلّق" : "Suspended")}
          </span>
        `,
      },
      {
        key: "vehicles",
        title: getLang() === "ar" ? "السيارات" : "Vehicles",
        render: (c) => (c.vehicles && c.vehicles.length ? c.vehicles.map((v) => `<span class="chip flat" style="font-size:11px">${v.make} (${v.plate})</span>`).join(" ") : "—"),
      },
      {
        key: "ordersCount",
        title: getLang() === "ar" ? "الحجوزات" : "Bookings",
        render: (c) => `<strong>${c.ordersCount}</strong> (${c.completedCount} ${getLang() === "ar" ? "مكتمل" : "done"})`,
      },
      {
        key: "createdAt",
        title: getLang() === "ar" ? "تاريخ التسجيل" : "Created",
        render: (c) => formatDate(c.createdAt),
      },
    ],
    onRowClick: (customer) => {
      openCustomerDrawer(customer);
    },
    exportFileName: "carzen_customers",
  });

  container.querySelector("#customers-table-mount").appendChild(table.element);
  return container;
}

function openCustomerDrawer(c) {
  openDrawer({
    title: c.name,
    subtitle: `${c.phone} · ${c.status === "active" ? (getLang() === "ar" ? "حساب نشط" : "Active account") : (getLang() === "ar" ? "حساب معلّق" : "Suspended account")}`,
    fullDetailsUrl: `#/customers/${c.id}`,
    bodyHtml: `
      <div class="card pad" style="background:var(--c-bg)">
        <div style="display:flex;justify-content:space-between;margin-block-end:8px">
          <span class="muted">${getLang() === "ar" ? "إجمالي الحجوزات:" : "Total Bookings:"}</span>
          <strong>${c.ordersCount}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin-block-end:8px">
          <span class="muted">${getLang() === "ar" ? "الحجوزات المكتملة:" : "Completed Visits:"}</span>
          <strong style="color:var(--c-success)">${c.completedCount}</strong>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span class="muted">${getLang() === "ar" ? "تاريخ الانضمام:" : "Member Since:"}</span>
          <span>${formatDate(c.createdAt)}</span>
        </div>
      </div>

      <div>
        <h4 style="margin:0 0 10px;font-size:14px">${getLang() === "ar" ? "السيارات المسجلة" : "Registered Vehicles"}</h4>
        ${(c.vehicles || []).map((v) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--c-surface);border:1px solid var(--c-line);border-radius:var(--r-sm);margin-block-end:6px">
            <div>
              <div style="font-weight:700">${v.make} ${v.model} (${v.year || ""})</div>
              <div class="muted" style="font-size:12px">${v.color}</div>
            </div>
            <span class="chip on" style="font-size:12px">${v.plate}</span>
          </div>
        `).join("")}
      </div>
    `,
  });
}

async function renderCustomerDetailsView(id) {
  const container = document.createElement("div");
  const data = await getCustomerDetails(id);

  if (!data || !data.customer) {
    container.innerHTML = `
      <div class="empty">
        <h3>${getLang() === "ar" ? "العميل غير موجود" : "Customer not found"}</h3>
        <a href="#/customers" class="btn">${getLang() === "ar" ? "العودة للعملاء" : "Back to customers"}</a>
      </div>
    `;
    return container;
  }

  const { customer, vehicles, orders, reviews, complaints, auditEntries } = data;
  const admin = getCurrentAdmin();
  const canManage = checkPermission("suspend_customer");

  container.innerHTML = `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:12px">
        <a href="#/customers" class="icon-btn sm" title="Back">
          <i data-lucide="arrow-right" style="inline-size:18px;block-size:18px"></i>
        </a>
        <div>
          <h1 class="page-title">${customer.name}</h1>
          <div class="page-subtitle">${customer.phone} · ${formatDate(customer.createdAt)}</div>
        </div>
      </div>
      <div class="page-actions">
        ${canManage ? `
          <button type="button" class="btn ${customer.status === "active" ? "danger" : "secondary"}" id="btn-toggle-suspend">
            ${customer.status === "active" ? t("admin.action.suspend") : t("admin.action.reactivate")}
          </button>
        ` : ""}
      </div>
    </div>

    <!-- Tabs -->
    <div class="admin-tabs" id="customer-detail-tabs">
      <button class="tab-btn active" data-tab="tab-profile">${getLang() === "ar" ? "الملف الشخصي" : "Profile"}</button>
      <button class="tab-btn" data-tab="tab-vehicles">${getLang() === "ar" ? "السيارات" : "Vehicles"} (${vehicles.length})</button>
      <button class="tab-btn" data-tab="tab-orders">${getLang() === "ar" ? "الحجوزات" : "Bookings"} (${orders.length})</button>
      <button class="tab-btn" data-tab="tab-reviews">${getLang() === "ar" ? "التقييمات" : "Reviews"} (${reviews.length})</button>
      <button class="tab-btn" data-tab="tab-complaints">${getLang() === "ar" ? "الشكاوى" : "Complaints"} (${complaints.length})</button>
      <button class="tab-btn" data-tab="tab-timeline">${getLang() === "ar" ? "سجل النشاط والتدقيق" : "Timeline"}</button>
    </div>

    <div id="tab-content-area">
      <!-- Tab 1: Profile -->
      <div id="tab-profile" class="tab-pane">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s-4)">
          <div class="card pad">
            <h3 style="margin:0 0 16px;font-size:16px">${getLang() === "ar" ? "البيانات الأساسية" : "Account Info"}</h3>
            <div style="display:flex;flex-direction:column;gap:12px;font-size:14px">
              <div><strong>${getLang() === "ar" ? "الاسم الكامل:" : "Name:"}</strong> ${customer.name}</div>
              <div><strong>${getLang() === "ar" ? "رقم الموبايل:" : "Phone:"}</strong> ${customer.phone}</div>
              <div>
                <strong>${getLang() === "ar" ? "حالة الحساب:" : "Status:"}</strong>
                <span class="badge" style="background:${customer.status === "active" ? "color-mix(in srgb,var(--c-success) 12%,transparent)" : "color-mix(in srgb,var(--c-danger) 12%,transparent)"};color:${customer.status === "active" ? "var(--c-success)" : "var(--c-danger)"}">
                  ${customer.status === "active" ? (getLang() === "ar" ? "نشط" : "Active") : (getLang() === "ar" ? "معلّق" : "Suspended")}
                </span>
              </div>
              ${customer.statusReason ? `<div><strong>${getLang() === "ar" ? "سبب التعليق:" : "Suspension Reason:"}</strong> <span style="color:var(--c-danger)">${customer.statusReason}</span></div>` : ""}
              <div><strong>${getLang() === "ar" ? "تاريخ التسجيل:" : "Registered:"}</strong> ${formatDateTime(customer.createdAt)}</div>
            </div>
          </div>
          <div class="card pad">
            <h3 style="margin:0 0 16px;font-size:16px">${getLang() === "ar" ? "إحصائيات المعاملات" : "Activity Overview"}</h3>
            <div style="display:flex;flex-direction:column;gap:12px;font-size:14px">
              <div><strong>${getLang() === "ar" ? "إجمالي الحجوزات:" : "Total Orders:"}</strong> ${orders.length}</div>
              <div><strong>${getLang() === "ar" ? "الزيارات المكتملة:" : "Completed:"}</strong> ${orders.filter((o) => o.status === "completed").length}</div>
              <div><strong>${getLang() === "ar" ? "إجمالي المنفق:" : "Total Spent:"}</strong> <span style="color:var(--c-primary-600);font-weight:700">${money(orders.filter((o) => o.status === "completed").reduce((s, o) => s + o.total, 0))}</span></div>
              <div><strong>${getLang() === "ar" ? "عدد الشكاوى المرفوعة:" : "Complaints:"}</strong> ${complaints.length}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: Vehicles -->
      <div id="tab-vehicles" class="tab-pane" style="display:none">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:var(--s-4)">
          ${vehicles.map((v) => `
            <div class="card pad">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-block-end:8px">
                <h4 style="margin:0;font-size:16px">${v.make} ${v.model}</h4>
                ${v.isDefault ? `<span class="badge" style="background:var(--c-primary-50);color:var(--c-primary-700)">Default</span>` : ""}
              </div>
              <div style="font-size:13px;color:var(--c-ink-700)">${getLang() === "ar" ? "اللون:" : "Color:"} ${v.color} · ${v.year || ""}</div>
              <div style="margin-block-start:12px;display:flex;align-items:center;justify-content:space-between">
                <span class="chip on" style="font-size:13px;letter-spacing:1px">${v.plate}</span>
                <span class="muted" style="font-size:12px">${v.plateNormalized}</span>
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Tab 3: Orders -->
      <div id="tab-orders" class="tab-pane" style="display:none">
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>${getLang() === "ar" ? "رقم الحجز" : "Order #"}</th>
                <th>${getLang() === "ar" ? "المغسلة والفرع" : "Wash / Branch"}</th>
                <th>${getLang() === "ar" ? "الموعد" : "Scheduled"}</th>
                <th>${getLang() === "ar" ? "الحالة" : "Status"}</th>
                <th>${getLang() === "ar" ? "المبلغ" : "Total"}</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map((o) => `
                <tr>
                  <td><a href="#/orders/${o.id}" style="font-weight:700;color:var(--c-primary-600)">${o.number}</a></td>
                  <td>${o.business?.name ? (o.business.name[getLang()] || o.business.name.ar) : o.businessId}</td>
                  <td>${formatDateTime(o.scheduledAt)}</td>
                  <td><span class="badge" data-status="${o.status}"><span class="dot"></span>${o.status}</span></td>
                  <td><strong>${money(o.total)}</strong></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab 4: Reviews -->
      <div id="tab-reviews" class="tab-pane" style="display:none">
        <div style="display:flex;flex-direction:column;gap:12px">
          ${reviews.length === 0 ? `<div class="empty"><p>${getLang() === "ar" ? "لا توجد تقييمات مسجلة لهذا العميل" : "No reviews submitted by this customer"}</p></div>` : reviews.map((r) => `
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

      <!-- Tab 5: Complaints -->
      <div id="tab-complaints" class="tab-pane" style="display:none">
        <div style="display:flex;flex-direction:column;gap:12px">
          ${complaints.length === 0 ? `<div class="empty"><p>${getLang() === "ar" ? "لا توجد شكاوى مرفوعة" : "No complaints filed"}</p></div>` : complaints.map((c) => `
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

      <!-- Tab 6: Timeline -->
      <div id="tab-timeline" class="tab-pane" style="display:none">
        <div class="timeline-list">
          ${(auditEntries || []).map((a) => `
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
  container.querySelectorAll("#customer-detail-tabs .tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll("#customer-detail-tabs .tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const targetId = btn.dataset.tab;
      container.querySelectorAll(".tab-pane").forEach((p) => (p.style.display = "none"));
      container.querySelector(`#${targetId}`).style.display = "block";
    });
  });

  // Suspend / Reactivate handler
  const suspendBtn = container.querySelector("#btn-toggle-suspend");
  if (suspendBtn) {
    suspendBtn.addEventListener("click", async () => {
      const isSuspending = customer.status === "active";
      const result = await promptReasonModal({
        title: isSuspending ? (getLang() === "ar" ? "تعليق حساب العميل" : "Suspend Customer Account") : (getLang() === "ar" ? "إعادة تفعيل الحساب" : "Reactivate Account"),
        message: isSuspending
          ? (getLang() === "ar" ? "عند تعليق الحساب، لن يتمكن العميل من تسجيل الدخول أو إتمام أي حجز جديد على منصة كارزن." : "The customer will be blocked from logging in and booking.")
          : (getLang() === "ar" ? "سيتم السماح للعميل بتسجيل الدخول وإجراء الحجوزات مجدداً." : "The customer will be allowed to log in and make bookings."),
        danger: isSuspending,
        placeholder: getLang() === "ar" ? "اكتب سبب هذا الإجراء للتوثيق في سجل التدقيق..." : "Document reason for this action...",
      });

      if (result) {
        await toggleCustomerSuspended(customer.id, {
          adminId: admin.id,
          suspended: isSuspending,
          reason: result.reason,
        });
        location.reload();
      }
    });
  }

  return container;
}
