import { t, getLang } from "../../../shared/js/i18n.js";
import { formatDateTime, formatDate, money } from "../../../shared/js/format.js";
import {
  getFinancialOverview,
  getTransactions,
  resolveDiscrepancy,
  updateCommissionSettings,
  getPayouts,
  markPayoutPaid,
  getWashes,
} from "../../../shared/js/services/admin.js";
import { createDataTable } from "../components/table.js";
import { showDiscrepancyModal, promptReasonModal, confirmModal } from "../components/modal.js";
import { getCurrentAdmin, checkPermission } from "../auth.js";
import { get } from "../../../shared/js/db.js";

export async function renderFinance(subRoute = "overview", query = {}) {
  const container = document.createElement("div");

  // Secondary sub-navigation for Financials
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t("admin.nav.finance")}</h1>
        <div class="page-subtitle">${getLang() === "ar" ? "الإشراف المالي، إجمالي حجم التداول، العمولات، والتسويات" : "Platform ledger, gross volume (GMV), commissions and wash payouts"}</div>
      </div>
    </div>

    <div class="admin-tabs" id="finance-sub-tabs">
      <a href="#/finance" class="tab-btn ${subRoute === "overview" ? "active" : ""}" style="text-decoration:none">${getLang() === "ar" ? "نظرة عامة والتقارير" : "Overview"}</a>
      <a href="#/finance/transactions" class="tab-btn ${subRoute === "transactions" ? "active" : ""}" style="text-decoration:none">${t("admin.nav.transactions")}</a>
      <a href="#/finance/commission" class="tab-btn ${subRoute === "commission" ? "active" : ""}" style="text-decoration:none">${t("admin.nav.commission")}</a>
      <a href="#/finance/payouts" class="tab-btn ${subRoute === "payouts" ? "active" : ""}" style="text-decoration:none">${t("admin.nav.payouts")}</a>
    </div>

    <div id="finance-content-mount"></div>
  `;

  const mount = container.querySelector("#finance-content-mount");

  if (subRoute === "transactions") {
    mount.appendChild(await renderTransactionsView(query));
  } else if (subRoute === "commission") {
    mount.appendChild(await renderCommissionView());
  } else if (subRoute === "payouts") {
    mount.appendChild(await renderPayoutsView());
  } else {
    mount.appendChild(await renderOverviewView());
  }

  return container;
}

// 1. Overview View (Screen A15)
async function renderOverviewView() {
  const el = document.createElement("div");
  const data = await getFinancialOverview();

  el.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card" title="Total gross value of all completed and paid orders">
        <div class="kpi-header">
          <span>${getLang() === "ar" ? "إجمالي قيمة المعاملات (GMV)" : "Gross Merchandise Value"}</span>
          <i data-lucide="help-circle" style="inline-size:14px;block-size:14px;color:var(--c-ink-300)"></i>
        </div>
        <div class="kpi-value">${money(data.totalGmv)}</div>
        <div class="kpi-footer">
          <span class="kpi-delta pos">+8.4%</span>
          <span class="muted">${getLang() === "ar" ? "الطلبات المحصلة" : "Paid orders"}</span>
        </div>
      </div>

      <div class="kpi-card" title="Carzen 7% marketplace fee on completed transactions">
        <div class="kpi-header">
          <span>${getLang() === "ar" ? "إيرادات عمولة المنصة" : "Platform Revenue (Commission)"}</span>
          <i data-lucide="help-circle" style="inline-size:14px;block-size:14px;color:var(--c-ink-300)"></i>
        </div>
        <div class="kpi-value" style="color:var(--c-primary-600)">${money(data.totalCommission)}</div>
        <div class="kpi-footer">
          <span class="kpi-delta pos">7% avg</span>
          <span class="muted">${getLang() === "ar" ? "صافي الدخل" : "Net revenue"}</span>
        </div>
      </div>

      <div class="kpi-card" title="Total net payouts owed to independent car wash businesses">
        <div class="kpi-header">
          <span>${getLang() === "ar" ? "صافي أرباح المغاسل" : "Net Wash Earnings"}</span>
          <i data-lucide="help-circle" style="inline-size:14px;block-size:14px;color:var(--c-ink-300)"></i>
        </div>
        <div class="kpi-value" style="color:var(--c-success)">${money(data.netToWashes)}</div>
        <div class="kpi-footer">
          <span class="muted">${getLang() === "ar" ? "٩٣٪ من إجمالي القيمة" : "93% of GMV"}</span>
        </div>
      </div>

      <div class="kpi-card" title="Refunded orders amount">
        <div class="kpi-header">
          <span>${getLang() === "ar" ? "المبالغ المستردة" : "Refunds"}</span>
          <i data-lucide="help-circle" style="inline-size:14px;block-size:14px;color:var(--c-ink-300)"></i>
        </div>
        <div class="kpi-value">${money(data.refunds)}</div>
        <div class="kpi-footer">
          <span class="muted">0.4% ${getLang() === "ar" ? "من الإجمالي" : "of GMV"}</span>
        </div>
      </div>
    </div>

    <!-- Top Washes by GMV Table -->
    <div class="card pad" style="margin-block-start:var(--s-4)">
      <h3 style="margin:0 0 16px;font-size:16px">${getLang() === "ar" ? "أعلى المغاسل تحقيقاً للإيرادات (GMV)" : "Top Performing Washes by GMV"}</h3>
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>${getLang() === "ar" ? "المغسلة" : "Wash"}</th>
              <th>${getLang() === "ar" ? "الطلبات المكتملة" : "Completed Orders"}</th>
              <th>${getLang() === "ar" ? "إجمالي القيمة (GMV)" : "Gross Value"}</th>
              <th>${getLang() === "ar" ? "عمولة المنصة المقدرة" : "Est. Commission"}</th>
            </tr>
          </thead>
          <tbody>
            ${data.topWashesByGmv.map((w) => `
              <tr>
                <td><strong><a href="#/washes/${w.id}">${w.name[getLang()] || w.name.ar}</a></strong></td>
                <td>${w.ordersCount}</td>
                <td><strong style="color:var(--c-primary-600)">${money(w.gmv)}</strong></td>
                <td>${money(Math.round(w.gmv * 0.07))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (window.lucide?.createIcons) window.lucide.createIcons({ root: el });
  return el;
}

