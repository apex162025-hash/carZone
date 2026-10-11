import { get, mutate, now } from "../../../../shared/js/db.js";
import { t, L } from "../../../../shared/js/i18n.js";
import { money, formatDateTime, formatTime } from "../../../../shared/js/format.js";
import { paintIcons } from "../../../../shared/js/dom.js";
import { toast } from "../../../../shared/js/ui.js";
import { currentStaff, selectedBranchId, computeKpis } from "../state.js";

let reportPeriod = "today"; // 'today' | '7d' | '30d'

/* =========================================================================
   D14: REPORTS & ANALYTICS
   ========================================================================= */

export function reportsScreen(root) {
  const db = get();
  const branchId = selectedBranchId();
  const kpis = computeKpis(branchId, reportPeriod);

  // Group top booked services
  const branchOrders = db.orders.filter((o) => {
    const match = branchId === "all" ? o.businessId === "biz_carzen" : o.branchId === branchId;
    return match && o.status === "completed";
  });

  const svcCounts = {};
  branchOrders.forEach((o) => {
    const prim = o.items[0];
    if (prim) {
      const key = L(prim.name);
      svcCounts[key] = (svcCounts[key] || 0) + 1;
    }
  });

  root.innerHTML = `
    <div class="between" style="margin-block-end:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:var(--fs-28);font-weight:800">${t("dash.nav.reports")}</h1>
        <p class="small muted">تقارير المبيعات وحركة المسارات والخدمات الأكثر طلبًا</p>
      </div>

      <div class="row">
        <div class="tabs">
          <button class="${reportPeriod === "today" ? "on" : ""}" data-rperiod="today">اليوم</button>
          <button class="${reportPeriod === "7d" ? "on" : ""}" data-rperiod="7d">٧ أيام</button>
          <button class="${reportPeriod === "30d" ? "on" : ""}" data-rperiod="30d">٣٠ يومًا</button>
        </div>

        <button class="btn sm secondary" id="btn-export-reports-csv">
          📥 ${t("dash.export_csv")}
        </button>
      </div>
    </div>

    <!-- KPI Summary Grid -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="lbl">إجمالي الإيرادات</div>
        <div class="val num" style="color:var(--c-success)">${money(kpis.revenue)}</div>
      </div>
      <div class="kpi-card">
        <div class="lbl">الطلبات المكتملة</div>
        <div class="val num">${kpis.completed} طلب</div>
      </div>
      <div class="kpi-card">
        <div class="lbl">نسبة الحضور المباشر</div>
        <div class="val num">${kpis.totalOrders ? Math.round((kpis.walkIns / kpis.totalOrders) * 100) : 0}%</div>
      </div>
      <div class="kpi-card">
        <div class="lbl">حجوزات التطبيق</div>
        <div class="val num" style="color:var(--c-primary-600)">${kpis.appBookings}</div>
      </div>
    </div>

    <!-- Top Services Table -->
    <div class="card pad" style="margin-block-end:24px">
      <h3 style="font-size:var(--fs-18);margin-block-end:14px">أكثر الخدمات طلبًا (Top Services)</h3>
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>اسم الخدمة</th>
              <th>عدد مرات الطلب</th>
              <th>النسبة من الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(svcCounts).map(([name, count]) => `
              <tr>
                <td><b>${name}</b></td>
                <td class="num font-bold">${count} مرات</td>
                <td class="num">${Math.round((count / (branchOrders.length || 1)) * 100)}%</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  paintIcons(root);

  root.querySelectorAll("[data-rperiod]").forEach((btn) => {
    btn.onclick = () => {
      reportPeriod = btn.dataset.rperiod;
      reportsScreen(root);
    };
  });

  document.getElementById("btn-export-reports-csv").onclick = () => {
    exportToCsv("carzen_reports.csv", [
      ["Metric", "Value"],
      ["Total Revenue", kpis.revenue],
      ["Completed Orders", kpis.completed],
      ["Walk-in Orders", kpis.walkIns],
      ["App Bookings", kpis.appBookings],
    ]);
  };
}

/* =========================================================================
   D15: FINANCIALS
   ========================================================================= */

