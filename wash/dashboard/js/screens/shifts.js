import { get, mutate, now } from "../../../../shared/js/db.js";
import { t, L } from "../../../../shared/js/i18n.js";
import { money, formatDateTime, formatTime } from "../../../../shared/js/format.js";
import { paintIcons } from "../../../../shared/js/dom.js";
import { toast, sheet } from "../../../../shared/js/ui.js";
import { reviewShift } from "../../../../shared/js/services/wash.js";
import { currentStaff, isOwner, isManager, selectedBranchId } from "../state.js";

let filterMismatchOnly = false;

export function shiftsClosingScreen(root) {
  const db = get();
  const staff = currentStaff();
  const branchId = selectedBranchId();

  let shifts = db.shifts || [];
  if (branchId !== "all") {
    shifts = shifts.filter((s) => s.branchId === branchId);
  }

  if (filterMismatchOnly) {
    shifts = shifts.filter((s) => s.difference && s.difference !== 0);
  }

  root.innerHTML = `
    <div class="between" style="margin-block-end:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:var(--fs-28);font-weight:800">${t("dash.nav.shifts")}</h1>
        <p class="small muted">مراجعة إغلاق الورديات اليومية ومطابقة النقدية مع الصندوق</p>
      </div>

      <div class="row">
        <button class="btn sm secondary ${filterMismatchOnly ? "active" : ""}" id="btn-toggle-mismatch">
          ${filterMismatchOnly ? "عرض كل الورديات" : "⚠️ عرض الفروقات والعجز فقط"}
        </button>
        <button class="btn sm" id="btn-reconcile-day">
          📑 ${t("dash.shift.reconcile")}
        </button>
      </div>
    </div>

    <!-- Shifts closings table -->
    <div class="card pad" style="margin-block-end:28px">
      <h3 style="font-size:var(--fs-18);margin-block-end:14px">سجل إغلاق الورديات</h3>

      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>الموظف</th>
              <th>الفرع</th>
              <th>وقت البدء</th>
              <th>وقت الإغلاق</th>
              <th>الطلبات</th>
              <th>المتوقع (كاش)</th>
              <th>الفعلي</th>
              <th>الفارق (Difference)</th>
              <th>سبب الفارق</th>
              <th>حالة المراجعة</th>
              <th>الإجراء</th>
            </tr>
          </thead>
          <tbody>
            ${shifts.map((sh) => {
              const emp = db.staff.find((s) => s.id === sh.staffId);
              const diff = sh.difference || 0;
              return `
                <tr>
                  <td><b>${emp?.name || sh.staffId}</b></td>
                  <td>${sh.branchId === "br_nasr" ? "مدينة نصر" : "مصر الجديدة"}</td>
                  <td class="num small">${formatTime(sh.actualStart || sh.scheduledStart)}</td>
                  <td class="num small">${sh.actualEnd ? formatTime(sh.actualEnd) : "— جارٍ العمل"}</td>
                  <td class="num font-bold">${sh.ordersCompleted || 0}</td>
                  <td class="num">${money(sh.expectedCash || 0)}</td>
                  <td class="num">${sh.actualCash != null ? money(sh.actualCash) : "—"}</td>
                  <td>
                    ${diff === 0 ? `
                      <span class="badge" data-status="completed">مطابق</span>
                    ` : `
                      <span class="badge" data-status="cancelled" style="font-weight:800">
                        ${diff > 0 ? `+${money(diff)}` : money(diff)}
                      </span>
                    `}
                  </td>
                  <td class="small muted">${L(sh.reason) || "—"}</td>
                  <td>
                    <span class="badge" data-status="${sh.reviewStatus === "reviewed" ? "completed" : "pending"}">
                      ${sh.reviewStatus === "reviewed" ? "معتمد" : sh.reviewStatus === "flagged" ? "موقوف" : "قيد المراجعة"}
                    </span>
                  </td>
                  <td>
                    <button class="btn sm ghost" data-review-shift="${sh.id}">مراجعة</button>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  paintIcons(root);

  // Toggle mismatch
  document.getElementById("btn-toggle-mismatch").onclick = () => {
    filterMismatchOnly = !filterMismatchOnly;
    shiftsClosingScreen(root);
  };

  // Reconcile day modal
  document.getElementById("btn-reconcile-day").onclick = () => {
    openReconciliationModal(root);
  };

  // Review shift button
  root.querySelectorAll("[data-review-shift]").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.reviewShift;
      const sh = shifts.find((s) => s.id === id);
      if (!sh) return;

      const action = confirm("اعتماد مراجعة الوردية؟ (موافق = معتمد / إلغاء = تعليق بملاحظة)");
      const status = action ? "reviewed" : "flagged";
      const note = prompt("ملاحظة المراجعة:", action ? "مطابق ومعتمد" : "تم تعليق الوردية لمراجعة العجز");

      await reviewShift({ shiftId: id, reviewStatus: status, note: note || "", staffId: staff.id });
      toast("تم حفظ مراجعة الوردية بنجاح ✓");
      shiftsClosingScreen(root);
    };
  });
}

