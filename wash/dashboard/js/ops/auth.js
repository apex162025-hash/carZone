import { t, L } from "../../../../shared/js/i18n.js";
import { toast } from "../../../../shared/js/ui.js";
import { startShift } from "../../../../shared/js/services/wash.js";
import { currentStaff, currentBranch, hasActiveShift } from "../state.js";

export function startShiftGate(root) {
  const staff = currentStaff();
  const branch = currentBranch();

  root.innerHTML = `
    <div class="shift-gate">
      <div class="shift-gate-icon">⏱️</div>
      <h2 style="font-size:var(--fs-22);margin-block-end:4px">${t("emp.shift.start_gate")}</h2>
      <p class="muted small" style="margin-block-end:20px">يجب تسجيل بداية الوردية لمتابعة سيارات الفرع وإثبات التحصيل النقدي.</p>

      <div class="card pad" style="width:100%;max-width:320px;text-align:start;background:var(--c-surface);margin-block-end:24px">
        <div class="between">
          <span class="small muted">الموظف:</span>
          <b>${staff.name}</b>
        </div>
        <div class="between" style="margin-block-start:8px">
          <span class="small muted">الفرع:</span>
          <b>${branch?.name?.ar || "مدينة نصر"}</b>
        </div>
        <div class="between" style="margin-block-start:8px">
          <span class="small muted">الوردية المقررة:</span>
          <span class="emp-shift-tag">٠٩:٠٠ - ١٧:٠٠</span>
        </div>
      </div>

      <button class="btn block" id="btn-start-shift" style="max-width:320px;min-height:48px">
        🚀 ${t("emp.shift.start_btn")}
      </button>

      <button class="btn ghost sm" id="btn-switch-account" style="margin-block-start:16px">
        تسجيل الدخول بحساب آخر
      </button>
    </div>
  `;

  document.getElementById("btn-start-shift").onclick = async () => {
    try {
      await startShift({ staffId: staff.id, branchId: branch.id });
      toast("تم بدء الوردية بنجاح ✓");
      location.hash = "#/today";
    } catch {
      location.hash = "#/today";
    }
  };

  document.getElementById("btn-switch-account").onclick = () => {
    location.hash = "#/login";
  };
}
