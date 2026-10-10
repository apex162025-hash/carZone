import { t, getLang } from "../../../shared/js/i18n.js";
import { money, formatDateTime } from "../../../shared/js/format.js";

export function promptReasonModal({
  title,
  message = "",
  placeholder = "",
  confirmText = null,
  danger = false,
  options = null,
}) {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "admin-modal-backdrop";

    const defaultConfirm = confirmText || (getLang() === "ar" ? "تأكيد ومتابعة" : "Confirm");
    let optionsHtml = "";
    if (options && options.length > 0) {
      optionsHtml = `
        <div class="field" style="margin-block-end:var(--s-3)">
          <span class="label">${getLang() === "ar" ? "اختر السبب الرئيسي:" : "Select Primary Reason:"}</span>
          <select class="select" id="modal-reason-select">
            ${options.map((opt) => `<option value="${opt.value || opt}">${opt.label || opt}</option>`).join("")}
          </select>
        </div>
      `;
    }

    backdrop.innerHTML = `
      <div class="admin-modal" role="dialog" aria-modal="true">
        <div class="admin-modal-header">
          <h3 style="margin:0;font-size:var(--fs-18);font-weight:800">${title}</h3>
          <button type="button" class="icon-btn sm" data-modal-close>
            <i data-lucide="x" style="inline-size:18px;block-size:18px"></i>
          </button>
        </div>
        <div class="admin-modal-body">
          ${message ? `<p class="muted" style="margin:0;font-size:var(--fs-14)">${message}</p>` : ""}
          ${optionsHtml}
          <div class="field">
            <span class="label">${t("admin.reason.required")}</span>
            <textarea class="textarea" id="modal-reason-input" placeholder="${placeholder || t("admin.reason.ph")}" required autofocus></textarea>
            <span class="err" id="modal-reason-err"></span>
          </div>
        </div>
        <div class="admin-modal-footer">
          <button type="button" class="btn ghost" data-modal-close>${getLang() === "ar" ? "إلغاء" : "Cancel"}</button>
          <button type="button" class="btn ${danger ? "danger" : "primary"}" id="modal-btn-confirm">${defaultConfirm}</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    if (window.lucide?.createIcons) window.lucide.createIcons({ root: backdrop });

    const close = (val = null) => {
      backdrop.remove();
      resolve(val);
    };

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop || e.target.closest("[data-modal-close]")) close(null);
    });

    const confirmBtn = backdrop.querySelector("#modal-btn-confirm");
    const reasonInput = backdrop.querySelector("#modal-reason-input");
    const reasonSelect = backdrop.querySelector("#modal-reason-select");
    const errSpan = backdrop.querySelector("#modal-reason-err");

    confirmBtn.addEventListener("click", () => {
      const text = reasonInput.value.trim();
      if (!text) {
        errSpan.textContent = getLang() === "ar" ? "السبب مطلوب لتوثيق هذا الإجراء في سجل التدقيق." : "Reason is required for audit documentation.";
        reasonInput.focus();
        return;
      }
      const selectedOption = reasonSelect ? reasonSelect.value : null;
      close({ reason: selectedOption ? `${selectedOption}: ${text}` : text, note: text, option: selectedOption });
    });
  });
}

export function confirmModal({ title, message, confirmText = null, danger = false }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "admin-modal-backdrop";

    backdrop.innerHTML = `
      <div class="admin-modal" role="dialog" aria-modal="true" style="inline-size:min(100%,460px)">
        <div class="admin-modal-header">
          <h3 style="margin:0;font-size:var(--fs-18);font-weight:800">${title}</h3>
          <button type="button" class="icon-btn sm" data-modal-close>
            <i data-lucide="x" style="inline-size:18px;block-size:18px"></i>
          </button>
        </div>
        <div class="admin-modal-body">
          <p style="margin:0;font-size:var(--fs-14);line-height:1.5">${message}</p>
        </div>
        <div class="admin-modal-footer">
          <button type="button" class="btn ghost" data-modal-close>${getLang() === "ar" ? "تراجع" : "Cancel"}</button>
          <button type="button" class="btn ${danger ? "danger" : "primary"}" id="modal-confirm-btn">
            ${confirmText || (getLang() === "ar" ? "تأكيد" : "Confirm")}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    if (window.lucide?.createIcons) window.lucide.createIcons({ root: backdrop });

    const close = (val = false) => {
      backdrop.remove();
      resolve(val);
    };

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop || e.target.closest("[data-modal-close]")) close(false);
    });

    backdrop.querySelector("#modal-confirm-btn").addEventListener("click", () => close(true));
  });
}

