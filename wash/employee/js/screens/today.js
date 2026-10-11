import { get, mutate, now } from "../../../../shared/js/db.js";
import { t, L } from "../../../../shared/js/i18n.js";
import { money, formatTime, minutesLabel } from "../../../../shared/js/format.js";
import { paintIcons } from "../../../../shared/js/dom.js";
import { toast, sheet } from "../../../../shared/js/ui.js";
import {
  confirmOrder,
  startService,
  completeService,
  collectPayment,
  addExtraService,
  applyDiscount,
} from "../../../../shared/js/services/wash.js";
import { currentStaff, currentBranch, todayCounters } from "../state.js";

let selectedFilter = "all"; // 'all' | 'waiting' | 'in_service' | 'completed' | 'pay_pending'

export function todayScreen(root) {
  const db = get();
  const staff = currentStaff();
  const branch = currentBranch();
  const counters = todayCounters(branch.id);

  // Filter orders for this branch today
  let orders = db.orders.filter((o) => o.branchId === branch.id);

  // Apply counter filter if active
  if (selectedFilter === "waiting") {
    orders = orders.filter((o) => o.status === "waiting");
  } else if (selectedFilter === "in_service") {
    orders = orders.filter((o) => o.status === "in_service");
  } else if (selectedFilter === "completed") {
    orders = orders.filter((o) => o.status === "completed");
  } else if (selectedFilter === "pay_pending") {
    orders = orders.filter((o) => o.status === "completed" && o.paymentStatus === "pending");
  }

  // Sort by urgency: in_service -> waiting -> pay_pending -> confirmed -> pending -> completed
  const weight = {
    in_service: 1,
    waiting: 2,
    confirmed: 3,
    pending: 4,
    completed: 5,
    cancelled: 6,
    no_show: 7,
  };

  orders.sort((a, b) => {
    // If completed but unpaid, prioritize above confirmed
    const aUnpaid = a.status === "completed" && a.paymentStatus === "pending";
    const bUnpaid = b.status === "completed" && b.paymentStatus === "pending";
    if (aUnpaid && !bUnpaid) return -1;
    if (!aUnpaid && bUnpaid) return 1;
    return (weight[a.status] || 9) - (weight[b.status] || 9);
  });

  // Next confirmed booking
  const nextBooking = db.orders.find((o) => o.branchId === branch.id && o.status === "confirmed");

  root.innerHTML = `
    <!-- Top Header -->
    <header class="emp-header between">
      <div class="stack" style="gap:2px">
        <div class="row">
          <b style="font-size:var(--fs-16)">${staff.name}</b>
          <span class="emp-shift-tag">٠٩:٠٠ - ١٧:٠٠</span>
        </div>
        <div class="small muted">${branch?.name?.ar || "كارزن ووش – مدينة نصر"}</div>
      </div>
      <div class="row">
        <a class="icon-btn" href="#/notifications" title="الإشعارات" style="width:38px;height:38px">
          <i data-lucide="bell"></i>
        </a>
      </div>
    </header>

    <div class="screen-body" style="padding-block-end:24px">
      <!-- 4 Counters Filter Grid -->
      <div class="counters-grid">
        <div class="counter-btn ${selectedFilter === "waiting" ? "active" : ""}" data-c="waiting">
          <span class="num">${counters.waiting}</span>
          <span class="lbl">${t("emp.counters.waiting")}</span>
        </div>
        <div class="counter-btn ${selectedFilter === "in_service" ? "active" : ""}" data-c="in_service">
          <span class="num">${counters.inService}</span>
          <span class="lbl">${t("emp.counters.in_service")}</span>
        </div>
        <div class="counter-btn ${selectedFilter === "completed" ? "active" : ""}" data-c="completed">
          <span class="num">${counters.completed}</span>
          <span class="lbl">${t("emp.counters.completed")}</span>
        </div>
        <div class="counter-btn ${selectedFilter === "pay_pending" ? "active" : ""}" data-c="pay_pending">
          <span class="num">${counters.payPending}</span>
          <span class="lbl">${t("emp.counters.pay_pending")}</span>
        </div>
      </div>

      <!-- Persistent Payment Pending Warning -->
      ${counters.payPending > 0 ? `
        <div class="emp-urgent-banner" id="urgent-pay-banner" style="cursor:pointer">
          <i data-lucide="alert-triangle" style="color:var(--c-warning)"></i>
          <span>${t("emp.urgent.warning")} (${counters.payPending})</span>
        </div>
      ` : ""}

      <!-- Quick Action Buttons -->
      <div class="row" style="padding-inline:16px;margin-block:4px 12px;gap:8px">
        <a class="btn grow sm" href="#/walk-in" style="background:linear-gradient(135deg, var(--c-primary-600), #12c8b6)">
          <i data-lucide="plus"></i> ${t("emp.walkin.title")}
        </a>
        <a class="btn ghost grow sm" href="#/check-in">
          <i data-lucide="scan"></i> ${t("emp.checkin.title")}
        </a>
        <a class="btn ghost sm" href="#/phone-booking" title="حجز هاتفي">
          <i data-lucide="phone"></i>
        </a>
      </div>

      <!-- Next upcoming booking countdown banner -->
      ${nextBooking ? `
        <div class="card pad" style="margin:0 16px 12px;background:var(--c-primary-50);border-color:var(--c-primary-100)">
          <div class="between">
            <span class="small strong ink"><i data-lucide="calendar"></i> ${t("emp.next_booking")}</span>
            <span class="badge" data-status="confirmed">${nextBooking.number}</span>
          </div>
          <div class="between" style="margin-block-start:6px">
            <div>
              <b>${nextBooking.plate}</b> · ${L(nextBooking.items[0]?.name)}
            </div>
            <span class="small muted num">${formatTime(nextBooking.scheduledAt)}</span>
          </div>
        </div>
      ` : ""}

      <!-- Today's Orders Section -->
      <div style="padding-inline:16px">
        <div class="between" style="margin-block-end:10px">
          <h2 style="font-size:var(--fs-16)">${selectedFilter !== "all" ? `طلبات (${selectedFilter})` : "أعمال اليوم"}</h2>
          ${selectedFilter !== "all" ? `
            <button class="linkish small" id="clear-filter-btn">عرض الكل</button>
          ` : `<span class="small muted">${orders.length} طلب</span>`}
        </div>

        <div id="orders-list">
          ${orders.length === 0 ? `
            <div class="empty">
              <i data-lucide="inbox" style="width:40px;height:40px;color:var(--c-ink-300)"></i>
              <h3>لا توجد طلبات هنا</h3>
              <p class="muted small">سجل سيارة حضور مباشر أو قم بتسجيل وصول الحجوزات القادمة.</p>
            </div>
          ` : orders.map((o) => renderOrderCard(o)).join("")}
        </div>
      </div>
    </div>
  `;

  paintIcons(root);

  // Counter filter clicks
  root.querySelectorAll(".counter-btn").forEach((btn) => {
    btn.onclick = () => {
      const c = btn.dataset.c;
      selectedFilter = selectedFilter === c ? "all" : c;
      todayScreen(root);
    };
  });

  const urgentBanner = document.getElementById("urgent-pay-banner");
  if (urgentBanner) {
    urgentBanner.onclick = () => {
      selectedFilter = "pay_pending";
      todayScreen(root);
    };
  }

  const clearFilterBtn = document.getElementById("clear-filter-btn");
  if (clearFilterBtn) {
    clearFilterBtn.onclick = () => {
      selectedFilter = "all";
      todayScreen(root);
    };
  }

  // Handle Order Card Primary Actions
  root.querySelectorAll("[data-action]").forEach((btn) => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const orderId = btn.dataset.id;
      const order = db.orders.find((x) => x.id === orderId);
      if (!order) return;

      try {
        if (action === "confirm") {
          await confirmOrder(orderId, staff.id);
          toast("تم تأكيد الحجز بنجاح ✓");
        } else if (action === "checkin") {
          location.hash = `#/check-in?id=${orderId}`;
          return;
        } else if (action === "start") {
          await startService(orderId, staff.id);
          toast("بدأ تنفيذ الخدمة 🚿");
        } else if (action === "complete") {
          await completeService(orderId, staff.id);
          toast("اكتملت الخدمة! جارٍ فتح التحصيل...");
          openPaymentSheet(orderId, root);
          return;
        } else if (action === "pay") {
          openPaymentSheet(orderId, root);
          return;
        }
        todayScreen(root);
      } catch (err) {
        toast(err.message || "حدث خطأ");
      }
    };
  });

  // Navigate to order details
  root.querySelectorAll(".emp-order-card").forEach((card) => {
    card.onclick = (e) => {
      if (e.target.closest("button") || e.target.closest("a")) return;
      const id = card.dataset.id;
      location.hash = `#/order/${id}`;
    };
  });
}

