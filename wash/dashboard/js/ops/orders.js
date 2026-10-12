import { get, mutate, now } from "../../../../shared/js/db.js";
import { t, L } from "../../../../shared/js/i18n.js";
import { money, formatDateTime, formatTime, minutesLabel } from "../../../../shared/js/format.js";
import { paintIcons } from "../../../../shared/js/dom.js";
import { toast, sheet } from "../../../../shared/js/ui.js";
import {
  confirmOrder,
  startService,
  completeService,
  addExtraService,
  applyDiscount,
  cancelOrderByStaff,
  markNoShow,
  addOrderNote,
} from "../../../../shared/js/services/wash.js";
import { currentStaff, currentBranch } from "../state.js";
import { openPaymentSheet } from "./today.js";

let activeTab = "all";
let searchQuery = "";

export function ordersListScreen(root) {
  const db = get();
  const branch = currentBranch();
  let orders = db.orders.filter((o) => o.branchId === branch.id);

  if (activeTab === "upcoming") {
    orders = orders.filter((o) => ["pending", "confirmed"].includes(o.status));
  } else if (activeTab === "waiting") {
    orders = orders.filter((o) => o.status === "waiting");
  } else if (activeTab === "in_service") {
    orders = orders.filter((o) => o.status === "in_service");
  } else if (activeTab === "completed") {
    orders = orders.filter((o) => o.status === "completed");
  }

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    orders = orders.filter((o) => {
      return (o.number && o.number.toLowerCase().includes(q)) ||
             (o.plate && o.plate.toLowerCase().includes(q)) ||
             (o.customerPhone && o.customerPhone.includes(q)) ||
             (o.customerName && o.customerName.toLowerCase().includes(q));
    });
  }

  // Sort descending by creation
  orders.sort((a, b) => new Date(b.scheduledAt || b.createdAt).getTime() - new Date(a.scheduledAt || a.createdAt).getTime());

  root.innerHTML = `
    <header class="topbar">
      <div></div>
      <h1>${t("emp.nav.orders")}</h1>
      <div></div>
    </header>

    <div class="screen-body" style="padding-block-end:20px">
      <!-- Search Input -->
      <div style="padding:10px 16px 4px">
        <div class="field">
          <input class="control" id="orders-search-input" placeholder="ابحث برقم اللوحة، الطلب، أو الهاتف..." value="${searchQuery}" style="border-radius:var(--r-pill);height:44px" />
        </div>
      </div>

      <!-- Tabs Bar -->
      <div class="tabs" style="margin:8px 16px 14px;overflow-x:auto">
        <button class="${activeTab === "all" ? "on" : ""}" data-tab="all">الكل</button>
        <button class="${activeTab === "waiting" ? "on" : ""}" data-tab="waiting">في الانتظار</button>
        <button class="${activeTab === "in_service" ? "on" : ""}" data-tab="in_service">جارٍ التنفيذ</button>
        <button class="${activeTab === "upcoming" ? "on" : ""}" data-tab="upcoming">قادمة</button>
        <button class="${activeTab === "completed" ? "on" : ""}" data-tab="completed">مكتملة</button>
      </div>

      <!-- Orders List -->
      <div style="padding-inline:16px">
        ${orders.length === 0 ? `
          <div class="empty">
            <i data-lucide="inbox" style="width:40px;height:40px;color:var(--c-ink-300)"></i>
            <h3>لا توجد طلبات مطابقة</h3>
            <p class="muted small">جرب تغيير التبويب أو مسح نص البحث.</p>
          </div>
        ` : orders.map((o) => `
          <div class="card pad" style="margin-block-end:10px;cursor:pointer" data-oid="${o.id}">
            <div class="between">
              <div class="row">
                <span class="badge" data-status="${o.status}">${o.status}</span>
                <span class="small muted num">${o.number}</span>
              </div>
              <b class="num" style="color:var(--c-primary-600)">${money(o.total)}</b>
            </div>

            <div class="between" style="margin-block-start:8px">
              <div>
                <b style="font-size:var(--fs-18)">${o.plate}</b>
                <div class="small muted">${o.customerName || "حضور مباشر"}</div>
              </div>
              <div style="text-align:end">
                <div class="small strong">${L(o.items[0]?.name)}</div>
                <div class="small muted num">${formatTime(o.scheduledAt)}</div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  paintIcons(root);

  const searchInp = document.getElementById("orders-search-input");
  if (searchInp) {
    searchInp.oninput = (e) => {
      searchQuery = e.target.value;
      ordersListScreen(root);
    };
  }

  root.querySelectorAll(".tabs button").forEach((btn) => {
    btn.onclick = () => {
      activeTab = btn.dataset.tab;
      ordersListScreen(root);
    };
  });

  root.querySelectorAll("[data-oid]").forEach((card) => {
    card.onclick = () => {
      location.hash = `#/order/${card.dataset.oid}`;
    };
  });
}

