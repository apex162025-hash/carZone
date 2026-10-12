import { get, mutate, now } from "../../../../shared/js/db.js";
import { t, L } from "../../../../shared/js/i18n.js";
import { money, formatDateTime, formatTime } from "../../../../shared/js/format.js";
import { paintIcons } from "../../../../shared/js/dom.js";
import { toast } from "../../../../shared/js/ui.js";
import { checkInOrder, markNoShow } from "../../../../shared/js/services/wash.js";
import { currentStaff, currentBranch } from "../state.js";

let checkinTab = "scan"; // 'scan' | 'code' | 'search'

export function checkinScreen(root, prefillOrderId = null) {
  const db = get();
  const staff = currentStaff();
  const branch = currentBranch();

  // Find confirmed bookings for today at this branch
  const confirmedOrders = db.orders.filter((o) => o.branchId === branch.id && o.status === "confirmed");

  // Check if prefill ID supplied via query
  let selectedOrder = prefillOrderId ? db.orders.find((o) => o.id === prefillOrderId) : null;

  root.innerHTML = `
    <header class="topbar">
      <button class="icon-btn" onclick="history.back()"><i data-lucide="arrow-right" class="dir-icon"></i></button>
      <h1>${t("emp.checkin.title")}</h1>
      <div></div>
    </header>

    <div class="screen-body" style="padding:14px 16px 80px">
      <!-- Tabs: Scan, Code, Search -->
      <div class="tabs" style="margin-block-end:16px">
        <button class="${checkinTab === "scan" ? "on" : ""}" data-tab="scan">${t("emp.checkin.scan")}</button>
        <button class="${checkinTab === "code" ? "on" : ""}" data-tab="code">${t("emp.checkin.code")}</button>
        <button class="${checkinTab === "search" ? "on" : ""}" data-tab="search">${t("emp.checkin.search")}</button>
      </div>

      <!-- Tab 1: Scanner Viewfinder -->
      <div id="tab-scan-content" style="display:${checkinTab === "scan" ? "block" : "none"}">
        <div class="scanner-viewfinder">
          <div class="scanner-corners"></div>
          <div class="scan-laser"></div>
          <div style="position:absolute;bottom:12px;font-size:12px;opacity:0.8">وجّه الكاميرا نحو رمز QR الخاص بالعميل</div>
        </div>

        <div class="field" style="margin-block-end:16px">
          <span class="label">${t("emp.checkin.sim_scan")}:</span>
          <select class="control" id="sim-scan-select">
            <option value="">-- اختَر حجزًا لتجربة المسح --</option>
            ${confirmedOrders.map((o) => `
              <option value="${o.id}">${o.number} · كود: ${o.code} · ${o.plate}</option>
            `).join("")}
          </select>
        </div>
      </div>

      <!-- Tab 2: 5-Character Code Entry -->
      <div id="tab-code-content" style="display:${checkinTab === "code" ? "none" : "none"}">
        <div class="field" style="margin-block-end:20px;text-align:center">
          <span class="label">${t("emp.checkin.code_ph")}</span>
          <div class="code-inputs" style="margin-block-start:12px">
            <input class="code-box" maxlength="1" id="c-1" autofocus />
            <input class="code-box" maxlength="1" id="c-2" />
            <input class="code-box" maxlength="1" id="c-3" />
            <input class="code-box" maxlength="1" id="c-4" />
            <input class="code-box" maxlength="1" id="c-5" />
          </div>
        </div>
        <button class="btn block" id="btn-verify-code">تحقق من الكود</button>
      </div>

      <!-- Tab 3: Search input -->
      <div id="tab-search-content" style="display:${checkinTab === "search" ? "none" : "none"}">
        <div class="field" style="margin-block-end:14px">
          <span class="label">ابحث برقم اللوحة أو الموبايل أو الحجز:</span>
          <input class="control" id="search-checkin-inp" placeholder="مثال: ABC123 أو CZ-10001 أو 010..." />
        </div>
        <button class="btn block" id="btn-search-checkin">بحث عن الحجز</button>
      </div>

      <!-- Result Card Container -->
      <div id="checkin-result-box" style="margin-block-start:20px">
        ${selectedOrder ? renderCheckinResult(selectedOrder) : ""}
      </div>
    </div>
  `;

  paintIcons(root);

  // Tab switching
  root.querySelectorAll(".tabs button").forEach((btn) => {
    btn.onclick = () => {
      checkinTab = btn.dataset.tab;
      document.getElementById("tab-scan-content").style.display = checkinTab === "scan" ? "block" : "none";
      document.getElementById("tab-code-content").style.display = checkinTab === "code" ? "block" : "none";
      document.getElementById("tab-search-content").style.display = checkinTab === "search" ? "block" : "none";
      root.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("on", b === btn));
    };
  });

  // Sim scan select
  const simSelect = document.getElementById("sim-scan-select");
  if (simSelect) {
    simSelect.onchange = (e) => {
      const id = e.target.value;
      if (!id) return;
      selectedOrder = db.orders.find((o) => o.id === id);
      showResult(selectedOrder);
    };
  }

  // Code input auto-advance
  const codeBoxes = [
    document.getElementById("c-1"),
    document.getElementById("c-2"),
    document.getElementById("c-3"),
    document.getElementById("c-4"),
    document.getElementById("c-5"),
  ];

  codeBoxes.forEach((box, i) => {
    if (!box) return;
    box.oninput = () => {
      box.value = box.value.toUpperCase();
      if (box.value && i < 4) codeBoxes[i + 1].focus();
    };
    box.onkeydown = (e) => {
      if (e.key === "Backspace" && !box.value && i > 0) codeBoxes[i - 1].focus();
    };
  });

  const verifyCodeBtn = document.getElementById("btn-verify-code");
  if (verifyCodeBtn) {
    verifyCodeBtn.onclick = () => {
      const code = codeBoxes.map((b) => b.value).join("").trim();
      if (code.length < 5) {
        toast("يرجى إدخال الكود المكون من ٥ أحرف");
        return;
      }
      const match = confirmedOrders.find((o) => o.code && o.code.toUpperCase() === code);
      if (match) {
        selectedOrder = match;
        showResult(selectedOrder);
      } else {
        toast("لم يتم العثور على حجز مؤكد بهذا الكود");
      }
    };
  }

  // Search check-in button
  const searchBtn = document.getElementById("btn-search-checkin");
  if (searchBtn) {
    searchBtn.onclick = () => {
      const q = document.getElementById("search-checkin-inp").value.trim().toUpperCase();
      if (!q) return;
      const match = confirmedOrders.find((o) => {
        return (o.number && o.number.toUpperCase().includes(q)) ||
               (o.plate && o.plate.toUpperCase().includes(q)) ||
               (o.customerPhone && o.customerPhone.includes(q));
      });
      if (match) {
        selectedOrder = match;
        showResult(selectedOrder);
      } else {
        toast("لم يتم العثور على حجز مؤكد يطابق البحث");
      }
    };
  }

  function showResult(order) {
    const resBox = document.getElementById("checkin-result-box");
    if (!resBox || !order) return;
    resBox.innerHTML = renderCheckinResult(order);
    paintIcons(resBox);
    bindResultActions(order);
  }

  function bindResultActions(order) {
    const confirmBtn = document.getElementById("btn-confirm-arrival");
    if (confirmBtn) {
      confirmBtn.onclick = async () => {
        try {
          await checkInOrder({
            orderId: order.id,
            staffId: staff.id,
            branchId: branch.id,
          });
          toast("تم تسجيل وصول العميل بنجاح ✓");
          location.hash = "#/home";
        } catch (err) {
          toast(err.message || "حدث خطأ");
        }
      };
    }

    const noshowBtn = document.getElementById("btn-mark-noshow-checkin");
    if (noshowBtn) {
      noshowBtn.onclick = async () => {
        try {
          await markNoShow(order.id, staff.id);
          toast("تم تسجيل عدم الحضور ✓");
          location.hash = "#/home";
        } catch (err) {
          toast(err.message || "حدث خطأ");
        }
      };
    }
  }

  if (selectedOrder) {
    bindResultActions(selectedOrder);
  }
}