function renderOrderCard(o) {
  const isPayPending = o.status === "completed" && o.paymentStatus === "pending";
  const sourceIcon = o.source === "app" ? "smartphone" : o.source === "phone" ? "phone" : "car";

  let actionText = "";
  let actionType = "";
  if (o.status === "pending") {
    actionText = t("emp.action.confirm");
    actionType = "confirm";
  } else if (o.status === "confirmed") {
    actionText = t("emp.action.checkin");
    actionType = "checkin";
  } else if (o.status === "waiting") {
    actionText = t("emp.action.start");
    actionType = "start";
  } else if (o.status === "in_service") {
    actionText = t("emp.action.complete");
    actionType = "complete";
  } else if (isPayPending) {
    actionText = `💰 ${t("emp.action.pay")} (${money(o.total)})`;
    actionType = "pay";
  }

  return `
    <div class="emp-order-card" data-id="${o.id}">
      <div class="between">
        <div class="row">
          <span class="badge" data-status="${o.status}">
            <span class="dot"></span>
            ${o.status === "completed" && isPayPending ? "بانتظار الدفع" : o.status}
          </span>
          <span class="small muted num">${o.number}</span>
          <i data-lucide="${sourceIcon}" style="width:14px;height:14px;color:var(--c-ink-500)"></i>
        </div>
        <b class="num" style="color:var(--c-primary-600)">${money(o.total)}</b>
      </div>

      <div class="between">
        <div>
          <b style="font-size:var(--fs-18);letter-spacing:1px">${o.plate}</b>
          <div class="small muted">${o.customerName || (o.source === "walk_in" ? "حضور مباشر" : "عميل مسجل")}</div>
        </div>
        <div style="text-align:end">
          <div class="small strong">${L(o.items[0]?.name)}</div>
          ${o.items.length > 1 ? `<div class="small muted">+${o.items.length - 1} خدمات إضافية</div>` : ""}
          <div class="small muted num">${o.durationMin} دقيقة</div>
        </div>
      </div>

      ${actionType ? `
        <div class="action-row">
          <button class="emp-action-btn" data-action="${actionType}" data-id="${o.id}">
            ${actionText}
          </button>
        </div>
      ` : ""}
    </div>
  `;
}

