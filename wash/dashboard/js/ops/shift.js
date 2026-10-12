import { get, mutate, now } from "../../../../shared/js/db.js";
import { t, L } from "../../../../shared/js/i18n.js";
import { money, formatTime, formatDateTime } from "../../../../shared/js/format.js";
import { paintIcons } from "../../../../shared/js/dom.js";
import { toast, sheet } from "../../../../shared/js/ui.js";
import { endShift } from "../../../../shared/js/services/wash.js";
import { currentStaff, currentBranch, currentShift } from "../state.js";

export function shiftScreen(root) {
  const db = get();
  const staff = currentStaff();
  const branch = currentBranch();
  const shift = currentShift();

  if (!shift) {
    root.innerHTML = `
      <header class="topbar">
        <div></div>
        <h1>${t("emp.shift.title")}</h1>
        <div></div>
      </header>
      <div class="empty">
        <i data-lucide="clock" style="width:40px;height:40px;color:var(--c-ink-300)"></i>
        <h3>لا توجد وردية نشطة حاليًا</h3>
        <p class="muted small">سجل بداية الوردية لتتبع العمليات والمبالغ المحصلة.</p>
        <a class="btn" href="#/shift/start">بدء الوردية الآن</a>
      </div>
    `;
    paintIcons(root);
    return;
  }

  // Calculate cash vs card collections for this employee during this shift
  const startTime = new Date(shift.actualStart).getTime();
  const myPayments = db.payments.filter((p) => {
    return p.collectedBy === staff.id &&
           p.status === "paid" &&
           new Date(p.collectedAt).getTime() >= startTime;
  });

  const cashTotal = myPayments.filter((p) => p.method === "cash").reduce((s, p) => s + p.amount, 0);
  const cardTotal = myPayments.filter((p) => p.method === "card").reduce((s, p) => s + p.amount, 0);
  const totalRevenue = cashTotal + cardTotal;

  // Active / incomplete orders check
  const incompleteOrders = db.orders.filter((o) => {
    const isMine = o.assignedStaffId === staff.id;
    const isInService = o.status === "in_service";
    const isUnpaid = o.status === "completed" && o.paymentStatus === "pending";
    return isMine && (isInService || isUnpaid);
  });

  root.innerHTML = `
    <header class="topbar">
      <div></div>
      <h1>${t("emp.shift.title")}</h1>
      <div></div>
    </header>

    <div class="screen-body" style="padding:14px 16px 80px">
      <!-- Shift Header Card -->
      <div class="card pad" style="margin-block-end:14px;background:var(--c-primary-50);border-color:var(--c-primary-100)">
        <div class="between">
          <div>
            <b>${staff.name}</b>
            <div class="small muted">${branch?.name?.ar || "فرع مدينة نصر"}</div>
          </div>
          <span class="badge" data-status="in_service">وردية نشطة</span>
        </div>
        <div class="between" style="margin-block-start:8px">
          <span class="small muted">وقت البدء الفعلي:</span>
          <b class="num">${formatTime(shift.actualStart)}</b>
        </div>
      </div>

      <!-- Financial Totals Grid -->
      <div class="grid-2" style="margin-block-end:14px">
        <div class="card pad">
          <div class="small muted">${t("emp.shift.expected")}</div>
          <b class="num" style="font-size:22px;color:var(--c-success)">${money(cashTotal)}</b>
          <div class="small muted" style="margin-block-start:4px">نقدًا بالصندوق</div>
        </div>
        <div class="card pad">
          <div class="small muted">مدفوعات البطاقة (POS)</div>
          <b class="num" style="font-size:22px;color:var(--c-primary-600)">${money(cardTotal)}</b>
          <div class="small muted" style="margin-block-start:4px">إلكتروني</div>
        </div>
      </div>

      <!-- Stats Card -->
      <div class="card pad" style="margin-block-end:20px">
        <h3 style="font-size:var(--fs-16);margin-block-end:10px">إحصائيات الوردية</h3>
        <div class="between" style="margin-block-end:8px">
          <span class="small muted">${t("emp.shift.orders_done")}:</span>
          <b class="num" style="font-size:16px">${shift.ordersCompleted || myPayments.length} سيارات</b>
        </div>
        <div class="between" style="margin-block-end:8px">
          <span class="small muted">إجمالي الإيراد المحصل:</span>
          <b class="num">${money(totalRevenue)}</b>
        </div>
        <div class="between">
          <span class="small muted">العمليات غير المكتملة:</span>
          <span class="badge" data-status="${incompleteOrders.length ? "pending" : "completed"}">
            ${incompleteOrders.length} طلبات
          </span>
        </div>
      </div>

      ${incompleteOrders.length > 0 ? `
        <div class="banner" style="margin-block-end:16px">
          ⚠️ لا يمكن إغلاق الوردية قبل إنهاء أو تحصيل جميع السيارات المفتوحة (${incompleteOrders.length}).
        </div>
      ` : ""}

      <!-- End Shift Action Button -->
      <button class="btn block danger" id="btn-open-end-shift" style="min-height:50px;font-size:16px" ${incompleteOrders.length > 0 ? "disabled" : ""}>
        🛑 ${t("emp.shift.end_btn")}
      </button>
    </div>
  `;

  paintIcons(root);

  const endBtn = document.getElementById("btn-open-end-shift");
  if (endBtn) {
    endBtn.onclick = () => openEndShiftModal(shift, cashTotal, root);
  }
}

