import { t, getLang } from "../../../shared/js/i18n.js";
import { formatDateTime, formatDate, money } from "../../../shared/js/format.js";
import { getOrders, getOrderDetails, cancelOrderAsAdmin, correctOrderDataAsAdmin, flagOrderForFinance } from "../../../shared/js/services/admin.js";
import { createDataTable } from "../components/table.js";
import { openDrawer } from "../components/drawer.js";
import { promptReasonModal, confirmModal } from "../components/modal.js";
import { getCurrentAdmin, checkPermission } from "../auth.js";

export async function renderOrders(params = {}, query = {}) {
  if (params.id) {
    return renderOrderDetailsView(params.id);
  }

  const container = document.createElement("div");

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t("admin.nav.orders")}</h1>
        <div class="page-subtitle">${getLang() === "ar" ? "متابعة تدفق جميع حجوزات وطلبات المنصة في الوقت الفعلي" : "Real-time monitoring of marketplace bookings, walk-ins and phone orders"}</div>
      </div>
    </div>
    <div id="orders-table-mount"></div>
  `;

  const orders = await getOrders({ status: query.status });

  const table = createDataTable({
    data: orders,
    searchPlaceholder: getLang() === "ar" ? "ابحث برقم الحجز، اللوحة، أو اسم العميل..." : "Search by order #, plate, or customer...",
    quickChips: [
      { id: "all", label: getLang() === "ar" ? "الكل" : "All", active: !query.status || query.status === "all", predicate: () => true },
      { id: "pending", label: getLang() === "ar" ? "بانتظار التأكيد" : "Pending", active: query.status === "pending", predicate: (o) => o.status === "pending" },
      { id: "confirmed", label: getLang() === "ar" ? "مؤكد" : "Confirmed", active: query.status === "confirmed", predicate: (o) => o.status === "confirmed" },
      { id: "waiting", label: getLang() === "ar" ? "في الانتظار" : "Waiting", active: query.status === "waiting", predicate: (o) => o.status === "waiting" },
      { id: "in_service", label: getLang() === "ar" ? "قيد التنفيذ" : "In Service", active: query.status === "in_service", predicate: (o) => o.status === "in_service" },
      { id: "completed", label: getLang() === "ar" ? "مكتمل" : "Completed", active: query.status === "completed", predicate: (o) => o.status === "completed" },
      { id: "cancelled", label: getLang() === "ar" ? "ملغي" : "Cancelled", active: query.status === "cancelled", predicate: (o) => o.status === "cancelled" },
    ],
    filters: [
      {
        key: "source",
        label: getLang() === "ar" ? "المصدر" : "Source",
        options: [
          { value: "app", label: getLang() === "ar" ? "تطبيق العميل" : "Customer App" },
          { value: "walk_in", label: getLang() === "ar" ? "زيارة مباشرة" : "Walk-in" },
          { value: "phone", label: getLang() === "ar" ? "هاتفياً" : "Phone" },
        ],
        predicate: (row, val) => row.source === val,
      },
    ],
    columns: [
      {
        key: "number",
        title: getLang() === "ar" ? "رقم الحجز" : "Order #",
        render: (o) => `
          <div style="font-weight:800;color:var(--c-primary-600)">${o.number}</div>
          <div class="muted" style="font-size:11px">${o.source || "app"}</div>
        `,
      },
      {
        key: "customer",
        title: getLang() === "ar" ? "العميل" : "Customer",
        render: (o) => o.customer ? `<div>${o.customer.name}</div><div class="muted" style="font-size:12px">${o.plate || ""}</div>` : (o.plate || "Guest"),
      },
      {
        key: "wash",
        title: getLang() === "ar" ? "المغسلة" : "Wash",
        render: (o) => {
          const name = o.business?.name ? (o.business.name[getLang()] || o.business.name.ar) : o.businessId;
          const branch = o.branch?.name ? (o.branch.name[getLang()] || o.branch.name.ar) : "";
          return `<div>${name}</div><div class="muted" style="font-size:12px">${branch}</div>`;
        },
      },
      {
        key: "scheduledAt",
        title: getLang() === "ar" ? "الموعد" : "Scheduled",
        render: (o) => formatDateTime(o.scheduledAt),
      },
      {
        key: "status",
        title: getLang() === "ar" ? "الحالة" : "Status",
        render: (o) => `
          <span class="badge" data-status="${o.status}">
            <span class="dot"></span>
            ${o.status}
          </span>
        `,
      },
      {
        key: "paymentStatus",
        title: getLang() === "ar" ? "الدفع" : "Payment",
        render: (o) => `
          <span class="badge" data-pay="${o.paymentStatus}">
            ${o.paymentStatus}
          </span>
        `,
      },
      {
        key: "total",
        title: getLang() === "ar" ? "المبلغ" : "Total",
        render: (o) => `<strong>${money(o.total)}</strong>`,
      },
    ],
    onRowClick: (order) => {
      openDrawer({
        title: order.number,
        subtitle: `${order.business?.name?.[getLang()] || ""} · ${formatDateTime(order.scheduledAt)}`,
        fullDetailsUrl: `#/orders/${order.id}`,
        bodyHtml: `
          <div class="card pad" style="background:var(--c-bg)">
            <div style="display:flex;justify-content:space-between;margin-block-end:8px">
              <span class="muted">${getLang() === "ar" ? "الحالة الحالية:" : "Current Status:"}</span>
              <span class="badge" data-status="${order.status}"><span class="dot"></span>${order.status}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-block-end:8px">
              <span class="muted">${getLang() === "ar" ? "المبلغ الإجمالي:" : "Total Amount:"}</span>
              <strong style="color:var(--c-primary-600)">${money(order.total)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span class="muted">${getLang() === "ar" ? "طريقة الدفع:" : "Payment Method:"}</span>
              <span>${order.paymentMethod || "Cash"} (${order.paymentStatus})</span>
            </div>
          </div>
          <div>
            <h4 style="margin:0 0 8px;font-size:14px">${getLang() === "ar" ? "الخدمات المطلوبة:" : "Items:"}</h4>
            ${(order.items || []).map((it) => `
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-block-end:1px solid var(--c-line);font-size:13px">
                <span>${it.name || "Wash Service"}</span>
                <strong>${money(it.price)}</strong>
              </div>
            `).join("")}
          </div>
        `,
      });
    },
    exportFileName: "carzen_orders",
  });

  container.querySelector("#orders-table-mount").appendChild(table.element);
  return container;
}