// 2. Transactions Ledger View (Screen A16)
async function renderTransactionsView(query) {
  const el = document.createElement("div");
  const admin = getCurrentAdmin();
  const txs = await getTransactions(query.flag === "discrepancy" ? "discrepancy" : "all");

  const totalGross = txs.reduce((s, t) => s + (t.gross || 0), 0);
  const totalComm = txs.reduce((s, t) => s + (t.commission || 0), 0);
  const totalNet = txs.reduce((s, t) => s + (t.netToWash || 0), 0);

  const table = createDataTable({
    data: txs,
    quickChips: [
      { id: "all", label: getLang() === "ar" ? "جميع المعاملات" : "All Transactions", active: query.flag !== "discrepancy", predicate: () => true },
      { id: "disc", label: `⚠️ ${getLang() === "ar" ? "فروق غير متطابقة" : "Discrepancies"} (1)`, active: query.flag === "discrepancy", predicate: (t) => t.flag === "discrepancy" || t.discrepancy },
      { id: "paid", label: getLang() === "ar" ? "محصلة" : "Paid", predicate: (t) => t.status === "paid" },
      { id: "settled", label: getLang() === "ar" ? "تمت التسوية" : "Settled", predicate: (t) => t.status === "settled" },
    ],
    columns: [
      {
        key: "date",
        title: getLang() === "ar" ? "التاريخ" : "Date",
        render: (t) => formatDateTime(t.date),
      },
      {
        key: "orderId",
        title: getLang() === "ar" ? "رقم الطلب" : "Order #",
        render: (t) => `<a href="#/orders/${t.orderId}" style="font-weight:700;color:var(--c-primary-600)">${t.order?.number || t.orderId}</a>`,
      },
      {
        key: "business",
        title: getLang() === "ar" ? "المغسلة" : "Wash",
        render: (t) => t.business?.name ? (t.business.name[getLang()] || t.business.name.ar) : t.businessId,
      },
      {
        key: "gross",
        title: getLang() === "ar" ? "القيمة (Gross)" : "Gross",
        render: (t) => `<strong>${money(t.gross)}</strong>`,
      },
      {
        key: "commissionRate",
        title: getLang() === "ar" ? "النسبة" : "Rate",
        render: (t) => `${t.commissionRate}%`,
      },
      {
        key: "commission",
        title: getLang() === "ar" ? "العمولة" : "Commission",
        render: (t) => `<span style="color:var(--c-primary-600);font-weight:700">${money(t.commission)}</span>`,
      },
      {
        key: "netToWash",
        title: getLang() === "ar" ? "صافي المغسلة" : "Net",
        render: (t) => `<span style="color:var(--c-success);font-weight:700">${money(t.netToWash)}</span>`,
      },
      {
        key: "method",
        title: getLang() === "ar" ? "طريقة الدفع" : "Method",
        render: (t) => `<span class="chip flat" style="font-size:11px">${t.method || "Cash"}</span>`,
      },
      {
        key: "status",
        title: getLang() === "ar" ? "الحالة" : "Status",
        render: (t) => {
          if (t.flag === "discrepancy" || t.discrepancy) {
            return `<span class="badge" style="background:color-mix(in srgb,var(--c-danger) 15%,transparent);color:var(--c-danger)">⚠️ Discrepancy</span>`;
          }
          return `<span class="badge">${t.status}</span>`;
        },
      },
    ],
    onRowClick: (transaction) => {
      // If discrepancy, open side-by-side investigation modal (Scenario 4 / AD-40)
      if (transaction.flag === "discrepancy" || transaction.discrepancy) {
        const db = get();
        const order = db.orders.find((o) => o.id === transaction.orderId || o.number === transaction.orderId);
        const payment = db.payments.find((p) => p.orderId === transaction.orderId);
        const auditEntries = db.auditLogs.filter((a) => a.entityId === transaction.orderId || a.entityId === transaction.id);

        showDiscrepancyModal({
          transaction,
          order,
          payment,
          auditEntries,
          onResolve: async (note) => {
            await resolveDiscrepancy(transaction.id, {
              adminId: admin.id,
              note,
            });
            location.reload();
          },
        });
      }
    },
    exportFileName: "carzen_transactions_ledger",
  });

  // Append Totals Row at the bottom (AD-37)
  const totalsRow = document.createElement("div");
  totalsRow.style.cssText = "display:flex;justify-content:flex-end;gap:24px;padding:12px 16px;background:var(--c-bg);border:1px solid var(--c-line);border-radius:var(--r-sm);margin-block-start:8px;font-size:14px";
  totalsRow.innerHTML = `
    <div>${getLang() === "ar" ? "إجمالي المعاملات المعروضة:" : "Total Gross:"} <strong>${money(totalGross)}</strong></div>
    <div>${getLang() === "ar" ? "إجمالي العمولات:" : "Total Commission:"} <strong style="color:var(--c-primary-600)">${money(totalComm)}</strong></div>
    <div>${getLang() === "ar" ? "إجمالي الصافي للمغاسل:" : "Total Net:"} <strong style="color:var(--c-success)">${money(totalNet)}</strong></div>
  `;

  el.appendChild(table.element);
  el.appendChild(totalsRow);
  return el;
}