async function openEndShiftModal(shift, expectedCash, root) {
  const html = `
    <h3 style="font-size:var(--fs-22);margin-block-end:4px">${t("emp.shift.end_btn")}</h3>
    <p class="muted small" style="margin-block-end:16px">جرد النقدية الفعلية ومطابقتها مع المبالغ المسجلة.</p>

    <div class="card pad" style="background:var(--c-bg);margin-block-end:16px">
      <div class="between">
        <span class="small muted">${t("emp.shift.expected")}:</span>
        <b class="num" style="font-size:18px">${money(expectedCash)}</b>
      </div>
    </div>

    <div class="field" style="margin-block-end:14px">
      <span class="label">${t("emp.shift.actual")} *:</span>
      <input class="control num" type="number" id="actual-cash-inp" value="${expectedCash}" style="font-size:22px;font-weight:700" autofocus />
    </div>

    <div class="card pad between" id="diff-box" style="margin-block-end:14px;background:var(--c-surface)">
      <b>${t("emp.shift.diff")}:</b>
      <b class="num" id="diff-val" style="font-size:20px;color:var(--c-success)">٠ ج.م</b>
    </div>

    <div class="field" id="diff-reason-field" style="display:none;margin-block-end:16px">
      <span class="label" style="color:var(--c-danger)">${t("emp.shift.reason")} *:</span>
      <select class="control" id="diff-reason-select" style="margin-block-end:8px">
        <option value="Mistake">خطأ في إرجاع الباقي (Mistake)</option>
        <option value="Refund">استرجاع مبلغ لعميل (Refund)</option>
        <option value="Discount">خصم نقدي مباشر (Discount)</option>
        <option value="Other">سبب آخر (Other)</option>
      </select>
      <input class="control" id="diff-reason-note" placeholder="${t("emp.shift.reason_ph")}" />
    </div>

    <button class="btn block danger" id="submit-close-shift-btn" style="min-height:50px">
      ✓ ${t("emp.shift.submit_end")}
    </button>
  `;

  await sheet(html);

  const sheetEl = document.querySelector(".sheet");
  if (!sheetEl) return;

  const actualInp = sheetEl.querySelector("#actual-cash-inp");
  const diffVal = sheetEl.querySelector("#diff-val");
  const diffReasonBox = sheetEl.querySelector("#diff-reason-field");
  const reasonSelect = sheetEl.querySelector("#diff-reason-select");
  const reasonNote = sheetEl.querySelector("#diff-reason-note");
  const submitBtn = sheetEl.querySelector("#submit-close-shift-btn");

  const updateDiff = () => {
    const act = Number(actualInp.value) || 0;
    const diff = act - expectedCash;
    diffVal.textContent = money(diff);

    if (diff !== 0) {
      diffVal.style.color = "var(--c-danger)";
      diffReasonBox.style.display = "block";
    } else {
      diffVal.style.color = "var(--c-success)";
      diffReasonBox.style.display = "none";
    }
  };

  actualInp.oninput = updateDiff;
  updateDiff();

  submitBtn.onclick = async () => {
    const act = Number(actualInp.value) || 0;
    const diff = act - expectedCash;
    let reason = "";

    if (diff !== 0) {
      const mainReason = reasonSelect.value;
      const extra = reasonNote.value.trim();
      reason = extra ? `${mainReason}: ${extra}` : mainReason;
    }

    try {
      await endShift({
        shiftId: shift.id,
        staffId: currentStaff().id,
        actualCash: act,
        reason,
        note: reasonNote.value.trim(),
      });

      document.querySelector(".overlay")?.remove();
      toast(diff !== 0 ? `تم إغلاق الوردية بفارق ${money(diff)}` : "تم إغلاق الوردية ومطابقة النقدية بنجاح ✓");
      location.hash = "#/home";
    } catch (err) {
      toast(err.message || "حدث خطأ أثناء إغلاق الوردية");
    }
  };
}
