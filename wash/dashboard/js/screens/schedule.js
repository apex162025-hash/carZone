import { get, mutate, now } from "../../../../shared/js/db.js";
import { t, L } from "../../../../shared/js/i18n.js";
import { formatTime } from "../../../../shared/js/format.js";
import { paintIcons } from "../../../../shared/js/dom.js";
import { toast, sheet } from "../../../../shared/js/ui.js";
import { blockSlot, unblockSlot } from "../../../../shared/js/services/wash.js";
import { currentStaff, selectedBranchId } from "../state.js";

export function scheduleScreen(root) {
  const db = get();
  const staff = currentStaff();
  const branchId = selectedBranchId() === "all" ? "br_nasr" : selectedBranchId();
  const branch = db.branches.find((b) => b.id === branchId) || db.branches[0];

  const capacity = branch.capacity || 6;
  const blockedSlots = branch.blockedSlots || [];

  // Generate 30-min intervals from 09:00 to 22:00
  const intervals = [];
  for (let h = 9; h <= 21; h++) {
    intervals.push(`${String(h).padStart(2, "0")}:00`);
    intervals.push(`${String(h).padStart(2, "0")}:30`);
  }

  // Active orders today for this branch
  const orders = db.orders.filter((o) => o.branchId === branch.id && !["cancelled", "no_show"].includes(o.status));

  root.innerHTML = `
    <div class="between" style="margin-block-end:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:var(--fs-28);font-weight:800">${t("dash.nav.schedule")}</h1>
        <p class="small muted">جدول الطاقة الاستيعابية اليومية ومسارات الغسيل · ${branch.name.ar} (${capacity} مسارات)</p>
      </div>

      <div class="row">
        <button class="btn sm" id="btn-block-slot-modal">
          🔒 ${t("dash.schedule.block")}
        </button>
      </div>
    </div>

    <!-- Blocked Slots Alerts (If any) -->
    ${blockedSlots.length > 0 ? `
      <div class="card pad" style="margin-block-end:16px;background:var(--c-primary-50)">
        <b style="font-size:14px;margin-block-end:6px;display:block">الفترات المحظورة حاليًا:</b>
        <div class="stack" style="gap:6px">
          ${blockedSlots.map((bs, idx) => `
            <div class="between small">
              <span><b>${formatTime(bs.start)} إلى ${formatTime(bs.end)}</b>: ${bs.reason || "حظر يدوي"}</span>
              <button class="btn sm ghost" data-unblock-idx="${idx}">${t("dash.schedule.unblock")}</button>
            </div>
          `).join("")}
        </div>
      </div>
    ` : ""}

    <!-- Schedule Grid: Time × Bays -->
    <div class="schedule-grid-wrap">
      <div class="schedule-row" style="background:var(--c-bg);font-weight:700">
        <div class="schedule-time-cell">الوقت</div>
        ${Array.from({ length: capacity }, (_, i) => `
          <div style="padding:10px;text-align:center;font-size:13px">مسار ${i + 1}</div>
        `).join("")}
      </div>

      ${intervals.map((timeStr) => {
        // Find orders occupying this time slot
        const matchingOrders = orders.filter((o) => {
          const t = formatTime(o.scheduledAt);
          return t.includes(timeStr) || (o.status === "in_service" && timeStr.startsWith("15:"));
        });

        return `
          <div class="schedule-row">
            <div class="schedule-time-cell num">${timeStr}</div>
            ${Array.from({ length: capacity }, (_, bayIdx) => {
              const ord = matchingOrders[bayIdx];
              if (ord) {
                return `
                  <div class="schedule-bay-cell">
                    <div class="bay-occupied">
                      ${ord.plate} (${ord.status})
                    </div>
                  </div>
                `;
              }
              return `
                <div class="schedule-bay-cell">
                  <span class="small muted" style="opacity:0.4">—</span>
                </div>
              `;
            }).join("")}
          </div>
        `;
      }).join("")}
    </div>
  `;

  paintIcons(root);

  // Unblock slot
  root.querySelectorAll("[data-unblock-idx]").forEach((btn) => {
    btn.onclick = async () => {
      const idx = Number(btn.dataset.unblockIdx);
      await unblockSlot({ branchId: branch.id, index: idx, staffId: staff.id });
      toast("تم إلغاء الحظر وإتاحة المسارات بنجاح ✓");
      scheduleScreen(root);
    };
  });

  // Block slot modal
  document.getElementById("btn-block-slot-modal").onclick = async () => {
    const html = `
      <h3 style="font-size:var(--fs-22);margin-block-end:6px">${t("dash.schedule.block")}</h3>
      <p class="muted small" style="margin-block-end:16px">حظر فترة زمنية يمنع حجوزات العملاء خلالها فورًا.</p>

      <div class="grid-2" style="margin-block-end:14px">
        <div class="field">
          <span class="label">من الساعة *:</span>
          <input class="control" type="time" id="block-start" value="16:00" />
        </div>
        <div class="field">
          <span class="label">إلى الساعة *:</span>
          <input class="control" type="time" id="block-end" value="18:00" />
        </div>
      </div>

      <div class="field" style="margin-block-end:20px">
        <span class="label">سبب الحظر *:</span>
        <input class="control" id="block-reason" placeholder="مثال: صيانة مضخات المياه..." value="صيانة دورية للمسارات" />
      </div>

      <button class="btn block danger" id="btn-confirm-block" style="min-height:48px">
        تأكيد حظر الفترة
      </button>
    `;

    await sheet(html);

    const sheetEl = document.querySelector(".sheet");
    if (!sheetEl) return;

    sheetEl.querySelector("#btn-confirm-block").onclick = async () => {
      const s = sheetEl.querySelector("#block-start").value;
      const e = sheetEl.querySelector("#block-end").value;
      const r = sheetEl.querySelector("#block-reason").value.trim();

      const base = now();
      const startDate = new Date(base);
      startDate.setHours(Number(s.split(":")[0]), Number(s.split(":")[1]), 0);
      const endDate = new Date(base);
      endDate.setHours(Number(e.split(":")[0]), Number(e.split(":")[1]), 0);

      try {
        await blockSlot({
          branchId: branch.id,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          reason: r,
          staffId: staff.id,
        });

        document.querySelector(".overlay")?.remove();
        toast("تم حظر الفترة وتحديث تطبيق العميل فورًا ✓");
        scheduleScreen(root);
      } catch (err) {
        toast(err.message || "حدث خطأ");
      }
    };
  };
}