// 3. Commission Settings View (Screen A17)
async function renderCommissionView() {
  const el = document.createElement("div");
  const admin = getCurrentAdmin();
  const db = get();
  const defaultRate = db.settings?.defaultCommissionPct || 7;
  const washes = await getWashes("active");

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s-6)">
      <!-- Platform Default Commission Setting (AD-38) -->
      <div class="card pad">
        <h3 style="margin:0 0 16px;font-size:16px">${getLang() === "ar" ? "نسبة العمولة الافتراضية للمنصة" : "Platform Default Commission"}</h3>
        <p class="muted" style="margin:0 0 16px;font-size:14px;line-height:1.5">
          ${getLang() === "ar" ? "تُطبق هذه النسبة تلقائياً على جميع المغاسل المنضمة ما لم يتم تخصيص استثناء خاص بها. التعديل يتطلب توثيق السبب ويُطبق على المعاملات المستقبلية فقط." : "Standard platform take-rate applied to future transactions unless an override exists."}
        </p>

        <form id="commission-default-form" style="display:flex;flex-direction:column;gap:16px">
          <div class="field">
            <span class="label">${getLang() === "ar" ? "النسبة الافتراضية (%)" : "Default Rate (%)"}</span>
            <input type="number" class="control" id="default-comm-input" value="${defaultRate}" min="1" max="50" required />
          </div>
          <button type="submit" class="btn primary">
            ${getLang() === "ar" ? "تعديل النسبة الافتراضية" : "Update Default Rate"}
          </button>
        </form>

        <!-- Plans Teaser (Free 10% / Pro 5%) - future (AD-38) -->
        <div style="margin-block-start:var(--s-6);padding:16px;background:var(--c-bg);border:1px dashed var(--c-line);border-radius:var(--r-md);opacity:0.65">
          <div style="font-weight:700;font-size:14px;margin-block-end:4px">
            🔒 ${getLang() === "ar" ? "باقات الشركاء المتعددة (Free 10% / Pro 5%) — قريباً" : "Tiered Partner Plans (Free 10% / Pro 5%) — Coming Soon"}
          </div>
          <div style="font-size:12px;color:var(--c-ink-500)">
            ${getLang() === "ar" ? "نظام الاشتراكات الشهرية ونسب العمولة المتغيرة قيد التطوير في المرحلة القادمة." : "Monthly tiered subscriptions under development for next platform release."}
          </div>
        </div>
      </div>

      <!-- Per-Wash Overrides (AD-38) -->
      <div class="card pad">
        <h3 style="margin:0 0 16px;font-size:16px">${getLang() === "ar" ? "تخصيص عمولة لمغاسل محددة (Overrides)" : "Per-Wash Custom Overrides"}</h3>
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>${getLang() === "ar" ? "المغسلة" : "Wash"}</th>
                <th>${getLang() === "ar" ? "النسبة الحالية" : "Current Rate"}</th>
                <th>${getLang() === "ar" ? "تعديل" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              ${washes.map((w) => `
                <tr>
                  <td><strong>${w.name[getLang()] || w.name.ar}</strong></td>
                  <td><span class="chip on">${w.commissionRate}%</span></td>
                  <td>
                    <button type="button" class="btn sm ghost" data-override-wash="${w.id}" data-current-rate="${w.commissionRate}">
                      ${getLang() === "ar" ? "تخصيص" : "Override"}
                    </button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Default commission form submit
  el.querySelector("#commission-default-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const rate = Number(el.querySelector("#default-comm-input").value);
    const result = await promptReasonModal({
      title: getLang() === "ar" ? "تعديل نسبة العمولة الافتراضية" : "Update Default Commission",
      message: `${getLang() === "ar" ? "سيتم تغيير النسبة الافتراضية إلى:" : "New default rate:"} ${rate}%`,
    });

    if (result) {
      await updateCommissionSettings({ defaultCommissionPct: rate }, {
        adminId: admin.id,
        reason: result.reason,
      });
      location.reload();
    }
  });

  // Per-wash override buttons
  el.querySelectorAll("[data-override-wash]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const bizId = btn.dataset.overrideWash;
      const current = btn.dataset.currentRate;
      const w = washes.find((item) => item.id === bizId);

      const result = await promptReasonModal({
        title: `${getLang() === "ar" ? "تخصيص عمولة لـ" : "Custom Rate for"} ${w.name[getLang()] || w.name.ar}`,
        placeholder: getLang() === "ar" ? "اكتب سبب تغيير النسبة لهذه المغسلة..." : "Reason for rate override...",
      });

      if (result) {
        const newRateStr = prompt(getLang() === "ar" ? "أدخل النسبة الجديدة (%):" : "Enter new rate (%):", current);
        if (newRateStr && !isNaN(Number(newRateStr))) {
          await updateCommissionSettings({ overrides: { [bizId]: Number(newRateStr) } }, {
            adminId: admin.id,
            reason: `${result.reason} (New rate: ${newRateStr}%)`,
          });
          location.reload();
        }
      }
    });
  });

  return el;
}

// 4. Payouts View (Screen A18)
async function renderPayoutsView() {
  const el = document.createElement("div");
  const admin = getCurrentAdmin();
  const payouts = await getPayouts();

  el.innerHTML = `
    <div class="card pad" style="margin-block-end:var(--s-4)">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <h3 style="margin:0;font-size:16px">${getLang() === "ar" ? "سجل ودورات تسوية مستحقات المغاسل" : "Partner Wash Settlement Runs"}</h3>
          <div class="muted" style="font-size:12px;margin-block-start:2px">
            ${getLang() === "ar" ? "تسجيل الحوالات البنكية وإغلاق المعاملات الدائنة يدوياً" : "Manual bank transfer reconciliation and transaction ledger settlement"}
          </div>
        </div>
      </div>
    </div>
    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>${getLang() === "ar" ? "رقم الدورة" : "Run ID"}</th>
            <th>${getLang() === "ar" ? "المغسلة" : "Wash"}</th>
            <th>${getLang() === "ar" ? "الفترة" : "Period"}</th>
            <th>${getLang() === "ar" ? "المبلغ المستحق" : "Amount Due"}</th>
            <th>${getLang() === "ar" ? "المبلغ المسدد" : "Paid"}</th>
            <th>${getLang() === "ar" ? "الحالة" : "Status"}</th>
            <th>${getLang() === "ar" ? "رقم الحوالة المرجعي" : "Reference"}</th>
            <th>${getLang() === "ar" ? "الإجراء" : "Action"}</th>
          </tr>
        </thead>
        <tbody>
          ${payouts.map((p) => `
            <tr>
              <td><strong>#${p.id}</strong></td>
              <td><strong>${p.business?.name ? (p.business.name[getLang()] || p.business.name.ar) : p.businessId}</strong></td>
              <td>${formatDate(p.periodStart)} – ${formatDate(p.periodEnd)}</td>
              <td><strong style="color:var(--c-primary-600)">${money(p.amountDue)}</strong></td>
              <td>${money(p.amountPaid)}</td>
              <td>
                <span class="badge" style="background:${p.status === "paid" ? "color-mix(in srgb,var(--c-success) 12%,transparent)" : "color-mix(in srgb,var(--c-warning) 12%,transparent)"};color:${p.status === "paid" ? "var(--c-success)" : "var(--c-warning)"}">
                  ${p.status}
                </span>
              </td>
              <td>${p.reference || "—"}</td>
              <td>
                ${p.status !== "paid" ? `
                  <button type="button" class="btn sm primary" data-mark-payout-paid="${p.id}" data-due="${p.amountDue}">
                    ${t("admin.action.markPaid")}
                  </button>
                ` : `<span class="muted">Settled</span>`}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  el.querySelectorAll("[data-mark-payout-paid]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const payoutId = btn.dataset.markPayoutPaid;
      const due = btn.dataset.due;

      const ref = prompt(getLang() === "ar" ? "أدخل رقم الحوالة أو الإيصال البنكي:" : "Enter bank transfer reference number:", `TRX-${Math.floor(10000 + Math.random() * 90000)}`);
      if (ref) {
        await markPayoutPaid(payoutId, {
          adminId: admin.id,
          amountPaid: Number(due),
          reference: ref,
          date: new Date().toISOString(),
        });
        location.reload();
      }
    });
  });

  return el;
}