async function openReconciliationModal(root) {
  const db = get();
  const staff = currentStaff();
  const branchId = selectedBranchId() === "all" ? "br_nasr" : selectedBranchId();

  // Aggregate today's orders
  const todayOrders = db.orders.filter((o) => o.branchId === branchId && o.status === "completed");
  const cashTotal = todayOrders.filter((o) => o.paymentMethod === "cash").reduce((s, o) => s + o.total, 0);
  const cardTotal = todayOrders.filter((o) => o.paymentMethod === "card").reduce((s, o) => s + o.total, 0);
  const totalRev = cashTotal + cardTotal;

  const html = `
    <h3 style="font-size:var(--fs-22);margin-block-end:4px">${t("dash.shift.reconcile")}</h3>
    <p class="muted small" style="margin-block-end:16px">إغلاق الحسابات اليومية وتأمين السجلات المالية للفرع.</p>

    <div class="card pad" style="background:var(--c-bg);margin-block-end:16px">
      <div class="between" style="margin-block-end:6px">
        <span class="small muted">الطلبات المكتملة اليوم:</span>
        <b class="num">${todayOrders.length} طلب</b>
      </div>
      <div class="between" style="margin-block-end:6px">
        <span class="small muted">إجمالي إيراد الكاش المتوقع:</span>
        <b class="num" style="color:var(--c-success)">${money(cashTotal)}</b>
      </div>
      <div class="between" style="margin-block-end:6px">
        <span class="small muted">إجمالي مدفوعات البطاقة (POS):</span>
        <b class="num" style="color:var(--c-primary-600)">${money(cardTotal)}</b>
      </div>
      <div class="between" style="margin-block-start:8px;padding-block-start:8px;border-block-start:1px solid var(--c-line)">
        <b>إجمالي اليوم:</b>
        <b class="num" style="font-size:18px">${money(totalRev)}</b>
      </div>
    </div>

    <div class="field" style="margin-block-end:12px">
      <span class="label">النقدية الفعلية بالصندوق (Actual Cash) *:</span>
      <input class="control num" type="number" id="recon-cash-inp" value="${cashTotal}" />
    </div>

    <div class="field" style="margin-block-end:16px">
      <span class="label">ملاحظات الإغلاق:</span>
      <input class="control" id="recon-notes" placeholder="تمت المطابقة مع ماكينة الدفع..." value="إغلاق يومي سليم" />
    </div>

    <button class="btn block" id="btn-submit-reconcile" style="min-height:48px;background:var(--c-primary-600);color:#fff">
      ✓ تأكيد الإغلاق اليومي وطباعة التقرير
    </button>
  `;

  await sheet(html);

  const sheetEl = document.querySelector(".sheet");
  if (!sheetEl) return;

  sheetEl.querySelector("#btn-submit-reconcile").onclick = () => {
    document.querySelector(".overlay")?.remove();
    toast("تم إغلاق اليوم ومطابقة السجلات المالية بنجاح ✓");
  };
}
