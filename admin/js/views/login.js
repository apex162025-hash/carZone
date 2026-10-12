import { t, getLang } from "../../../shared/js/i18n.js";
import { login, setCurrentAdmin } from "../auth.js";

export function renderLogin() {
  const container = document.createElement("div");
  container.className = "admin-login";

  container.innerHTML = `
    <div class="card pad" style="inline-size:min(100%,440px);box-shadow:var(--sh-3);border-radius:var(--r-lg);padding:var(--s-7) var(--s-6)">
      <div style="text-align:center;margin-block-end:var(--s-6)">
        <img src="../shared/assets/logo.svg" width="56" height="56" alt="Carzen" style="margin-inline:auto;margin-block-end:var(--s-3);border-radius:16px;box-shadow:var(--sh-2)" />
        <h2 style="margin:0;font-size:var(--fs-22);font-weight:800;letter-spacing:-0.02em">
          ${getLang() === "ar" ? "تسجيل الدخول إلى لوحة الإدارة" : "Carzen Platform Admin"}
        </h2>
        <p class="muted" style="margin-block-start:6px;font-size:var(--fs-14)">
          ${getLang() === "ar" ? "أدخل بياناتك للمتابعة أو اختر حساباً تجريبياً" : "Sign in or select a demo admin account"}
        </p>
      </div>

      <form id="admin-login-form" style="display:flex;flex-direction:column;gap:var(--s-4)">
        <div class="field">
          <span class="label">${getLang() === "ar" ? "البريد الإلكتروني" : "Email Address"}</span>
          <input type="email" class="control" id="login-email" value="sara@carzen.demo" required />
        </div>

        <div class="field">
          <span class="label">${getLang() === "ar" ? "كلمة المرور" : "Password"}</span>
          <input type="password" class="control" id="login-password" value="demo1234" required />
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px">
          <label style="display:flex;align-items:center;gap:6px;color:var(--c-ink-700)">
            <input type="checkbox" checked />
            ${getLang() === "ar" ? "تذكرني في هذه الجلسة" : "Remember me"}
          </label>
          <span class="muted" title="Coming soon" style="opacity:0.6;cursor:not-allowed">
            🔒 ${getLang() === "ar" ? "التحقق الثنائي 2FA (قريباً)" : "2FA (Coming soon)"}
          </span>
        </div>

        <span class="err" id="login-err" style="text-align:center"></span>

        <button type="submit" class="btn primary block" style="min-block-size:46px;font-size:15px">
          ${getLang() === "ar" ? "تسجيل الدخول" : "Sign In"}
        </button>
      </form>

      <div style="margin-block:var(--s-5);position:relative;text-align:center">
        <hr style="border:0;border-block-start:1px solid var(--c-line);margin:0" />
        <span style="position:relative;inset-block-start:-9px;background:var(--c-surface);padding-inline:10px;font-size:12px;color:var(--c-ink-500);font-weight:600">
          ${getLang() === "ar" ? "حسابات العرض التجريبي (نقرة واحدة)" : "Demo Persona Logins (One-tap)"}
        </span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s-2)">
        <button type="button" class="btn ghost sm" data-login-persona="au_sara">
          Sara · Super
        </button>
        <button type="button" class="btn ghost sm" data-login-persona="au_omar">
          Omar · Operations
        </button>
        <button type="button" class="btn ghost sm" data-login-persona="au_nour">
          Nour · Finance
        </button>
        <button type="button" class="btn ghost sm" data-login-persona="au_mona">
          Mona · Support
        </button>
      </div>
    </div>
  `;

  const form = container.querySelector("#admin-login-form");
  const emailInput = container.querySelector("#login-email");
  const passwordInput = container.querySelector("#login-password");
  const errSpan = container.querySelector("#login-err");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    errSpan.textContent = "";
    try {
      login(emailInput.value, passwordInput.value);
      location.hash = "#/dashboard";
    } catch (err) {
      errSpan.textContent = err.message;
    }
  });

  container.querySelectorAll("[data-login-persona]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.loginPersona;
      setCurrentAdmin(id);
      location.hash = "#/dashboard";
    });
  });

  return container;
}