function renderCheckinResult(order) {
  const sched = new Date(order.scheduledAt).getTime();
  const current = now().getTime();
  const diffMin = Math.round((sched - current) / 60000);

  let arrivalNote = "";
  if (diffMin > 15) {
    arrivalNote = `
      <div class="banner" style="margin-block-end:10px;background:var(--c-primary-50)">
        ℹ️ ${t("emp.checkin.early")} (مبكر بحوالي ${Math.floor(diffMin / 60)} ساعة و ${diffMin % 60} دقيقة)
      </div>
    `;
  } else if (diffMin < -15) {
    arrivalNote = `
      <div class="banner" style="margin-block-end:10px;background:color-mix(in srgb, var(--c-danger) 14%, var(--c-surface));color:var(--c-danger)">
        ⚠️ ${t("emp.checkin.late")} (متأخر بحوالي ${Math.abs(diffMin)} دقيقة)
      </div>
    `;
  }

  return `
    <div class="card pad" style="box-shadow:var(--sh-2);border-color:var(--c-primary-600)">
      ${arrivalNote}

      <div class="between">
        <span class="badge" data-status="${order.status}">حجز مؤكد</span>
        <b class="num" style="font-size:18px;color:var(--c-primary-600)">${money(order.total)}</b>
      </div>

      <div class="between" style="margin-block:12px">
        <div>
          <b style="font-size:var(--fs-22);letter-spacing:1px">${order.plate}</b>
          <div class="small muted">${order.customerName || "عميل تطبيق كارزن"} · <span class="num">${order.customerPhone || ""}</span></div>
        </div>
        <div style="text-align:end">
          <b>${L(order.items[0]?.name)}</b>
          <div class="small muted num">الموعد: ${formatTime(order.scheduledAt)}</div>
        </div>
      </div>

      <div class="stack" style="gap:10px;margin-block-start:16px">
        <button class="emp-action-btn" id="btn-confirm-arrival" style="background:var(--st-waiting);color:#fff">
          ✓ ${t("emp.checkin.confirm_btn")}
        </button>

        ${diffMin < -15 ? `
          <button class="btn ghost sm danger" id="btn-mark-noshow-checkin">
            تسجيل عدم حضور وتحرير المسار
          </button>
        ` : ""}
      </div>
    </div>
  `;
}