export function financialsScreen(root) {
  const db = get();
  const branchId = selectedBranchId();

  const orders = db.orders.filter((o) => {
    const match = branchId === "all" ? o.businessId === "biz_carzen" : o.branchId === branchId;
    return match && o.status === "completed";
  });

  const cashRev = orders.filter((o) => o.paymentMethod === "cash").reduce((s, o) => s + o.total, 0);
  const cardRev = orders.filter((o) => o.paymentMethod === "card").reduce((s, o) => s + o.total, 0);
  const totalGross = cashRev + cardRev;
  const commissionRate = 7;
  const platformCommission = Math.round((totalGross * commissionRate) / 100);
  const netToWash = totalGross - platformCommission;

  // Pending payments
  const pendingOrders = db.orders.filter((o) => {
    const match = branchId === "all" ? o.businessId === "biz_carzen" : o.branchId === branchId;
    return match && o.status === "completed" && o.paymentStatus === "pending";
  });

  // Refunds
  const refundedOrders = db.orders.filter((o) => {
    const match = branchId === "all" ? o.businessId === "biz_carzen" : o.branchId === branchId;
    return match && o.paymentStatus === "refunded";
  });

  root.innerHTML = `
    <div class="between" style="margin-block-end:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:var(--fs-28);font-weight:800">${t("dash.nav.financials")}</h1>
        <p class="small muted">التسويات المالية ونسب العمولة وصافي أرباح المغسلة</p>
      </div>

      <button class="btn sm secondary" id="btn-export-fin-csv">
        📥 تصدير التقرير المالي (CSV)
      </button>
    </div>

    <!-- Financial KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="lbl">إجمالي الإيرادات (Gross Revenue)</div>
        <div class="val num" style="color:var(--c-primary-600)">${money(totalGross)}</div>
        <div class="small muted">شامل الكاش والبطاقات</div>
      </div>

      <div class="kpi-card">
        <div class="lbl">عمولة منصة كارزن (${commissionRate}%)</div>
        <div class="val num" style="color:var(--c-ink-700)">${money(platformCommission)}</div>
        <div class="small muted">تُسوى دوريًا</div>
      </div>

      <div class="kpi-card">
        <div class="lbl">صافي أرباح المغسلة (Net to Wash)</div>
        <div class="val num" style="color:var(--c-success)">${money(netToWash)}</div>
        <div class="delta up">صافي المستحق للمالك</div>
      </div>

      <div class="kpi-card">
        <div class="lbl">مبالغ قيد التحصيل (Pending)</div>
        <div class="val num" style="color:var(--c-warning)">${money(pendingOrders.reduce((s, o) => s + o.total, 0))}</div>
        <div class="small muted">${pendingOrders.length} طلبات جاهزة للاستلام</div>
      </div>
    </div>

    <!-- Breakdown by Payment Method -->
    <div class="card pad" style="margin-block-end:24px">
      <h3 style="font-size:var(--fs-18);margin-block-end:14px">توزيع الإيرادات حسب طريقة الدفع</h3>
      <div class="grid-2">
        <div class="card pad" style="background:var(--c-bg)">
          <div class="between">
            <div>
              <b>💵 نقدًا (Cash)</b>
              <div class="small muted">محصل بواسطة موظفي الوردية</div>
            </div>
            <b class="num" style="font-size:20px;color:var(--c-success)">${money(cashRev)}</b>
          </div>
        </div>
        <div class="card pad" style="background:var(--c-bg)">
          <div class="between">
            <div>
              <b>💳 بطاقات نقاط البيع (POS)</b>
              <div class="small muted">عبر ماكينات الدفع الإلكتروني</div>
            </div>
            <b class="num" style="font-size:20px;color:var(--c-primary-600)">${money(cardRev)}</b>
          </div>
        </div>
      </div>
    </div>

    <!-- Refunds Table (If any) -->
    ${refundedOrders.length > 0 ? `
      <div class="card pad">
        <h3 style="font-size:var(--fs-18);margin-block-end:12px;color:var(--c-danger)">المبالغ المسترجعة (Refunds)</h3>
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>اللوحة</th>
                <th>المبلغ المسترجع</th>
                <th>السبب</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              ${refundedOrders.map((o) => `
                <tr>
                  <td class="num"><b>${o.number}</b></td>
                  <td>${o.plate}</td>
                  <td class="num" style="color:var(--c-danger)">-${money(o.total)}</td>
                  <td>طلب العميل</td>
                  <td class="num small">${formatDateTime(o.createdAt)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    ` : ""}
  `;

  paintIcons(root);

  document.getElementById("btn-export-fin-csv").onclick = () => {
    exportToCsv("carzen_financials.csv", [
      ["Metric", "Amount (EGP)"],
      ["Gross Revenue", totalGross],
      ["Cash Revenue", cashRev],
      ["Card Revenue", cardRev],
      ["Platform Commission (7%)", platformCommission],
      ["Net to Wash", netToWash],
    ]);
  };
}

function exportToCsv(filename, rows) {
  const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  toast("تم تصدير ملف CSV بنجاح ✓");
}