async function renderOrderDetailsView(id) {
  const container = document.createElement("div");
  const data = await getOrderDetails(id);

  if (!data || !data.order) {
    container.innerHTML = `
      <div class="empty">
        <h3>${getLang() === "ar" ? "الحجز غير موجود" : "Booking not found"}</h3>
        <a href="#/orders" class="btn">${getLang() === "ar" ? "العودة للحجوزات" : "Back"}</a>
      </div>
    `;
    return container;
  }

  const { order, customer, vehicle, business, branch, staff, payment, transaction, review, complaint, auditEntries } = data;
  const admin = getCurrentAdmin();
  const canIntervene = checkPermission("cancel_order");

  container.innerHTML = `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:12px">
        <a href="#/orders" class="icon-btn sm" title="Back">
          <i data-lucide="arrow-right" style="inline-size:18px;block-size:18px"></i>
        </a>
        <div>
          <h1 class="page-title">${order.number}</h1>
          <div class="page-subtitle">${formatDateTime(order.scheduledAt)} · ${business?.name?.[getLang()] || ""}</div>
        </div>
      </div>
      <div class="page-actions">
        ${canIntervene && ["pending", "confirmed"].includes(order.status) ? `
          <button type="button" class="btn ghost danger" id="btn-cancel-order-admin">
            ${t("admin.action.cancelOrder")}
          </button>
        ` : ""}
        <button type="button" class="btn ghost" id="btn-correct-order-admin">
          ${t("admin.action.correctData")}
        </button>
        <button type="button" class="btn secondary" id="btn-flag-finance-admin">
          ${t("admin.action.flagFinance")}
        </button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:var(--s-6)">
      <!-- Order details & Items -->
      <div style="display:flex;flex-direction:column;gap:var(--s-5)">
        <div class="card pad">
          <h3 style="margin:0 0 16px;font-size:16px">${getLang() === "ar" ? "تفاصيل الحجز والخدمات" : "Order & Service Details"}</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:14px;margin-block-end:var(--s-4)">
            <div><strong>${getLang() === "ar" ? "المغسلة:" : "Wash:"}</strong> ${business?.name?.[getLang()] || order.businessId}</div>
            <div><strong>${getLang() === "ar" ? "الفرع:" : "Branch:"}</strong> ${branch?.name?.[getLang()] || order.branchId}</div>
            <div><strong>${getLang() === "ar" ? "العميل:" : "Customer:"}</strong> ${customer ? `<a href="#/customers/${customer.id}">${customer.name}</a>` : "Guest"}</div>
            <div><strong>${getLang() === "ar" ? "السيارة واللوحة:" : "Vehicle:"}</strong> ${vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.plate})` : (order.plate || "—")}</div>
            <div><strong>${getLang() === "ar" ? "الموظف المباشر:" : "Staff:"}</strong> ${staff?.name || "—"}</div>
            <div><strong>${getLang() === "ar" ? "رمز الوصول (Check-in Code):" : "Code:"}</strong> <span class="chip on" style="font-family:monospace">${order.code || "—"}</span></div>
          </div>

          <h4 style="margin:var(--s-4) 0 8px;font-size:14px">${getLang() === "ar" ? "الخدمات المحجوزة:" : "Booked Services:"}</h4>
          <div class="table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>${getLang() === "ar" ? "الخدمة" : "Service"}</th>
                  <th>${getLang() === "ar" ? "النوع" : "Type"}</th>
                  <th>${getLang() === "ar" ? "المدة" : "Duration"}</th>
                  <th>${getLang() === "ar" ? "السعر" : "Price"}</th>
                </tr>
              </thead>
              <tbody>
                ${(order.items || []).map((it) => `
                  <tr>
                    <td><strong>${it.name}</strong></td>
                    <td>${it.type}</td>
                    <td>${it.durationMin} min</td>
                    <td><strong>${money(it.price)}</strong></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>

          <div style="display:flex;justify-content:flex-end;margin-block-start:var(--s-4)">
            <div style="inline-size:240px;display:flex;flex-direction:column;gap:6px;font-size:14px">
              <div style="display:flex;justify-content:space-between">
                <span class="muted">${getLang() === "ar" ? "المجموع الفرعي:" : "Subtotal:"}</span>
                <span>${money(order.subtotal || order.total)}</span>
              </div>
              ${order.discount ? `
                <div style="display:flex;justify-content:space-between;color:var(--c-success)">
                  <span>${getLang() === "ar" ? "الخصم:" : "Discount:"}</span>
                  <span>-${money(order.discount.amount)}</span>
                </div>
              ` : ""}
              <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:800;border-block-start:1px solid var(--c-line);padding-block-start:6px">
                <span>${getLang() === "ar" ? "الإجمالي:" : "Total:"}</span>
                <span style="color:var(--c-primary-600)">${money(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Related Review or Complaint if exists -->
        ${review ? `
          <div class="card pad" style="background:var(--c-bg)">
            <h4 style="margin:0 0 8px;font-size:14px">${getLang() === "ar" ? "تقييم العميل المرتبط بهذا الحجز" : "Customer Review"}</h4>
            <div style="color:var(--c-warning);font-weight:700">${"★".repeat(review.stars)} (${review.stars}/5)</div>
            <p style="margin:6px 0 0;font-size:14px">${review.comment || "—"}</p>
          </div>
        ` : ""}

        ${complaint ? `
          <div class="card pad" style="background:color-mix(in srgb,var(--c-danger) 8%,transparent)">
            <h4 style="margin:0 0 8px;font-size:14px;color:var(--c-danger)">⚠️ ${getLang() === "ar" ? "شكوى مرفوعة على هذا الطلب" : "Complaint Filed"}</h4>
            <p style="margin:0;font-size:14px">${complaint.description}</p>
            <a href="#/complaints/${complaint.id}" style="display:inline-block;margin-block-start:8px;font-weight:700">View Complaint #${complaint.id}</a>
          </div>
        ` : ""}
      </div>

      <!-- Right Column: Operational Timeline (AD-26) -->
      <div style="display:flex;flex-direction:column;gap:var(--s-4)">
        <div class="card pad">
          <h3 style="margin:0 0 16px;font-size:16px">${getLang() === "ar" ? "المسار الزمني التشغيلي" : "Operational Timeline"}</h3>
          <div class="timeline-list">
            ${(order.timeline || []).map((step) => `
              <div class="timeline-step done">
                <div class="timeline-dot"></div>
                <div style="font-weight:700;font-size:14px">${step.status}</div>
                <div class="muted" style="font-size:12px">${formatDateTime(step.at)} · by ${step.byId || step.byType}</div>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="card pad">
          <h3 style="margin:0 0 12px;font-size:16px">${getLang() === "ar" ? "بيانات الدفع والتسوية" : "Payment & Settlement"}</h3>
          <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
            <div><strong>${getLang() === "ar" ? "حالة الدفع:" : "Payment Status:"}</strong> <span class="badge" data-pay="${order.paymentStatus}">${order.paymentStatus}</span></div>
            <div><strong>${getLang() === "ar" ? "طريقة التحصيل:" : "Method:"}</strong> ${order.paymentMethod || "Cash"}</div>
            <div><strong>${getLang() === "ar" ? "العمولة المحتسبة:" : "Commission:"}</strong> ${transaction ? money(transaction.commission) : "—"}</div>
            <div><strong>${getLang() === "ar" ? "صافي المغسلة:" : "Net to Wash:"}</strong> ${transaction ? money(transaction.netToWash) : "—"}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  if (window.lucide?.createIcons) window.lucide.createIcons({ root: container });

  // Cancel order handler (AD-27)
  const cancelBtn = container.querySelector("#btn-cancel-order-admin");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", async () => {
      const result = await promptReasonModal({
        title: getLang() === "ar" ? "إلغاء الحجز بواسطة إدارة المنصة" : "Cancel Booking as Admin",
        message: getLang() === "ar" ? "سيتم إشعار العميل والمغسلة فوراً بسبب الإلغاء." : "Both customer and wash will be notified.",
        danger: true,
        placeholder: getLang() === "ar" ? "اكتب سبب الإلغاء الإداري..." : "State cancellation reason...",
      });

      if (result) {
        await cancelOrderAsAdmin(order.id, {
          adminId: admin.id,
          reason: result.reason,
        });
        location.reload();
      }
    });
  }

  // Correct non-financial data handler (AD-27)
  const correctBtn = container.querySelector("#btn-correct-order-admin");
  if (correctBtn) {
    correctBtn.addEventListener("click", async () => {
      const result = await promptReasonModal({
        title: getLang() === "ar" ? "تصحيح بيانات الحجز الإدارية" : "Correct Booking Data",
        message: getLang() === "ar" ? "ملاحظة: لا يمكن تعديل المبالغ المالية للحجوزات المحصلة، فقط البيانات التشغيلية والملاحظات." : "Financial values cannot be altered. Operational corrections only.",
      });

      if (result) {
        await correctOrderDataAsAdmin(order.id, {
          adminId: admin.id,
          patch: {},
          reason: result.reason,
        });
        location.reload();
      }
    });
  }

  // Flag for finance review handler (AD-27)
  const flagBtn = container.querySelector("#btn-flag-finance-admin");
  if (flagBtn) {
    flagBtn.addEventListener("click", async () => {
      const result = await promptReasonModal({
        title: getLang() === "ar" ? "إحالة الحجز للمراجعة المالية" : "Flag for Finance Review",
        message: getLang() === "ar" ? "بما أن المعاملات المالية المكتملة لا تُعدل مباشرة، سيتم إرسال تنبيه لفريق الإدارة المالية للتحقيق." : "Completed transactions cannot be edited directly; this dispatches a review request to Finance.",
      });

      if (result) {
        await flagOrderForFinance(order.id, {
          adminId: admin.id,
          reason: result.reason,
        });
        location.reload();
      }
    });
  }

  return container;
}