export function orderDetailsScreen(root, orderId) {
  const db = get();
  const staff = currentStaff();
  const order = db.orders.find((o) => o.id === orderId);

  if (!order) {
    root.innerHTML = `
      <div class="empty">
        <h3>الطلب غير موجود</h3>
        <a class="btn" href="#/orders">العودة للطلبات</a>
      </div>
    `;
    return;
  }

  const isPaid = order.paymentStatus === "paid";
  const sourceLabel = order.source === "app" ? "تطبيق كارزن" : order.source === "phone" ? "حجز هاتفي" : "حضور مباشر";

  root.innerHTML = `
    <header class="topbar">
      <button class="icon-btn" onclick="history.back()"><i data-lucide="arrow-right" class="dir-icon"></i></button>
      <h1>تفاصيل الطلب ${order.number}</h1>
      <div></div>
    </header>

    <div class="screen-body" style="padding:14px 16px 80px">
      ${isPaid ? `
        <div class="banner" style="margin-block-end:14px;background:var(--c-primary-50);border:1px solid var(--c-primary-100)">
          🔒 هذا الطلب مدفوع ومغلق. التعديل متاح للمدير أو المالك فقط.
        </div>
      ` : ""}

      <!-- Status Header Card -->
      <div class="card pad" style="margin-block-end:14px">
        <div class="between">
          <div>
            <span class="badge" data-status="${order.status}">${order.status}</span>
            <span class="badge" data-pay="${order.paymentStatus}" style="margin-inline-start:6px">${order.paymentStatus}</span>
          </div>
          <b class="num" style="font-size:var(--fs-22);color:var(--c-primary-600)">${money(order.total)}</b>
        </div>
        <div class="small muted" style="margin-block-start:6px">المصدر: ${sourceLabel} · كود الوصول: <b class="num">${order.code}</b></div>
      </div>

      <!-- Customer & Vehicle Card -->
      <div class="card pad" style="margin-block-end:14px">
        <h3 style="font-size:var(--fs-16);margin-block-end:8px">بيانات العميل والمركبة</h3>
        <div class="between">
          <div>
            <b>${order.customerName || "عميل غير مسجل"}</b>
            ${order.customerPhone ? `
              <div><a class="small num" href="tel:${order.customerPhone}">📞 ${order.customerPhone}</a></div>
            ` : ""}
          </div>
          <span class="chip on" style="font-size:16px;letter-spacing:1px">${order.plate}</span>
        </div>
      </div>

      <!-- Services & Items Breakdown -->
      <div class="card pad" style="margin-block-end:14px">
        <div class="between" style="margin-block-end:10px">
          <h3 style="font-size:var(--fs-16)">الخدمات المطلوبة (${order.items.length})</h3>
          ${!isPaid && ["waiting", "in_service"].includes(order.status) ? `
            <button class="linkish small" id="btn-add-addon">＋ إضافة خدمة (Upsell)</button>
          ` : ""}
        </div>

        <div class="stack" style="gap:8px">
          ${order.items.map((it) => `
            <div class="between" style="border-block-end:1px dashed var(--c-line);padding-block-end:6px">
              <div>
                <b>${L(it.name)}</b>
                <span class="small muted num">(${it.durationMin} دقيقة)</span>
              </div>
              <span class="num">${money(it.price)}</span>
            </div>
          `).join("")}
        </div>

        <div class="between" style="margin-block-start:12px;padding-block-start:8px;border-block-start:1px solid var(--c-line)">
          <span class="small muted">المجموع الفرعي:</span>
          <span class="num">${money(order.subtotal)}</span>
        </div>

        ${order.discount ? `
          <div class="between" style="color:var(--c-danger)">
            <span class="small">خصم (${order.discount.pct || ""}% - ${order.discount.reason}):</span>
            <span class="num">-${money(order.discount.amount)}</span>
          </div>
        ` : ""}

        <div class="between" style="margin-block-start:6px">
          <b>الإجمالي النهائي:</b>
          <b class="num" style="font-size:18px;color:var(--c-primary-600)">${money(order.total)}</b>
        </div>
      </div>

      <!-- Timeline & History -->
      <div class="card pad" style="margin-block-end:14px">
        <h3 style="font-size:var(--fs-16);margin-block-end:8px">المسار الزمني (Timeline)</h3>
        <div class="stack" style="gap:8px">
          ${(order.timeline || []).map((tl) => `
            <div class="between small">
              <span class="badge" data-status="${tl.status}">${tl.status}</span>
              <span class="muted num">${formatTime(tl.at)}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Actions Panel -->
      ${!isPaid ? `
        <div class="stack" style="gap:8px;margin-block-start:20px">
          ${order.status === "pending" ? `
            <button class="btn block" id="btn-confirm-action">تأكيد الحجز</button>
          ` : order.status === "confirmed" ? `
            <a class="btn block" href="#/check-in?id=${order.id}">تسجيل الوصول (Check-in)</a>
          ` : order.status === "waiting" ? `
            <button class="btn block" id="btn-start-action" style="background:var(--st-in_service)">بدء الخدمة الآن</button>
          ` : order.status === "in_service" ? `
            <button class="btn block" id="btn-complete-action" style="background:var(--c-primary-600)">إنهاء الخدمة والدفع</button>
          ` : order.status === "completed" ? `
            <button class="btn block" id="btn-pay-action" style="background:var(--c-success)">💰 تحصيل الحساب (${money(order.total)})</button>
          ` : ""}

          <div class="grid-2">
            <button class="btn ghost sm" id="btn-apply-discount">تطبيق خصم</button>
            <button class="btn ghost sm danger" id="btn-cancel-action">إلغاء / عدم حضور</button>
          </div>
        </div>
      ` : ""}
    </div>
  `;

  paintIcons(root);

  // Bind Actions
  const btnAddAddon = document.getElementById("btn-add-addon");
  if (btnAddAddon) {
    btnAddAddon.onclick = () => openAddonSheet(order, root);
  }

  const btnDiscount = document.getElementById("btn-apply-discount");
  if (btnDiscount) {
    btnDiscount.onclick = () => openDiscountSheet(order, root);
  }

  const btnConfirm = document.getElementById("btn-confirm-action");
  if (btnConfirm) {
    btnConfirm.onclick = async () => {
      await confirmOrder(order.id, staff.id);
      toast("تم تأكيد الحجز ✓");
      orderDetailsScreen(root, order.id);
    };
  }

  const btnStart = document.getElementById("btn-start-action");
  if (btnStart) {
    btnStart.onclick = async () => {
      try {
        await startService(order.id, staff.id);
        toast("بدأ تنفيذ الخدمة 🚿");
        orderDetailsScreen(root, order.id);
      } catch (err) {
        toast(err.message || "حدث خطأ");
      }
    };
  }

  const btnComplete = document.getElementById("btn-complete-action");
  if (btnComplete) {
    btnComplete.onclick = async () => {
      await completeService(order.id, staff.id);
      toast("اكتملت الخدمة! جارٍ فتح التحصيل...");
      openPaymentSheet(order.id, root);
    };
  }

  const btnPay = document.getElementById("btn-pay-action");
  if (btnPay) {
    btnPay.onclick = () => openPaymentSheet(order.id, root);
  }

  const btnCancel = document.getElementById("btn-cancel-action");
  if (btnCancel) {
    btnCancel.onclick = () => openCancelSheet(order, root);
  }
}

async function openAddonSheet(order, root) {
  const db = get();
  const addons = db.services.filter((s) => s.branchId === order.branchId && s.type === "addon" && s.active);

  const html = `
    <h3 style="font-size:var(--fs-20);margin-block-end:8px">${t("emp.action.add_addon")}</h3>
    <p class="muted small" style="margin-block-end:16px">اختر من الخدمات الإضافية المتاحة:</p>

    <div class="stack" style="gap:10px;margin-block-end:20px">
      ${addons.map((ad) => `
        <div class="card pad between" style="cursor:pointer;background:var(--c-bg)" data-addid="${ad.id}">
          <div>
            <b>${L(ad.name)}</b>
            <div class="small muted num">+${ad.durationMin} دقيقة</div>
          </div>
          <b class="num" style="color:var(--c-primary-600)">+${money(ad.price)}</b>
        </div>
      `).join("")}
    </div>
  `;

  await sheet(html);

  const sheetEl = document.querySelector(".sheet");
  if (!sheetEl) return;

  sheetEl.querySelectorAll("[data-addid]").forEach((item) => {
    item.onclick = async () => {
      const adId = item.dataset.addid;
      try {
        await addExtraService(order.id, adId, currentStaff().id);
        document.querySelector(".overlay")?.remove();
        toast("تمت إضافة الخدمة الإضافية بنجاح ✓");
        orderDetailsScreen(root, order.id);
      } catch (err) {
        toast(err.message || "حدث خطأ");
      }
    };
  });
}

async function openDiscountSheet(order, root) {
  const staff = currentStaff();
  const maxLimit = staff.maxDiscountPct || 10;

  const html = `
    <h3 style="font-size:var(--fs-20);margin-block-end:6px">${t("emp.action.discount")}</h3>
    <p class="muted small" style="margin-block-end:16px">الحد الأقصى المسموح لك: <b>${maxLimit}%</b></p>

    <div class="field" style="margin-block-end:12px">
      <span class="label">نسبة الخصم (%):</span>
      <input class="control num" type="number" id="disc-pct" max="100" min="1" value="10" />
    </div>

    <div class="field" style="margin-block-end:12px">
      <span class="label">سبب الخصم *:</span>
      <input class="control" id="disc-reason" placeholder="مثال: عميل دائم، تعويض تأخير..." value="عميل دائم" />
    </div>

    <div class="field" id="manager-pin-group" style="display:none;margin-block-end:16px">
      <span class="label" style="color:var(--c-danger)">يتطلب موافقة المدير (النسبة > ${maxLimit}%):</span>
      <input class="control num" type="password" id="manager-pin" placeholder="أدخل رمز المدير (PIN: 1234)" />
    </div>

    <button class="btn block" id="apply-disc-btn">تطبيق الخصم</button>
  `;

  await sheet(html);

  const sheetEl = document.querySelector(".sheet");
  if (!sheetEl) return;

  const pctInp = sheetEl.querySelector("#disc-pct");
  const pinGroup = sheetEl.querySelector("#manager-pin-group");
  const pinInp = sheetEl.querySelector("#manager-pin");
  const reasonInp = sheetEl.querySelector("#disc-reason");
  const submitBtn = sheetEl.querySelector("#apply-disc-btn");

  pctInp.oninput = () => {
    const val = Number(pctInp.value) || 0;
    pinGroup.style.display = val > maxLimit ? "block" : "none";
  };

  submitBtn.onclick = async () => {
    const pct = Number(pctInp.value) || 0;
    const reason = reasonInp.value.trim() || "خصم تجاري";
    const pin = pinInp ? pinInp.value.trim() : "";

    try {
      await applyDiscount(order.id, { pct, reason }, staff.id, pin);
      document.querySelector(".overlay")?.remove();
      toast(`تم تطبيق الخصم ${pct}% بنجاح ✓`);
      orderDetailsScreen(root, order.id);
    } catch (err) {
      toast(err.message || "فشل تطبيق الخصم");
    }
  };
}

async function openCancelSheet(order, root) {
  const html = `
    <h3 style="font-size:var(--fs-20);margin-block-end:6px">إلغاء الطلب / عدم حضور</h3>
    <div class="field" style="margin-block:12px">
      <span class="label">نوع الإجراء:</span>
      <select class="control" id="cancel-type">
        <option value="cancel">إلغاء الحجز</option>
        <option value="noshow" ${order.status === "confirmed" ? "selected" : ""}>لم يحضر (No Show)</option>
      </select>
    </div>

    <div class="field" style="margin-block-end:16px">
      <span class="label">السبب *:</span>
      <input class="control" id="cancel-reason" placeholder="أدخل سبب الإلغاء..." value="اعتذار العميل" />
    </div>

    <button class="btn block danger" id="confirm-cancel-btn">تأكيد الإجراء</button>
  `;

  await sheet(html);

  const sheetEl = document.querySelector(".sheet");
  if (!sheetEl) return;

  sheetEl.querySelector("#confirm-cancel-btn").onclick = async () => {
    const type = sheetEl.querySelector("#cancel-type").value;
    const reason = sheetEl.querySelector("#cancel-reason").value.trim() || "إلغاء من المغسلة";

    try {
      if (type === "noshow") {
        await markNoShow(order.id, currentStaff().id);
        toast("تم تسجيل عدم الحضور ✓");
      } else {
        await cancelOrderByStaff(order.id, reason, currentStaff().id);
        toast("تم إلغاء الطلب ✓");
      }
      document.querySelector(".overlay")?.remove();
      orderDetailsScreen(root, order.id);
    } catch (err) {
      toast(err.message || "حدث خطأ");
    }
  };
}
