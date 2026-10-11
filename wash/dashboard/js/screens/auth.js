import { get } from "../../../../shared/js/db.js";
import { t } from "../../../../shared/js/i18n.js";
import { toast } from "../../../../shared/js/ui.js";

export function dashLoginScreen(root) {
  root.innerHTML = `
    <div style="min-height:80vh;display:grid;place-items:center;padding:24px">
      <div class="card pad" style="width:100%;max-width:400px;box-shadow:var(--sh-3)">
        <div style="text-align:center;margin-block-end:20px">
          <img src="../../shared/assets/logo.svg" width="48" height="48" style="margin-inline:auto;margin-block-end:8px" alt="" />
          <h2 style="font-size:var(--fs-22)">تسجيل الدخول إلى لوحة المغسلة</h2>
          <p class="small muted">نظام إدارة العمليات والتقارير المالية للشركاء</p>
        </div>

        <div class="stack" style="gap:12px">
          <div class="field">
            <span class="label">البريد الإلكتروني أو الهاتف</span>
            <input class="control" id="dash-login-user" value="khaled@carzen.demo" />
          </div>
          <div class="field">
            <span class="label">كلمة المرور</span>
            <input class="control" type="password" id="dash-login-pwd" value="demo1234" />
          </div>
          <button class="btn block" id="btn-dash-login" style="margin-block-start:6px">تسجيل الدخول</button>

          <div style="text-align:center;margin-block:12px">
            <span class="small muted">تسجيل تجريبي سريع بنقرة واحدة:</span>
          </div>

          <button class="btn ghost block sm" id="btn-quick-khaled">
            👑 خالد منصور (المالك — جميع الفروع)
          </button>
          <button class="btn ghost block sm" id="btn-quick-adel">
            👔 محمد عادل (مدير فرع مدينة نصر)
          </button>
        </div>
      </div>
    </div>
  `;

  const doLogin = (id) => {
    localStorage.setItem("carzen_staff_id", id);
    window.dispatchEvent(new CustomEvent("carzen-staff-session", { detail: { staffId: id } }));
    toast("مرحبًا بك في لوحة المغسلة!");
    location.hash = "#/dashboard";
  };

  document.getElementById("btn-dash-login").onclick = () => doLogin("st_owner_biz_carzen");
  document.getElementById("btn-quick-khaled").onclick = () => doLogin("st_owner_biz_carzen");
  document.getElementById("btn-quick-adel").onclick = () => doLogin("st_adel");
}
