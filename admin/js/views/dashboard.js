import { t, getLang } from "../../../shared/js/i18n.js";
import { money } from "../../../shared/js/format.js";
import { getDashboardStats } from "../../../shared/js/services/admin.js";

let funnelChartInstance = null;
let revenueChartInstance = null;

export async function renderDashboard() {
  const container = document.createElement("div");

  // Show loading skeleton first
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t("admin.nav.dashboard")}</h1>
        <div class="page-subtitle">${getLang() === "ar" ? "نظرة شاملة ومؤشرات أداء منصة كارزن المباشرة" : "Live platform overview and real-time operations performance"}</div>
      </div>
    </div>
    <div class="kpi-grid">
      ${Array.from({ length: 8 }, () => `<div class="card pad sk" style="block-size:110px"></div>`).join("")}
    </div>
  `;

  // Fetch stats from fake backend service
  const { kpis, funnel, alerts, topWashes } = await getDashboardStats();

  let html = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t("admin.nav.dashboard")}</h1>
        <div class="page-subtitle">${getLang() === "ar" ? "نظرة شاملة ومؤشرات أداء منصة كارزن المباشرة" : "Live platform overview and real-time operations performance"}</div>
      </div>
      <div class="page-actions">
        <span class="badge" style="background:var(--c-accent-100);color:var(--c-primary-700);font-weight:700">
          <span class="dot" style="background:var(--c-success)"></span>
          ${getLang() === "ar" ? "مزامنة بيانات حية" : "Live Sync Active"}
        </span>
      </div>
    </div>

    <!-- 11 KPI Cards -->
    <div class="kpi-grid">
      <a href="#/customers" class="kpi-card">
        <div class="kpi-header">
          <span>${t("admin.kpi.customers")}</span>
          <i data-lucide="users" style="inline-size:18px;block-size:18px"></i>
        </div>
        <div class="kpi-value">${kpis.customers.toLocaleString()}</div>
        <div class="kpi-footer">
          <span class="kpi-delta pos">+3.2% ↑</span>
          <span class="muted">${kpis.activeCustomers.toLocaleString()} ${getLang() === "ar" ? "نشط" : "active"}</span>
        </div>
      </a>

      <a href="#/washes?status=active" class="kpi-card">
        <div class="kpi-header">
          <span>${t("admin.kpi.activeWashes")}</span>
          <i data-lucide="store" style="inline-size:18px;block-size:18px"></i>
        </div>
        <div class="kpi-value">${kpis.activeWashes.toLocaleString()}</div>
        <div class="kpi-footer">
          <span class="kpi-delta pos">+1 ${getLang() === "ar" ? "هذا الأسبوع" : "this week"}</span>
          <span class="muted">${kpis.totalWashes} ${getLang() === "ar" ? "إجمالي" : "total"}</span>
        </div>
      </a>

      <a href="#/applications" class="kpi-card" style="${kpis.pendingApplications > 0 ? "border-color:var(--c-warning)" : ""}">
        <div class="kpi-header">
          <span>${t("admin.kpi.pendingApps")}</span>
          <i data-lucide="file-plus" style="inline-size:18px;block-size:18px;color:var(--c-warning)"></i>
        </div>
        <div class="kpi-value" style="color:var(--c-warning)">${kpis.pendingApplications}</div>
        <div class="kpi-footer">
          <span class="kpi-delta ${kpis.pendingApplications > 0 ? "neg" : "neutral"}">
            ${kpis.pendingApplications > 0 ? (getLang() === "ar" ? "تتطلب مراجعة" : "Action needed") : "0"}
          </span>
          <span class="muted">${getLang() === "ar" ? "أقدمها منذ يومين" : "Oldest 2d ago"}</span>
        </div>
      </a>

      <a href="#/branches" class="kpi-card">
        <div class="kpi-header">
          <span>${t("admin.kpi.branches")}</span>
          <i data-lucide="map-pin" style="inline-size:18px;block-size:18px"></i>
        </div>
        <div class="kpi-value">${kpis.totalBranches}</div>
        <div class="kpi-footer">
          <span class="kpi-delta pos">+2 ${getLang() === "ar" ? "مناطق جديدة" : "new areas"}</span>
          <span class="muted">${getLang() === "ar" ? "٨ أحياء بالقاهرة" : "8 Cairo areas"}</span>
        </div>
      </a>

      <a href="#/orders" class="kpi-card">
        <div class="kpi-header">
          <span>${t("admin.kpi.bookingsToday")}</span>
          <i data-lucide="calendar" style="inline-size:18px;block-size:18px"></i>
        </div>
        <div class="kpi-value">${kpis.bookingsToday}</div>
        <div class="kpi-footer">
          <span class="kpi-delta pos">+14% vs ${getLang() === "ar" ? "أمس" : "yesterday"}</span>
          <span class="muted">${kpis.completedToday} ${getLang() === "ar" ? "مكتمل" : "done"}</span>
        </div>
      </a>

      <a href="#/orders?status=completed" class="kpi-card">
        <div class="kpi-header">
          <span>${t("admin.kpi.completedToday")}</span>
          <i data-lucide="check-circle-2" style="inline-size:18px;block-size:18px;color:var(--c-success)"></i>
        </div>
        <div class="kpi-value" style="color:var(--c-success)">${kpis.completedToday}</div>
        <div class="kpi-footer">
          <span class="kpi-delta pos">84% ${getLang() === "ar" ? "نسبة الإتمام" : "completion"}</span>
          <span class="muted">${kpis.cancelledToday} ${getLang() === "ar" ? "ملغي" : "cancelled"}</span>
        </div>
      </a>

      <a href="#/finance" class="kpi-card">
        <div class="kpi-header">
          <span>${t("admin.kpi.gmvToday")}</span>
          <i data-lucide="coins" style="inline-size:18px;block-size:18px;color:var(--c-primary-600)"></i>
        </div>
        <div class="kpi-value">${money(kpis.gmvToday)}</div>
        <div class="kpi-footer">
          <span class="kpi-delta pos">+8.4%</span>
          <span class="muted">${getLang() === "ar" ? "إجمالي قيمة الخدمات" : "Gross volume"}</span>
        </div>
      </a>

      <a href="#/finance/commission" class="kpi-card">
        <div class="kpi-header">
          <span>${t("admin.kpi.revenueToday")}</span>
          <i data-lucide="badge-percent" style="inline-size:18px;block-size:18px;color:var(--c-accent-500)"></i>
        </div>
        <div class="kpi-value" style="color:var(--c-primary-700)">${money(kpis.revenueToday)}</div>
        <div class="kpi-footer">
          <span class="kpi-delta pos">7% avg</span>
          <span class="muted">${getLang() === "ar" ? "عمولة المنصة" : "Platform fee"}</span>
        </div>
      </a>
    </div>

    <!-- Charts Row -->
    <div class="dashboard-row">
      <!-- Funnel Chart -->
      <div class="card pad">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-block-end:var(--s-4)">
          <div>
            <h3 style="margin:0;font-size:var(--fs-16);font-weight:800">${t("admin.funnel.title")}</h3>
            <div class="muted" style="font-size:12px;margin-block-start:2px">
              ${getLang() === "ar" ? "تتبع تدفق طلبات اليوم من الإنشاء حتى اكتمال الخدمة والتحصيل" : "Order flow tracking from booking creation to completion"}
            </div>
          </div>
          <div class="tabs" style="padding:2px">
            <button class="on" data-funnel-period="today" style="min-block-size:28px;padding-inline:10px;font-size:12px">${getLang() === "ar" ? "اليوم" : "Today"}</button>
            <button data-funnel-period="7d" style="min-block-size:28px;padding-inline:10px;font-size:12px">7d</button>
            <button data-funnel-period="30d" style="min-block-size:28px;padding-inline:10px;font-size:12px">30d</button>
          </div>
        </div>
        <div style="block-size:240px;position:relative">
          <canvas id="funnel-chart-canvas"></canvas>
        </div>
      </div>

      <!-- Action Alerts -->
      <div class="card pad">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-block-end:var(--s-4)">
          <h3 style="margin:0;font-size:var(--fs-16);font-weight:800">${t("admin.alerts.title")}</h3>
          <span class="chip flat">${alerts.length}</span>
        </div>
        <div class="alert-list">
          ${alerts.length === 0 ? `
            <div style="text-align:center;padding:24px;color:var(--c-ink-500);font-size:13px">
              ✓ ${getLang() === "ar" ? "لا توجد تنبيهات عاجلة حالياً" : "All operations running normally"}
            </div>
          ` : alerts.map((al) => `
            <div class="alert-item ${al.severity}">
              <div>
                <div style="font-weight:700;font-size:13px">${al.title[getLang()] || al.title.ar}</div>
              </div>
              <a href="${al.link}" class="btn sm ghost" style="flex-shrink:0">
                ${getLang() === "ar" ? "معاينة" : "Review"}
              </a>
            </div>
          `).join("")}
        </div>
      </div>
    </div>

    <!-- Revenue Trends & Marketplace Health Row -->
    <div class="dashboard-row">
      <!-- Revenue Trend Line Chart -->
      <div class="card pad">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-block-end:var(--s-4)">
          <div>
            <h3 style="margin:0;font-size:var(--fs-16);font-weight:800">${t("admin.revenue.title")}</h3>
            <div class="muted" style="font-size:12px">
              ${getLang() === "ar" ? "إجمالي قيمة المعاملات (GMV) وعمولة المنصة عبر ساعات اليوم" : "Gross volume (GMV) vs platform commission over time"}
            </div>
          </div>
        </div>
        <div style="block-size:240px;position:relative">
          <canvas id="revenue-chart-canvas"></canvas>
        </div>
      </div>

      <!-- Top Washes Today Mini-Table -->
      <div class="card pad">
        <h3 style="margin:0 0 var(--s-3);font-size:var(--fs-16);font-weight:800">${t("admin.topWashes.title")}</h3>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${topWashes.map((tw) => `
            <a href="#/washes/${tw.businessId}" style="display:flex;align-items:center;justify-content:space-between;text-decoration:none;color:inherit;padding:8px 0;border-block-end:1px solid var(--c-line)">
              <div>
                <div style="font-weight:700;font-size:13px">${tw.name[getLang()] || tw.name.ar}</div>
                <div class="muted" style="font-size:12px">★ ${tw.rating} · ${tw.completedCount} ${getLang() === "ar" ? "غسيل اليوم" : "washes"}</div>
              </div>
              <div style="font-weight:800;color:var(--c-primary-600);font-size:14px">
                ${money(tw.gmv)}
              </div>
            </a>
          `).join("")}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  if (window.lucide?.createIcons) window.lucide.createIcons({ root: container });

  // Mount Chart.js Charts
  setTimeout(() => {
    initCharts(container, funnel);
  }, 50);

  return container;
}

function initCharts(container, funnel) {
  if (typeof Chart === "undefined") return;

  // Funnel Chart
  const funnelCanvas = container.querySelector("#funnel-chart-canvas");
  if (funnelCanvas) {
    if (funnelChartInstance) funnelChartInstance.destroy();
    funnelChartInstance = new Chart(funnelCanvas, {
      type: "bar",
      data: {
        labels: [
          getLang() === "ar" ? "حجز جديد" : "Created",
          getLang() === "ar" ? "مؤكد" : "Confirmed",
          getLang() === "ar" ? "في الانتظار" : "Waiting",
          getLang() === "ar" ? "قيد التنفيذ" : "In Service",
          getLang() === "ar" ? "مكتمل" : "Completed",
          getLang() === "ar" ? "ملغي" : "Cancelled",
          getLang() === "ar" ? "لم يحضر" : "No-show",
        ],
        datasets: [{
          data: [funnel.created, funnel.confirmed, funnel.waiting, funnel.in_service, funnel.completed, funnel.cancelled, funnel.no_show],
          backgroundColor: [
            "#dce0f3",
            "#1C2459",
            "#5e48e8",
            "#059669",
            "#16a34a",
            "#e5484d",
            "#64748b",
          ],
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.05)" } },
          x: { grid: { display: false } },
        },
      },
    });
  }

  // Revenue Chart
  const revCanvas = container.querySelector("#revenue-chart-canvas");
  if (revCanvas) {
    if (revenueChartInstance) revenueChartInstance.destroy();
    revenueChartInstance = new Chart(revCanvas, {
      type: "line",
      data: {
        labels: ["09:00", "11:00", "13:00", "15:00", "17:00", "19:00", "21:00", "23:00"],
        datasets: [
          {
            label: "GMV (EGP)",
            data: [3200, 7800, 14500, 24000, 33500, 41200, 46800, 48500],
            borderColor: "#1C2459",
            backgroundColor: "rgba(28, 36, 89, 0.08)",
            fill: true,
            tension: 0.35,
          },
          {
            label: "Commission (7%)",
            data: [224, 546, 1015, 1680, 2345, 2884, 3276, 3395],
            borderColor: "#1C2459",
            backgroundColor: "rgba(245, 255, 103, 0.35)",
            borderDash: [5, 5],
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "top" } },
        scales: {
          y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.05)" } },
          x: { grid: { display: false } },
        },
      },
    });
  }
}
