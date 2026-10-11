import { get, mutate, now } from "../../../../shared/js/db.js";
import { t, L } from "../../../../shared/js/i18n.js";
import { money, formatTime, minutesLabel } from "../../../../shared/js/format.js";
import { paintIcons } from "../../../../shared/js/dom.js";
import {
  currentStaff,
  isOwner,
  isManager,
  selectedBranchId,
  computeKpis,
  getCarsInside,
  getAlertsFeed,
} from "../state.js";

let activePeriod = "today"; // 'today' | '7d' | '30d'
let revenueChartInstance = null;
let sourceChartInstance = null;
let servicesChartInstance = null;

export function dashboardScreen(root) {
  const db = get();
  const staff = currentStaff();
  const branchId = selectedBranchId();
  const kpis = computeKpis(branchId, activePeriod);
  const carsInside = getCarsInside(branchId);
  const alerts = getAlertsFeed(branchId);

  // Branches to show
  const branches = branchId === "all" ? db.branches.filter((b) => b.businessId === "biz_carzen") : db.branches.filter((b) => b.id === branchId);

  root.innerHTML = `
    <!-- Top Row with Title & Period Switcher -->
    <div class="between" style="margin-block-end:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:var(--fs-28);font-weight:800">${t("dash.nav.dashboard")}</h1>
        <p class="small muted">نظرة عامة على أداء ومسارات ${branchId === "all" ? "جميع فروع كارزن ووش" : "فرع مدينة نصر"}</p>
      </div>

      <div class="tabs" style="min-width:240px">
        <button class="${activePeriod === "today" ? "on" : ""}" data-period="today">اليوم</button>
        <button class="${activePeriod === "7d" ? "on" : ""}" data-period="7d">٧ أيام</button>
        <button class="${activePeriod === "30d" ? "on" : ""}" data-period="30d">٣٠ يومًا</button>
      </div>
    </div>

    <!-- Alert Feed (If any) -->
    ${alerts.length > 0 ? `
      <div style="margin-block-end:24px">
        <div class="between" style="margin-block-end:10px">
          <b style="font-size:15px;color:var(--c-ink-700)">🚨 ${t("dash.live.alert")} (${alerts.length})</b>
        </div>
        <div class="stack" style="gap:8px">
          ${alerts.slice(0, 3).map((al) => `
            <div class="alert-feed-item ${al.level}">
              <div style="font-size:20px">${al.level === "danger" ? "⚠️" : "⏳"}</div>
              <div class="grow">
                <b>${L(al.title)}</b>
                <div class="small muted">${L(al.desc)}</div>
              </div>
              <a class="btn sm ghost" href="${al.link}">عرض التفاصيل</a>
            </div>
          `).join("")}
        </div>
      </div>
    ` : ""}

    <!-- KPI Grid Cards (OW-04) -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="lbl">${t("dash.kpi.revenue")}</div>
        <div class="val num" style="color:var(--c-success)">${money(kpis.revenue)}</div>
        <div class="delta up">↑ +١٢٪ مقارنة بالأمس</div>
      </div>

      <div class="kpi-card">
        <div class="lbl">${t("dash.kpi.orders")}</div>
        <div class="val num" style="color:var(--c-primary-600)">${kpis.totalOrders}</div>
        <div class="delta up">↑ +٤ طلبات جديدة</div>
      </div>

      <div class="kpi-card">
        <div class="lbl">${t("dash.kpi.walkin")}</div>
        <div class="val num">${kpis.walkIns}</div>
        <div class="small muted">حضور مباشر بالفرع</div>
      </div>

      <div class="kpi-card">
        <div class="lbl">${t("dash.kpi.pending_pay")}</div>
        <div class="val num" style="color:var(--c-warning)">${money(kpis.pendingPayments)}</div>
        <div class="small muted">بانتظار تحصيل الكاش</div>
      </div>
    </div>

    <!-- Live Branches Cards (OW-05) -->
    <div style="margin-block-end:28px">
      <div class="between" style="margin-block-end:12px">
        <h2 style="font-size:var(--fs-18);font-weight:700">الفروع المباشرة (Live Branches)</h2>
        <a class="linkish small" href="#/live">عرض لوحة المسارات ←</a>
      </div>

      <div class="grid-2">
        ${branches.map((b) => {
          const bOrders = db.orders.filter((o) => o.branchId === b.id);
          const bBusy = bOrders.filter((o) => o.status === "in_service").length;
          const bInside = bOrders.filter((o) => ["waiting", "in_service"].includes(o.status)).length;
          const bRev = bOrders.filter((o) => o.status === "completed" && o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0);

          return `
            <div class="card pad between" style="cursor:pointer;background:var(--c-surface)" data-gobranch="${b.id}">
              <div>
                <div class="row" style="margin-block-end:6px">
                  <b>${b.name.ar}</b>
                  <span class="badge" data-status="${b.active ? "completed" : "cancelled"}">
                    ${b.active ? "مفتوح الآن" : "مغلق"}
                  </span>
                </div>
                <div class="small muted">${b.address.ar || b.address.en}</div>
                <div class="row" style="margin-block-start:10px">
                  <span class="chip flat small"><b>${bBusy} / ${b.capacity}</b> مسارات مشغولة</span>
                  <span class="chip flat small"><b>${bInside}</b> سيارات بالداخل</span>
                </div>
              </div>
              <div style="text-align:end">
                <div class="small muted">إيراد اليوم:</div>
                <b class="num" style="font-size:18px;color:var(--c-primary-600)">${money(bRev)}</b>
                <div style="margin-block-start:8px">
                  <a class="btn sm" href="#/live">فتح المسارات</a>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>

    <!-- Cars currently inside (OW-06) -->
    <div class="card pad" style="margin-block-end:28px">
      <div class="between" style="margin-block-end:14px">
        <div>
          <h2 style="font-size:var(--fs-18);font-weight:700">${t("dash.live.inside")} (${carsInside.length})</h2>
          <span class="small muted">تحديث حي لحظي لحركة السيارات والمسارات داخل المغسلة</span>
        </div>
        <a class="btn sm ghost" href="#/live">لوحة كانبان الكاملة</a>
      </div>

      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>رقم اللوحة</th>
              <th>رقم الطلب</th>
              <th>الخدمة</th>
              <th>الموظف المسؤول</th>
              <th>الحالة</th>
              <th>المبلغ</th>
              <th>الوقت</th>
            </tr>
          </thead>
          <tbody>
            ${carsInside.length === 0 ? `
              <tr><td colspan="7" style="text-align:center;padding:24px" class="muted">لا توجد سيارات داخل المغسلة حاليًا</td></tr>
            ` : carsInside.map((c) => `
              <tr style="cursor:pointer" data-vieworder="${c.id}">
                <td><b class="chip on" style="letter-spacing:1px">${c.plate}</b></td>
                <td class="num">${c.number}</td>
                <td>${L(c.items[0]?.name)}</td>
                <td>${c.assignedStaffId === "st_samir" ? "أحمد سمير" : c.assignedStaffId === "st_youssef" ? "يوسف نبيل" : "فريق المغسلة"}</td>
                <td><span class="badge" data-status="${c.status}">${c.status}</span></td>
                <td class="num font-bold">${money(c.total)}</td>
                <td class="num small muted">${formatTime(c.scheduledAt)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Operational Charts Grid (OW-08) -->
    <div class="grid-2" style="margin-block-end:24px">
      <div class="card pad">
        <h3 style="font-size:var(--fs-16);margin-block-end:14px">${t("dash.chart.revenue_hour")}</h3>
        <div style="height:220px;position:relative">
          <canvas id="chart-revenue-hour"></canvas>
        </div>
      </div>

      <div class="card pad">
        <h3 style="font-size:var(--fs-16);margin-block-end:14px">${t("dash.chart.source")}</h3>
        <div style="height:220px;position:relative">
          <canvas id="chart-order-source"></canvas>
        </div>
      </div>
    </div>
  `;

  paintIcons(root);

  // Period buttons
  root.querySelectorAll(".tabs button").forEach((btn) => {
    btn.onclick = () => {
      activePeriod = btn.dataset.period;
      dashboardScreen(root);
    };
  });

  // Table row click -> open order details drawer
  root.querySelectorAll("[data-vieworder]").forEach((row) => {
    row.onclick = () => {
      location.hash = `#/orders?id=${row.dataset.vieworder}`;
    };
  });

  // Render Chart.js
  setTimeout(() => {
    renderCharts(kpis);
  }, 50);
}

function renderCharts(kpis) {
  if (!window.Chart) return;

  // Revenue by hour
  const ctxRev = document.getElementById("chart-revenue-hour")?.getContext("2d");
  if (ctxRev) {
    if (revenueChartInstance) revenueChartInstance.destroy();
    revenueChartInstance = new window.Chart(ctxRev, {
      type: "bar",
      data: {
        labels: ["٩ ص", "١٠ ص", "١١ ص", "١٢ م", "١ م", "٢ م", "٣ م", "٤ م", "٥ م"],
        datasets: [{
          label: "الإيرادات (ج.م)",
          data: [280, 540, 720, 900, 680, 1100, 1450, 1280, 950],
          backgroundColor: "#1463FF",
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: "#E6ECF4" } },
          x: { grid: { display: false } },
        },
      },
    });
  }

  // Source Donut
  const ctxSrc = document.getElementById("chart-order-source")?.getContext("2d");
  if (ctxSrc) {
    if (sourceChartInstance) sourceChartInstance.destroy();
    sourceChartInstance = new window.Chart(ctxSrc, {
      type: "doughnut",
      data: {
        labels: ["تطبيق كارزن (App)", "حضور مباشر (Walk-in)", "حجز هاتفي (Phone)"],
        datasets: [{
          data: [kpis.appBookings || 55, kpis.walkIns || 35, kpis.phoneBookings || 10],
          backgroundColor: ["#1463FF", "#12C8B6", "#7C5CFC"],
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" },
        },
      },
    });
  }
}
