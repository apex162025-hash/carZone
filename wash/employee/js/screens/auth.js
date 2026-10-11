import { get, mutate, now } from "../../../../shared/js/db.js";
import { t, L } from "../../../../shared/js/i18n.js";
import { toast } from "../../../../shared/js/ui.js";
import { startShift } from "../../../../shared/js/services/wash.js";
import { currentStaff, currentBranch, hasActiveShift } from "../state.js";

export function loginScreen(root) {
  root.innerHTML = `
    <div class="shift-gate">
      <div class="shift-gate-icon">🚿</div>
      <h2 style="font-size:var(--fs-22);margin-block-end:4px">${t("emp.login.title")}</h2>
      <p class="muted small" style="margin-block-end:24px">تطبيق العمليات وإدارة مسارات الغسيل</p>

      <div class="stack" style="width:100%;max-width:320px;text-align:start;gap:12px">
        <div class="field">
          <span class="label">رقم الموبايل</span>
          <input class="control num" id="login-phone" value="+20 100 555 0101" />
        </div>
        <div class="field">
          <span class="label">كلمة المرور</span>
          <input class="control" type="password" id="login-pwd" value="demo1234" />
        </div>
        <button class="btn block" id="login-submit" style="margin-block-start:8px">تسجيل الدخول</button>

        <div style="margin-block:12px;text-align:center">
          <span class="small muted">أو دخول تجريبي سريع بنقرة واحدة:</span>
        </div>

        <button class="btn ghost block sm" id="quick-samir">
          👤 أحمد سمير (موظف — ٠٩:٠٠ - ١٧:٠٠)
        </button>
        <button class="btn ghost block sm" id="quick-adel">
          👔 محمد عادل (مدير فرع مدينة نصر)
        </button>
      </div>
    </div>
  `;

  const doLogin = (id) => {
    localStorage.setItem("carzen_staff_id", id);
    window.dispatchEvent(new CustomEvent("carzen-staff-session", { detail: { staffId: id } }));
    toast("مرحبًا بك!");
    location.hash = "#/home";
  };

  document.getElementById("login-submit").onclick = () => {
    const phone = document.getElementById("login-phone").value.trim();
    const db = get();
    const cleanPhone = phone.replace(/[\s-+]/g, "");
    const member = db.staff.find((s) => s.phone.replace(/[\s-+]/g, "").includes(cleanPhone));
    if (member) {
      if (member.status !== "active") {
        toast("الحساب غير نشط. يرجى مراجعة إدارة المغسلة.");
        return;
      }
      doLogin(member.id);
    } else {
      doLogin("st_samir");
    }
  };

  document.getElementById("quick-samir").onclick = () => doLogin("st_samir");
  document.getElementById("quick-adel").onclick = () => doLogin("st_adel");
}

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
      location.hash = "#/home";
    } catch {
      location.hash = "#/home";
    }
  };

  document.getElementById("btn-switch-account").onclick = () => {
    location.hash = "#/login";
  };
}