export function showSessionTimeoutModal(onStay, onLogout) {
  const backdrop = document.createElement("div");
  backdrop.className = "admin-modal-backdrop";
  backdrop.style.zIndex = "100";

  backdrop.innerHTML = `
    <div class="admin-modal" role="dialog" aria-modal="true" style="inline-size:min(100%,440px)">
      <div class="admin-modal-header">
        <h3 style="margin:0;font-size:var(--fs-18);font-weight:800">${t("admin.timeout.title")}</h3>
      </div>
      <div class="admin-modal-body" style="text-align:center;padding:var(--s-6)">
        <i data-lucide="clock" style="inline-size:48px;block-size:48px;color:var(--c-warning);margin:0 auto var(--s-3)"></i>
        <p style="margin:0;font-size:var(--fs-14);line-height:1.5">${t("admin.timeout.desc")}</p>
      </div>
      <div class="admin-modal-footer" style="justify-content:center;gap:var(--s-3)">
        <button type="button" class="btn ghost" id="timeout-btn-logout">${t("admin.timeout.logout")}</button>
        <button type="button" class="btn primary" id="timeout-btn-stay">${t("admin.timeout.stay")}</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  if (window.lucide?.createIcons) window.lucide.createIcons({ root: backdrop });

  backdrop.querySelector("#timeout-btn-stay").addEventListener("click", () => {
    backdrop.remove();
    if (onStay) onStay();
  });

  backdrop.querySelector("#timeout-btn-logout").addEventListener("click", () => {
    backdrop.remove();
    if (onLogout) onLogout();
  });
}

export function showDiscrepancyModal({ transaction, order, payment, auditEntries, onResolve }) {
  const backdrop = document.createElement("div");
  backdrop.className = "admin-modal-backdrop";

  backdrop.innerHTML = `
    <div class="admin-modal" role="dialog" aria-modal="true" style="inline-size:min(100%,860px)">
      <div class="admin-modal-header">
        <div>
          <h3 style="margin:0;font-size:var(--fs-18);font-weight:800">${t("admin.discrepancy.title")}</h3>
          <div style="font-size:var(--fs-12);color:var(--c-ink-500);margin-block-start:4px">${t("admin.discrepancy.desc")}</div>
        </div>
        <button type="button" class="icon-btn sm" data-modal-close>
          <i data-lucide="x" style="inline-size:18px;block-size:18px"></i>
        </button>
      </div>
      <div class="admin-modal-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s-4)">
          <!-- Left: Order Details -->
          <div class="card pad" style="background:var(--c-bg)">
            <h4 style="margin:0 0 var(--s-3);font-size:var(--fs-14);color:var(--c-primary-700)">
              ${getLang() === "ar" ? "بيانات الحجز الأصلية" : "Original Booking"}
            </h4>
            <div style="display:flex;flex-direction:column;gap:8px;font-size:var(--fs-13)">
              <div><strong>${getLang() === "ar" ? "رقم الحجز:" : "Order #:"}</strong> ${order?.number || transaction.orderId}</div>
              <div><strong>${getLang() === "ar" ? "المغسلة:" : "Wash:"}</strong> ${transaction.business?.name ? (transaction.business.name[getLang()] || transaction.business.name.ar) : transaction.businessId}</div>
              <div><strong>${getLang() === "ar" ? "إجمالي الحساب:" : "Order Total:"}</strong> <span style="font-size:16px;font-weight:700;color:var(--c-primary-600)">${money(order?.total || transaction.gross)}</span></div>
              <div><strong>${getLang() === "ar" ? "طريقة الدفع:" : "Method:"}</strong> ${order?.paymentMethod || transaction.method || "Cash"}</div>
              <div><strong>${getLang() === "ar" ? "الحالة التشغيلية:" : "Status:"}</strong> ${order?.status || "completed"}</div>
            </div>
          </div>

          <!-- Right: Payment & Collection -->
          <div class="card pad" style="background:var(--c-bg)">
            <h4 style="margin:0 0 var(--s-3);font-size:var(--fs-14);color:var(--c-warning)">
              ${getLang() === "ar" ? "المبلغ المحصل فعلياً (المدفوعات)" : "Collected Payment"}
            </h4>
            <div style="display:flex;flex-direction:column;gap:8px;font-size:var(--fs-13)">
              <div><strong>${getLang() === "ar" ? "المبلغ المقيد في المعاملة:" : "Ledger Gross:"}</strong> ${money(transaction.gross)}</div>
              <div><strong>${getLang() === "ar" ? "نسبة العمولة:" : "Commission Rate:"}</strong> ${transaction.commissionRate}% (${money(transaction.commission)})</div>
              <div><strong>${getLang() === "ar" ? "صافي المغسلة:" : "Net to Wash:"}</strong> ${money(transaction.netToWash)}</div>
              <div style="padding:8px;background:color-mix(in srgb,var(--c-danger) 10%,transparent);border-radius:var(--r-sm);color:var(--c-danger);font-weight:600">
                ⚠️ ${getLang() === "ar" ? "فرق غير مطابق بين إجمالي الفاتورة والمبلغ المستلم في الصندوق" : "Mismatch detected between order invoice total and cashier receipt"}
              </div>
            </div>
          </div>
        </div>

        <!-- Audit Trail Table -->
        <div>
          <h4 style="margin:var(--s-3) 0 var(--s-2);font-size:var(--fs-14)">
            ${getLang() === "ar" ? "سجل التدقيق المتعلق بالطلب" : "Related Audit Trail"}
          </h4>
          <div class="table-wrap">
            <table class="data" style="font-size:12px">
              <thead>
                <tr>
                  <th>${getLang() === "ar" ? "التاريخ" : "Time"}</th>
                  <th>${getLang() === "ar" ? "المسؤول / الموظف" : "Actor"}</th>
                  <th>${getLang() === "ar" ? "الإجراء" : "Action"}</th>
                  <th>${getLang() === "ar" ? "السبب / الملاحظة" : "Reason"}</th>
                </tr>
              </thead>
              <tbody>
                ${(auditEntries || []).map((a) => `
                  <tr>
                    <td>${formatDateTime(a.at)}</td>
                    <td>${a.actorId}</td>
                    <td>${a.action}</td>
                    <td>${a.reason || "—"}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <div class="field">
          <span class="label">${getLang() === "ar" ? "ملاحظة الاعتماد والمراجعة المالية:" : "Finance Review Note:"}</span>
          <textarea class="textarea" id="disc-resolve-note" placeholder="${getLang() === "ar" ? "اكتب توضيح المطابقة والتسوية..." : "Explain the resolution..."}"></textarea>
        </div>
      </div>
      <div class="admin-modal-footer">
        <button type="button" class="btn ghost" data-modal-close>${getLang() === "ar" ? "إغلاق" : "Close"}</button>
        <button type="button" class="btn primary" id="disc-btn-resolve">${t("admin.discrepancy.resolve")}</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  if (window.lucide?.createIcons) window.lucide.createIcons({ root: backdrop });

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop || e.target.closest("[data-modal-close]")) backdrop.remove();
  });

  backdrop.querySelector("#disc-btn-resolve").addEventListener("click", () => {
    const note = backdrop.querySelector("#disc-resolve-note").value.trim();
    backdrop.remove();
    if (onResolve) onResolve(note || "Reconciled and approved by Finance admin");
  });
}
