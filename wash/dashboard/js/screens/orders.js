import { get, mutate, now } from "../../../../shared/js/db.js";
import { t, L } from "../../../../shared/js/i18n.js";
import { money, formatDateTime, formatTime, minutesLabel } from "../../../../shared/js/format.js";
import { paintIcons } from "../../../../shared/js/dom.js";
import { toast, sheet } from "../../../../shared/js/ui.js";
import {
  confirmOrder,
  cancelOrderByStaff,
  refundPayment,
  reassignStaff,
} from "../../../../shared/js/services/wash.js";
import { currentStaff, selectedBranchId } from "../state.js";

let bookingsTab = "today";
let ordersTab = "active";

export function bookingsScreen(root) {
  const db = get();
  const branchId = selectedBranchId();
  let orders = branchId === "all" ? db.orders : db.orders.filter((o) => o.branchId === branchId);

  // Filter only app & phone bookings
  orders = orders.filter((o) => ["app", "phone"].includes(o.source));

  if (bookingsTab === "today") {
    orders = orders.filter((o) => ["pending", "confirmed"].includes(o.status));
  } else if (bookingsTab === "upcoming") {
    orders = orders.filter((o) => ["pending", "confirmed"].includes(o.status));
  } else if (bookingsTab === "completed") {
    orders = orders.filter((o) => o.status === "completed");
  } else if (bookingsTab === "cancelled") {
    orders = orders.filter((o) => o.status === "cancelled");
  } else if (bookingsTab === "noshow") {
    orders = orders.filter((o) => o.status === "no_show");
  }

  root.innerHTML = `
    <div class="between" style="margin-block-end:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:var(--fs-28);font-weight:800">${t("dash.nav.bookings")}</h1>
        <p class="small muted">إدارة الحجوزات المسبقة الواردة من تطبيق كارزن والاتصالات الهاتفية</p>
      </div>

      <div class="row">
        <button class="btn sm secondary" id="btn-bulk-confirm">تأكيد الكل (Bulk Confirm)</button>
        <button class="btn sm" id="btn-new-phone-booking">＋ حجز هاتفي جديد</button>
      </div>
    </div>

    <!-- Tabs Bar -->
    <div class="tabs" style="margin-block-end:16px;max-width:600px">
      <button class="${bookingsTab === "today" ? "on" : ""}" data-btab="today">اليوم</button>
      <button class="${bookingsTab === "upcoming" ? "on" : ""}" data-btab="upcoming">قادمة</button>
      <button class="${bookingsTab === "completed" ? "on" : ""}" data-btab="completed">مكتملة</button>
      <button class="${bookingsTab === "cancelled" ? "on" : ""}" data-btab="cancelled">ملغاة</button>
      <button class="${bookingsTab === "noshow" ? "on" : ""}" data-btab="noshow">لم يحضر</button>
    </div>

    <!-- Table -->
    <div class="card pad">
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>رقم الحجز</th>
              <th>اللوحة</th>
              <th>العميل</th>
              <th>الخدمة</th>
              <th>الموعد</th>
              <th>المصدر</th>
              <th>الحالة</th>
              <th>المبلغ</th>
              <th>الإجراء</th>
            </tr>
          </thead>
          <tbody>
            ${orders.length === 0 ? `
              <tr><td colspan="9" style="text-align:center;padding:32px" class="muted">لا توجد حجوزات في هذا التبويب</td></tr>
            ` : orders.map((o) => `
              <tr style="cursor:pointer" data-drawer-order="${o.id}">
                <td class="num"><b>${o.number}</b></td>
                <td><b class="chip on" style="letter-spacing:1px">${o.plate}</b></td>
                <td>${o.customerName || "عميل مسجل"}</td>
                <td>${L(o.items[0]?.name)}</td>
                <td class="num">${formatDateTime(o.scheduledAt)}</td>
                <td><span class="badge" data-status="${o.source === "app" ? "confirmed" : "waiting"}">${o.source === "app" ? "تطبيق" : "هاتف"}</span></td>
                <td><span class="badge" data-status="${o.status}">${o.status}</span></td>
                <td class="num font-bold">${money(o.total)}</td>
                <td>
                  ${o.status === "pending" ? `
                    <button class="btn sm" data-confirm-id="${o.id}">تأكيد</button>
                  ` : `
                    <button class="btn sm ghost" data-drawer-btn="${o.id}">تفاصيل</button>
                  `}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>

    <div id="drawer-slot"></div>
  `;

  paintIcons(root);

  // Tab switching
  root.querySelectorAll(".tabs button").forEach((btn) => {
    btn.onclick = () => {
      bookingsTab = btn.dataset.btab;
      bookingsScreen(root);
    };
  });

  // Bulk confirm
  document.getElementById("btn-bulk-confirm").onclick = async () => {
    const pending = orders.filter((o) => o.status === "pending");
    for (const o of pending) {
      await confirmOrder(o.id, currentStaff().id);
    }
    toast(`تم تأكيد ${pending.length} حجز بنجاح ✓`);
    bookingsScreen(root);
  };

  // Open drawer on row click
  root.querySelectorAll("[data-drawer-order]").forEach((row) => {
    row.onclick = (e) => {
      if (e.target.closest("button[data-confirm-id]")) return;
      openOrderDetailsDrawer(row.dataset.drawerOrder, root);
    };
  });

  root.querySelectorAll("[data-confirm-id]").forEach((btn) => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      await confirmOrder(btn.dataset.confirmId, currentStaff().id);
      toast("تم تأكيد الحجز ✓");
      bookingsScreen(root);
    };
  });
}

export function ordersScreen(root) {
  const db = get();
  const branchId = selectedBranchId();
  let orders = branchId === "all" ? db.orders : db.orders.filter((o) => o.branchId === branchId);

  if (ordersTab === "active") {
    orders = orders.filter((o) => ["waiting", "in_service"].includes(o.status) || (o.status === "completed" && o.paymentStatus === "pending"));
  } else if (ordersTab === "waiting") {
    orders = orders.filter((o) => o.status === "waiting");
  } else if (ordersTab === "in_service") {
    orders = orders.filter((o) => o.status === "in_service");
  } else if (ordersTab === "completed") {
    orders = orders.filter((o) => o.status === "completed");
  }

  // Sort descending
  orders.sort((a, b) => new Date(b.scheduledAt || b.createdAt).getTime() - new Date(a.scheduledAt || a.createdAt).getTime());

  root.innerHTML = `
    <div class="between" style="margin-block-end:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:var(--fs-28);font-weight:800">${t("dash.nav.orders")}</h1>
        <p class="small muted">سجل جميع طلبات الغسيل بالفرع بجميع مصادرها وحالاتها</p>
      </div>

      <div class="row">
        <a class="btn sm" href="#/live">عرض اللوحة المباشرة ←</a>
      </div>
    </div>

    <!-- Tabs Bar -->
    <div class="tabs" style="margin-block-end:16px;max-width:600px">
      <button class="${ordersTab === "active" ? "on" : ""}" data-otab="active">السيارات النشطة</button>
      <button class="${ordersTab === "waiting" ? "on" : ""}" data-otab="waiting">في الانتظار</button>
      <button class="${ordersTab === "in_service" ? "on" : ""}" data-otab="in_service">جارٍ التنفيذ</button>
      <button class="${ordersTab === "completed" ? "on" : ""}" data-otab="completed">مكتملة</button>
      <button class="${ordersTab === "all" ? "on" : ""}" data-otab="all">جميع السجلات</button>
    </div>

    <!-- Table -->
    <div class="card pad">
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>رقم الطلب</th>
              <th>اللوحة</th>
              <th>العميل</th>
              <th>الخدمة</th>
              <th>المصدر</th>
              <th>الموظف</th>
              <th>الحالة</th>
              <th>الدفع</th>
              <th>المبلغ</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map((o) => `
              <tr style="cursor:pointer" data-drawer-order="${o.id}">
                <td class="num"><b>${o.number}</b></td>
                <td><b class="chip on" style="letter-spacing:1px">${o.plate}</b></td>
                <td>${o.customerName || (o.source === "walk_in" ? "حضور مباشر" : "عميل مسجل")}</td>
                <td>${L(o.items[0]?.name)}</td>
                <td>${o.source === "app" ? "تطبيق" : o.source === "phone" ? "هاتف" : "مباشر"}</td>
                <td>${o.assignedStaffId === "st_samir" ? "أحمد سمير" : o.assignedStaffId === "st_adel" ? "محمد عادل" : "فريق المغسلة"}</td>
                <td><span class="badge" data-status="${o.status}">${o.status}</span></td>
                <td><span class="badge" data-pay="${o.paymentStatus}">${o.paymentStatus}</span></td>
                <td class="num font-bold">${money(o.total)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>

    <div id="drawer-slot"></div>
  `;

  paintIcons(root);

  root.querySelectorAll(".tabs button").forEach((btn) => {
    btn.onclick = () => {
      ordersTab = btn.dataset.otab;
      ordersScreen(root);
    };
  });

  root.querySelectorAll("[data-drawer-order]").forEach((row) => {
    row.onclick = () => {
      openOrderDetailsDrawer(row.dataset.drawerOrder, root);
    };
  });
}

export function openOrderDetailsDrawer(orderId, pageRoot) {
  const db = get();
  const staff = currentStaff();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) return;

  const drawerSlot = document.getElementById("drawer-slot") || pageRoot;
  const onShiftStaff = db.staff.filter((s) => s.branchId === order.branchId && s.status === "active");

  const drawerHtml = `
    <div class="drawer-overlay" id="order-drawer">
      <div class="drawer-panel">
        <div class="between" style="margin-block-end:16px">
          <div>
            <h2 style="font-size:var(--fs-22)">الطلب ${order.number}</h2>
            <div class="small muted">كود الحجز: <b class="num">${order.code}</b></div>
          </div>
          <button class="icon-btn" id="btn-close-drawer">✕</button>
        </div>

        <!-- Badges row -->
        <div class="row" style="margin-block-end:16px">
          <span class="badge" data-status="${order.status}">${order.status}</span>
          <span class="badge" data-pay="${order.paymentStatus}">${order.paymentStatus}</span>
          <span class="chip on" style="letter-spacing:1px">${order.plate}</span>
        </div>

        <!-- Customer & Vehicle -->
        <div class="card pad" style="background:var(--c-bg);margin-block-end:16px">
          <b>${order.customerName || "عميل غير مسجل"}</b>
          ${order.customerPhone ? `<div class="small num">📞 ${order.customerPhone}</div>` : ""}
          <div class="small muted" style="margin-block-start:4px">المركبة: ${order.plate}</div>
        </div>

        <!-- Staff Assignment (MG-04) -->
        <div class="field" style="margin-block-end:16px">
          <span class="label">الموظف المعين للخدمة:</span>
          <select class="control" id="drawer-staff-select">
            ${onShiftStaff.map((s) => `
              <option value="${s.id}" ${s.id === order.assignedStaffId ? "selected" : ""}>
                ${s.name} (${s.role === "manager" ? "مدير" : "موظف"})
              </option>
            `).join("")}
          </select>
        </div>

        <!-- Items Breakdown -->
        <div class="card pad" style="margin-block-end:16px">
          <b style="font-size:14px;display:block;margin-block-end:10px">الخدمات والإضافات:</b>
          <div class="stack" style="gap:6px">
            ${order.items.map((it) => `
              <div class="between small">
                <span>${L(it.name)} (${it.durationMin} دقيقة)</span>
                <span class="num font-bold">${money(it.price)}</span>
              </div>
            `).join("")}
          </div>
          <div class="between" style="margin-block-start:10px;padding-block-start:8px;border-block-start:1px solid var(--c-line)">
            <b>الإجمالي:</b>
            <b class="num" style="font-size:18px;color:var(--c-primary-600)">${money(order.total)}</b>
          </div>
        </div>

        <!-- Timeline & Audits -->
        <div class="card pad" style="margin-block-end:20px">
          <b style="font-size:14px;display:block;margin-block-end:8px">سجل الحالات والتدقيق:</b>
          <div class="stack" style="gap:8px">
            ${(order.timeline || []).map((tl) => `
              <div class="between small">
                <span class="badge" data-status="${tl.status}">${tl.status}</span>
                <span class="small muted num">${formatDateTime(tl.at)}</span>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Manager Exceptions (MG-06) -->
        <div class="stack" style="margin-block-start:auto;gap:8px">
          ${order.paymentStatus === "paid" ? `
            <button class="btn ghost sm danger" id="drawer-btn-refund">
              استرجاع المبلغ وإلغاء الدفع (Refund)
            </button>
          ` : ""}

          ${["pending", "confirmed", "waiting"].includes(order.status) ? `
            <button class="btn ghost sm danger" id="drawer-btn-cancel">
              إلغاء الطلب من الإدارة
            </button>
          ` : ""}
        </div>
      </div>
    </div>
  `;

  drawerSlot.innerHTML = drawerHtml;
  paintIcons(drawerSlot);

  document.getElementById("btn-close-drawer").onclick = () => {
    document.getElementById("order-drawer")?.remove();
  };

  // Staff reassignment
  const staffSelect = document.getElementById("drawer-staff-select");
  if (staffSelect) {
    staffSelect.onchange = async () => {
      const newStaffId = staffSelect.value;
      await reassignStaff(order.id, newStaffId, staff.id);
      toast("تمت إعادة تعيين الموظف بنجاح ✓");
    };
  }

  // Refund button
  const refundBtn = document.getElementById("drawer-btn-refund");
  if (refundBtn) {
    refundBtn.onclick = async () => {
      const reason = prompt("يرجى إدخال سبب استرجاع المبلغ (Refund Reason):", "طلب العميل بسبب مشكلة في الخدمة");
      if (!reason) return;
      try {
        await refundPayment(order.id, reason, staff.id);
        toast("تم استرجاع المبلغ وتحديث المعاملة بنجاح ✓");
        document.getElementById("order-drawer")?.remove();
        if (location.hash.startsWith("#/bookings")) bookingsScreen(pageRoot);
        else ordersScreen(pageRoot);
      } catch (err) {
        toast(err.message || "حدث خطأ");
      }
    };
  }

  // Cancel button
  const cancelBtn = document.getElementById("drawer-btn-cancel");
  if (cancelBtn) {
    cancelBtn.onclick = async () => {
      const reason = prompt("يرجى إدخال سبب الإلغاء:", "إلغاء إداري");
      if (!reason) return;
      try {
        await cancelOrderByStaff(order.id, reason, staff.id);
        toast("تم إلغاء الطلب بنجاح ✓");
        document.getElementById("order-drawer")?.remove();
        if (location.hash.startsWith("#/bookings")) bookingsScreen(pageRoot);
        else ordersScreen(pageRoot);
      } catch (err) {
        toast(err.message || "حدث خطأ");
      }
    };
  }
}
