import { t, getLang } from "../../../shared/js/i18n.js";
import { money } from "../../../shared/js/format.js";
import { getMarketplaceHealth } from "../services/admin.js";
import { get } from "../../../shared/js/db.js";

let reportChart = null;

export async function renderReports(currentTab = "users") {
  const container = document.createElement("div");
  const tab = currentTab || "users";

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t("admin.nav.reports")}</h1>
        <div class="page-subtitle">${getLang() === "ar" ? "تحليلات الأداء، صحة السوق، ومؤشرات العرض والطلب" : "Marketplace health, supply & demand dynamics and conversion reports"}</div>
      </div>
      <div class="page-actions">
        <button type="button" class="btn ghost sm" id="btn-export-report-csv">
          <i data-lucide="download" style="inline-size:14px;block-size:14px"></i>
          <span>${t("admin.action.exportCsv")}</span>
        </button>
      </div>
    </div>

    <!-- 6 Tabs -->
    <div class="admin-tabs" id="report-tabs">
      <a href="#/reports/users" class="tab-btn ${tab === "users" ? "active" : ""}" style="text-decoration:none">${getLang() === "ar" ? "المستخدمون" : "Users"}</a>
      <a href="#/reports/washes" class="tab-btn ${tab === "washes" ? "active" : ""}" style="text-decoration:none">${getLang() === "ar" ? "المغاسل" : "Washes"}</a>
      <a href="#/reports/bookings" class="tab-btn ${tab === "bookings" ? "active" : ""}" style="text-decoration:none">${getLang() === "ar" ? "الحجوزات" : "Bookings"}</a>
      <a href="#/reports/revenue" class="tab-btn ${tab === "revenue" ? "active" : ""}" style="text-decoration:none">${getLang() === "ar" ? "الإيرادات" : "Revenue"}</a>
      <a href="#/reports/services" class="tab-btn ${tab === "services" ? "active" : ""}" style="text-decoration:none">${getLang() === "ar" ? "الخدمات" : "Services"}</a>
      <a href="#/reports/health" class="tab-btn ${tab === "health" ? "active" : ""}" style="text-decoration:none">${getLang() === "ar" ? "صحة السوق" : "Marketplace Health"}</a>
    </div>

    <div id="report-tab-content"></div>
  `;

  const mount = container.querySelector("#report-tab-content");

  if (tab === "health") {
    mount.appendChild(await renderMarketplaceHealthView());
  } else {
    mount.appendChild(await renderStandardReportView(tab));
  }

  return container;
}

async function renderMarketplaceHealthView() {
  const el = document.createElement("div");
  const health = await getMarketplaceHealth();

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:var(--s-4);margin-block-end:var(--s-6)">
      <!-- Supply Card -->
      <div class="card pad" style="border-inline-start:4px solid var(--c-primary-600)">
        <div style="display:flex;justify-content:space-between;margin-block-end:6px">
          <span style="font-weight:700;font-size:14px">${getLang() === "ar" ? "جانب العرض (Supply)" : "Supply Dynamics"}</span>
          <span class="chip on" style="font-size:11px">${health.supply.trend}</span>
        </div>
        <div style="font-size:24px;font-weight:800;color:var(--c-ink-900);margin-block-end:6px">
          ${health.supply.activeWashes} ${getLang() === "ar" ? "مغسلة" : "washes"} · ${health.supply.totalBays} ${getLang() === "ar" ? "مسار" : "bays"}
        </div>
        <div style="font-size:12px;color:var(--c-ink-700);line-height:1.4">
          💡 ${health.supply.interpretation[getLang()] || health.supply.interpretation.ar}
        </div>
      </div>

      <!-- Demand Card -->
      <div class="card pad" style="border-inline-start:4px solid var(--c-accent-500)">
        <div style="display:flex;justify-content:space-between;margin-block-end:6px">
          <span style="font-weight:700;font-size:14px">${getLang() === "ar" ? "جانب الطلب (Demand)" : "Demand Dynamics"}</span>
          <span class="chip on" style="font-size:11px">${health.demand.trend}</span>
        </div>
        <div style="font-size:24px;font-weight:800;color:var(--c-ink-900);margin-block-end:6px">
          ${health.demand.activeCustomers} ${getLang() === "ar" ? "عميل نشط" : "active customers"}
        </div>
        <div style="font-size:12px;color:var(--c-ink-700);line-height:1.4">
          💡 ${health.demand.interpretation[getLang()] || health.demand.interpretation.ar}
        </div>
      </div>

      <!-- Conversion Card -->
      <div class="card pad" style="border-inline-start:4px solid var(--c-success)">
        <div style="display:flex;justify-content:space-between;margin-block-end:6px">
          <span style="font-weight:700;font-size:14px">${getLang() === "ar" ? "التحويل والإتمام (Conversion)" : "Conversion Funnel"}</span>
          <span class="chip on" style="font-size:11px">${health.conversion.trend}</span>
        </div>
        <div style="font-size:24px;font-weight:800;color:var(--c-ink-900);margin-block-end:6px">
          ${health.conversion.bookingToComplete}% ${getLang() === "ar" ? "إتمام الحجز" : "completion"}
        </div>
        <div style="font-size:12px;color:var(--c-ink-700);line-height:1.4">
          💡 ${health.conversion.interpretation[getLang()] || health.conversion.interpretation.ar}
        </div>
      </div>

      <!-- Quality Card -->
      <div class="card pad" style="border-inline-start:4px solid var(--c-warning)">
        <div style="display:flex;justify-content:space-between;margin-block-end:6px">
          <span style="font-weight:700;font-size:14px">${getLang() === "ar" ? "الجودة والرضا (Quality)" : "Platform Quality"}</span>
          <span class="chip flat" style="font-size:11px">${health.quality.trend}</span>
        </div>
        <div style="font-size:24px;font-weight:800;color:var(--c-ink-900);margin-block-end:6px">
          ★ ${health.quality.averageRating} · ${health.quality.complaintRate}% ${getLang() === "ar" ? "شكاوى" : "complaints"}
        </div>
        <div style="font-size:12px;color:var(--c-ink-700);line-height:1.4">
          💡 ${health.quality.interpretation[getLang()] || health.quality.interpretation.ar}
        </div>
      </div>
    </div>
  `;

  return el;
}

