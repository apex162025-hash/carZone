import { get, mutate, now } from "../../../../shared/js/db.js";
import { t, L } from "../../../../shared/js/i18n.js";
import { money, formatDateTime, formatTime, initials } from "../../../../shared/js/format.js";
import { paintIcons } from "../../../../shared/js/dom.js";
import { toast, sheet } from "../../../../shared/js/ui.js";
import { replyToReview, reportReview } from "../../../../shared/js/services/wash.js";
import { currentStaff, selectedBranchId } from "../state.js";

let crmSegment = "all"; // 'all' | 'new' | 'returning' | 'lost'
let reviewStarFilter = 0; // 0 = all

/* =========================================================================
   D12: CUSTOMERS (CRM)
   ========================================================================= */

export function customersCrmScreen(root) {
  const db = get();
  const branchId = selectedBranchId();

  // Aggregate customers with their visits and total spend at Carzen Wash
  const custStats = db.customers.map((c) => {
    const orders = db.orders.filter((o) => {
      const matchBranch = branchId === "all" ? o.businessId === "biz_carzen" : o.branchId === branchId;
      return o.customerId === c.id && matchBranch && o.status === "completed";
    });

    const visits = orders.length;
    const totalSpent = orders.reduce((s, o) => s + o.total, 0);
    const sorted = [...orders].sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
    const lastVisit = sorted[0]?.scheduledAt || null;

    let segment = "new";
    if (visits > 2) segment = "returning";
    if (lastVisit && (now().getTime() - new Date(lastVisit).getTime()) > 60 * 86400000) segment = "lost";

    const vehicles = db.vehicles.filter((v) => v.customerId === c.id);

    return {
      customer: c,
      visits,
      totalSpent,
      lastVisit,
      segment,
      vehicles,
    };
  }).filter((x) => x.visits > 0 || x.customer.id === "cu_ahmed");

  let filtered = custStats;
  if (crmSegment !== "all") {
    filtered = filtered.filter((x) => x.segment === crmSegment);
  }

  // Sort by visits desc
  filtered.sort((a, b) => b.visits - a.visits);

  root.innerHTML = `
    <div class="between" style="margin-block-end:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:var(--fs-28);font-weight:800">${t("dash.nav.customers")}</h1>
        <p class="small muted">سجل عملاء المغسلة وتكرار الزيارات وإجمالي الإنفاق</p>
      </div>

      <!-- Segment Chips -->
      <div class="row">
        <button class="chip ${crmSegment === "all" ? "on" : "flat"}" data-seg="all">الكل (${custStats.length})</button>
        <button class="chip ${crmSegment === "returning" ? "on" : "flat"}" data-seg="returning">عملاء دائمون</button>
        <button class="chip ${crmSegment === "new" ? "on" : "flat"}" data-seg="new">عملاء جدد</button>
        <button class="chip ${crmSegment === "lost" ? "on" : "flat"}" data-seg="lost">منقطعون (+٦٠ يوم)</button>
      </div>
    </div>

    <div class="card pad">
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>اسم العميل</th>
              <th>رقم الهاتف</th>
              <th>السيارات المسجلة</th>
              <th>عدد الزيارات</th>
              <th>آخر زيارة</th>
              <th>إجمالي الإنفاق</th>
              <th>التصنيف</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((item) => `
              <tr style="cursor:pointer" data-view-cust="${item.customer.id}">
                <td>
                  <b>${item.customer.name}</b>
                  ${item.customer.id === "cu_ahmed" ? `<span class="badge" data-status="confirmed" style="margin-inline-start:6px">العميل النموذجي</span>` : ""}
                </td>
                <td class="num">${item.customer.phone}</td>
                <td>
                  ${item.vehicles.map((v) => `<span class="chip flat small" style="margin-inline-end:4px">${v.make} (${v.plate})</span>`).join("") || "—"}
                </td>
                <td class="num font-bold" style="color:var(--c-primary-600)">${item.visits} زيارات</td>
                <td class="num small">${item.lastVisit ? formatDateTime(item.lastVisit) : "—"}</td>
                <td class="num font-bold" style="color:var(--c-success)">${money(item.totalSpent)}</td>
                <td>
                  <span class="badge" data-status="${item.segment === "returning" ? "completed" : item.segment === "new" ? "confirmed" : "cancelled"}">
                    ${item.segment === "returning" ? "دائم" : item.segment === "new" ? "جديد" : "منقطع"}
                  </span>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>

    <div id="cust-drawer-slot"></div>
  `;

  paintIcons(root);

  root.querySelectorAll("[data-seg]").forEach((btn) => {
    btn.onclick = () => {
      crmSegment = btn.dataset.seg;
      customersCrmScreen(root);
    };
  });

  root.querySelectorAll("[data-view-cust]").forEach((row) => {
    row.onclick = () => {
      const id = row.dataset.viewCust;
      const data = custStats.find((x) => x.customer.id === id);
      if (data) openCustomerDrawer(data, root);
    };
  });
}

function openCustomerDrawer(data, pageRoot) {
  const db = get();
  const c = data.customer;
  const historyOrders = db.orders.filter((o) => o.customerId === c.id && o.status === "completed");

  const html = `
    <div class="drawer-overlay" id="cust-drawer">
      <div class="drawer-panel">
        <div class="between" style="margin-block-end:16px">
          <div class="row" style="gap:10px">
            <div class="avatar lg">${initials(c.name)}</div>
            <div>
              <h2 style="font-size:var(--fs-22)">${c.name}</h2>
              <div class="small num">📞 ${c.phone}</div>
            </div>
          </div>
          <button class="icon-btn" id="btn-close-cust-drawer">✕</button>
        </div>

        <div class="grid-2" style="margin-block-end:16px">
          <div class="card pad" style="background:var(--c-bg);text-align:center">
            <div class="small muted">الزيارات السابقة</div>
            <b class="num" style="font-size:22px;color:var(--c-primary-600)">${data.visits}</b>
          </div>
          <div class="card pad" style="background:var(--c-bg);text-align:center">
            <div class="small muted">إجمالي الإنفاق</div>
            <b class="num" style="font-size:22px;color:var(--c-success)">${money(data.totalSpent)}</b>
          </div>
        </div>

        <div class="card pad" style="margin-block-end:16px">
          <b style="font-size:14px;margin-block-end:8px;display:block">السيارات المسجلة (${data.vehicles.length}):</b>
          <div class="stack" style="gap:6px">
            ${data.vehicles.map((v) => `
              <div class="between small">
                <span>${v.make} ${v.model} (${v.color || ""})</span>
                <b class="chip on">${v.plate}</b>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="card pad" style="flex:1;overflow-y:auto">
          <b style="font-size:14px;margin-block-end:8px;display:block">سجل الزيارات السابقة:</b>
          <div class="stack" style="gap:8px">
            ${historyOrders.map((o) => `
              <div class="between small" style="border-block-end:1px dashed var(--c-line);padding-block-end:6px">
                <div>
                  <b>${L(o.items[0]?.name)}</b>
                  <div class="small muted num">${formatDateTime(o.scheduledAt)}</div>
                </div>
                <b class="num">${money(o.total)}</b>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    </div>
  `;

  const slot = document.getElementById("cust-drawer-slot") || pageRoot;
  slot.innerHTML = html;
  paintIcons(slot);

  document.getElementById("btn-close-cust-drawer").onclick = () => {
    document.getElementById("cust-drawer")?.remove();
  };
}

/* =========================================================================
   D13: REVIEWS & REPUTATION
   ========================================================================= */

export function reviewsScreen(root) {
  const db = get();
  const staff = currentStaff();
  const branchId = selectedBranchId();

  let reviews = db.reviews || [];
  if (branchId !== "all") {
    reviews = reviews.filter((r) => r.branchId === branchId);
  }

  if (reviewStarFilter > 0) {
    reviews = reviews.filter((r) => r.stars === reviewStarFilter);
  }

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.stars, 0) / reviews.length).toFixed(1) : "0.0";

  root.innerHTML = `
    <div class="between" style="margin-block-end:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:var(--fs-28);font-weight:800">${t("dash.nav.reviews")}</h1>
        <p class="small muted">تقييمات وآراء العملاء الواردة من تطبيق كارزن</p>
      </div>

      <div class="row">
        <button class="chip ${reviewStarFilter === 0 ? "on" : "flat"}" data-star="0">الكل (${reviews.length})</button>
        <button class="chip ${reviewStarFilter === 5 ? "on" : "flat"}" data-star="5">⭐ ٥</button>
        <button class="chip ${reviewStarFilter === 4 ? "on" : "flat"}" data-star="4">⭐ ٤</button>
        <button class="chip ${reviewStarFilter === 1 ? "on" : "flat"}" data-star="1">⭐ ١ (مشاكل)</button>
      </div>
    </div>

    <!-- Rating Summary Hero -->
    <div class="card pad between" style="margin-block-end:24px;background:var(--c-primary-50);border-color:var(--c-primary-100)">
      <div>
        <div class="small muted">متوسط التقييم العام:</div>
        <b class="num" style="font-size:36px;color:var(--c-primary-600)">⭐ ${avgRating}</b>
        <span class="small muted">من إجمالي ${reviews.length} تقييم</span>
      </div>
      <div class="small muted" style="max-width:320px">
        الرد على التقييمات يظهر للعميل في التطبيق فورًا ويساعد على تحسين ولاء العملاء.
      </div>
    </div>

    <!-- Reviews List -->
    <div class="stack" style="gap:14px">
      ${reviews.map((r) => {
        const cust = db.customers.find((c) => c.id === r.customerId);
        return `
          <div class="card pad">
            <div class="between" style="margin-block-end:8px">
              <div class="row">
                <b>${cust?.name || "عميل كارزن"}</b>
                <span class="star" style="font-size:16px">${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)}</span>
                ${r.reportedByWash ? `<span class="badge" data-status="cancelled">تم الإبلاغ للإدارة</span>` : ""}
              </div>
              <span class="small muted num">${formatDateTime(r.createdAt)}</span>
            </div>

            <p style="font-size:15px;margin-block:6px 12px">${L(r.comment) || "خدمة ممتازة وسريعة."}</p>

            ${r.reply ? `
              <div class="card pad" style="background:var(--c-bg);margin-block:8px;border-inline-start:3px solid var(--c-primary-600)">
                <div class="small strong ink">رد إدارة المغسلة:</div>
                <div class="small muted" style="margin-block-start:4px">${r.reply.text}</div>
              </div>
            ` : ""}

            <div class="row" style="margin-block-start:8px;gap:8px">
              ${!r.reply ? `
                <button class="btn sm ghost" data-reply-rv="${r.id}">💬 ${t("dash.review.reply_btn")}</button>
              ` : ""}
              ${!r.reportedByWash ? `
                <button class="btn sm ghost danger" data-report-rv="${r.id}">🚩 ${t("dash.review.report_btn")}</button>
              ` : ""}
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  paintIcons(root);

  root.querySelectorAll("[data-star]").forEach((btn) => {
    btn.onclick = () => {
      reviewStarFilter = Number(btn.dataset.star);
      reviewsScreen(root);
    };
  });

  // Reply to review
  root.querySelectorAll("[data-reply-rv]").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.replyRv;
      const text = prompt("أدخل رد المغسلة على التقييم (سيظهر للعميل في التطبيق):", "شكرًا لك، ويسعدنا دائمًا خدمتك بأعلى جودة!");
      if (!text) return;
      await replyToReview({ reviewId: id, replyText: text, staffId: staff.id });
      toast("تم حفظ الرد ونشره للعميل بنجاح ✓");
      reviewsScreen(root);
    };
  });

  // Report review to admin
  root.querySelectorAll("[data-report-rv]").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.reportRv;
      const reason = prompt("أدخل سبب الإبلاغ لإدارة كارزن:", "تقييم غير دقيق أو يخالف معايير المنصة");
      if (!reason) return;
      await reportReview({ reviewId: id, reason, staffId: staff.id });
      toast("تم إرسال البلاغ لفريق إدارة المنصة ✓");
      reviewsScreen(root);
    };
  });
}