export async function openPaymentSheet(orderId, root) {
  const db = get();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) return;

  const total = order.total;
  let method = "cash";

  const sheetHtml = `
    <h3 style="font-size:var(--fs-22);margin-block-end:6px">${t("emp.pay.title")}</h3>
    <div class="small muted" style="margin-block-end:16px">طلب رقم ${order.number} · لوحة ${order.plate}</div>

    <div class="card pad" style="background:var(--c-bg);text-align:center;margin-block-end:20px">
      <div class="small muted">المبلغ المطلوب سداده:</div>
      <div class="num" style="font-size:32px;font-weight:800;color:var(--c-primary-600);margin-block:4px">${money(total)}</div>
    </div>

    <div class="field" style="margin-block-end:16px">
      <span class="label">طريقة الدفع:</span>
      <div class="grid-2">
        <button class="btn ${method === "cash" ? "" : "ghost"}" id="pay-method-cash">
          💵 ${t("emp.pay.cash")}
        </button>
        <button class="btn ${method === "card" ? "" : "ghost"}" id="pay-method-card">
          💳 ${t("emp.pay.card")}
        </button>
      </div>
    </div>

    <div id="cash-calculator">
      <div class="field">
        <span class="label">${t("emp.pay.received")}:</span>
        <input class="control num" type="number" id="pay-amount-input" value="${total}" style="font-size:20px;font-weight:700" />
      </div>

      <div class="quick-amounts">
        <button class="quick-chip on" data-amt="${total}">المبلغ المضبوط</button>
        <button class="quick-chip" data-amt="100">١٠٠</button>
        <button class="quick-chip" data-amt="200">٢٠٠</button>
        <button class="quick-chip" data-amt="500">٥٠٠</button>
      </div>

      <div class="between card pad" style="background:var(--c-primary-50);margin-block:12px">
        <b>${t("emp.pay.change")}:</b>
        <b class="num" id="pay-change-val" style="font-size:20px;color:var(--c-success)">٠ ج.م</b>
      </div>
    </div>

    <button class="btn block" id="pay-confirm-btn" style="min-height:50px;background:var(--c-success);font-size:16px">
      ✓ ${t("emp.pay.confirm")}
    </button>
  `;

  const layer = await sheet(sheetHtml);

  // Bind inside sheet
  const sheetEl = document.querySelector(".sheet");
  if (!sheetEl) return;

  const inputEl = sheetEl.querySelector("#pay-amount-input");
  const changeEl = sheetEl.querySelector("#pay-change-val");
  const cashCalc = sheetEl.querySelector("#cash-calculator");
  const btnCash = sheetEl.querySelector("#pay-method-cash");
  const btnCard = sheetEl.querySelector("#pay-method-card");
  const confirmBtn = sheetEl.querySelector("#pay-confirm-btn");

  const calcChange = () => {
    const val = Number(inputEl.value) || 0;
    const diff = Math.max(0, val - total);
    changeEl.textContent = money(diff);
  };

  inputEl.oninput = calcChange;

  sheetEl.querySelectorAll(".quick-chip").forEach((chip) => {
    chip.onclick = () => {
      sheetEl.querySelectorAll(".quick-chip").forEach((c) => c.classList.remove("on"));
      chip.classList.add("on");
      inputEl.value = chip.dataset.amt;
      calcChange();
    };
  });

  btnCash.onclick = () => {
    method = "cash";
    btnCash.className = "btn";
    btnCard.className = "btn ghost";
    cashCalc.style.display = "block";
  };

  btnCard.onclick = () => {
    method = "card";
    btnCard.className = "btn";
    btnCash.className = "btn ghost";
    cashCalc.style.display = "none";
  };

  confirmBtn.onclick = async () => {
    try {
      const rec = Number(inputEl.value) || total;
      const res = await collectPayment({
        orderId,
        method,
        amountReceived: rec,
        staffId: currentStaff().id,
      });

      document.querySelector(".overlay")?.remove();
      toast(`تم التحصيل بنجاح! الباقي: ${money(res.change)}`);
      todayScreen(root);
    } catch (err) {
      toast(err.message || "فشل تسجيل الدفع");
    }
  };
}