async function renderStandardReportView(tab) {
  const el = document.createElement("div");
  const db = get();

  let chartLabels = [];
  let chartData = [];
  let tableHeaders = [];
  let tableRows = [];

  if (tab === "users") {
    chartLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    chartData = [12, 19, 15, 25, 32, 45, 28];
    tableHeaders = [getLang() === "ar" ? "اليوم" : "Day", getLang() === "ar" ? "العملاء الجدد" : "New Customers", getLang() === "ar" ? "العملاء النشطون" : "Active Customers"];
    tableRows = [
      ["Mon", "12", "140"],
      ["Tue", "19", "185"],
      ["Wed", "15", "162"],
      ["Thu", "25", "210"],
      ["Fri", "32", "290"],
      ["Sat", "45", "380"],
      ["Sun", "28", "240"],
    ];
  } else if (tab === "washes") {
    chartLabels = ["Nasr City", "Heliopolis", "New Cairo", "Maadi", "Zamalek", "Mohandessin", "Sheikh Zayed", "6th Oct"];
    chartData = [2, 2, 2, 2, 2, 1, 1, 2];
    tableHeaders = [getLang() === "ar" ? "المنطقة" : "Area", getLang() === "ar" ? "عدد الفروع" : "Branches", getLang() === "ar" ? "متوسط التقييم" : "Avg Rating"];
    tableRows = [
      ["Nasr City", "2", "4.8"],
      ["Heliopolis", "2", "4.7"],
      ["New Cairo", "2", "4.9"],
      ["Maadi", "2", "4.6"],
      ["Zamalek", "2", "4.8"],
      ["Mohandessin", "1", "4.5"],
      ["Sheikh Zayed", "1", "4.7"],
      ["6th of October", "2", "4.6"],
    ];
  } else if (tab === "bookings") {
    chartLabels = ["Completed", "Pending", "In Service", "Cancelled", "No-show"];
    chartData = [180, 15, 12, 8, 5];
    tableHeaders = [getLang() === "ar" ? "الحالة" : "Status", getLang() === "ar" ? "عدد الحجوزات" : "Bookings Count", getLang() === "ar" ? "النسبة المئوية" : "Percentage"];
    tableRows = [
      ["Completed", "180", "82%"],
      ["Pending Review", "15", "7%"],
      ["In Service", "12", "5%"],
      ["Cancelled", "8", "4%"],
      ["No Show", "5", "2%"],
    ];
  } else if (tab === "revenue") {
    chartLabels = ["Oct 04", "Oct 05", "Oct 06", "Oct 07", "Oct 08", "Oct 09", "Oct 10"];
    chartData = [28000, 31000, 36000, 42000, 45000, 47000, 48500];
    tableHeaders = [getLang() === "ar" ? "التاريخ" : "Date", "GMV (EGP)", getLang() === "ar" ? "العمولة (7%)" : "Commission"];
    tableRows = [
      ["Oct 04", "28,000", "1,960"],
      ["Oct 05", "31,000", "2,170"],
      ["Oct 06", "36,000", "2,520"],
      ["Oct 07", "42,000", "2,940"],
      ["Oct 08", "45,000", "3,150"],
      ["Oct 09", "47,000", "3,290"],
      ["Oct 10", "48,500", "3,395"],
    ];
  } else {
    chartLabels = ["Exterior Wash", "Interior Wash", "Interior + Exterior", "Deep Steam Wash"];
    chartData = [85, 45, 110, 30];
    tableHeaders = [getLang() === "ar" ? "الخدمة" : "Service", getLang() === "ar" ? "عدد المرات" : "Bookings", getLang() === "ar" ? "إجمالي الإيراد" : "Revenue"];
    tableRows = [
      ["Interior + Exterior", "110", "19,800 EGP"],
      ["Exterior Wash", "85", "8,500 EGP"],
      ["Interior Wash", "45", "4,500 EGP"],
      ["Deep Steam Cleaning", "30", "9,000 EGP"],
    ];
  }

  el.innerHTML = `
    <div class="card pad" style="margin-block-end:var(--s-5)">
      <div style="block-size:260px;position:relative">
        <canvas id="report-canvas"></canvas>
      </div>
    </div>

    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            ${tableHeaders.map((h) => `<th>${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${tableRows.map((row) => `
            <tr>
              ${row.map((cell) => `<td><strong>${cell}</strong></td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  setTimeout(() => {
    const canvas = el.querySelector("#report-canvas");
    if (canvas && typeof Chart !== "undefined") {
      if (reportChart) reportChart.destroy();
      reportChart = new Chart(canvas, {
        type: tab === "revenue" ? "line" : "bar",
        data: {
          labels: chartLabels,
          datasets: [{
            label: tab.toUpperCase(),
            data: chartData,
            backgroundColor: tab === "revenue" ? "rgba(20, 99, 255, 0.12)" : "#1463ff",
            borderColor: "#1463ff",
            fill: tab === "revenue",
            borderRadius: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
        },
      });
    }
  }, 50);

  return el;
}
