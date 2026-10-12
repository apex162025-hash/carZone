import { get } from "../../../../shared/js/db.js";
import { t } from "../../../../shared/js/i18n.js";
import { toast } from "../../../../shared/js/ui.js";
import { homeHash } from "../state.js";

// Demo personas — one sign-in for the whole wash app; the role decides what is shown.
const PERSONAS = [
  { id: "st_owner_biz_carzen", icon: "crown", role: "owner", hint: "جميع الفروع · التقارير · المالية · الإعدادات" },
  { id: "st_adel", icon: "briefcase", role: "manager", hint: "فرع مدينة نصر · التشغيل + الإدارة" },
  { id: "st_samir", icon: "user-round", role: "employee", hint: "فرع مدينة نصر · الاستقبال والحجوزات والوردية" },
];

export function dashLoginScreen(root) {
  const db = get();
  root.innerHTML = `
    <div class="wash-login">
      <section class="wash-login-hero">
        <img src="../../shared/assets/logo.svg" width="64" height="64" alt="" />
        <h1>Carzen Wash</h1>
        <p>تطبيق ولوحة واحدة للمغسلة — المالك يدير، والموظف يستقبل ويحجز.</p>
        <ul>
          <li><i data-lucide="layout-dashboard"></i> مؤشرات وتقارير ومالية للمالك</li>
          <li><i data-lucide="calendar-check"></i> حجوزات وعملاء حضوري وتسجيل وصول للموظف</li>
          <li><i data-lucide="smartphone"></i> يعمل على الكمبيوتر والموبايل</li>
        </ul>
      </section>

      <div class="card pad wash-login-card">
        <div style="margin-block-end:18px">
          <h2 style="font-size:var(--fs-22)">تسجيل الدخول</h2>
          <p class="small muted">الأقسام تظهر حسب صلاحية الحساب</p>
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

          <div class="small muted" style="text-align:center;margin-block:10px 2px">دخول تجريبي سريع:</div>
          ${PERSONAS.map((p) => {
            const staff = db.staff.find((s) => s.id === p.id);
            return `<button class="persona" data-id="${p.id}">
              <span class="persona-ico ${p.role}"><i data-lucide="${p.icon}"></i></span>
              <span class="grow"><b>${staff?.name || p.id}</b> · ${t("wash.role." + p.role)}<span class="small muted" style="display:block">${p.hint}</span></span>
              <i data-lucide="chevron-left" class="dir-icon muted"></i>
            </button>`;
          }).join("")}
        </div>
      </div>
    </div>
  `;
  window.lucide?.createIcons({ attrs: { class: "ico" }, nameAttr: "data-lucide", root });

  const doLogin = (id) => {
    localStorage.setItem("carzen_staff_id", id);
    window.dispatchEvent(new CustomEvent("carzen-staff-session", { detail: { staffId: id } }));
    toast("مرحبًا بك في Carzen Wash!");
    location.hash = homeHash();
  };

  document.getElementById("btn-dash-login").onclick = () => {
    const value = document.getElementById("dash-login-user").value.trim().toLowerCase();
    const digits = value.replace(/\D/g, "");
    const member = db.staff.find((s) => (s.email && s.email.toLowerCase() === value) || (digits.length > 6 && s.phone.replace(/\D/g, "").endsWith(digits)));
    if (member && member.status === "suspended") {
      toast("الحساب غير نشط. يرجى مراجعة إدارة المغسلة.");
      return;
    }
    doLogin(member?.id || "st_owner_biz_carzen");
  };
  root.querySelectorAll(".persona").forEach((b) => { b.onclick = () => doLogin(b.dataset.id); });
}
